export default {
  id: 'ai-marketing',
  title: 'AI Marketing Specialist',
  tagline: 'Use generative AI across the funnel — responsibly.',
  description:
    'Apply generative AI to audience research, content, personalization and campaign testing without sacrificing brand voice, accuracy or compliance.',
  icon: 'Megaphone',
  duration: '4 Hours',
  level: 'Intermediate',
  passMark: 70,
  examSize: 15,
  examMinutes: 25,
  outcomes: [
    'Decide where AI adds value in the marketing funnel — and where humans must lead',
    'Ground audience research and personas in real customer data',
    'Write content briefs that keep AI output on-brand and accurate',
    'Run an AI content pipeline with fact-checking and human review',
    'Personalize campaigns within privacy and consent rules',
    'Test AI-generated variants with sound statistics, and meet disclosure obligations',
  ],
  modules: [
    {
      id: 'm1',
      title: 'Foundations',
      lessons: [
        {
          id: 'ai-in-the-funnel',
          title: 'AI across the marketing funnel',
          minutes: 25,
          blocks: [
            {
              type: 'text',
              text: [
                'Generative AI is a **production and analysis multiplier**: it drafts, summarizes, varies and classifies faster than any team. It is *not* a strategy engine. It does not know your market position, your margins, or what your customers told sales last week — unless you give it that context.',
                'The most effective teams use AI for volume and speed, and keep humans in charge of **positioning, judgment, and final approval**.',
              ],
            },
            {
              type: 'list',
              items: [
                '**Awareness** — topic research, content drafts, ad copy variants, image concepts.',
                '**Consideration** — comparison pages, FAQs, nurture emails, sales enablement summaries.',
                '**Conversion** — landing-page variants, personalized offers, chat assistants.',
                '**Retention** — onboarding sequences, churn-risk analysis, support-ticket themes.',
              ],
            },
            {
              type: 'classify',
              title: 'Good fit for AI, or keep it human-led?',
              categories: ['Good fit for AI', 'Keep human-led'],
              items: [
                { text: 'Drafting 20 subject-line variants for an existing campaign', cat: 'Good fit for AI' },
                { text: 'Deciding the brand\'s positioning against a new competitor', cat: 'Keep human-led', why: 'Strategy needs market knowledge, trade-offs and accountability.' },
                { text: 'Summarizing 500 customer reviews into themes', cat: 'Good fit for AI' },
                { text: 'Approving a claim that the product is "#1 rated"', cat: 'Keep human-led', why: 'Claims carry legal risk and must be substantiated by evidence.' },
                { text: 'Resizing and reformatting a blog post into social captions', cat: 'Good fit for AI' },
                { text: 'Responding publicly to a product-safety complaint', cat: 'Keep human-led', why: 'Crisis communication needs judgment, legal review and empathy.' },
              ],
            },
            {
              type: 'callout',
              variant: 'tip',
              title: 'Rule of thumb',
              text: 'If a mistake would be cheap and easy to catch, let AI do the first draft. If a mistake would be public, legal or expensive, AI may assist — but a named person decides.',
            },
            {
              type: 'quiz',
              q: 'A team uses AI to write all campaign copy and publishes it without review "to move faster". What is the biggest risk?',
              options: [
                'The copy will be too short',
                'Unverified claims, off-brand tone and factual errors reach customers under the brand\'s name',
                'AI copy cannot be indexed by search engines',
                'It uses too many tokens',
              ],
              a: 1,
              explain: 'AI output is a draft. Publishing without review shifts every hallucination and tone mistake directly onto the brand.',
            },
          ],
        },
        {
          id: 'audience-research',
          title: 'Audience research & personas with AI',
          minutes: 30,
          blocks: [
            {
              type: 'text',
              text: [
                'Ask an LLM to "create a persona for our product" and you get a confident, plausible, **made-up** person. Synthetic personas are built from the model\'s stereotypes, not from your customers.',
                'Use AI to **analyze real evidence** instead: reviews, support tickets, sales-call notes, survey answers, search queries. The model is excellent at clustering and summarizing that material — and you can trace every insight back to a source.',
              ],
            },
            {
              type: 'promptCompare',
              title: 'Invented persona vs. grounded insight',
              versions: [
                {
                  label: 'Invented',
                  prompt: 'Create a buyer persona for our project-management software.',
                  output:
                    'Meet "Project Manager Paula", 34, works at a mid-sized tech company. She loves productivity hacks, drinks oat-milk lattes, and struggles with team communication. Her goals: efficiency and work-life balance.',
                  notes: ['Every detail is a stereotype the model generated — none of it came from your customers.', 'Decisions built on this persona are guesses with a name attached.'],
                },
                {
                  label: 'Grounded',
                  prompt:
                    'Below are 120 churn-survey answers from our customers in <answers> tags.\nGroup them into the 4–6 most common reasons for cancelling. For each reason give: a short label, the share of answers, and 2 verbatim quotes.\nDo not add reasons that are not in the data.\n\n<answers>\n…\n</answers>',
                  output:
                    '1. Too complex for small teams — 31% — "We only needed a board, not 40 settings."\n2. Price jump at 10 seats — 22% — "Fine at 9 users, then the bill doubled."\n3. Missing Outlook integration — 18% — "Everyone here lives in Outlook."\n…',
                  notes: ['Insights are counted and quoted, so they can be checked.', 'They point to concrete actions: a simpler plan, smoother pricing tiers, an integration.'],
                },
              ],
            },
            {
              type: 'order',
              title: 'An evidence-based research workflow',
              items: [
                'Collect real customer evidence (reviews, tickets, survey answers, call notes)',
                'Remove personal data that the analysis does not need',
                'Ask the model to cluster themes, with counts and verbatim quotes',
                'Spot-check a sample of the clusters against the raw data',
                'Turn validated themes into personas or messaging hypotheses',
                'Test the hypotheses with real campaigns or interviews',
              ],
            },
            {
              type: 'quiz',
              q: 'What is the main weakness of a persona an LLM generates from a one-line prompt?',
              options: [
                'It is too detailed',
                'It reflects the model\'s generic assumptions rather than your actual customers',
                'It cannot include demographics',
                'It is protected by copyright',
              ],
              a: 1,
              explain: 'Without your data, the model fills the gaps with plausible stereotypes.',
            },
          ],
        },
      ],
    },
    {
      id: 'm2',
      title: 'Content Production',
      lessons: [
        {
          id: 'brand-voice',
          title: 'Brand voice & content briefs',
          minutes: 30,
          blocks: [
            {
              type: 'text',
              text: [
                'Generic prompts produce generic marketing: "unlock", "elevate", "seamless", "game-changing". To get on-brand output, give the model what a new copywriter would get on day one — a **brief** and a **voice guide**.',
              ],
            },
            {
              type: 'list',
              items: [
                '**Audience & goal** — who reads this, and what should they do next?',
                '**Key message & proof** — the one idea, plus the facts that support it.',
                '**Voice rules** — 3–5 do/don\'t pairs ("plain words, not jargon"; "confident, not hype").',
                '**Banned words** — the clichés your brand never uses.',
                '**Examples** — 2–3 short pieces of real on-brand copy (few-shot prompting).',
                '**Format** — channel, length, structure, call-to-action.',
              ],
            },
            {
              type: 'promptCompare',
              title: 'Generic prompt vs. creative brief',
              versions: [
                {
                  label: 'Generic',
                  prompt: 'Write a LinkedIn post about our new invoicing feature.',
                  output:
                    '🚀 Exciting news! We\'re thrilled to unveil our game-changing invoicing solution that will revolutionize the way you do business! Unlock seamless efficiency and elevate your workflow today! #Innovation #FinTech',
                  notes: ['Hype words, emojis and no concrete benefit.', 'Could be about any product from any company.'],
                },
                {
                  label: 'With brief',
                  prompt:
                    'Audience: finance managers at 20–200 person companies.\nGoal: get them to try recurring invoices.\nKey fact: recurring invoices cut monthly billing time from ~3 hours to ~10 minutes (internal beta, 40 customers).\nVoice: plain, specific, calm. No hype words (revolutionize, game-changing, unlock, seamless). No emojis.\nExample of our voice: "Month-end shouldn\'t need a spreadsheet marathon."\nFormat: LinkedIn post, max 70 words, end with one question.',
                  output:
                    'Most finance teams still rebuild the same invoices every month.\n\nRecurring invoices fix that: set the schedule once and they go out on time. In our beta, 40 customers cut monthly billing from about 3 hours to 10 minutes.\n\nWhich invoice do you rebuild most often?',
                  notes: ['Specific benefit with a sourced number.', 'Matches the voice rules and format exactly.'],
                },
              ],
            },
            {
              type: 'spotFlaw',
              title: 'Review this content brief',
              lines: [
                { text: 'Audience: operations leads at logistics companies (50–500 staff).' },
                { text: 'Goal: make people aware of the product, I guess.', bad: true, why: 'Vague goal. State the one action you want: book a demo, start a trial, download a guide.' },
                { text: 'Key fact: route planning is 23% faster (2025 study with 12 customers).' },
                { text: 'Tone: whatever sounds good.', bad: true, why: 'No voice rules — the model will default to generic marketing language. Give do/don\'t pairs and an example.' },
                { text: 'Also mention we are the #1 platform in Europe.', bad: true, why: 'Unsubstantiated superlative. Comparative claims need evidence, or they create legal and trust risk.' },
                { text: 'Format: email, max 120 words, one call-to-action button.' },
              ],
              explain: 'A good brief removes guesswork: a clear goal, explicit voice rules, and only claims you can prove.',
            },
            {
              type: 'quiz',
              q: 'Which addition most improves brand consistency of AI-written copy?',
              options: ['A higher temperature', 'Two or three examples of real on-brand copy plus explicit voice rules', 'Asking the model to "be creative"', 'A longer word count'],
              a: 1,
              explain: 'Examples and do/don\'t rules show the model the voice instead of making it guess.',
            },
          ],
        },
        {
          id: 'content-at-scale',
          title: 'Content at scale without losing quality',
          minutes: 30,
          blocks: [
            {
              type: 'text',
              text: [
                'AI lets one marketer produce what used to take a team. The failure mode is publishing **volume without verification**: invented statistics, quotes nobody said, features the product doesn\'t have, and pages so similar they help no one.',
                'Treat AI as the fastest writer in a pipeline that still has an editor, a fact-checker and an approver.',
              ],
            },
            {
              type: 'order',
              title: 'A reliable AI content pipeline',
              items: [
                'Brief: audience, goal, key facts with sources, voice rules',
                'Outline generated by AI, approved by an editor',
                'Draft generated section by section from the approved outline',
                'Fact-check every number, name, quote and product claim against sources',
                'Human edit for voice, originality and first-hand insight',
                'Final approval (legal review for claims, comparisons or regulated topics), then publish',
              ],
            },
            {
              type: 'spotFlaw',
              title: 'Fact-check this AI-drafted paragraph',
              instructions: 'Each line is a sentence from an AI draft about your app. Flag the ones that must not be published without verification or removal.',
              lines: [
                { text: 'Our app helps small teams track shared expenses in one place.' },
                { text: 'A 2024 Stanford study found teams using expense apps save 11 hours a month.', bad: true, why: 'A specific study and number the model may have invented. Find the actual source or delete it.' },
                { text: '"It changed how our company works," says Maria Chen, CFO at Brightline.', bad: true, why: 'A fabricated testimonial attributed to a real-sounding person. Only publish real, permissioned quotes.' },
                { text: 'You can split a bill between up to 20 people.' },
                { text: 'It integrates with every major accounting tool.', bad: true, why: 'Overbroad product claim. List the integrations that actually exist.' },
                { text: 'Try it free for 14 days.' },
              ],
              explain: 'Statistics, quotes and capability claims are where AI drafts most often go wrong — verify each one.',
            },
            {
              type: 'callout',
              variant: 'warning',
              title: 'Fake reviews and testimonials',
              text: 'Never generate reviews or testimonials and present them as real customers. In the US, the FTC\'s rule on fake reviews (in force since October 2024) explicitly covers AI-generated reviews; EU consumer law prohibits fake reviews as well.',
            },
            {
              type: 'quiz',
              q: 'An AI draft includes "87% of marketers say…" with no source. What should you do?',
              options: ['Publish it — the model was trained on real data', 'Find the original source and cite it, or remove the statistic', 'Round it to 90%', 'Add "approximately"'],
              a: 1,
              explain: 'Models produce plausible numbers. Every statistic needs a verifiable source.',
            },
          ],
        },
        {
          id: 'multichannel',
          title: 'Repurposing across channels',
          minutes: 20,
          blocks: [
            {
              type: 'text',
              text: [
                'One strong piece of content — a report, webinar or long article — can feed a month of channels. AI is very good at this transformation, *if* you tell it the constraints of each channel. Copy-pasting the same text everywhere performs badly and can look spammy.',
              ],
            },
            {
              type: 'match',
              title: 'Match the channel to what works there',
              pairs: [
                { left: 'Email subject line', right: 'Short and specific; the benefit or curiosity in the first few words' },
                { left: 'LinkedIn post', right: 'A hook in the first line, short paragraphs, one clear takeaway' },
                { left: 'Search ad', right: 'Strict character limits; the keyword plus one concrete benefit' },
                { left: 'Short video script', right: 'Hook in the first 2–3 seconds, written for speaking, captions on' },
                { left: 'Landing page', right: 'One goal, scannable headings, proof near the call-to-action' },
              ],
            },
            {
              type: 'callout',
              variant: 'tip',
              title: 'Prompt pattern',
              text: 'Paste the source once, then ask for each channel separately with its own constraints ("LinkedIn: max 70 words, no hashtags, end with a question"). One output per prompt is easier to review than ten at once.',
            },
            {
              type: 'quiz',
              q: 'Why ask for each channel in a separate prompt rather than "turn this into posts for every channel"?',
              options: [
                'Models can only write one format per day',
                'Each channel has different constraints; separate prompts make them explicit and the output easier to review',
                'It uses fewer tokens',
                'Search engines require it',
              ],
              a: 1,
              explain: 'Specific constraints per channel give better-fitting output and smaller, reviewable pieces.',
            },
          ],
        },
      ],
    },
    {
      id: 'm3',
      title: 'Optimization & Responsibility',
      lessons: [
        {
          id: 'personalization',
          title: 'Personalization & segmentation',
          minutes: 30,
          blocks: [
            {
              type: 'text',
              text: [
                'AI makes it cheap to write a different message for every segment — or every person. Done well, personalization is simply *relevance*. Done badly, it is creepy, inaccurate, or unlawful.',
                'In the EU, personal data used for marketing needs a **lawful basis** under the GDPR (often consent for direct marketing and tracking), must be used for the purpose people were told about, and some categories (health, religion, ethnicity, sexual orientation…) are specially protected.',
              ],
            },
            {
              type: 'classify',
              title: 'Is this personalization appropriate?',
              categories: ['Appropriate', 'Avoid or get legal advice'],
              items: [
                { text: 'Recommending accessories for a product the customer bought', cat: 'Appropriate' },
                { text: 'Inferring a customer\'s health condition from purchases and targeting ads on it', cat: 'Avoid or get legal advice', why: 'Health is special-category data under the GDPR; inferring it for targeting is high-risk.' },
                { text: 'Sending the onboarding email in the language the user chose', cat: 'Appropriate' },
                { text: 'Uploading the customer list to a third-party AI tool with no data-processing agreement', cat: 'Avoid or get legal advice', why: 'Sharing personal data with a processor requires a contract and a lawful basis.' },
                { text: 'Segmenting newsletter subscribers by the topics they clicked', cat: 'Appropriate' },
                { text: 'Mentioning in an ad that you know where the person was yesterday', cat: 'Avoid or get legal advice', why: 'Creepy, likely unexpected use of location data — erodes trust and may breach consent.' },
              ],
            },
            {
              type: 'scenario',
              title: 'The personalization request',
              start: 's1',
              nodes: {
                s1: {
                  text: 'Your manager wants an AI tool to write a personal email to each of 30,000 newsletter subscribers using "everything we know about them". What do you do first?',
                  choices: [
                    { label: 'Export all CRM fields into the AI tool and start generating.', next: 'f1', good: false, feedback: 'You may be sharing data you have no basis to use, with a tool that has no processing agreement.' },
                    { label: 'Check what subscribers consented to, which fields are needed, and whether the tool has a data-processing agreement.', next: 's2', good: true, feedback: 'Purpose, minimization and processor contracts come first.' },
                  ],
                },
                s2: {
                  text: 'Consent covers newsletters and topic preferences. The tool is approved. How do you personalize?',
                  choices: [
                    { label: 'Use topic preferences and recent reads to pick and adapt content; keep a human review sample.', next: 'win', good: true, feedback: 'Relevant, within consent, and quality-controlled.' },
                    { label: 'Also scrape their social profiles to add personal details.', next: 'f2', good: false, feedback: 'New data source, no consent, and no expectation from subscribers.' },
                  ],
                },
                f1: { end: 'fail', text: '**Outcome:** The privacy team halts the campaign. Customer data was sent to an unapproved processor and must be reported internally.' },
                f2: { end: 'fail', text: '**Outcome:** Subscribers find the emails invasive; unsubscribe and complaint rates spike.' },
                win: { end: 'success', text: '**Outcome:** Click-through rises 18% versus the generic newsletter, with no complaints. 🎯' },
              },
            },
            {
              type: 'quiz',
              q: 'Which principle means you should only feed the AI the customer fields it actually needs?',
              options: ['Data minimization', 'Right to be forgotten', 'Data portability', 'Accountability'],
              a: 0,
              explain: 'GDPR\'s data-minimization principle: adequate, relevant and limited to what is necessary.',
            },
          ],
        },
        {
          id: 'testing-variants',
          title: 'Testing AI-generated variants',
          minutes: 30,
          blocks: [
            {
              type: 'text',
              text: [
                'AI can produce 50 headlines in a minute. That does not mean you know which one works. Only a properly designed test tells you — and the more variants you test, the more likely one "wins" by pure chance.',
              ],
            },
            { type: 'abTest' },
            {
              type: 'list',
              items: [
                '**Decide the sample size before you start**, based on the smallest lift worth detecting.',
                '**Test few variants** — 2 to 4. Pre-select with judgment; don\'t test 50.',
                '**Don\'t peek and stop early** when one looks ahead; early leads often vanish.',
                '**Pick one primary metric** (e.g. clicks or conversions) before launching.',
                '**Record the result**, including losers, so you don\'t re-test the same idea.',
              ],
            },
            {
              type: 'quiz',
              q: 'After 2 days, variant B leads with a p-value of 0.20. The planned sample is not reached. What should you do?',
              options: ['Declare B the winner', 'Continue until the planned sample size is reached, then evaluate', 'Stop the test and try 10 new variants', 'Lower the significance threshold to 0.25'],
              a: 1,
              explain: 'p = 0.20 is not significant, and stopping early or moving the threshold inflates false positives.',
            },
            {
              type: 'quiz',
              q: 'Why does testing 40 AI-generated variants at once make false "winners" more likely?',
              options: [
                'AI variants are always worse',
                'Each comparison has a chance of a false positive; with many comparisons, some will look significant by luck',
                'Testing tools limit you to 2 variants',
                'Large tests are illegal',
              ],
              a: 1,
              explain: 'The multiple-comparisons problem: at a 5% threshold, roughly 1 in 20 null comparisons looks significant.',
            },
          ],
        },
        {
          id: 'responsible-marketing',
          title: 'Compliance, disclosure & brand safety',
          minutes: 30,
          blocks: [
            {
              type: 'text',
              text: [
                'Regulators have caught up with AI marketing. The rules that matter most day to day:',
              ],
            },
            {
              type: 'list',
              items: [
                '**EU AI Act — transparency (Article 50)**: from 2 August 2026, AI-generated or manipulated images, audio and video that resemble real people, places or events (deepfakes) must be disclosed, and AI-generated text published to inform the public on matters of public interest must be labelled unless it was human-reviewed and someone holds editorial responsibility.',
                '**Fake reviews and endorsements** are prohibited in the US (FTC rule, 2024) and the EU; this includes AI-generated reviews and undisclosed paid endorsements.',
                '**Advertising claims** must be truthful and substantiated, whoever — or whatever — wrote them.',
                '**Intellectual property**: avoid prompting for the style of named living artists or brands, and check licences/terms of the AI tools you use for commercial output.',
                '**Brand safety**: human approval before anything AI-generated is published under the brand.',
              ],
            },
            {
              type: 'scenario',
              title: 'Launch week',
              start: 's1',
              nodes: {
                s1: {
                  text: 'For a product launch, the agency proposes an AI-generated video of a well-known athlete "endorsing" your shoes. The athlete has not been asked. What do you do?',
                  choices: [
                    { label: 'Approve it with a small "AI-generated" label in the corner.', next: 'f1', good: false, feedback: 'A label does not fix using a real person\'s likeness and implying an endorsement they never gave.' },
                    { label: 'Reject it; use real customers or a fictional, clearly synthetic presenter, disclosed as AI-generated.', next: 's2', good: true, feedback: 'No false endorsement, and transparent use of synthetic media.' },
                  ],
                },
                s2: {
                  text: 'The agency also wants to seed the product page with 200 AI-written 5-star reviews "until real ones come in".',
                  choices: [
                    { label: 'Refuse. Launch with no reviews and invite verified buyers to review after purchase.', next: 'win', good: true, feedback: 'Fake reviews are prohibited and destroy trust when discovered.' },
                    { label: 'Accept, but delete them after a month.', next: 'f2', good: false, feedback: 'Still fake reviews, still unlawful, still deceptive.' },
                  ],
                },
                f1: { end: 'fail', text: '**Outcome:** The athlete\'s lawyers send a cease-and-desist; the story trends for the wrong reasons.' },
                f2: { end: 'fail', text: '**Outcome:** A journalist spots identical phrasing across reviews. Regulators open an inquiry.' },
                win: { end: 'success', text: '**Outcome:** A clean launch: synthetic media disclosed, genuine reviews only. Trust intact. ✅' },
              },
            },
            {
              type: 'flashcards',
              title: 'Course review',
              cards: [
                { front: 'Grounded research', back: 'Using AI to analyze real customer evidence (reviews, tickets, surveys) instead of inventing personas.' },
                { front: 'Creative brief', back: 'Audience, goal, key facts with proof, voice rules, examples and format — given to the model before writing.' },
                { front: 'Fact-check pass', back: 'Verifying every statistic, quote, name and product claim in an AI draft against a source.' },
                { front: 'Data minimization', back: 'Only use the personal data that is necessary for the stated purpose.' },
                { front: 'Peeking', back: 'Checking an A/B test early and stopping when one variant looks ahead — inflates false positives.' },
                { front: 'Article 50, EU AI Act', back: 'Transparency duties: disclose deepfakes and certain AI-generated public-interest text (from Aug 2026).' },
              ],
            },
            {
              type: 'quiz',
              q: 'Which of these is acceptable?',
              options: [
                'Posting AI-written 5-star reviews under invented customer names',
                'Using an AI-generated presenter that is clearly disclosed as synthetic',
                'An AI video implying a real celebrity endorses your product without permission',
                'Claiming "#1 in Europe" because the AI draft said so',
              ],
              a: 1,
              explain: 'Disclosed synthetic media is fine; fake reviews, false endorsements and unsubstantiated claims are not.',
            },
          ],
        },
      ],
    },
  ],
  examQuestions: [
    { q: 'Where does generative AI add the most reliable value in marketing?', options: ['Setting brand strategy', 'Producing and analyzing content at speed under human direction', 'Approving legal claims', 'Replacing customer research entirely'], a: 1, explain: 'AI multiplies production and analysis; strategy and approval stay with people.' },
    { q: 'A persona generated from a one-line prompt is best described as:', options: ['Validated customer research', 'A plausible stereotype based on the model\'s assumptions', 'A legal requirement', 'Statistically representative'], a: 1, explain: 'Without real data the model invents details.' },
    { q: 'The most trustworthy way to use AI for audience research is to:', options: ['Ask it to imagine your customers', 'Have it cluster and summarize real customer evidence, with counts and quotes', 'Use only demographic data', 'Copy competitor personas'], a: 1, explain: 'Grounded analysis is traceable and checkable.' },
    { q: 'Which brief element most directly prevents generic, hype-filled copy?', options: ['A larger word count', 'Explicit voice rules with banned words and real examples', 'Higher temperature', 'More hashtags'], a: 1, explain: 'Voice rules and examples steer the model away from clichés.' },
    { q: '"We are the #1 platform in Europe" appears in an AI draft. Before publishing you must:', options: ['Bold it', 'Have evidence that substantiates the claim, or remove it', 'Add an emoji', 'Translate it'], a: 1, explain: 'Comparative and superlative claims must be substantiated.' },
    { q: 'An AI draft cites "a 2024 Stanford study". The study cannot be found. You should:', options: ['Keep it; the model knows', 'Remove it or replace it with a verified source', 'Change the year', 'Move it to a footnote'], a: 1, explain: 'Unfindable sources are likely hallucinated.' },
    { q: 'Publishing AI-generated testimonials under invented customer names is:', options: ['Fine if they are positive', 'Deceptive and prohibited as fake reviews/endorsements', 'Allowed for new products', 'Required for social proof'], a: 1, explain: 'Fake reviews are banned in the US (FTC) and EU.' },
    { q: 'In an AI content pipeline, the fact-check step should verify:', options: ['Only spelling', 'Every statistic, quote, name and product claim', 'Only the headline', 'Nothing if the model is large'], a: 1, explain: 'These are the most common sources of AI errors.' },
    { q: 'Why repurpose content with a separate prompt per channel?', options: ['To use more AI credits', 'Each channel has different constraints and separate outputs are easier to review', 'Channels forbid shared text', 'It improves model accuracy on math'], a: 1, explain: 'Explicit channel constraints produce better-fitting copy.' },
    { q: 'Under the GDPR, which data needs special caution for ad targeting?', options: ['Language preference', 'Health information', 'Newsletter topic clicks', 'Order history for accessories'], a: 1, explain: 'Health is special-category personal data.' },
    { q: 'Before uploading a customer list to a third-party AI tool, you need:', options: ['Nothing', 'A lawful basis and a data-processing agreement with the vendor', 'Only a strong password', 'The customers\' phone numbers'], a: 1, explain: 'Processors handling personal data require a contract and a lawful basis.' },
    { q: 'The data-minimization principle means:', options: ['Use as much data as possible', 'Use only the personal data necessary for the purpose', 'Delete all data monthly', 'Store data only in the EU'], a: 1, explain: 'Adequate, relevant and limited to what is necessary.' },
    { q: 'An A/B test shows B ahead with p = 0.20 before the planned sample size. The correct action is:', options: ['Declare B the winner', 'Keep running until the planned sample, then evaluate', 'Stop and pick A', 'Change the threshold to 0.25'], a: 1, explain: 'Early stopping and moving thresholds inflate false positives.' },
    { q: 'Testing 40 AI-generated headlines at once increases the risk of:', options: ['Lower click rates', 'False-positive "winners" due to multiple comparisons', 'Search penalties', 'Email bounces'], a: 1, explain: 'With many comparisons, some will appear significant by chance.' },
    { q: 'To detect a smaller lift with the same confidence, you need:', options: ['Fewer recipients', 'More recipients per variant', 'More variants', 'A higher temperature'], a: 1, explain: 'Smaller effects require larger samples.' },
    { q: 'Under the EU AI Act transparency rules (Article 50), what must be disclosed?', options: ['All spell-checked text', 'Deepfake images, audio and video, and certain AI-generated public-interest text', 'Every email subject line', 'Only content in English'], a: 1, explain: 'Article 50 covers deepfakes and AI-generated public-interest text (with exceptions for human editorial review).' },
    { q: 'An agency proposes an AI video of a real athlete endorsing your product without permission. This is:', options: ['Fine with a small AI label', 'A false endorsement and misuse of their likeness — reject it', 'Allowed if the video is short', 'Allowed outside the EU'], a: 1, explain: 'A label does not authorize using someone\'s identity to imply endorsement.' },
    { q: 'Which task should remain human-led?', options: ['Drafting subject-line variants', 'Summarizing reviews into themes', 'Responding publicly to a product-safety complaint', 'Reformatting a post for social'], a: 2, explain: 'High-stakes public communication needs human judgment and accountability.' },
    { q: 'What is the best first step when a manager asks to personalize emails using "everything we know"?', options: ['Export all CRM fields to the AI', 'Check consent, required fields and the tool\'s processing agreement', 'Scrape social profiles', 'Send a test to everyone'], a: 1, explain: 'Purpose, minimization and processor checks come first.' },
    { q: 'Why give 2–3 real examples of on-brand copy in a prompt?', options: ['To lengthen the prompt', 'Few-shot examples show the voice instead of describing it', 'Models require examples', 'To increase randomness'], a: 1, explain: 'Examples are the fastest way to transfer style.' },
  ],
};
