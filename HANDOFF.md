# techCert — Handoff

**From:** Amirhossein Akbari · **To:** Faraz Haghgoo · **Date:** 30 Sep 2026

techCert is live at **https://techcert.assist365.app** but is **not ready for mass marketing**. This document is the work list to get it there. Tasks are ordered by priority; P0 items block launch.

Read `README.md` first for the architecture, run modes and deployment.

---

## 1. Current state

| Area | Status |
| --- | --- |
| Courses | 2 tracks (AI Prompt Engineer, AI Security Professional), 8 lessons each, 23–24 interactive activities per course |
| Exam | 15 questions drawn from a 20-question bank, 25 min, 70% to pass |
| Auth | Supabase magic-link email |
| Database | Supabase project `techcert` (`dtcovmttntdwihzxsuvl`, Frankfurt, **free tier**) — schema + seed applied |
| Hosting | Cloudflare Worker `techcert`, custom domain `techcert.assist365.app` (does not touch the `assist365.app` apex site) |
| Admins | Amirhossein Akbari, Faraz Haghgoo — both hold both certifications (admin-issued) |
| Tests | `npm run test:db` — 23 security checks on the database rules; CI runs lint + build + these tests |

### Verified working
- Live site, deep links, HTTPS, security headers.
- Public certificate verification against the database (`/verify?id=TC-FMDD-AWYL`).
- Row-level security: learners see only their own data; nobody can insert certificates directly; anonymous users cannot submit exams.

### Not verified
- The end-to-end magic-link sign-in on the live domain (depends on task **T1**).

---

## 2. Access you need

Ask Amir for each of these (they must be granted from his accounts):

- [ ] **GitHub** — collaborator on `AMIRAK-code/TEchCERT` with write access.
- [ ] **Supabase** — member of organization *AMIRAK-code's Org* (Dashboard → Organization → Team → Invite).
- [ ] **Cloudflare** — member of the account that owns `assist365.app`, with Workers permissions (Manage Account → Members). Then run `npx wrangler login` on your machine.
- [ ] **`.env`** — create from `.env.example`. Values are in Supabase → Project Settings → API (Project URL and the *publishable* key). These are public by design; never commit the `service_role` / secret key.

Setup:
```bash
npm install
npm run dev        # http://localhost:5173 (uses the live Supabase project if .env is filled)
npm run check      # lint + build
npm run test:db    # database security checks (no network needed)
npm run deploy     # build + deploy to techcert.assist365.app
```

> ⚠️ `npm run dev` with `.env` filled talks to the **production** database. For risky database work, create a Supabase branch or a separate dev project first.

---

## 3. Tasks

### In progress (Oct 2026)

- **AI Marketing Specialist** course — done and live (`src/data/aiMarketing.js`, new `abTest` lab in `src/components/blocks/MarketingLabs.jsx`).
- **AI SEO & GEO Specialist** course — written (`src/data/aiSeoGeo.js`, uses the `geoLab` simulator; 8 lessons, 20-question bank, examSize 15, matching the `courses` row). Goes live with the next deploy.
- **Accounts: email + password, verify after purchase** — done (Oct 2026). Sign-up logs in immediately, no confirmation email. After a learner pays, a warning (dashboard, exam page, exam result) asks them to verify their email and says that otherwise their payment and certificate might be lost; "Send verification link" emails a one-time sign-in link. Opening it calls `mark_email_verified()`, which sets `profiles.email_verified_at` only if the session's JWT `amr` shows an emailed link/code — the browser cannot fake it. Also: "Forgot password?" (reset link → choose a new password) and "Email me a sign-in link instead". Migration `20261010000000_email_verification.sql` (applied to production).
  - **Supabase setting required (Amir):** Authentication → Sign In / Providers → Email → turn **Confirm email OFF**. While it is on, sign-up shows "check your inbox" instead of logging in. Links in emails need T1 (redirect URLs) and, at volume, T2 (SMTP).
