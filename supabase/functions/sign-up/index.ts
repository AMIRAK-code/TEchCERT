// Creates an email + password account that can sign in immediately, with no confirmation
// email — independent of the project's "Confirm email" setting. Email ownership is proven
// later, before buying (see mark_email_verified() and create-checkout).
//
// Deploy with verify_jwt = false: visitors are not signed in yet.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://techcert.assist365.app';
const ALLOWED_ORIGINS = [SITE_URL, 'http://localhost:5173'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

const secretKey = (() => {
  const keys = Deno.env.get('SUPABASE_SECRET_KEYS');
  return keys ? JSON.parse(keys).default : Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
})();
const admin = createClient(Deno.env.get('SUPABASE_URL')!, secretKey!, { auth: { persistSession: false } });

function cors(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : SITE_URL,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

Deno.serve(async req => {
  const origin = req.headers.get('Origin');
  const headers = { ...cors(origin), 'Content-Type': 'application/json' };
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) });
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' });

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (name.split(/\s+/).length < 2) return reply(400, { error: 'Please enter your full name — it will appear on your certificate.' });
  if (!EMAIL_RE.test(email) || email.length > 254) return reply(400, { error: 'Please enter a valid email address.' });
  if (password.length < MIN_PASSWORD || password.length > 72) return reply(400, { error: `Use ${MIN_PASSWORD}–72 characters for your password.` });

  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
  if (error) {
    if (/already|exists|registered/i.test(error.message)) return reply(409, { error: 'exists' });
    console.error('sign-up failed:', error.status ?? '', error.code ?? '', error.message.slice(0, 200));
    return reply(400, { error: /password/i.test(error.message) ? error.message : 'Could not create the account. Please try again.' });
  }
  return reply(200, { ok: true });
});
