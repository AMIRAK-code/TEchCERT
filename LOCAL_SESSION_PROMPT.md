# Prompt for a local Claude Code session — finish techCert launch setup

Run on your own computer, in a clone of the repo:

```bash
git clone https://github.com/AMIRAK-code/TEchCERT && cd TEchCERT   # or: cd TEchCERT && git pull origin main
claude "$(cat LOCAL_SESSION_PROMPT.md)"
```

Have these ready (the session will ask for them; it must never print, log or commit them — use them only through environment variables):

| Variable | Where to get it |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | supabase.com → Account → Access Tokens → Generate |
| `BREVO_API_KEY` | Brevo → SMTP & API → API Keys → Generate |
| `BREVO_SMTP_KEY` | Brevo → SMTP & API → SMTP → Generate a new SMTP key |
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → Create: permissions **Zone · DNS · Edit** (zone `assist365.app`) **and** **Account · Workers Scripts · Edit** |
| `STRIPE_TEST_SECRET_KEY` | Stripe (Test mode) → Developers → API keys → Secret key `sk_test_…` |

---

## PROMPT (everything below is the instruction for Claude)

You are finishing the launch setup of **techCert**, a certification site (React + Vite on Cloudflare Workers, Supabase backend, Stripe payments). Read `HANDOFF.md` first. Work through the steps below **in order**, verify each one, and report a short checklist at the end (done / failed + why).

### Facts
- Repo: `AMIRAK-code/TEchCERT`, branch `main` (also keep `main-ittim6` in sync). Live site: `https://techcert.assist365.app` = Cloudflare Worker `techcert` (`wrangler.jsonc`, custom domain route).
- Supabase project ref: `dtcovmttntdwihzxsuvl` (eu-central-1). Public URL `https://dtcovmttntdwihzxsuvl.supabase.co`, publishable key `sb_publishable_eLcwcntuaHHUNzgat4Dy7Q_0V65CpIi` (public by design).
- Edge Functions already deployed: `sign-up`, `create-checkout`, `stripe-webhook` (source in `supabase/functions/`, all `verify_jwt = false`, see `supabase/config.toml`).
- Brevo account "assist365": SMTP relay `smtp-relay.brevo.com:587`, SMTP login `bc08bb001@smtp-brevo.com`, free plan 300 emails/day. The only sender today is a Gmail address — do **not** use it as the From address (fails DMARC).
- Email auth templates are in `supabase/templates/` (`magic-link.html`, `reset-password.html`, `confirm-signup.html`).

### Hard rules
- Never print, echo, log, or commit any secret or token. Read them from environment variables; if one is missing, ask the user to export it in their shell, don't ask them to paste it into chat.
- DNS: only **add** the records Brevo needs on `assist365.app`. Never change or delete existing records, the apex `assist365.app` site, or the `techcert` record. If a `_dmarc` TXT record already exists, leave it.
- Stripe stays in **test mode**. Don't touch live keys. Remind the user to roll the old live restricted key `rk_live_51UM3…` in the Stripe dashboard (it leaked into function logs earlier).
- Commit with clear messages; push to `main` and `main-ittim6`.

### Step 1 — Deploy the newest version to Cloudflare
1. `git pull origin main`, `npm ci`, `npm run lint`, `npm run test:db`, all must pass.
2. Create `.env` (gitignored) with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (values above).
3. `npm run deploy` (uses `CLOUDFLARE_API_TOKEN` if set, otherwise `npx wrangler login` first).
4. Verify: `curl -s https://techcert.assist365.app | grep -o 'assets/index-[^"]*\.js'` matches the hash in `dist/index.html`.
5. Make GitHub auto-deploy work: `gh secret set CLOUDFLARE_API_TOKEN` and `gh secret set CLOUDFLARE_ACCOUNT_ID` (account id from `npx wrangler whoami`), both read from env/stdin, never on the command line. Re-run the "Deploy" workflow (`gh workflow run deploy.yml --ref main`) and confirm it succeeds.

