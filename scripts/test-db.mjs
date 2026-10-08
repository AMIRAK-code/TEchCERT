// Runs the Supabase migrations against an in-memory Postgres (PGlite) with a stubbed
// `auth` schema, then checks the security rules: RLS, RPC permissions, exam validation.
// Usage: npm run test:db   (exits non-zero if any check fails)
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));
const db = new PGlite();

// --- stub the parts of Supabase the migrations rely on
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}', encrypted_password text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  grant execute on function auth.uid() to anon, authenticated;
  grant execute on function auth.jwt() to anon, authenticated;
`);
for (const f of fs.readdirSync(root).sort()) await db.exec(fs.readFileSync(root + f, 'utf8'));
// Supabase grants table privileges to the API roles by default; RLS does the filtering.
await db.exec(`grant usage on schema public to anon, authenticated;
  grant all on all tables in schema public to anon, authenticated;
  grant all on all sequences in schema public to anon, authenticated;`);

// Run SQL as a given role/user. Returns rows, or the error message string.
const as = async (uid, role, sql, params, claims = {}) => {
  const jwt = JSON.stringify({ sub: uid, ...claims }).replace(/'/g, "''");
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid || ''}', false);
    select set_config('request.jwt.claims', '${jwt}', false); set role ${role};`);
  try {
    return (await db.query(sql, params)).rows;
  } catch (e) {
    return 'ERROR: ' + e.message;
  } finally {
    await db.exec('reset role');
  }
};

