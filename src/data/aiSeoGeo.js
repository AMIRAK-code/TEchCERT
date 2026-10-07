export default {
  id: 'ai-seo-geo',
  title: 'AI SEO & GEO Specialist',
  tagline: 'Get found in search results — and cited in AI answers.',
  description:
    'Master technical SEO, helpful content and structured data, then extend them to Generative Engine Optimization (GEO): how AI answer engines crawl, choose and cite sources.',
  icon: 'SearchCheck',
  duration: '4 Hours',
  level: 'Intermediate',
  passMark: 70,
  examSize: 15,
  examMinutes: 25,
  outcomes: [
    'Explain how search is shifting from ranked links to AI-generated answers',
    'Audit crawlability, robots.txt and Core Web Vitals',
    'Write people-first content that meets Google\'s helpful-content and spam policies',
    'Map keywords to search intent and add valid structured data',
    'Structure pages so AI answer engines can quote and cite them',
    'Control and measure how AI crawlers and assistants use your content',
  ],
  modules: [
    {
      id: 'm1',
      title: 'Search Foundations',
      lessons: [
        {
          id: 'search-to-answers',
          title: 'From ten blue links to AI answers',
          minutes: 25,
          blocks: [
            {
              type: 'text',
              text: [
                'For twenty years, search meant a ranked list of links. Today a growing share of queries is answered directly: Google\'s **AI Overviews** and **AI Mode**, **ChatGPT search**, **Perplexity**, **Microsoft Copilot** and **Claude** all write an answer and cite a handful of sources.',
                '**SEO** (search engine optimization) earns you a position in the ranked results. **GEO** (generative engine optimization) earns you a place *inside the answer* — as a cited source. The two overlap heavily: AI answer engines still retrieve pages through a search index, so a page that cannot be crawled or ranked rarely gets cited.',
              ],
            },
            {
              type: 'list',
              items: [
                '**Crawl** — a bot fetches your page. If robots.txt blocks it, or the content needs JavaScript the bot doesn\'t run, nothing else matters.',
                '**Index** — the page is parsed and stored. Duplicate, thin or `noindex` pages drop out here.',
                '**Rank / retrieve** — for a query, the engine picks the most relevant, trustworthy pages.',
                '**Answer & cite** (AI engines) — a model reads the retrieved passages, writes an answer and links the sources it used.',
              ],
            },
            {
              type: 'classify',
              title: 'Classic SEO, GEO, or both?',
              categories: ['Mostly classic SEO', 'Mostly GEO', 'Both'],
              items: [
                { text: 'Making sure the page can be crawled and indexed', cat: 'Both', why: 'AI engines retrieve from crawled pages too — no crawl, no citation.' },
                { text: 'Writing a self-contained, quotable answer in the first paragraph', cat: 'Mostly GEO', why: 'Answer engines lift short passages; a direct answer is easy to quote.' },
                { text: 'Earning a higher position for a query on the results page', cat: 'Mostly classic SEO' },
                { text: 'Tracking how often ChatGPT or Perplexity cites your brand', cat: 'Mostly GEO' },
                { text: 'Demonstrating real experience and expertise', cat: 'Both', why: 'Trust signals help both ranking systems and source selection for answers.' },
                { text: 'Optimizing a title tag for click-through from the results page', cat: 'Mostly classic SEO' },
              ],
            },
            {
              type: 'callout',
              variant: 'info',
              title: 'Zero-click is real',
              text: 'When the answer appears on the results page, fewer people click through. That makes being the **cited source** — with your brand name in the answer — more valuable, and makes raw traffic a weaker success metric on its own.',
            },
            {
              type: 'quiz',
              q: 'Why does classic technical SEO still matter for GEO?',
              options: [
                'It doesn\'t — AI engines read the whole web from memory',
                'AI answer engines retrieve pages from a crawled index; pages that cannot be crawled or indexed are rarely cited',
                'GEO only works for sites that pay for ads',
                'Because AI engines only cite the #1 result',
              ],
              a: 1,
              explain: 'Retrieval comes before generation. A page that isn\'t crawled and indexed isn\'t available to be cited.',
            },
          ],
        },
        {
          id: 'technical-foundations',
          title: 'Technical foundations: crawling & Core Web Vitals',
          minutes: 30,
          blocks: [
            {
              type: 'text',
              text: [
                '**robots.txt** tells crawlers which paths they may fetch. It is a request, not access control: well-behaved bots obey it, but it does not hide content, and a URL blocked in robots.txt can still appear in results if other sites link to it. To keep a page out of the index, allow crawling and use a `noindex` meta tag — the crawler must be able to fetch the page to see that tag.',
              ],
            },
            {
              type: 'code',
              caption: 'A minimal, healthy robots.txt',
              text: 'User-agent: *\nDisallow: /cart/\nDisallow: /account/\n\nSitemap: https://www.example.com/sitemap.xml',
            },
            {
              type: 'spotFlaw',
              title: 'Audit this robots.txt',
              instructions: 'The site wants its blog and product pages in search and AI answers. Flag the lines that work against that goal.',
              lines: [
                { text: 'User-agent: *' },
                { text: 'Disallow: /', bad: true, why: 'Blocks every crawler from the entire site — often left over from a staging environment.' },
                { text: 'Disallow: /checkout/' },
                { text: 'Disallow: /assets/css/', bad: true, why: 'Search engines render pages; blocking CSS/JS can stop them from seeing the layout and content properly.' },
                { text: 'User-agent: OAI-SearchBot' },
                { text: 'Disallow: /blog/', bad: true, why: 'OAI-SearchBot powers ChatGPT search results. Blocking it removes the blog from ChatGPT\'s search answers.' },
                { text: 'Sitemap: https://www.example.com/sitemap.xml' },
              ],
              explain: 'The most expensive SEO bugs are one line long. Re-check robots.txt after every launch and migration.',
            },
            {
              type: 'text',
              text: [
                '**Core Web Vitals** are Google\'s user-experience metrics, measured on real visitors (field data). They are a ranking signal, though a modest one compared with relevance — but slow pages also lose visitors and conversions.',
              ],
            },
            {
              type: 'match',
              title: 'Match each Core Web Vital to what it measures',
              pairs: [
                { left: 'LCP — Largest Contentful Paint', right: 'Loading: when the main content appears (good ≤ 2.5 s)' },
                { left: 'INP — Interaction to Next Paint', right: 'Responsiveness: delay after clicks and taps (good ≤ 200 ms)' },
                { left: 'CLS — Cumulative Layout Shift', right: 'Visual stability: how much the layout jumps (good ≤ 0.1)' },
              ],
            },
            {
              type: 'callout',
              variant: 'tip',
              title: 'Render the content in HTML',
              text: 'Many AI crawlers do not execute JavaScript. If your article text only appears after client-side rendering, they may see an empty page. Server-side rendering or static generation keeps content visible to every bot.',
            },
            {
              type: 'quiz',
              q: 'You want a thin tag page removed from Google\'s index. What should you do?',
              options: [
                'Disallow it in robots.txt',
                'Allow crawling and add a noindex robots meta tag',
                'Delete the sitemap',
                'Add more keywords to it',
              ],
              a: 1,
              explain: 'Google has to crawl the page to see noindex. A robots.txt block can leave the URL indexed without content.',
            },
            {
              type: 'quiz',
              q: 'INP replaced which metric as a Core Web Vital in March 2024?',
              options: ['LCP', 'CLS', 'FID (First Input Delay)', 'TTFB'],
              a: 2,
              explain: 'INP measures responsiveness across all interactions, not just the first one, and replaced FID.',
            },
          ],
        },
        {
          id: 'helpful-content',
          title: 'Helpful content, E-E-A-T & AI-written pages',
          minutes: 30,
          blocks: [
            {
              type: 'text',
              text: [
                'Google\'s ranking systems aim to reward **people-first content**: written to help a reader, not to attract search traffic. Its quality raters judge pages on **E-E-A-T** — Experience, Expertise, Authoritativeness and Trust, with trust the most important.',
                'Google\'s position on AI-generated content is about *quality, not origin*: using AI is not against its guidelines. What is against them is **scaled content abuse** — generating many pages primarily to manipulate rankings, with little value for users, whether made by AI, people, or both.',
              ],
            },
            {
              type: 'classify',
              title: 'Helpful content or spam risk?',
              categories: ['Helpful', 'Spam risk'],
              items: [
                { text: 'A review with original photos and measurements from testing the product for 3 months', cat: 'Helpful' },
                { text: '5,000 AI-generated "best plumber in [city]" pages with only the city name changed', cat: 'Spam risk', why: 'Scaled content abuse: mass-produced pages with no unique value.' },
                { text: 'An AI-assisted guide, fact-checked and expanded by a named expert', cat: 'Helpful', why: 'AI use is fine; expert review and original insight add value.' },
                { text: 'Rewriting competitors\' top articles with an AI paraphraser', cat: 'Spam risk', why: 'Adds nothing new; scraped or spun content is spam.' },
                { text: 'An author page showing the writer\'s credentials and other work', cat: 'Helpful' },
                { text: 'Changing the "last updated" date daily without changing the content', cat: 'Spam risk', why: 'Fake freshness signals mislead users and search engines.' },
              ],
            },
            {
              type: 'promptCompare',
              title: 'Generic AI article vs. experience-led draft',
              versions: [
                {
                  label: 'Generic',
                  prompt: 'Write a 1,500-word SEO article about how long running shoes last. Include the keyword "how long do running shoes last" many times.',
                  output:
                    'How long do running shoes last? This is a question many runners ask. How long do running shoes last depends on many factors. In this article we will explore how long do running shoes last…',
                  notes: ['Keyword repetition, no original information.', 'Indistinguishable from thousands of other pages — nothing to rank or cite.'],
                },
                {
                  label: 'Experience-led',
                  prompt:
                    'Draft an article from our test notes below. Our team logged mileage on 12 pairs over 18 months and measured midsole compression every 100 km.\nLead with a direct 2-sentence answer. Include our data table and the three wear signs we observed. Mark any claim not supported by the notes with [CHECK].\n\n<notes>…</notes>',
                  output:
                    'Most of the 12 pairs we tested lost noticeable cushioning between 550 and 750 km. Heavier runners and road-only use wore them out sooner.\n\n| Shoe | km at 20% compression |\n|---|---|\n| …',
                  notes: ['First-hand data no one else has — the strongest E-E-A-T and citation signal.', '[CHECK] markers send uncertain claims to a human.'],
                },
              ],
            },
            {
              type: 'quiz',
              q: 'According to Google\'s guidance, AI-generated content is:',
              options: [
                'Always penalized',
                'Acceptable if it is helpful and not produced primarily to manipulate rankings',
                'Only allowed with a watermark',
                'Banned for YMYL topics',
              ],
              a: 1,
              explain: 'Google evaluates quality and intent, not how content was produced. Scaled, low-value content is the problem.',
            },
          ],
        },
      ],
    },
    {
      id: 'm2',
      title: 'Content & Structure',
      lessons: [
        {
          id: 'keyword-to-intent',
          title: 'From keywords to search intent',
          minutes: 25,
          blocks: [
            {
              type: 'text',
              text: [
                'A keyword is what people type; **intent** is what they want. Ranking — and being cited — depends on matching the format and depth the searcher expects. AI makes intent mapping fast: give it a keyword list and ask it to classify and cluster, then verify by looking at the actual results page.',
              ],
            },
            {
              type: 'match',
              title: 'Match the query to its intent',
              pairs: [
                { left: '"what is schema markup"', right: 'Informational — wants an explanation' },
                { left: '"semrush vs ahrefs"', right: 'Commercial investigation — comparing before buying' },
                { left: '"buy trail running shoes size 44"', right: 'Transactional — ready to purchase' },
                { left: '"gmail login"', right: 'Navigational — wants a specific site' },
              ],
            },
            {
              type: 'text',
              text: [
                'Conversational AI has stretched queries: people now ask full questions with context ("I run 30 km a week on trails, which shoes should I replace first?"). Answer engines break such prompts into several sub-searches (often called **query fan-out**) and assemble an answer. Pages that cover a topic thoroughly — including the follow-up questions — get retrieved for more of those sub-queries.',
              ],
            },
            {
              type: 'order',
              title: 'An AI-assisted topic cluster workflow',
              items: [
                'Export real queries from Search Console and keyword tools',
                'Ask the model to classify each query by intent and group them into topics',
                'Check a sample against the live results page to confirm the intent',
                'Choose one pillar page per topic and supporting pages for sub-questions',
                'Link the pages together with descriptive anchor text',
                'Track rankings, citations and conversions per cluster',
              ],
            },
            {
              type: 'quiz',
              q: 'The top results for a query are all comparison tables. Your page is a 3,000-word history of the product category. What is the likely problem?',
              options: [
                'The page is too short',
                'Intent mismatch: searchers want a comparison, not a history',
                'Missing meta keywords tag',
                'The page needs more images',
              ],
              a: 1,
              explain: 'The results page shows what format satisfies the intent. Match it.',
            },
          ],
        },
        {
          id: 'structured-data',
          title: 'Structured data & rich results',
          minutes: 30,
          blocks: [
            {
              type: 'text',
              text: [
                '**Structured data** describes a page in a machine-readable vocabulary (schema.org). Google recommends the **JSON-LD** format: a script block that doesn\'t touch your visible HTML. It can make pages eligible for **rich results** (stars, prices, breadcrumbs, event dates) and helps every machine — including AI systems — understand what the page is about.',
                'Two hard rules: the markup must describe content that is **visible on the page**, and it must be **truthful**. Marking up reviews that don\'t exist is spam and can lead to a manual action.',
              ],
            },
            {
              type: 'code',
              caption: 'Product markup in JSON-LD',
              text: '<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "Product",\n  "name": "TrailMax 3 Running Shoe",\n  "brand": { "@type": "Brand", "name": "TrailMax" },\n  "offers": {\n    "@type": "Offer",\n    "price": "129.00",\n    "priceCurrency": "EUR",\n    "availability": "https://schema.org/InStock"\n  }\n}\n</script>',
            },
            {
              type: 'spotFlaw',
              title: 'Review this structured-data plan',
              lines: [
                { text: 'Add Product markup with name, brand, price and availability to every product page.' },
                { text: 'Add a 4.9-star AggregateRating to pages that have no reviews yet, "to boost CTR".', bad: true, why: 'Markup must reflect real, visible content. Fake ratings are a spam violation.' },
                { text: 'Add BreadcrumbList markup matching the visible breadcrumb trail.' },
                { text: 'Put FAQ markup on every product page to guarantee FAQ rich results.', bad: true, why: 'Since August 2023, Google shows FAQ rich results only for well-known, authoritative government and health sites. Markup never guarantees a rich result.' },
                { text: 'Validate the pages with the Rich Results Test before launch.' },
              ],
              explain: 'Structured data is a description, not a ranking trick: accurate, visible, validated.',
            },
            {
              type: 'quiz',
              q: 'Which statement about structured data is correct?',
              options: [
                'It guarantees rich results',
                'It must describe content that is visible on the page, and Google recommends JSON-LD',
                'It replaces the need for good content',
                'It is only read by Google',
              ],
              a: 1,
              explain: 'Markup makes a page eligible, never guaranteed, and must match the visible content.',
            },
          ],
        },
      ],
    },
    {
      id: 'm3',
      title: 'Generative Engine Optimization',
      lessons: [
        {
          id: 'geo-principles',
          title: 'GEO: becoming the cited source',
          minutes: 35,
          blocks: [
            {
              type: 'text',
              text: [
                'The term **GEO** comes from a 2023 research paper (Aggarwal et al., *"GEO: Generative Engine Optimization"*, published at KDD 2024). The authors tested how page edits change visibility in AI-generated answers. Adding **citations to sources, quotations from experts and relevant statistics** raised visibility substantially — while classic **keyword stuffing** did little or made it worse.',
                'The intuition: an answer engine is looking for passages it can **lift and attribute** — clear, specific, verifiable statements. Vague marketing copy gives it nothing to quote.',
              ],
            },
            { type: 'geoLab' },
            {
              type: 'list',
              items: [
                '**Answer first** — put a direct 1–2 sentence answer near the top, then the detail.',
                '**Make passages self-contained** — each section should make sense if quoted alone.',
                '**Add evidence** — statistics with sources, expert quotes, original data.',
                '**Use clear structure** — descriptive headings, lists and tables that map to sub-questions.',
                '**Be consistent about entities** — the same brand, product and author names everywhere, including on other sites that mention you.',
                '**Keep it current** — update facts and show a real "last updated" date.',
              ],
            },
            {
              type: 'promptCompare',
              title: 'Hard to cite vs. easy to cite',
              versions: [
                {
                  label: 'Hard to cite',
                  prompt: 'Opening paragraph of a page about running-shoe lifespan:',
                  output:
                    'At StrideCo, we\'re passionate about running! Everyone\'s journey is different, and there are so many factors to consider when it comes to your favourite shoes. Let\'s dive in and explore this exciting topic together!',
                  notes: ['No answer, no facts, no source.', 'Nothing an AI answer could quote.'],
                },
                {
                  label: 'Easy to cite',
                  prompt: 'Opening paragraph of a page about running-shoe lifespan:',
                  output:
                    'Most running shoes last 500–800 km. In StrideCo\'s 2025 wear test of 12 pairs, cushioning dropped by 20% after a median of 640 km; runners over 80 kg reached that point about 15% sooner.',
                  notes: ['Direct answer in the first sentence.', 'Original statistic, attributed — exactly what answer engines quote.'],
                },
              ],
            },
            {
              type: 'quiz',
              q: 'In the GEO study by Aggarwal et al., which kind of edit tended to increase visibility in generative engine answers?',
              options: [
                'Repeating the target keyword more often',
                'Adding citations, quotations and statistics',
                'Making the page longer with filler',
                'Hiding text in white font',
              ],
              a: 1,
              explain: 'Evidence-rich, quotable content helped; keyword stuffing did not.',
            },
          ],
        },
        {
          id: 'ai-crawlers',
          title: 'AI crawlers, robots.txt & llms.txt',
          minutes: 30,
          blocks: [
            {
              type: 'text',
              text: [
                'AI companies run **several different bots** with different jobs. The key distinction: bots that collect data for **training** models, bots that index pages for **AI search**, and agents that fetch a page **because a user asked** right now. You can allow one and block another in robots.txt.',
              ],
            },
            {
              type: 'match',
              title: 'Match the user-agent to its job',
              pairs: [
                { left: 'GPTBot', right: 'OpenAI — collects content that may be used to train models' },
                { left: 'OAI-SearchBot', right: 'OpenAI — indexes pages for ChatGPT search results' },
                { left: 'ChatGPT-User', right: 'OpenAI — fetches a page when a user\'s request needs it' },
                { left: 'ClaudeBot', right: 'Anthropic — collects content that may be used for training' },
                { left: 'Claude-SearchBot', right: 'Anthropic — indexes pages to improve Claude\'s search results' },
                { left: 'Google-Extended', right: 'Google — a control token for Gemini training and grounding; not a separate crawler' },
              ],
            },
            {
              type: 'list',
              items: [
                '**Anthropic** also uses **Claude-User** for fetches a user asks for. **Perplexity** uses **PerplexityBot** for its index (and Perplexity-User for user-requested fetches).',
                '**Google-Extended does not affect Google Search** — blocking it does not remove you from Search or from AI Overviews, which are part of Search and use Googlebot.',
                '**Microsoft Copilot** answers are grounded in the **Bing** index, crawled by **Bingbot**.',
                'Bots that act on a direct user request may not follow robots.txt the way crawlers do — check each vendor\'s documentation.',
              ],
            },
            {
              type: 'code',
              caption: 'Allow AI search, opt out of model training',
              text: 'User-agent: GPTBot\nDisallow: /\n\nUser-agent: ClaudeBot\nDisallow: /\n\nUser-agent: Google-Extended\nDisallow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: Claude-SearchBot\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /',
            },
            {
              type: 'callout',
              variant: 'info',
              title: 'What about llms.txt?',
              text: '**llms.txt** is a *proposed* convention (2024): a Markdown file at /llms.txt that summarizes a site and links to LLM-friendly versions of key pages. It is not a standard, and major search and AI providers have not committed to using it for ranking or citation. It is cheap to add — just don\'t expect it to replace robots.txt, sitemaps or good content.',
            },
            {
              type: 'scenario',
              title: 'The publisher\'s dilemma',
              start: 's1',
              nodes: {
                s1: {
                  text: 'A news publisher\'s CEO says: "Block every AI bot. They\'re stealing our content." Referral traffic from ChatGPT and Perplexity has been growing 20% a month. What do you recommend?',
                  choices: [
                    { label: 'Block all AI user-agents, including the search bots.', next: 'f1', good: false, feedback: 'This also removes the site from AI search answers and their growing referral traffic.' },
                    { label: 'Separate the decisions: opt out of training bots, keep AI search bots allowed, and review the numbers monthly.', next: 's2', good: true, feedback: 'Training and search are different bots with different trade-offs.' },
                  ],
                },
                s2: {
                  text: 'The CEO also wants to block Google-Extended "so we disappear from AI Overviews but stay in Google Search".',
                  choices: [
                    { label: 'Explain that Google-Extended does not control AI Overviews; those are part of Search, governed by Googlebot and snippet controls such as nosnippet.', next: 'win', good: true, feedback: 'Correct — Google-Extended affects Gemini training and grounding, not Search features.' },
                    { label: 'Block Google-Extended and promise the CEO it will work.', next: 'f2', good: false, feedback: 'It won\'t remove the site from AI Overviews.' },
                  ],
                },
                f1: { end: 'fail', text: '**Outcome:** AI referral traffic drops to near zero within weeks, and competitors become the cited sources.' },
                f2: { end: 'fail', text: '**Outcome:** The site still appears in AI Overviews. The CEO loses trust in the SEO team\'s advice.' },
                win: { end: 'success', text: '**Outcome:** Training opt-out in place, AI search traffic keeps growing, and leadership understands the real controls. ✅' },
              },
            },
            {
              type: 'quiz',
              q: 'A site blocks GPTBot but allows OAI-SearchBot. What is the effect?',
              options: [
                'The site disappears from ChatGPT entirely',
                'Content is opted out of OpenAI model training but can still appear in ChatGPT search results',
                'Google stops indexing the site',
                'Nothing — OpenAI uses one bot for everything',
              ],
              a: 1,
              explain: 'OpenAI separates training (GPTBot) from search indexing (OAI-SearchBot).',
            },
          ],
        },
        {
          id: 'measuring',
          title: 'Measuring SEO & AI visibility',
          minutes: 25,
          blocks: [
            {
              type: 'text',
              text: [
                'Classic SEO has mature measurement: **Google Search Console** shows impressions, clicks, average position and click-through rate per query and page — and AI Overviews / AI Mode appearances are counted within those Search totals. Measuring visibility *inside* AI assistants is younger and messier.',
              ],
            },
            {
              type: 'list',
              items: [
                '**Referral traffic** — analytics shows visits from chatgpt.com, perplexity.ai, copilot.microsoft.com, claude.ai and others. Small but often high-intent.',
                '**Citation tracking** — run a fixed set of real customer questions through the main assistants on a schedule and record whether and how you are cited. Answers vary between runs, so look at trends over many prompts, not single screenshots.',
                '**Server logs** — see which AI crawlers fetch which pages, and how often.',
                '**Brand mentions** — answers often name brands without linking; track mentions as well as links.',
                '**Business outcomes** — sign-ups, leads and revenue per channel matter more than raw visibility.',
              ],
            },
            {
              type: 'classify',
              title: 'Which source answers the question?',
              categories: ['Search Console', 'Analytics / referrals', 'Server logs', 'Prompt tracking'],
              items: [
                { text: 'Which queries show our page in Google, and at what position?', cat: 'Search Console' },
                { text: 'How many sessions came from perplexity.ai last month?', cat: 'Analytics / referrals' },
                { text: 'Is OAI-SearchBot actually fetching our new guides?', cat: 'Server logs' },
                { text: 'Does ChatGPT mention us when asked for "best invoicing tools for freelancers"?', cat: 'Prompt tracking' },
                { text: 'Did click-through rate fall after an AI Overview appeared for our query?', cat: 'Search Console' },
              ],
            },
            {
              type: 'flashcards',
              title: 'Course review',
              cards: [
                { front: 'GEO', back: 'Generative Engine Optimization — making content easy for AI answer engines to retrieve, quote and cite.' },
                { front: 'noindex vs. robots.txt', back: 'robots.txt controls crawling; noindex controls indexing. A page must be crawlable for noindex to be seen.' },
                { front: 'Core Web Vitals', back: 'LCP (loading ≤ 2.5 s), INP (responsiveness ≤ 200 ms), CLS (stability ≤ 0.1).' },
                { front: 'Scaled content abuse', back: 'Mass-producing low-value pages to manipulate rankings — a Google spam policy, however the content is made.' },
                { front: 'GPTBot vs. OAI-SearchBot', back: 'Training crawler vs. ChatGPT search indexer — controlled separately in robots.txt.' },
                { front: 'Google-Extended', back: 'Opt-out token for Gemini training/grounding. Does not affect Google Search or AI Overviews.' },
                { front: 'llms.txt', back: 'A proposed (not standard) Markdown file summarizing a site for LLMs.' },
              ],
            },
            {
              type: 'quiz',
              q: 'You check ChatGPT once and your brand isn\'t cited. What is the right conclusion?',
              options: [
                'GEO doesn\'t work for your site',
                'One run proves little — answers vary; track a fixed prompt set over time',
                'Block OAI-SearchBot',
                'Rewrite every page immediately',
              ],
              a: 1,
              explain: 'AI answers are non-deterministic. Measure trends across many prompts and runs.',
            },
          ],
        },
      ],
    },
  ],
  examQuestions: [
    { q: 'What is the main difference between SEO and GEO?', options: ['GEO only applies to paid ads', 'SEO targets positions in ranked results; GEO targets being cited inside AI-generated answers', 'They are identical', 'GEO replaces the need for crawlable pages'], a: 1, explain: 'GEO extends SEO to answer engines that write responses and cite sources.' },
    { q: 'Why can a page that is blocked from crawling rarely be cited by AI answer engines?', options: ['AI engines only cite paid partners', 'They retrieve content from crawled pages before generating answers', 'Blocked pages load faster', 'robots.txt is ignored by everyone'], a: 1, explain: 'Retrieval depends on crawling and indexing.' },
    { q: 'What does "Disallow: /" under "User-agent: *" do?', options: ['Blocks only images', 'Asks all crawlers not to fetch any page on the site', 'Removes the site from the index immediately', 'Allows everything'], a: 1, explain: 'It blocks the whole site for all compliant crawlers.' },
    { q: 'To remove a page from Google\'s index, you should:', options: ['Disallow it in robots.txt', 'Allow crawling and add a noindex robots meta tag', 'Remove it from the sitemap only', 'Rename the URL'], a: 1, explain: 'Google must crawl the page to see noindex.' },
    { q: 'Which Core Web Vital measures responsiveness to user interactions?', options: ['LCP', 'CLS', 'INP', 'TTFB'], a: 2, explain: 'Interaction to Next Paint; good is 200 ms or less.' },
    { q: 'A "good" Largest Contentful Paint is:', options: ['≤ 2.5 seconds', '≤ 10 seconds', '≤ 0.1', '≤ 200 ms'], a: 0, explain: 'LCP should occur within 2.5 s for most visits.' },
    { q: 'Google\'s position on AI-generated content is that:', options: ['It is always spam', 'Quality and intent matter, not how the content was produced', 'It must be watermarked', 'It ranks higher automatically'], a: 1, explain: 'Helpful content is fine; content made primarily to manipulate rankings is not.' },
    { q: 'Which is an example of scaled content abuse?', options: ['A tested product review with original photos', 'Thousands of near-identical AI pages that only swap a city name', 'An expert-reviewed guide', 'A detailed author bio'], a: 1, explain: 'Mass-produced pages with no unique value violate Google\'s spam policies.' },
    { q: 'In E-E-A-T, which element does Google describe as the most important?', options: ['Experience', 'Expertise', 'Authoritativeness', 'Trust'], a: 3, explain: 'Trust is at the center of E-E-A-T.' },
    { q: 'The query "semrush vs ahrefs" most likely has which intent?', options: ['Navigational', 'Commercial investigation', 'Transactional', 'Local'], a: 1, explain: 'The searcher is comparing options before a purchase.' },
    { q: 'Which structured-data format does Google recommend?', options: ['Microdata only', 'JSON-LD', 'RDFa only', 'Meta keywords'], a: 1, explain: 'JSON-LD is Google\'s recommended format.' },
    { q: 'Adding AggregateRating markup to a page with no visible reviews is:', options: ['A smart CTR tactic', 'A spam violation — markup must reflect real, visible content', 'Required for products', 'Ignored and harmless'], a: 1, explain: 'Misleading markup can trigger a manual action.' },
    { q: 'Since August 2023, FAQ rich results in Google are shown:', options: ['For every page with FAQ markup', 'Mainly for well-known, authoritative government and health sites', 'Only on mobile', 'Only for paid listings'], a: 1, explain: 'Google limited FAQ rich results to authoritative government and health sites.' },
    { q: 'In the GEO study by Aggarwal et al., which change performed poorly?', options: ['Adding statistics', 'Adding quotations', 'Keyword stuffing', 'Citing sources'], a: 2, explain: 'Evidence helped; keyword stuffing did not.' },
    { q: 'Which page opening is most likely to be cited in an AI answer?', options: ['"We\'re passionate about helping you on your journey!"', 'A direct answer with a specific, attributed statistic', 'A list of keywords', 'A large hero image with no text'], a: 1, explain: 'Self-contained, specific, sourced passages are easy to lift and attribute.' },
    { q: 'What is the difference between GPTBot and OAI-SearchBot?', options: ['They are the same bot', 'GPTBot collects data that may be used for training; OAI-SearchBot indexes pages for ChatGPT search', 'OAI-SearchBot trains models; GPTBot serves ads', 'GPTBot is Google\'s crawler'], a: 1, explain: 'OpenAI separates training and search crawlers.' },
    { q: 'Blocking Google-Extended in robots.txt will:', options: ['Remove the site from Google Search', 'Remove the site from AI Overviews', 'Opt content out of Gemini training and grounding, without affecting Google Search', 'Block Googlebot'], a: 2, explain: 'Google-Extended does not affect Search or AI Overviews.' },
    { q: 'Microsoft Copilot answers are grounded mainly in which index?', options: ['Google', 'Bing', 'Perplexity', 'Common Crawl only'], a: 1, explain: 'Copilot uses Bing\'s index, crawled by Bingbot.' },
    { q: 'What is the status of llms.txt?', options: ['An official W3C standard', 'A proposed convention that major providers have not committed to using for ranking or citation', 'Required by the EU AI Act', 'A replacement for robots.txt'], a: 1, explain: 'It is a proposal; useful at most as a supplement.' },
    { q: 'What is the most reliable way to measure whether AI assistants cite your brand?', options: ['One screenshot of a single answer', 'Tracking a fixed set of real prompts across assistants over time', 'Counting keywords on your page', 'Checking robots.txt'], a: 1, explain: 'Answers vary between runs, so look at trends across many prompts.' },
  ],
};
