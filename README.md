# techCert

Interactive technical certification courses — React + Vite, with optional Supabase backend.

**Live:** https://techcert.assist365.app · Cloudflare Worker `techcert` · Supabase project `techcert` (`dtcovmttntdwihzxsuvl`, eu-central-1). Redeploy with `npm run deploy`.

**Open work:** see [HANDOFF.md](HANDOFF.md) for the prioritized task list before launch.

## Certifications

| Course | Lessons | Highlights |
| --- | --- | --- |
| **AI Prompt Engineer** | 8 lessons / 3 modules | Tokenizer playground, temperature & top-p sampler, prompt builder, few-shot simulator, chain-of-thought experiment, RAG pipeline, evaluation scenario |
| **AI Security Professional** | 8 lessons / 4 modules | Prompt-injection attack lab, agent-permission design, data-poisoning simulator, model-extraction simulator, secure-code reviews, incident response |

Each lesson has required hands-on activities; the exam unlocks when every lesson is complete. Exam: 15 questions from a 20-question bank, shuffled, 25-minute timer, 70% to pass.

## Two run modes

| | **Local mode** (no env vars) | **Cloud mode** (Supabase configured) |
| --- | --- | --- |
| Sign-in | Name + email, no verification | Email magic link (Supabase Auth) |
| Progress & attempts | This browser's localStorage | Postgres, synced across devices |
| Certificate issuing | In the browser | `submit_exam()` on the server checks lessons completed, exam size and pass mark |
| Verification | Built-in registry + link self-check | Database lookup via `verify_certificate()` — works for every certificate, anywhere |
| Admin role | Anyone who types a staff email (**not secure**) | Granted by the database from `staff_allowlist` |

Use local mode for development and demos only. Deploy with Supabase.

## Internal admins & pre-issued certificates

Staff are defined in `src/data/registry.js` and `supabase/migrations/20260930000001_seed.sql`:

| Name | Email | Role |
| --- | --- | --- |
| Amirhossein Akbari | amir.akbari@inrebus.it | admin |
| Faraz Haghgoo | faraz.haghgoo@inrebus.it | admin |

Each holds both certifications (admin-issued, 30 Sep 2026):

| Credential ID | Holder | Certification |
| --- | --- | --- |
| TC-FMDD-AWYL | Amirhossein Akbari | AI Prompt Engineer |
| TC-5RZJ-LG5J | Amirhossein Akbari | AI Security Professional |
| TC-NERP-6NUB | Faraz Haghgoo | AI Prompt Engineer |
| TC-SC7C-EZBE | Faraz Haghgoo | AI Security Professional |

Verify at `/verify?id=<credential ID>`. Admins get an **Admin** page (`/admin`) listing staff and certificates; in cloud mode they can also issue and revoke certificates there.

## Development

```bash
npm install
npm run dev          # local mode unless .env has Supabase keys
npm run check        # lint + production build
npm run test:db      # database security checks (in-memory Postgres)
```

## Supabase setup

1. Create a project at supabase.com.
2. Apply the migrations — either paste both files from `supabase/migrations/` (in order) into the SQL editor, or with the CLI:
   ```bash
   npx supabase init        # once, creates supabase/config.toml
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
3. **Authentication → URL Configuration**: set *Site URL* to your production URL and add it (plus `http://localhost:5173`) to *Redirect URLs*. Magic links only redirect to listed URLs.
4. Copy `.env.example` to `.env` and fill in *Project URL* and *anon public key* from **Project Settings → API**.
5. For production email volume, configure custom SMTP (**Authentication → Emails**); Supabase's built-in sender is rate-limited.

Staff become admins automatically the first time they sign in with their allowlisted email. To add an admin later, insert into `staff_allowlist` (and, if they already have an account, update their `profiles.role`).

If you change a course's pass mark, lesson count or exam size in `src/data/*.js`, update the `courses` table too — the server enforces those values.

## Deployment

The app is a static SPA; any static host works.

**Cloudflare (recommended if your domain is on Cloudflare)** — config in `wrangler.jsonc`, headers in `public/_headers`:

```bash
npx wrangler login      # once, opens the browser
npm run deploy          # builds and uploads to https://techcert.<your-subdomain>.workers.dev
```

Then in the Cloudflare dashboard: **Workers & Pages → techcert → Settings → Domains & Routes → Add → Custom domain**, and enter your domain (repeat for `www` if you want it). DNS and HTTPS are set up automatically.

**Vercel** (config in `vercel.json`): import the repo and add the env vars under *Settings → Environment Variables*.

`VITE_*` variables are baked in at build time. With `npm run deploy` the build runs on your machine, so they come from your local `.env`; redeploy after changing them. The anon key is public by design; the row-level-security policies in the migration are what protect the data.

After adding a custom domain, add it to Supabase **Authentication → URL Configuration** (Site URL and Redirect URLs), or magic-link sign-in will not redirect back to it.

## Project structure

```
src/
  config.js             brand name, credential prefix, env vars
  data/                 course content, exam banks, staff & certificate registry
  components/blocks/    interactive activities (exercises, prompt labs, security labs)
  pages/                Home, Course, Lesson, Exam, Certificate, Verify, Dashboard, Admin
  store/AppStore.jsx    app state; switches between local and cloud mode
  lib/supabase.js       Supabase client and all database calls
supabase/migrations/    schema, RLS policies, RPCs, seed data
```

## Known limitations

- Exam questions and answers ship in the JavaScript bundle, and the browser reports the score to `submit_exam()`. The server validates lesson completion, exam size and pass mark, but a technical user could still submit a fabricated score. For high-stakes certification, move the question bank and grading into a Supabase Edge Function.
- Lesson completion is recorded by the client; the server trusts it.
