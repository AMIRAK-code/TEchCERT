# techCert

techCert is an online certification platform for practical AI skills, run by techCert365 Academy, part of assist365. Learners work through short, hands-on courses, pass a timed exam, and receive a certificate that anyone can verify online.

Live site: https://techcert.assist365.app

## What the platform offers

Most AI courses stop at reading and watching. techCert courses are built around doing. Every lesson contains interactive exercises that run in the browser: learners tune sampling settings and watch the output change, attack and defend a simulated chatbot, design an agent's permissions, assemble a retrieval pipeline, or audit a robots.txt file. A lesson only counts as complete once its activities are done, so a certificate reflects practice, not just attendance.

### Certifications

| Certification | What it covers |
| --- | --- |
| AI Prompt Engineer | How large language models process text, sampling settings, prompt structure, few-shot and chain-of-thought prompting, structured output, retrieval-augmented generation, and evaluating prompts before they ship. |
| AI Security Professional | The OWASP Top 10 for LLM applications, direct and indirect prompt injection, excessive agency in AI agents, data poisoning, model extraction and inference attacks, secure code review, and incident response. |
| AI Marketing Specialist | Using generative AI across the marketing funnel: audience research grounded in evidence, brand voice and briefs, content production, experimentation and A/B testing, and responsible use. |
| AI SEO & GEO Specialist | Search fundamentals in an era of AI answers: technical SEO and Core Web Vitals, helpful content and E-E-A-T, search intent, structured data, generative engine optimization, AI crawlers and llms.txt, and measuring visibility. |

Each certification has eight lessons grouped into modules.

### How learners get certified

1. **Learn.** All lessons are free. Progress is saved to the learner's account and syncs across devices.
2. **Unlock the exam.** When every lesson is complete, the learner can purchase the exam and certificate for that course. The AI Prompt Engineer certification is offered at an introductory price; returning learners receive a discount on every further certification.
3. **Pass the exam.** Fifteen questions are drawn at random from the course's question bank, with a 25-minute time limit and a pass mark of 70 percent. Retakes are included.
4. **Share the certificate.** The certificate shows the holder's name, the certification, the date and a unique credential ID. It can be saved as a PDF, added to LinkedIn in one click, and shared through a verification link.

### Verification

Every certificate carries a credential ID such as `TC-XXXX-XXXX`. Anyone, including employers and clients, can enter that ID at [techcert.assist365.app/verify](https://techcert.assist365.app/verify) to confirm that the certificate is genuine, who holds it, and whether it is still valid. Certificates can be revoked by the academy, and a revoked credential is reported as such.

### Accounts and payments

Learners sign up with an email address and password and can start immediately. Before their first purchase they confirm their email through a one-time link, which protects their payment and certificate. Payments are handled by Stripe Checkout; card details never reach techCert. Prices include VAT.

## Technical overview

The front end is a single-page React application built with Vite and served from a Cloudflare Worker. The back end is Supabase: Postgres for data, Supabase Auth for accounts, and Edge Functions for sign-up and payments. Transactional email is sent through Brevo from `no-reply@assist365.app`.

| Layer | Technology |
| --- | --- |
| Front end | React 19, React Router, Vite |
| Hosting | Cloudflare Workers (static assets), custom domain `techcert.assist365.app` |
| Database and auth | Supabase (Postgres with row-level security, Supabase Auth), region eu-central-1 |
| Server logic | Postgres functions (exam submission, pricing, verification) and Supabase Edge Functions (`sign-up`, `create-checkout`, `stripe-webhook`) |
| Payments | Stripe Checkout with signed webhooks |
| Email | Brevo SMTP relay, authenticated sending domain `assist365.app` |
| Deployment | `npm run deploy` from a local machine (Vite build, then `wrangler deploy`); GitHub is the backup, with checks on every push |

### How the data is protected

- Row-level security is enabled on every table. Learners can read only their own progress, attempts, purchases and certificates.
- Certificates cannot be written from the browser. They are issued by the `submit_exam` database function, which checks lesson completion, exam size, the pass mark and payment, or by an administrator.
- Prices are computed in one place on the server (`price_for`), and only the Stripe webhook, verified by its signature, can record a purchase.
- Email verification is set by the server only when the session was opened through an emailed link, so the browser cannot fake it.
- `npm run test:db` runs the migrations against an in-memory Postgres and checks these rules. Run it before every deploy; GitHub also runs it on every push.

### Run modes

| | Local mode (no environment variables) | Cloud mode (Supabase configured) |
| --- | --- | --- |
| Accounts | Name and email, no verification | Email and password through Supabase Auth |
| Progress | Stored in the browser | Stored in Postgres, synced across devices |
| Certificates | Issued in the browser | Issued by the server after its checks |
| Payments | None | Stripe Checkout |

Local mode is for development and demonstrations only.

## Development

```bash
npm install
npm run dev          # http://localhost:5173, local mode unless .env has Supabase keys
npm run check        # lint and production build
npm run test:db      # database security checks (in-memory Postgres, no network)
```

To work against the real back end, copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Supabase, Project Settings, API. The publishable key is public by design; the row-level-security policies are what protect the data. Note that this points the development server at the production database.

### Project structure

```
src/
  config.js             brand, issuer name, credential prefix, environment variables
  data/                 course content, exam question banks, staff certificate registry
  components/           shared UI, including Logo and CertificateCard
  components/blocks/    interactive activities and labs
  pages/                Home, Course, Lesson, Exam, Certificate, Verify, Dashboard, Admin
  store/AppStore.jsx    application state, switches between local and cloud mode
  lib/supabase.js       Supabase client and all database calls
supabase/
  migrations/           schema, row-level security, database functions, seed data
  functions/            Edge Functions: sign-up, create-checkout, stripe-webhook
  templates/            branded authentication emails
scripts/test-db.mjs     database security test suite
```

### Adding a course

Courses are data. Add a file in `src/data/`, register it in `src/data/courses.js`, and add a matching row to the `courses` table in a new migration (lesson count, exam size, pass mark and price). The server enforces the values in the table, so keep both in sync.

## Deployment

The site is deployed from a local machine, not from GitHub. On a machine logged in to Cloudflare with `npx wrangler login`, run:

```bash
npm run check        # lint and build
npm run test:db      # database security checks
npm run deploy       # build and publish to techcert.assist365.app
```

`npm run deploy` builds with the values in your local `.env`, so check that it points at production first.

GitHub holds the version-controlled backup of the code. The Checks workflow in `.github/workflows/deploy.yml` runs the linter, the database tests and a build on every push to `main`, but it never deploys.

Database changes go in a new timestamped file in `supabase/migrations/`; never edit a migration that has already been applied. Edge Function secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) are set in Supabase and never committed to the repository.

## Known limitations

- Exam questions and answers are currently shipped to the browser, and the browser reports the score to the server. The server validates everything else, but a technical user could submit a fabricated score. Moving the question bank and grading to the server is the top item in [HANDOFF.md](HANDOFF.md).
- Lesson completion is recorded by the client and trusted by the server.

See [HANDOFF.md](HANDOFF.md) for the full list of open work.