let failed = 0;
const check = (label, ok, detail) => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `  → ${JSON.stringify(detail)}`}`);
};
const isError = (r, text) => typeof r === 'string' && r.includes(text);

const [amir] = (await db.query(`insert into auth.users (email) values ('Amir.Akbari@inrebus.it') returning id`)).rows;
const [ada] = (await db.query(`insert into auth.users (email, raw_user_meta_data) values ('ada@example.com', '{"full_name":"Ada Lovelace"}') returning id`)).rows;
const L = 'authenticated';

const profiles = (await db.query('select email, role from public.profiles order by email')).rows;
check('staff email becomes admin on sign-up', profiles.find(p => p.email === 'amir.akbari@inrebus.it')?.role === 'admin', profiles);
check('other emails become learners', profiles.find(p => p.email === 'ada@example.com')?.role === 'learner', profiles);
const linked = (await db.query('select cred_id from public.certificates where user_id = $1', [amir.id])).rows;
check('pre-issued certificates attach to the new account', linked.length === 2, linked);

let r = await as(ada.id, L, `select submit_exam('ai-security', 15, 15)`);
check('exam rejected before lessons are complete', isError(r, 'Complete all lessons'), r);
r = await as(ada.id, L, `select submit_exam('ai-security', 3, 3)`);
check('exam rejected when total ≠ exam size', isError(r, 'Invalid exam result'), r);

for (let i = 0; i < 8; i++) await as(ada.id, L, `insert into lesson_progress (course_id, lesson_id) values ('ai-security', 'l${i}')`);
r = await as(ada.id, L, `select submit_exam('ai-security', 15, 15)`);
check('exam rejected without a purchase', isError(r, 'Purchase the exam'), r);

// --- pricing & purchases
let price = (await as(null, 'anon', `select course_price('ai-prompt-engineer') p`))[0].p;
check('anonymous visitors see the base price', price.price_cents === 199 && !price.discounted && !price.has_access, price);
price = (await as(ada.id, L, `select course_price('ai-security') p`))[0].p;
check('first purchase is full price (€4.99)', price.price_cents === 499 && !price.discounted && !price.has_access, price);
r = await as(ada.id, L, `insert into purchases (user_id, course_id, stripe_session_id, amount_cents, currency) values ('${ada.id}', 'ai-security', 'cs_fake', 0, 'eur')`);
check('learner cannot insert purchases', isError(r, 'row-level security'), r);
r = await as(ada.id, L, `select price_for('${ada.id}', 'ai-security')`);
check('learner cannot call price_for directly', isError(r, 'permission denied'), r);
r = await as(ada.id, L, `select has_exam_access('${ada.id}', 'ai-security')`);
check('learner cannot call has_exam_access directly', isError(r, 'permission denied'), r);
// what the stripe-webhook function does with the service role
await db.query(`insert into purchases (user_id, course_id, stripe_session_id, stripe_payment_intent, amount_cents, currency) values ($1, 'ai-security', 'cs_test_1', 'pi_1', 499, 'eur')`, [ada.id]);
price = (await as(ada.id, L, `select course_price('ai-security') p`))[0].p;
check('purchase grants exam access', price.has_access === true, price);
price = (await as(ada.id, L, `select course_price('ai-prompt-engineer') p`))[0].p;
check('later purchases are 20% off (€1.99 → €1.59)', price.price_cents === 159 && price.discounted && !price.has_access, price);
price = (await as(ada.id, L, `select course_price('ai-marketing') p`))[0].p;
check('later purchases are 20% off (€4.99 → €3.99)', price.price_cents === 399 && price.discounted, price);
r = await as(ada.id, L, 'select stripe_session_id from purchases');
check('learner sees own purchases', r.length === 1 && r[0].stripe_session_id === 'cs_test_1', r);
r = await as(null, 'anon', 'select * from purchases');
check('anonymous users cannot read purchases', Array.isArray(r) && r.length === 0, r);
r = (await as(ada.id, L, `select submit_exam('ai-security', 9, 15) r`))[0].r;
check('failing score issues no certificate', r.passed === false && r.certificate === null, r);
const pass = (await as(ada.id, L, `select submit_exam('ai-security', 12, 15) r`))[0].r;
check('passing score issues a certificate', pass.passed && /^TC-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(pass.certificate?.cred_id) && pass.certificate.score === 80, pass);
const again = (await as(ada.id, L, `select submit_exam('ai-security', 15, 15) r`))[0].r;
check('retake returns the same certificate', again.certificate.cred_id === pass.certificate.cred_id, again);

r = await as(ada.id, L, `insert into certificates (cred_id,email,holder_name,course_id,method) values ('TC-FAKE-FAKE','ada@example.com','Ada','ai-prompt-engineer','admin')`);
check('learner cannot insert certificates directly', isError(r, 'row-level security'), r);
r = await as(ada.id, L, 'select cred_id from certificates');
check('learner sees only own certificates', r.length === 1 && r[0].cred_id === pass.certificate.cred_id, r);
r = await as(ada.id, L, `select admin_issue_certificate('x@y.com','X Y','ai-security')`);
check('learner cannot admin-issue', isError(r, 'Admins only'), r);
r = await as(ada.id, L, `update certificates set revoked = true where cred_id = 'TC-FMDD-AWYL' returning cred_id`);
check('learner cannot revoke others’ certificates', Array.isArray(r) && r.length === 0, r);
r = await as(ada.id, L, 'select email from profiles');
check('learner sees only own profile', r.length === 1, r);

r = await as(null, 'anon', `select * from verify_certificate(' tc-fmdd-awyl ')`);
check('public verification works (case/space-insensitive)', r.length === 1 && r[0].holder_name === 'Amirhossein Akbari' && !('email' in r[0]), r);
r = await as(null, 'anon', `select * from verify_certificate('TC-NOPE-NOPE')`);
check('unknown credential returns nothing', r.length === 0, r);
r = await as(null, 'anon', 'select * from certificates');
check('anonymous users cannot read the certificates table', Array.isArray(r) && r.length === 0, r);
r = await as(null, 'anon', `select submit_exam('ai-security', 15, 15)`);
check('anonymous users cannot submit exams', isError(r, 'permission denied'), r);

r = await as(amir.id, L, `select * from admin_issue_certificate('New.Person@x.com','New Person','ai-prompt-engineer')`);
check('admin can issue a certificate', r[0]?.method === 'admin' && r[0]?.email === 'new.person@x.com', r);
r = await as(amir.id, L, 'select count(*)::int n from certificates');
check('admin sees all certificates', r[0].n === 6, r);
r = await as(amir.id, L, `update certificates set revoked = true where cred_id = $1 returning revoked`, [pass.certificate.cred_id]);
check('admin can revoke', r[0]?.revoked === true, r);
r = await as(null, 'anon', `select revoked from verify_certificate($1)`, [pass.certificate.cred_id]);
check('verification reports revocation', r[0]?.revoked === true, r);

const [np] = (await db.query(`insert into auth.users (email) values ('new.person@x.com') returning id`)).rows;
r = (await db.query('select cred_id from certificates where user_id=$1', [np.id])).rows;
check('late sign-up receives admin-issued certificate', r.length === 1, r);
// refunded purchases no longer grant access or the discount
const [bob] = (await db.query(`insert into auth.users (email) values ('bob@example.com') returning id`)).rows;
for (let i = 0; i < 8; i++) await as(bob.id, L, `insert into lesson_progress (course_id, lesson_id) values ('ai-marketing', 'l${i}')`);
await db.query(`insert into purchases (user_id, course_id, stripe_session_id, stripe_payment_intent, amount_cents, currency, status) values ($1, 'ai-marketing', 'cs_test_2', 'pi_2', 499, 'eur', 'refunded')`, [bob.id]);
r = await as(bob.id, L, `select submit_exam('ai-marketing', 15, 15)`);
check('refunded purchase does not grant exam access', isError(r, 'Purchase the exam'), r);
price = (await as(bob.id, L, `select course_price('ai-seo-geo') p`))[0].p;
check('refunded purchase does not earn the discount', price.price_cents === 499 && !price.discounted, price);

// admins bypass the paywall
for (let i = 0; i < 8; i++) await as(amir.id, L, `insert into lesson_progress (course_id, lesson_id) values ('ai-marketing', 'l${i}')`);
r = (await as(amir.id, L, `select submit_exam('ai-marketing', 12, 15) r`))[0]?.r;
check('admins take exams without purchasing', r?.passed === true, r);
// --- email verification (password accounts verify later via an emailed link)
const pw = { amr: [{ method: 'password', timestamp: 1 }] };
const link = { amr: [{ method: 'otp', timestamp: 2 }] };
const [carol] = (await db.query(`insert into auth.users (email, encrypted_password) values ('carol@example.com', '$2a$hash') returning id`)).rows;
await db.exec(fs.readFileSync(root + '20261010000000_email_verification.sql', 'utf8'));
r = (await db.query('select id, email_verified_at is not null v from profiles where id = any($1)', [[ada.id, carol.id]])).rows;
check('backfill verifies link-only accounts, not password accounts', r.find(x => x.id === ada.id)?.v === true && r.find(x => x.id === carol.id)?.v === false, r);
r = (await as(carol.id, L, 'select mark_email_verified() v', [], pw))[0];
check('password sign-in does not verify the email', r?.v === false, r);
r = await as(carol.id, L, `update profiles set email_verified_at = now() where id = '${carol.id}' returning id`, [], pw);
check('learner cannot mark own email verified directly', Array.isArray(r) && r.length === 0, r);
r = (await as(carol.id, L, 'select mark_email_verified() v', [], link))[0];
check('emailed-link sign-in verifies the email', r?.v === true, r);
r = (await as(carol.id, L, 'select mark_email_verified() v', [], pw))[0];
check('verification sticks on later password sign-ins', r?.v === true, r);
r = await as(null, 'anon', 'select mark_email_verified()');
check('anonymous users cannot call mark_email_verified', isError(r, 'permission denied'), r);

r = await db.exec(fs.readFileSync(root + '20261009000000_stripe_paywall.sql', 'utf8')).then(() => 'ok', e => e.message);
check('paywall migration is idempotent', r === 'ok', r);

r = await db.exec(fs.readFileSync(root + '20260930000001_seed.sql', 'utf8')).then(() => 'ok', e => e.message);
check('seed migration is idempotent', r === 'ok', r);

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