- **Stripe paywall** — built, not yet live. Decisions (Amir, Oct 2026): lessons are free; **the exam + certificate** are paid per course — AI Prompt Engineer **€1.99**, every other course **€4.99**, VAT-inclusive via **Stripe Tax**; after a first paid purchase **every later purchase is 20% off** (€1.59 / €3.99). Admins and holders of a valid certificate (including admin-issued ones) bypass the paywall; a fully refunded purchase removes access and the discount.
  - DB: `supabase/migrations/20261009000000_stripe_paywall.sql` — `courses.price_cents`, `purchases` table (RLS: read own; only the service role writes), `price_for()` (service role only — the one place prices are computed), `course_price()` (public wrapper for the UI), `has_exam_access()`, and `submit_exam` now rejects unpaid attempts. 15 new checks in `npm run test:db`.
  - Edge Functions (`supabase/functions/`, both `verify_jwt = false` and authorized in code): `create-checkout` (checks the user's token, charges `price_for()`, Stripe Checkout with automatic tax) and `stripe-webhook` (verifies the Stripe signature; records `checkout.session.completed` / `async_payment_succeeded`; marks full refunds from `charge.refunded`).
  - UI: price on the course page; buy button on the exam page; after returning from Stripe the page waits for the webhook. Local mode has no paywall.
  - **Go-live steps, in order (test mode first):**
    1. Stripe (test mode): Settings → Tax → add head-office address, turn on Stripe Tax, register for EU OSS when going live. Developers → Webhooks → add endpoint `https://dtcovmttntdwihzxsuvl.supabase.co/functions/v1/stripe-webhook` with events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`; copy its signing secret.
    2. Supabase → Edge Functions → Secrets: `STRIPE_SECRET_KEY` (sk_test_…), `STRIPE_WEBHOOK_SECRET` (whsec_…). Optional: `SITE_URL`, `STRIPE_AUTOMATIC_TAX=false` to test before Stripe Tax is set up. **Never put Stripe secret keys in `.env`, the repo or GitHub.**
    3. Apply the migration and deploy both functions (Supabase connector, or `supabase db push` + `supabase functions deploy`).
    4. Merge to `main` → the Deploy workflow ships the site (needs T13 secrets). Until the new site is live, the old site still shows "Start exam" but its submission will be rejected for unpaid learners, so do steps 3 and 4 together.
    5. Test with card 4242 4242 4242 4242: buy a course → exam unlocks; buy a second → 20% off; refund in Stripe → access removed.
    6. Switch to live keys (new webhook endpoint + secret in live mode).

Legend — **Owner:** *Amir* = needs account-owner action, *Faraz* = code.

### P0 — launch blockers

#### T1 · Configure Supabase auth redirect URLs — *Amir* (or Faraz once invited)
Magic links fail on the live domain until this is set.
- Supabase → Authentication → URL Configuration
- **Site URL:** `https://techcert.assist365.app`
- **Redirect URLs:** `https://techcert.assist365.app/**`, `http://localhost:5173/**`

**Done when:** signing in on the live site with a real email lands you back on techcert.assist365.app, signed in.

#### T2 · Custom SMTP for sign-in emails — *Amir*
Supabase's built-in sender allows only a handful of emails per hour; a campaign would stall at the first few sign-ups.
- Pick a provider (Resend, Postmark, SendGrid, Amazon SES). Verify a sending domain, e.g. `mail.assist365.app` (SPF/DKIM records go in Cloudflare DNS).
- Supabase → Authentication → Emails → SMTP settings. Raise the auth rate limit afterwards (Authentication → Rate Limits).
- Brand the magic-link email template (subject, sender name "techCert").

**Done when:** 20 sign-ups in 10 minutes all receive their links; emails don't land in spam (check Gmail + Outlook).

#### T3 · Keep learner progress before sign-in — *Faraz*
In cloud mode, a signed-out learner's lesson progress lives only in React state: it is lost on refresh and on the magic-link redirect. This loses exactly the try-before-signup visitors marketing brings in.
- `src/store/AppStore.jsx`: `loadLocal()` returns `emptyState` in cloud mode and the localStorage effect is skipped. Persist **guest** progress to localStorage (e.g. key `techcert:guest`) when `state.user` is null.
- On `SIGNED_IN`, upsert the guest `completed` lessons into `lesson_progress` (`saveLesson` in `src/lib/supabase.js`, or a single bulk upsert), then clear the guest key and reload the account.
- Merge rule: union of guest + server lessons.

**Done when:** complete 3 lessons signed out → refresh (still 3) → sign in via email link → dashboard shows 3 lessons, and they are in the `lesson_progress` table.

#### T4 · Grade exams on the server — *Faraz* (largest task)
Today the question bank **with answers** ships in the JS bundle (`src/data/*.js`, `examQuestions`) and the browser reports its own score to `submit_exam(course, score, total)`. The server validates lesson completion, exam size and pass mark, but anyone who opens DevTools can submit 15/15. At scale someone will publish a script, and forgeable certificates destroy the brand.

Suggested design (pure SQL, no Edge Function needed):
1. New migration: table `exam_questions (id, course_id, question, options jsonb, answer int, explanation)`; seed it from the current banks (write a small script to generate the SQL). RLS enabled with **no** select policy.
2. Table `exam_sessions (id uuid, user_id, course_id, question_ids int[], option_orders jsonb, started_at, submitted_at)`.
3. RPC `start_exam(p_course_id)` → checks lessons are complete and attempt limits (T11), picks `exam_size` random questions, shuffles options, stores the session, returns questions **without answers**.
4. RPC `submit_exam(p_session_id, p_answers int[])` → rejects if already submitted or past `started_at + exam_minutes (+ grace)`, grades server-side, records the attempt, issues the certificate, returns score + per-question review (correct option + explanation).
5. `revoke execute` on the old `submit_exam(text, int, int)` (then drop it once the new client is deployed).
6. Client: `src/pages/Exam.jsx` fetches questions from `start_exam`; delete `examQuestions` from `src/data/*.js`, keeping local mode working either via a separate dev-only bank or by disabling the exam in local mode.
7. Add checks to `scripts/test-db.mjs`: answers not selectable by learners, late submission rejected, double submit rejected, forged answers array length rejected.

**Done when:** searching the production JS bundle for any exam answer text finds nothing, and all new DB checks pass.

#### T5 · Privacy policy, terms and data rights — *Faraz* drafts, *Amir* gets legal review
The site collects names and emails from EU residents (GDPR).
- Pages: `/privacy` and `/terms`, linked in the footer and from the sign-in modal ("By continuing you agree to…").
- Content: data controller (company name/address), what is stored (name, email, progress, attempts, certificates), purpose, retention, processors (Supabase — EU region; Cloudflare; the SMTP provider), user rights, contact email.
- **Right to erasure:** RPC `delete_my_account()` (security definer, deletes the auth user; cascades profile/progress/attempts; decide whether certificates are deleted or anonymised) + a button on the dashboard.
- Only strictly necessary storage is used today (auth session, progress), so no cookie banner is needed **unless** analytics with cookies are added (see T9).

**Done when:** pages are live and reviewed; a test account can delete itself and its rows are gone.

#### T6 · Upgrade Supabase to Pro — *Amir*
Free projects pause after ~1 week of inactivity (site goes down) and have no daily backups. Pro is $25/month per organization. Do this before launch day.

### P1 — before or right after launch

#### T7 · Grow the question banks to 60+ per course — *Faraz* (+ subject review)
20 questions with 15 drawn per exam means candidates see 75% of the bank each attempt; it will circulate within days. Target ≥ 60 per course, balanced across all lessons, with explanations. Put them straight into `exam_questions` if T4 is done.

#### T8 · Social previews & SEO — *Faraz*
- `index.html`: Open Graph + Twitter tags (`og:title`, `og:description`, `og:image` 1200×630, `og:url`), canonical URL.
- Per-route titles (e.g. `document.title` per page).
- `public/robots.txt` and `public/sitemap.xml` (home, two course pages, verify).
- Verification pages (`/verify?id=…`) are what people share on LinkedIn — make sure they preview well.

#### T9 · Analytics & error tracking — *Faraz*
- **Cloudflare Web Analytics** (cookie-less, no banner needed): enable for the Worker/zone.
- Conversion events worth tracking: course started, lesson completed, exam started/passed/failed, certificate shared.
- **Error tracking:** Sentry (or similar) for front-end errors; wire the existing `console.error` calls in `src/lib/supabase.js`.

#### T10 · Copy fixes — *Faraz*
- `src/pages/Home.jsx` hero says "proctored-style exam" — it is not proctored. Replace with "timed exam".
- Review all marketing copy for claims we can't back (e.g. "globally recognized").

#### T11 · Exam attempt limits — *Faraz*
Enforce server-side (in `start_exam`, T4): e.g. max 3 attempts per course per 24 h. Show the remaining attempts / cooldown on the exam intro screen.

### P2 — later

#### T12 · More courses — *Faraz*
Courses are data: add a file in `src/data/`, register it in `src/data/courses.js`, add a row to the `courses` table (pass mark, lesson count, exam size), and questions (T4). Block types are listed in the README.

#### T13 · Automatic deploys — *Amir* (secrets only; workflow done)
`.github/workflows/deploy.yml` lints, tests, builds and runs `wrangler deploy` on every push to `main`. One-time setup in GitHub → Settings → Secrets and variables → Actions:
- **Secrets:** `CLOUDFLARE_API_TOKEN` (Cloudflare → My Profile → API Tokens → template "Edit Cloudflare Workers", scoped to the account) and `CLOUDFLARE_ACCOUNT_ID`.
- **Variables:** `VITE_SUPABASE_URL` = `https://dtcovmttntdwihzxsuvl.supabase.co`, `VITE_SUPABASE_ANON_KEY` = the publishable key (`sb_publishable_…`, public by design).

The workflow fails early if the variables are missing, so it never ships a local-mode build.

#### T14 · Accessibility audit — *Faraz*
WCAG 2.1 AA pass: keyboard-only walkthrough of every activity type (matching, sorting and the sliders especially), screen-reader labels on range inputs, focus management in the sign-in modal, colour contrast in dark mode.

#### T15 · Tidy-ups — *Faraz*
- Local mode grants admin to anyone typing a staff email. Either hide `/admin` when `MODE === 'local'` or show a clear "demo" banner.
- `vercel.json` is unused now that we host on Cloudflare — delete it unless Vercel is kept as a fallback.
- `profiles` has no update policy, so users can't fix a typo in their name (which is printed on certificates). Add an RPC `update_my_name(text)` that updates `profiles.full_name` (and not `role`), and decide whether existing certificates are re-issued.

#### T16 · Split the JavaScript bundle — *Faraz*
The production bundle is ~630 KB (187 KB gzipped) in one file, mostly the Supabase client plus all course content. Lazy-load pages with `React.lazy` (Lesson, Exam, Admin) and course data per course, so the home page loads a fraction of it. Target: first-load JS under 200 KB (gzip under ~70 KB).

---

## 4. Things to know

- **Course rules live in two places:** `src/data/*.js` (UI) and the `courses` table (enforced by the server). Change both.
- **Admin certificates** are pinned in `src/data/registry.js` and in the seed migration with identical IDs (TC-FMDD-AWYL, TC-5RZJ-LG5J, TC-NERP-6NUB, TC-SC7C-EZBE). They verify even if the database is down.
- **Database changes:** add a new timestamped file in `supabase/migrations/` (never edit an applied one), run `npm run test:db`, then apply it to the project (SQL editor, `supabase db push`, or the Supabase MCP `apply_migration`).
- **Staff/admins:** add a row to `staff_allowlist`; the role is granted on first sign-in. For existing accounts, also update `profiles.role`.
- **Deploying** rebuilds with your local `.env` — double-check it points at production before `npm run deploy`.
