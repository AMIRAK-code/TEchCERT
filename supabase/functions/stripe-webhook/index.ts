// Receives Stripe events, verifies their signature and records purchases.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY       sk_test_… / sk_live_…
//   STRIPE_WEBHOOK_SECRET   whsec_… (from the webhook endpoint in the Stripe dashboard)
// Stripe endpoint URL: https://<project-ref>.supabase.co/functions/v1/stripe-webhook
// Events: checkout.session.completed, checkout.session.async_payment_succeeded, charge.refunded
// Deploy with verify_jwt = false: Stripe does not send a Supabase JWT; the signature is the auth.
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { httpClient: Stripe.createFetchHttpClient() });
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const secretKey = (() => {
  const keys = Deno.env.get('SUPABASE_SECRET_KEYS');
  return keys ? JSON.parse(keys).default : Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
})();
const admin = createClient(Deno.env.get('SUPABASE_URL')!, secretKey!, { auth: { persistSession: false } });

async function recordPurchase(session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid') return; // async methods complete later
  const { user_id, course_id, discounted } = session.metadata ?? {};
  if (!user_id || !course_id) throw new Error(`Session ${session.id} has no user/course metadata`);
  const { error } = await admin.from('purchases').upsert(
    {
      user_id,
      course_id,
      stripe_session_id: session.id,
      stripe_payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
      amount_cents: session.amount_total ?? 0,
      currency: session.currency ?? 'eur',
      discounted: discounted === 'true',
    },
    { onConflict: 'stripe_session_id', ignoreDuplicates: true },
  );
  if (error) throw error;
}

Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const signature = req.headers.get('Stripe-Signature');
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature ?? '', Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '', undefined, cryptoProvider);
  } catch (err) {
    console.warn('stripe-webhook: bad signature', (err as Error).message);
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        await recordPurchase(event.data.object);
        break;
      case 'charge.refunded': {
        const charge = event.data.object;
        const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
        // Only a full refund removes access.
        if (pi && charge.refunded) {
          const { error } = await admin.from('purchases').update({ status: 'refunded' }).eq('stripe_payment_intent', pi);
          if (error) throw error;
        }
        break;
      }
    }
  } catch (err) {
    // 500 makes Stripe retry the event later.
    console.error('stripe-webhook', event.type, event.id, err);
    return new Response('Webhook handler failed', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
});