### Step 2 — Brevo sending domain
Using the Brevo API (`https://api.brevo.com/v3`, header `api-key: $BREVO_API_KEY`):
1. `POST /senders/domains` `{"name":"assist365.app"}` (if it already exists, `GET /senders/domains/assist365.app`). Note the DNS records it returns.
2. Add exactly those records to the Cloudflare zone `assist365.app` via the Cloudflare API (`/zones?name=assist365.app` → zone id → `POST /zones/{id}/dns_records`), proxied = false. Skip any record that already exists with the same name and content.
3. Wait for propagation (`dig TXT …`), then `PUT /senders/domains/assist365.app/authenticate` until it reports authenticated (retry a few times, a few minutes apart).
4. `POST /senders` `{"name":"techCert","email":"no-reply@assist365.app"}`.

### Step 3 — Supabase Auth settings (Management API)
`PATCH https://api.supabase.com/v1/projects/dtcovmttntdwihzxsuvl/config/auth` with `Authorization: Bearer $SUPABASE_ACCESS_TOKEN`. First `GET` the same URL and save the current values to a scratch file outside the repo (so they can be restored). Then set:
- `site_url`: `https://techcert.assist365.app`
- `uri_allow_list`: `https://techcert.assist365.app/**,http://localhost:5173/**`
- `mailer_autoconfirm`: `true` (sign-up needs no confirmation email; the app verifies emails before purchase itself)
- SMTP: `smtp_host` `smtp-relay.brevo.com`, `smtp_port` `"587"`, `smtp_user` `bc08bb001@smtp-brevo.com`, `smtp_pass` from `$BREVO_SMTP_KEY`, `smtp_admin_email` `no-reply@assist365.app`, `smtp_sender_name` `techCert`
- `rate_limit_email_sent`: `100`
- Templates and subjects: `mailer_subjects_magic_link` "Confirm your email for techCert", `mailer_templates_magic_link_content` = contents of `supabase/templates/magic-link.html`; `mailer_subjects_recovery` "Reset your techCert password", `mailer_templates_recovery_content` = `reset-password.html`; `mailer_subjects_confirmation` "Confirm your techCert email", `mailer_templates_confirmation_content` = `confirm-signup.html`.
Build the JSON with a script (e.g. `jq`/`node`) so the HTML is escaped correctly. `GET` again and confirm the values (except the password) stuck.

### Step 4 — Stripe in test mode
1. Create the test webhook endpoint (Stripe API or `stripe` CLI with `$STRIPE_TEST_SECRET_KEY`): URL `https://dtcovmttntdwihzxsuvl.supabase.co/functions/v1/stripe-webhook`, events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`. Capture its signing secret into an env var, don't print it.
2. Set Supabase function secrets without echoing values, e.g. write a temp env file with `umask 077` outside the repo and run `supabase secrets set --project-ref dtcovmttntdwihzxsuvl --env-file <file>`, then delete the file: `STRIPE_SECRET_KEY` = test key, `STRIPE_WEBHOOK_SECRET` = signing secret, `STRIPE_AUTOMATIC_TAX` = `false` (unless Stripe Tax is configured in test mode).

### Step 5 — End-to-end test (report each result)
Use a fresh, non-staff email (e.g. a `+test` Gmail alias the user owns; staff emails `amir.akbari@inrebus.it` / `faraz.haghgoo@inrebus.it` bypass the paywall).
1. Sign up on the live site → logged in immediately, **no** email sent.
2. Mark the 8 lessons of `ai-prompt-engineer` complete for that user (SQL via `supabase db query` / Management API `POST /v1/projects/{ref}/database/query`, insert into `lesson_progress`), then open `/exam/ai-prompt-engineer` → shows €1.99 and "Verify your email before buying".
3. Click "Send verification link" → email arrives from `no-reply@assist365.app` (inbox, not spam) → opening it signs in and the buy button appears; `profiles.email_verified_at` is set.
4. Buy with card `4242 4242 4242 4242` → returns to the site, exam unlocks; a `purchases` row exists; `create-checkout` and `stripe-webhook` logs show no errors.
5. Second course shows €4.99 crossed out → €3.99.
6. Refund the payment in Stripe (test) → `purchases.status` = `refunded`, exam locked again.
7. "Forgot password?" sends a reset email; the link lets you set a new password.
8. Run Supabase security advisors (`GET /v1/projects/{ref}/advisors/security`) and report anything new.

Finally update `HANDOFF.md` (mark T1, T2, T13 done; note test-mode Stripe), commit, push to `main` and `main-ittim6`, and give the user the checklist plus anything that still needs them (e.g. switching Stripe to live, rolling the leaked live key).
