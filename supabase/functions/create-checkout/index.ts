// Creates a Stripe Checkout Session for a course exam + certificate.
// The price comes from public.price_for() in the database, never from the browser.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY      sk_test_… / sk_live_…   (required)
//   SITE_URL               https://techcert.assist365.app (default)
//   STRIPE_AUTOMATIC_TAX   "true" (default) — set "false" until Stripe Tax is configured
// Deploy with verify_jwt = false: the user's token is checked below with auth.getUser().
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://techcert.assist365.app';
const ALLOWED_ORIGINS = [SITE_URL, 'http://localhost:5173'];

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { httpClient: Stripe.createFetchHttpClient() });

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

  try {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: auth, error: authError } = await admin.auth.getUser(token);
    if (authError || !auth.user) return reply(401, { error: 'Sign in to buy the exam' });
    const user = auth.user;

    const { course_id } = await req.json().catch(() => ({}));
    if (typeof course_id !== 'string') return reply(400, { error: 'course_id is required' });

    const { data: price, error: priceError } = await admin.rpc('price_for', { p_user: user.id, p_course_id: course_id });
    if (priceError) return reply(400, { error: priceError.message });
    if (price.has_access) return reply(409, { error: 'You already have access to this exam' });

    // Return to the page the learner came from (production or local dev).
    const base = origin && ALLOWED_ORIGINS.includes(origin) ? origin : SITE_URL;
    const metadata = { user_id: user.id, course_id, discounted: String(price.discounted) };

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: price.currency,
            unit_amount: price.price_cents,
            tax_behavior: 'inclusive',
            product_data: {
              name: `${price.title} — exam & certificate`,
              description: price.discounted ? 'Returning-learner price (20% off)' : undefined,
              // General electronically supplied services
              tax_code: 'txcd_10000000',
            },
          },
        },
      ],
      automatic_tax: { enabled: Deno.env.get('STRIPE_AUTOMATIC_TAX') !== 'false' },
      metadata,
      payment_intent_data: { metadata },
      success_url: `${base}/exam/${encodeURIComponent(course_id)}?checkout=success`,
      cancel_url: `${base}/exam/${encodeURIComponent(course_id)}?checkout=cancel`,
    });

    return reply(200, { url: session.url });
  } catch (err) {
    console.error('create-checkout', err);
    return reply(500, { error: 'Could not start checkout. Please try again.' });
  }
});
