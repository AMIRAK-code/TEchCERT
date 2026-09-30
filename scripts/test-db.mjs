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
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`);
for (const f of fs.readdirSync(root).sort()) await db.exec(fs.readFileSync(root + f, 'utf8'));
// Supabase grants table privileges to the API roles by default; RLS does the filtering.
await db.exec(`grant usage on schema public to anon, authenticated;
  grant all on all tables in schema public to anon, authenticated;
  grant all on all sequences in schema public to anon, authenticated;`);

// Run SQL as a given role/user. Returns rows, or the error message string.
const as = async (uid, role, sql, params) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid || ''}', false); set role ${role};`);
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
r = await db.exec(fs.readFileSync(root + '20260930000001_seed.sql', 'utf8')).then(() => 'ok', e => e.message);
check('seed migration is idempotent', r === 'ok', r);

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
