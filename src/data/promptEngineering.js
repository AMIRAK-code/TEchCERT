export default {
  id: 'ai-prompt-engineer',
  title: 'AI Prompt Engineer',
  tagline: 'Communicate precisely with large language models.',
  description:
    'Master the art of crafting precise, effective prompts for Large Language Models (LLMs) to maximize AI output quality.',
  icon: 'BrainCircuit',
  duration: '4 Hours',
  level: 'Intermediate',
  passMark: 70,
  examSize: 15,
  examMinutes: 25,
  outcomes: [
    'Explain how tokens, context windows and sampling shape model output',
    'Structure prompts with role, task, context, format and constraints',
    'Choose between zero-shot, few-shot and chain-of-thought prompting',
    'Get reliable structured output (JSON) from a model',
    'Manage long context and retrieval-augmented generation (RAG)',
    'Evaluate and iterate on prompts with test sets',
  ],
  modules: [
    {
      id: 'm1',
      title: 'How LLMs Work',
      lessons: [
        {
          id: 'intro-to-llms',
          title: 'Introduction to LLMs: tokens & context',
          minutes: 20,
          blocks: [
            {
              type: 'text',
              text: [
                'A large language model (LLM) is a neural network trained on enormous amounts of text to do one thing extremely well: **predict the next token**. Everything it does — answering questions, writing code, summarizing — emerges from repeating that prediction, one token at a time.',
                'To use LLMs well you need an accurate mental model of three things: what a token is, what the context window is, and how the model picks the next token. This lesson covers the first two.',
              ],
            },
            { type: 'heading', text: 'Tokens: the unit models read' },
            {
              type: 'text',
              text: [
                'Models do not see characters or words. Text is split into **tokens** — common words, word fragments, punctuation and whitespace. In English, one token is roughly **4 characters** or **¾ of a word**. Rare words, numbers, code and non-English text usually take more tokens.',
                'Tokens matter because they are how you are **billed**, how **latency** scales, and how the **context window** is measured.',
              ],
            },
            { type: 'tokenizer' },
            { type: 'heading', text: 'The context window' },
            {
              type: 'text',
              text: [
                'The **context window** is the maximum number of tokens the model can consider at once — your system prompt, the conversation history, any documents you paste in, *and* the tokens it generates in response.',
                'LLMs are **stateless**: they remember nothing between API calls. A chat interface "remembers" your conversation only because the whole history is resent on every turn. When the history grows beyond the window, something has to be dropped or summarized.',
              ],
            },
            {
              type: 'callout',
              variant: 'tip',
              title: 'Mental model',
              text: 'Treat the model as a brilliant new colleague with no memory who has just walked into the room. Everything they need to know must be in the prompt.',
            },
            {
              type: 'quiz',
              q: 'A user says "the chatbot remembered what I told it 10 messages ago". What is actually happening?',
              options: [
                'The model updated its weights with the conversation',
                'The application resends the earlier messages as part of the context on each turn',
                'The model stores conversations in a long-term memory database automatically',
                'Tokens from earlier messages persist inside the GPU between calls',
              ],
              a: 1,
              explain: 'LLMs are stateless. The app includes prior turns in the context window every time it calls the model.',
              hint: 'Remember: models are stateless between API calls.',
            },
            {
              type: 'quiz',
              q: 'Which input will typically use the MOST tokens for the same number of characters?',
              options: ['Plain English prose', 'A long random API key like `x7Qp9ZrT2vLm8WkY`', 'A list of common words', 'A single repeated word'],
              a: 1,
              explain: 'Random strings have no common sub-word patterns, so the tokenizer splits them into many small pieces.',
            },
          ],
        },
        {
          id: 'sampling',
          title: 'Sampling: temperature & top-p',
          minutes: 20,
          blocks: [
            {
              type: 'text',
              text: [
                'At each step the model outputs a score for every token in its vocabulary. These scores are turned into probabilities, and then one token is **sampled**. Sampling parameters let you control how adventurous that choice is.',
              ],
            },
            {
              type: 'list',
              items: [
                '**Temperature** rescales the probabilities. Low values (0–0.3) make the most likely token dominate — consistent, focused output. High values (1.0+) flatten the distribution — more diverse and creative, but more prone to errors.',
                '**Top-p (nucleus sampling)** keeps only the smallest set of tokens whose probabilities add up to *p*, then samples from those. It cuts off the long tail of unlikely tokens.',
                '**Max tokens** caps the length of the response (and your cost). If output stops mid-sentence, you probably hit this limit.',
              ],
            },
            { type: 'temperature' },
            {
              type: 'callout',
              variant: 'info',
              title: 'Rule of thumb',
              text: 'Adjust temperature *or* top-p, not both at once — they interact. Many providers recommend changing only one.',
            },
            {
              type: 'match',
              title: 'Pick the right setting',
              pairs: [
                { left: 'Temperature 0', right: 'Extracting invoice fields into JSON' },
                { left: 'Temperature ≈ 0.9', right: 'Brainstorming 20 product names' },
                { left: 'Top-p 0.9', right: 'Trimming the tail of very unlikely tokens' },
                { left: 'Max tokens = 200', right: 'Capping response length and cost' },
              ],
            },
            {
              type: 'quiz',
              q: 'You run the same prompt twice at temperature 0 and get identical answers. At temperature 1.2 you get different answers each time. Why?',
              options: [
                'Temperature 1.2 uses a different model',
                'At temperature 0 the model always picks the highest-probability token; higher temperature samples from a flatter distribution',
                'Higher temperature adds random words to the prompt',
                'Temperature only affects response length',
              ],
              a: 1,
              explain: 'Temperature 0 approximates greedy decoding. Higher temperatures give lower-probability tokens a real chance of being chosen.',
            },
          ],
        },
      ],
    },
    {
      id: 'm2',
      title: 'Core Prompting Techniques',
      lessons: [
        {
          id: 'prompt-anatomy',
          title: 'Anatomy of an effective prompt',
          minutes: 30,
          blocks: [
            {
              type: 'text',
              text: [
                'Most bad outputs come from **under-specified prompts**, not weak models. The model fills every gap with the most generic plausible guess. Your job is to remove the guesswork.',
                'Strong prompts are built from a handful of components:',
              ],
            },
            {
              type: 'list',
              items: [
                '**Role** — who the model should act as (sets vocabulary, depth and perspective).',
                '**Task** — the specific action and deliverable. Use a clear verb: *write, classify, extract, compare*.',
                '**Context** — the facts, audience and purpose the model cannot know on its own.',
                '**Output format** — structure, length, sections, JSON schema.',
                '**Constraints & tone** — what to avoid, style, and what to do when information is missing.',
              ],
            },
            { type: 'promptBuilder' },
            {
              type: 'callout',
              variant: 'tip',
              title: 'Say what to do, not only what not to do',
              text: '"Don\'t be verbose" is weaker than "Answer in at most 3 sentences." Positive, measurable instructions are easier for a model to follow.',
            },
            {
              type: 'classify',
              title: 'Vague or specific?',
              categories: ['Vague', 'Specific'],
              items: [
                { text: '"Make it shorter."', cat: 'Vague', why: 'Shorter by how much? Give a target length.' },
                { text: '"Rewrite in under 80 words, keeping the price and deadline."', cat: 'Specific' },
                { text: '"Write something about our product for social media."', cat: 'Vague', why: 'No platform, audience, goal or length.' },
                { text: '"Write a 2-sentence LinkedIn post for IT managers announcing SSO support."', cat: 'Specific' },
                { text: '"If a field is missing from the text, return null — do not guess."', cat: 'Specific' },
                { text: '"Be professional."', cat: 'Vague', why: '"Professional" means different things; describe or show the tone.' },
              ],
            },
            {
              type: 'quiz',
              q: 'Which addition would MOST improve the prompt "Summarize this report"?',
              options: [
                'Adding "please" and "thank you"',
                'Specifying the audience, purpose and format: "for the CFO, 5 bullets on cost risks"',
                'Writing the prompt in all caps',
                'Asking the model to be creative',
              ],
              a: 1,
              explain: 'Audience, purpose and format tell the model *which* summary you need out of the many possible ones.',
            },
          ],
        },
        {
          id: 'zero-vs-few-shot',
          title: 'Zero-shot vs few-shot prompting',
          minutes: 25,
          blocks: [
            {
              type: 'text',
              text: [
                '**Zero-shot prompting** means asking the model to perform a task with instructions only — no examples. Modern models are very good at it for common tasks.',
                '**Few-shot prompting** includes a small number of worked input → output examples in the prompt. Examples are the fastest way to communicate a *format*, a *label set*, or a *style* that is hard to describe in words.',
              ],
            },
            {
              type: 'fewShot',
              title: 'Support-ticket classifier',
              instruction: 'Classify the support ticket into exactly one category: billing, technical, account.',
              examples: [
                { input: 'I was charged twice this month.', output: 'billing' },
                { input: 'The app crashes when I upload a photo.', output: 'technical' },
                { input: 'How do I change the email on my profile?', output: 'account' },
              ],
              tests: [
                'My invoice shows the wrong VAT number.',
                'The password reset link never arrives.',
                'Sync fails with error 504.',
                'Can I get a refund for last month?',
                'Please close my account.',
              ],
              outputs: [
                [
                  { text: 'This ticket is about billing since it mentions an invoice.', ok: false },
                  { text: 'Account / Technical', ok: false },
                  { text: 'Technical issue', ok: false },
                  { text: 'billing', ok: true },
                  { text: 'Category: Account', ok: false },
                ],
                [
                  { text: 'billing', ok: true },
                  { text: 'billing', ok: false },
                  { text: 'technical', ok: true },
                  { text: 'billing', ok: true },
                  { text: 'account deletion', ok: false },
                ],
                [
                  { text: 'billing', ok: true },
                  { text: 'technical', ok: false },
                  { text: 'technical', ok: true },
                  { text: 'billing', ok: true },
                  { text: 'other', ok: false },
                ],
                [
                  { text: 'billing', ok: true },
                  { text: 'account', ok: true },
                  { text: 'technical', ok: true },
                  { text: 'billing', ok: true },
                  { text: 'account', ok: true },
                ],
              ],
            },
            {
              type: 'text',
              text: [
                'Notice what happened with **1-shot**: the model saw only a billing example and became biased toward "billing". Good few-shot sets are **balanced** across labels, **diverse** in phrasing, and **consistent** in format. Put tricky edge cases in your examples, not just easy ones.',
              ],
            },
            {
              type: 'callout',
              variant: 'warning',
              title: 'Examples are copied — including their flaws',
              text: 'Models imitate examples closely. If every example is 3 sentences long, outputs will be too. If one example has a typo in the label, expect that typo in production.',
            },
            {
              type: 'quiz',
              q: 'Your 3-shot classifier keeps predicting "positive". All three examples are labelled "positive". What is the best fix?',
              options: [
                'Increase the temperature',
                'Rewrite the instructions in more detail but keep the examples',
                'Use a balanced set of examples covering each label',
                'Remove the instructions and keep only the examples',
              ],
              a: 2,
              explain: 'Unbalanced examples bias the model toward the over-represented label. Balance and diversify them.',
            },
          ],
        },
        {
          id: 'chain-of-thought',
          title: 'Chain-of-thought reasoning',
          minutes: 25,
          blocks: [
            {
              type: 'text',
              text: [
                'Because a model generates one token at a time, it has no hidden "scratch pad" unless you give it one. Asking for the final answer immediately forces it to commit before doing the work.',
                '**Chain-of-thought (CoT) prompting** asks the model to write out intermediate reasoning steps *before* the answer. Each generated step becomes context for the next, which dramatically improves accuracy on math, logic and multi-step problems.',
              ],
            },
            {
              type: 'cot',
              title: 'Direct answer vs. step-by-step',
              problem:
                'A café sells muffins for **$3** and coffees for **$2**. On Monday it sold **40 items** in total and took **$95**. How many muffins did it sell?',
              directAnswer: '20',
              directWhy: 'Answering immediately, the model pattern-matched "40 items" to "half are muffins" instead of solving.',
              correct: '15',
              steps: [
                'Let *m* be muffins and *c* be coffees. Total items: m + c = 40, so c = 40 − m.',
                'Total revenue: 3m + 2c = 95.',
                'Substitute: 3m + 2(40 − m) = 95 → 3m + 80 − 2m = 95.',
                'Simplify: m + 80 = 95, so **m = 15**.',
                'Check: 15 muffins × $3 = $45; 25 coffees × $2 = $50; $45 + $50 = $95 ✓',
              ],
            },
            {
              type: 'list',
              items: [
                '**Zero-shot CoT**: simply add "Think step by step before answering."',
                '**Few-shot CoT**: show examples that include the reasoning, not just the answer.',
                '**Structured CoT**: ask for reasoning inside `<thinking>` tags and the final answer inside `<answer>` tags, so your code can extract just the answer.',
                '**Self-consistency**: sample several reasoning paths at a higher temperature and take the majority answer.',
                '**Prompt chaining**: split a big task into sequential prompts (extract → analyze → write), passing each output into the next.',
              ],
            },
            {
              type: 'callout',
              variant: 'info',
              title: 'Reasoning models',
              text: 'Some newer models have built-in "extended thinking". For those, you usually get better results by describing the problem well and letting the model reason, rather than scripting every step yourself.',
            },
            {
              type: 'order',
              title: 'Chain these prompts',
              instructions: 'You need a competitor analysis memo from 10 long articles. Order the prompt chain.',
              items: [
                'Extract key facts (pricing, features, launches) from each article into JSON',
                'Merge and deduplicate the facts across all articles',
                'Compare the competitors against our product on each dimension',
                'Write a one-page memo for executives from the comparison',
              ],
              explain: 'Each step has a single job and a checkable output, which makes the pipeline easier to debug than one giant prompt.',
            },
            {
              type: 'quiz',
              q: 'Why does chain-of-thought improve accuracy on multi-step problems?',
              options: [
                'It makes the model use a larger neural network',
                'Generated reasoning tokens become context the model can build on before committing to an answer',
                'It lowers the temperature automatically',
                'It lets the model search the internet',
              ],
              a: 1,
              explain: 'The model conditions each token on everything before it — including its own intermediate steps.',
            },
          ],
        },
      ],
    },
    {
      id: 'm3',
      title: 'Advanced Practice',
      lessons: [
        {
          id: 'structured-output',
          title: 'Structured output & delimiters',
          minutes: 25,
          blocks: [
            {
              type: 'text',
              text: [
                'When model output feeds into code, "roughly right" is not good enough — you need output your program can parse every time. Three techniques do most of the work:',
              ],
            },
            {
              type: 'list',
              items: [
                '**Delimiters** — wrap inputs in clear boundaries like `<email>…</email>` or triple quotes, so the model can tell your instructions apart from the data.',
                '**An explicit schema** — list every field, its type, and what to do when it is missing (e.g. `null`).',
                '**Output-only instructions** — "Return only valid JSON, no prose." Many APIs also offer a JSON / structured-output mode or tool schemas that enforce this.',
              ],
            },
            {
              type: 'promptCompare',
              title: 'Extracting a sales lead',
              versions: [
                {
                  label: 'Casual prompt',
                  prompt:
                    "Get the details from this email: Hi, I'm Dana Ruiz from Brightline. We'd like 40 seats of the Pro plan starting March 1. Call me at 555-0142.",
                  output:
                    "Sure! Here are the details from the email:\n\nThe sender is Dana Ruiz, who works at a company called Brightline. They're interested in purchasing 40 seats of your Pro plan, with a start date of March 1st. You can reach Dana by phone at 555-0142. Let me know if you'd like me to draft a reply!",
                  notes: ['Readable for a human, useless for code: prose, a chatty preamble, and a follow-up offer.', 'Field names and the date format change from run to run.'],
                },
                {
                  label: 'Structured prompt',
                  prompt:
                    'Extract the lead from the email in <email> tags.\nReturn only JSON matching:\n{"name": string, "company": string, "plan": string, "seats": integer, "start_date": "YYYY-MM-DD" | null, "phone": string | null}\nUse null for anything not stated. Do not guess the year.\n\n<email>\nHi, I\'m Dana Ruiz from Brightline. We\'d like 40 seats of the Pro plan starting March 1. Call me at 555-0142.\n</email>',
                  output:
                    '{\n  "name": "Dana Ruiz",\n  "company": "Brightline",\n  "plan": "Pro",\n  "seats": 40,\n  "start_date": null,\n  "phone": "555-0142"\n}',
                  notes: [
                    'Parseable with `JSON.parse` every time.',
                    '`start_date` is `null` because the year was not stated — the prompt told the model not to guess.',
                    'Delimiters make it obvious which text is data.',
                  ],
                },
              ],
            },
            {
              type: 'spotFlaw',
              title: 'Review this summarization prompt template',
              lines: [
                { text: 'You are an assistant that summarizes internal documents.' },
                { text: 'Summarize the document and maybe list some key points if you want.', bad: true, why: 'Optional, hedged instructions ("maybe", "if you want") produce inconsistent output. State exactly what you need.' },
                { text: "Don't make it too long.", bad: true, why: 'Vague length. Use a measurable limit, e.g. "at most 3 sentences".' },
                { text: 'Respond in JSON with keys: summary (string), key_points (array of up to 5 strings).' },
                { text: '{document}', bad: true, why: 'Untrusted document text is inserted with no delimiters — the model cannot tell data from instructions, and it is an injection risk. Wrap it in <document> tags.' },
              ],
              explain: 'Clear, measurable instructions plus delimited input give consistent, safer output.',
            },
            {
              type: 'quiz',
              q: 'Why wrap pasted content in tags like `<document>…</document>`?',
              options: [
                'Tags reduce the token count',
                'They help the model separate instructions from data and let you reference the content precisely',
                'Models can only read XML',
                'They encrypt the content',
              ],
              a: 1,
              explain: 'Delimiters clarify structure ("summarize the text in <document>") and reduce the chance that text inside the data is treated as instructions.',
            },
          ],
        },
        {
          id: 'context-management',
          title: 'Advanced context management & RAG',
          minutes: 30,
          blocks: [
            {
              type: 'text',
              text: [
                'A bigger context window does not mean you should fill it. More tokens cost more, respond slower, and can *dilute attention*: models are often better at using information at the **beginning and end** of a long context than in the middle (the "lost in the middle" effect).',
                'Good context management means giving the model **the right information, in the right place, at the right size**.',
              ],
            },
            {
              type: 'list',
              items: [
                '**Put long documents first, and the question/instructions after them** — for long inputs, this ordering typically improves answer quality.',
                '**Summarize old conversation turns** instead of resending them verbatim once they stop being relevant.',
                '**Retrieve, don\'t paste**: use retrieval-augmented generation (RAG) to include only the passages relevant to the current question.',
                '**Label sources** (`<source id="3">`) and ask the model to cite them, so answers can be verified.',
              ],
            },
            {
              type: 'order',
              title: 'Build a RAG pipeline',
              instructions: 'Put the steps of a retrieval-augmented generation pipeline in order.',
              items: [
                'Split the knowledge-base documents into chunks',
                'Convert each chunk into an embedding and store it in a vector index',
                "Embed the user's question",
                'Retrieve the chunks most similar to the question',
                'Insert the retrieved chunks, with source labels, into the prompt',
                'Generate an answer that cites the sources it used',
              ],
              explain: 'Steps 1–2 happen offline (indexing); steps 3–6 run for every question.',
            },
            {
              type: 'classify',
              title: 'Curate the context',
              instructions: 'A customer asks your support bot about the refund policy for annual plans. What goes in the context?',
              categories: ['Include', 'Summarize or omit'],
              items: [
                { text: 'The 2 policy sections about annual-plan refunds', cat: 'Include' },
                { text: 'The entire 400-page product manual', cat: 'Summarize or omit', why: 'Mostly irrelevant; it costs tokens and dilutes attention. Retrieve only relevant sections.' },
                { text: "The customer's current question", cat: 'Include' },
                { text: 'The customer\'s plan type and purchase date', cat: 'Include' },
                { text: 'All 80 earlier turns of an unrelated chat from last month, verbatim', cat: 'Summarize or omit', why: 'At most, keep a short summary if anything in it is still relevant.' },
                { text: 'Raw debug logs from unrelated backend services', cat: 'Summarize or omit', why: 'Noise — and possibly sensitive data.' },
              ],
            },
            {
              type: 'callout',
              variant: 'warning',
              title: 'Grounding reduces — but does not remove — hallucination',
              text: 'Instruct the model to answer only from the provided sources and to say "I don\'t know" when the answer is not there. Then test that it actually does.',
            },
            {
              type: 'quiz',
              q: 'Your bot answers well when the key fact is at the start or end of a 150-page context, but misses it when it is in the middle. What is the best first fix?',
              options: [
                'Switch to a model with an even larger context window',
                'Use retrieval to include only the most relevant passages, placed prominently in the prompt',
                'Raise the temperature',
                'Repeat the whole document twice',
              ],
              a: 1,
              explain: 'Less, better-targeted context mitigates "lost in the middle" and reduces cost.',
            },
          ],
        },
        {
          id: 'evaluation',
          title: 'Evaluating & iterating on prompts',
          minutes: 25,
          blocks: [
            {
              type: 'text',
              text: [
                'Prompt engineering is an **empirical** discipline. A prompt that looks great on three hand-picked examples can fail on 10% of real inputs. Professionals treat prompts like code: they test them.',
              ],
            },
            {
              type: 'list',
              items: [
                '**Build a test set**: 20–100 realistic inputs, including edge cases and known failures.',
                '**Define success**: exact-match checks, rules (valid JSON? under 100 words?), rubrics, or an LLM-as-judge for subjective quality.',
                '**Change one thing at a time** so you know what caused an improvement or a regression.',
                '**Version your prompts** and rerun the test set on every change (regression testing).',
              ],
            },
            {
              type: 'scenario',
              title: 'Shipping a summarization prompt',
              start: 's1',
              nodes: {
                s1: {
                  text: 'Your contract-summary prompt looked great on the 3 contracts you tried. Your manager wants it in production tomorrow. What do you do first?',
                  choices: [
                    { label: 'Ship it — it worked on every example.', next: 'f1', good: false, feedback: 'Three examples tell you almost nothing about the long tail.' },
                    { label: 'Collect ~50 real contracts, including messy edge cases, and define pass criteria.', next: 's2', good: true, feedback: 'A representative test set is the foundation of reliable prompts.' },
                    { label: 'Make the prompt longer and more detailed to be safe.', next: 'c1', good: false, feedback: 'More words ≠ better. Without measurement you can\'t tell if it helped.' },
                  ],
                },
                c1: {
                  text: 'You now have a longer prompt, but no evidence it is better — or worse.',
                  choices: [{ label: 'Go back and build a test set first.', next: 's1', good: true }],
                },
                f1: {
                  end: 'fail',
                  text: '**Outcome:** In the first week, 12% of summaries get renewal dates wrong. Legal loses trust in the tool.',
                },
                s2: {
                  text: 'Running the test set: 8 of 50 summaries omit the contract value. What next?',
                  choices: [
                    { label: 'Change the prompt, the model and the temperature all at once to fix it fast.', next: 'c2', good: false, feedback: 'If results change, you won\'t know which change caused it.' },
                    { label: 'Inspect the 8 failures, find the pattern (values in tables), and change one thing: an explicit instruction to extract the contract value.', next: 's3', good: true, feedback: 'Error analysis → targeted, single-variable change.' },
                  ],
                },
                c2: {
                  text: 'Scores moved from 42/50 to 44/50, but two previously-passing cases now fail and you can\'t tell why.',
                  choices: [{ label: 'Revert and change one variable at a time.', next: 's2', good: true }],
                },
                s3: {
                  text: 'The fix scores 49/50. A week later a colleague edits the prompt to sound friendlier. What protects you?',
                  choices: [
                    { label: 'Rerun the test set on every prompt change before deploying (regression testing).', next: 'win', good: true, feedback: 'Prompts are code: version them and test them.' },
                    { label: 'Nothing needed — tone changes can\'t affect accuracy.', next: 'f2', good: false, feedback: 'Any change to a prompt can change behaviour.' },
                  ],
                },
                f2: {
                  end: 'fail',
                  text: '**Outcome:** The "friendlier" version adds a chatty intro that pushes summaries past the length limit, and contract values disappear again.',
                },
                win: {
                  end: 'success',
                  text: '**Outcome:** The tone change is caught in CI when accuracy drops to 45/50. Your colleague adjusts it, the tests pass, and it ships safely. 🎉',
                },
              },
            },
            {
              type: 'flashcards',
              title: 'Course review',
              cards: [
                { front: 'Zero-shot prompting', back: 'Asking the model to do a task with instructions only, no examples.' },
                { front: 'Few-shot prompting', back: 'Including a few input → output examples to show the format, labels or style.' },
                { front: 'Chain of thought', back: 'Asking the model to reason step by step before giving the final answer.' },
                { front: 'Temperature', back: 'Controls randomness of sampling. Low = focused/consistent, high = diverse/creative.' },
                { front: 'Context window', back: 'Max tokens the model can consider at once — input and output combined.' },
                { front: 'Prompt chaining', back: 'Splitting a task into a sequence of prompts where each output feeds the next.' },
              ],
            },
            {
              type: 'quiz',
              q: 'Which is the most reliable way to know whether a prompt change is an improvement?',
              options: [
                'Try it on one example you like',
                'Ask the model whether the new prompt is better',
                'Run both versions on the same representative test set and compare scores',
                'Check whether the new prompt is longer',
              ],
              a: 2,
              explain: 'Only a consistent, representative evaluation tells you whether a change helps across real inputs.',
            },
          ],
        },
      ],
    },
  ],
  examQuestions: [
    {
      q: "What is 'Zero-shot' prompting?",
      options: ['Providing examples before asking', 'Asking a model to perform a task without any examples', 'Using zero context', 'Prompting with zero parameters'],
      a: 1,
      explain: 'Zero-shot = instructions only, no worked examples.',
    },
    {
      q: 'Chain of Thought prompting is best described as:',
      options: ['Linking multiple prompts together', 'Asking the AI to reason step-by-step before answering', 'A method to train the model', 'A way to reduce token cost'],
      a: 1,
      explain: 'CoT elicits intermediate reasoning steps before the final answer. (Linking prompts is prompt chaining.)',
    },
    {
      q: 'Roughly how many English words does 1,000 tokens represent?',
      options: ['About 100', 'About 750', 'About 4,000', 'Exactly 1,000'],
      a: 1,
      explain: 'One token ≈ ¾ of an English word on average.',
    },
    {
      q: 'Which statement about the context window is TRUE?',
      options: [
        'It only counts the tokens in your system prompt',
        'It includes input tokens and the tokens the model generates',
        'It is unlimited for paid accounts',
        'It stores memory permanently across sessions',
      ],
      a: 1,
      explain: 'The window covers everything the model processes in a call — prompt, history, documents and output.',
    },
    {
      q: 'For extracting fields from invoices into JSON, which temperature is most appropriate?',
      options: ['0 or close to 0', '1.0', '1.5', '2.0'],
      a: 0,
      explain: 'Extraction needs consistency, not creativity.',
    },
    {
      q: 'What does top-p (nucleus) sampling with p = 0.9 do?',
      options: [
        'Keeps the 90 most likely tokens',
        'Samples only from the smallest set of tokens whose probabilities sum to 90%',
        'Makes the output 90% shorter',
        'Picks the top token 90% of the time',
      ],
      a: 1,
      explain: 'Top-p truncates the long tail of unlikely tokens, then renormalizes.',
    },
    {
      q: 'A model response stops mid-sentence. What is the most likely cause?',
      options: ['Temperature is too low', 'The max tokens limit was reached', 'The prompt used delimiters', 'Top-p was set to 1.0'],
      a: 1,
      explain: 'Hitting the output token cap truncates the response.',
    },
    {
      q: 'Which prompt component tells the model the audience and the facts it cannot know on its own?',
      options: ['Role', 'Context', 'Output format', 'Temperature'],
      a: 1,
      explain: 'Context supplies facts, audience and purpose.',
    },
    {
      q: 'Which instruction is the most effective?',
      options: ["Don't be too wordy.", 'Keep it short-ish.', 'Answer in at most 3 sentences.', 'Be concise if possible.'],
      a: 2,
      explain: 'Positive, measurable instructions beat vague negatives.',
    },
    {
      q: 'Your few-shot classifier over-predicts one label. The most likely cause is:',
      options: ['Temperature is 0', 'The examples are unbalanced across labels', 'The prompt uses XML tags', 'The model has too large a context window'],
      a: 1,
      explain: 'Models pick up label frequency from examples; balance them.',
    },
    {
      q: 'What is the main purpose of few-shot examples?',
      options: [
        'To permanently fine-tune the model',
        'To demonstrate the desired format, labels or style inside the prompt',
        'To increase randomness',
        'To reduce the number of tokens',
      ],
      a: 1,
      explain: 'Examples show rather than tell; they do not change model weights.',
    },
    {
      q: 'Why can asking for "just the final answer" hurt accuracy on a multi-step math problem?',
      options: [
        'The model has no room to generate intermediate reasoning it can build on',
        'Short answers use more tokens',
        'Math requires a high temperature',
        'Final answers are always filtered',
      ],
      a: 0,
      explain: 'Reasoning tokens act as the model\'s scratch pad.',
    },
    {
      q: 'Self-consistency prompting means:',
      options: [
        'Using the same prompt for every task',
        'Sampling several reasoning paths and choosing the most common answer',
        'Asking the model if it is consistent',
        'Setting temperature to 0',
      ],
      a: 1,
      explain: 'Majority vote over diverse reasoning paths improves reliability.',
    },
    {
      q: 'Why wrap user-provided documents in delimiters such as <document> tags?',
      options: [
        'To make the output longer',
        'To separate data from instructions and reduce the risk of the data being treated as instructions',
        'Because models cannot read plain text',
        'To lower the price per token',
      ],
      a: 1,
      explain: 'Delimiters clarify structure and help resist injected instructions.',
    },
    {
      q: 'The best way to get reliably parseable JSON from a model is to:',
      options: [
        'Ask politely for JSON',
        'Provide an explicit schema, say to return only JSON, and use the API\'s structured-output mode if available',
        'Use a high temperature',
        'Ask for a table instead',
      ],
      a: 1,
      explain: 'Schema + output-only instruction + enforcement gives consistent results.',
    },
    {
      q: 'In a RAG system, what happens right after the user\'s question is embedded?',
      options: [
        'The model is fine-tuned on the question',
        'The most similar document chunks are retrieved from the vector index',
        'All documents are pasted into the prompt',
        'The answer is generated without context',
      ],
      a: 1,
      explain: 'Retrieval selects relevant chunks to ground the answer.',
    },
    {
      q: 'The "lost in the middle" effect suggests you should:',
      options: [
        'Always use the maximum context size',
        'Place key information prominently and keep context focused on what is relevant',
        'Put the question in the middle of the documents',
        'Remove all instructions',
      ],
      a: 1,
      explain: 'Models often under-use information buried mid-context.',
    },
    {
      q: 'For a long document plus a question, a generally effective ordering is:',
      options: ['Question first, then the document', 'Document first, then the question and instructions', 'Question in the middle', 'Document only, no question'],
      a: 1,
      explain: 'Placing the query after long content typically improves quality.',
    },
    {
      q: 'You changed the prompt, model and temperature together, and results got slightly better. What is the problem?',
      options: ['Nothing — ship it', "You can't tell which change caused the improvement (or any new regressions)", 'Temperature changes are not allowed', 'The model cannot be changed'],
      a: 1,
      explain: 'Change one variable at a time to attribute effects.',
    },
    {
      q: 'Which practice best protects a production prompt from accidental regressions?',
      options: [
        'Never changing it',
        'Versioning prompts and re-running a test set on every change',
        'Using temperature 2.0',
        'Adding "be accurate" to the prompt',
      ],
      a: 1,
      explain: 'Treat prompts like code: version control plus regression tests.',
    },
  ],
};
