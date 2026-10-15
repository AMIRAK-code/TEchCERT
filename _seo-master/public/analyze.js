// Turns the crawl (site facts + parsed pages) into issues, scores and ready-to-use files.
// Pure functions only, no DOM, so the logic is easy to test and reuse.

// ---------- robots.txt ----------

export const SEARCH_BOTS = [
  { ua: 'Googlebot', label: 'Google Search', kind: 'search' },
  { ua: 'Bingbot', label: 'Bing (also feeds ChatGPT search and Copilot)', kind: 'search' },
  { ua: 'OAI-SearchBot', label: 'ChatGPT search', kind: 'answer' },
  { ua: 'ChatGPT-User', label: 'ChatGPT browsing for a user', kind: 'answer' },
  { ua: 'Claude-SearchBot', label: 'Claude search', kind: 'answer' },
  { ua: 'Claude-User', label: 'Claude fetching for a user', kind: 'answer' },
  { ua: 'PerplexityBot', label: 'Perplexity search', kind: 'answer' },
  { ua: 'Perplexity-User', label: 'Perplexity fetching for a user', kind: 'answer' },
  { ua: 'Applebot', label: 'Apple (Siri, Spotlight)', kind: 'search' },
  { ua: 'DuckDuckBot', label: 'DuckDuckGo', kind: 'search' },
];
export const TRAINING_BOTS = [
  { ua: 'GPTBot', label: 'OpenAI model training', kind: 'training' },
  { ua: 'ClaudeBot', label: 'Anthropic model training', kind: 'training' },
  { ua: 'Google-Extended', label: 'Gemini training (does not affect Google Search)', kind: 'training' },
  { ua: 'Applebot-Extended', label: 'Apple AI training', kind: 'training' },
  { ua: 'CCBot', label: 'Common Crawl (used by many AI labs)', kind: 'training' },
  { ua: 'Meta-ExternalAgent', label: 'Meta AI training', kind: 'training' },
];
const CRITICAL_BOTS = ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'PerplexityBot', 'Claude-SearchBot'];

export function parseRobots(text) {
  const groups = [];
  const sitemaps = [];
  let current = null;
  let lastWasAgent = false;
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const field = m[1].toLowerCase();
    const value = m[2].trim();
    if (field === 'user-agent') {
      if (!current || !lastWasAgent) groups.push((current = { agents: [], rules: [] }));
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (field === 'allow' || field === 'disallow') {
      if (current) current.rules.push({ type: field, path: value });
      lastWasAgent = false;
    } else {
      if (field === 'sitemap') sitemaps.push(value);
      lastWasAgent = false;
    }
  }
  return { groups, sitemaps };
}

function ruleMatches(rulePath, path) {
  if (!rulePath) return false;
  const re = new RegExp(
    '^' + rulePath.split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*').replace(/\\\$$/, '$'),
  );
  return re.test(path);
}

// Google's rules: the most specific group for the agent wins; within it the longest
// matching path wins, and Allow wins a tie.
export function robotsAllows(parsed, agent, path = '/') {
  const ua = agent.toLowerCase();
  let groups = parsed.groups.filter(g => g.agents.includes(ua));
  if (!groups.length) groups = parsed.groups.filter(g => g.agents.includes('*'));
  let best = null;
  for (const r of groups.flatMap(g => g.rules)) {
    if (r.type === 'disallow' && r.path === '') continue;
    if (!ruleMatches(r.path, path)) continue;
    const len = r.path.replace(/\*/g, '').length;
    if (!best || len > best.len || (len === best.len && r.type === 'allow')) best = { len, type: r.type };
  }
  return !best || best.type === 'allow';
}

// ---------- helpers ----------

const clip = (s, n) => {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ') > n * 0.6 ? cut.lastIndexOf(' ') : cut.length).replace(/[\s,;:.–-]+$/, '')}…`;
};
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const xmlEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const norm = u => {
  try {
    const x = new URL(u);
    x.hash = '';
    return x.href.replace(/\/$/, '');
  } catch {
    return u;
  }
};
const today = () => new Date().toISOString().slice(0, 10);

export function siteName(site) {
  const h = site.home || {};
  if (h.og?.['og:site_name']) return h.og['og:site_name'];
  const t = h.title || '';
  const parts = t.split(/\s+[|·•–—-]\s+/);
  if (parts.length > 1) return parts.reduce((a, b) => (a.length <= b.length ? a : b));
  return t || site.host;
}

// Drops a trailing " | Site name" so titles read cleanly in llms.txt and breadcrumbs.
function shortTitle(title, name) {
  if (!title) return '';
  const parts = title.split(/\s+[|·•–—]\s+/);
  if (parts.length > 1 && parts.at(-1).toLowerCase() === name.toLowerCase()) parts.pop();
  return parts.join(' | ');
}

const isIndexable = p =>
  p.html && p.status === 200 && !/noindex/i.test(`${p.robotsMeta || ''} ${p.xRobots || ''}`) && (!p.canonical || norm(p.canonical) === norm(p.url));

// ---------- issues ----------

const W = { critical: 25, warning: 10, info: 3 };

const DEFS = {
  // site level
  'robots-missing': { cat: 'technical', sev: 'warning', title: 'No robots.txt', why: 'Crawlers fall back to defaults and cannot find your sitemap from it.', fix: 'Publish the generated robots.txt at the site root.' },
  'robots-html': { cat: 'technical', sev: 'critical', title: 'robots.txt is served as an HTML page', why: 'Your server returns a web page (usually a single-page-app fallback) instead of the file, so crawlers see no rules and no sitemap.', fix: 'Add a real robots.txt file to the folder your host serves as static files.' },
  'robots-blocks-all': { cat: 'technical', sev: 'critical', title: 'robots.txt blocks search engines from the whole site', why: 'Googlebot or Bingbot is disallowed at "/", so the site cannot rank.', fix: 'Remove the "Disallow: /" rule for search engines.' },
  'sitemap-missing': { cat: 'technical', sev: 'warning', title: 'No XML sitemap', why: 'A sitemap tells search engines and IndexNow which pages exist and when they changed.', fix: 'Publish the generated sitemap.xml and reference it in robots.txt.' },
  'sitemap-html': { cat: 'technical', sev: 'critical', title: 'sitemap.xml is served as an HTML page', why: 'Search engines reject it, so none of the listed pages are discovered through it.', fix: 'Serve a real XML sitemap file at that address.' },
  'sitemap-invalid': { cat: 'technical', sev: 'warning', title: 'Sitemap is not valid XML sitemap format', why: 'It has no <urlset> or <sitemapindex> root element.', fix: 'Replace it with the generated sitemap.xml.' },
  'sitemap-not-declared': { cat: 'technical', sev: 'info', title: 'Sitemap is not listed in robots.txt', why: 'Bing, AI crawlers and other engines find sitemaps through the "Sitemap:" line.', fix: 'Add a "Sitemap: https://…/sitemap.xml" line to robots.txt.' },
  'sitemap-broken': { cat: 'technical', sev: 'warning', title: 'Sitemap lists pages that do not load', why: 'Broken or redirected URLs in a sitemap waste crawl budget and lower trust in the file.', fix: 'Remove or fix these URLs; the generated sitemap.xml leaves them out.' },
  'sitemap-gaps': { cat: 'technical', sev: 'info', title: 'Indexable pages missing from the sitemap', why: 'Pages only reachable through links are discovered later.', fix: 'Use the generated sitemap.xml, which includes them.' },
  'no-https-redirect': { cat: 'technical', sev: 'warning', title: 'http:// does not redirect to https://', why: 'Two versions of each page split ranking signals and can show visitors an insecure page.', fix: 'Add a permanent (301) redirect from http to https.' },
  'llms-missing': { cat: 'geo', sev: 'warning', title: 'No llms.txt', why: 'llms.txt gives AI assistants a short, clean map of your site and its key pages.', fix: 'Publish the generated llms.txt at the site root.' },
  'llms-html': { cat: 'geo', sev: 'warning', title: 'llms.txt is served as an HTML page', why: 'AI tools that look for it get your app shell instead of the map.', fix: 'Serve the generated llms.txt as a plain text file.' },
  'ai-search-blocked': { cat: 'geo', sev: 'critical', title: 'AI search engines are blocked in robots.txt', why: 'Blocked answer engines cannot read or cite your pages, so you do not appear in ChatGPT, Perplexity or Claude answers.', fix: 'Allow the search and answer bots listed below; the generated robots.txt does this.' },
  'ai-training-blocked': { cat: 'geo', sev: 'info', title: 'AI training crawlers are blocked', why: 'This is a business choice. It does not affect search or AI answer citations.', fix: 'No action needed unless you want your content used for model training.' },
  'no-site-schema': { cat: 'geo', sev: 'warning', title: 'Homepage has no Organization or WebSite structured data', why: 'Search engines and AI models use it to identify who runs the site and connect your brand across pages and profiles.', fix: 'Add the generated JSON-LD to the homepage <head>.' },
  // page level
  'http-error': { cat: 'technical', sev: 'critical', title: 'Page returns an error', why: 'Crawlers and visitors get no content.', fix: 'Fix the page or remove links to it.' },
  noindex: { cat: 'technical', sev: 'warning', title: 'Page is set to noindex', why: 'It will not appear in search results or most AI answers.', fix: 'Remove the noindex directive if the page should be found.' },
  slow: { cat: 'technical', sev: 'info', title: 'Slow server response (over 2 s)', why: 'Slow pages are crawled less often and lose visitors.', fix: 'Add caching or a CDN; check server-side work on this page.' },
  'js-shell': { cat: 'geo', sev: 'critical', title: 'Content only appears after JavaScript runs', why: 'The HTML is an empty app shell. Most AI crawlers (GPTBot, ClaudeBot, PerplexityBot) and social previews do not run JavaScript, so they see a blank page. Google indexes it later and less reliably.', fix: 'Prerender or server-render the page so its text is in the HTML.' },
  'title-missing': { cat: 'onpage', sev: 'critical', title: 'Missing <title>', why: 'The title is the main headline in search results and AI citations.', fix: 'Add the suggested title.' },
  'title-long': { cat: 'onpage', sev: 'info', title: 'Title longer than 60 characters', why: 'Search results cut it off.', fix: 'Shorten it; put the key phrase first.' },
  'title-short': { cat: 'onpage', sev: 'info', title: 'Title shorter than 20 characters', why: 'It leaves out words people search for.', fix: 'Describe the page more specifically.' },
  'title-dup': { cat: 'onpage', sev: 'warning', title: 'Same title as another page', why: 'Search engines cannot tell the pages apart and may show the wrong one.', fix: 'Give every page a unique title.' },
  'desc-missing': { cat: 'onpage', sev: 'warning', title: 'Missing meta description', why: 'Search engines then pick random text for the snippet.', fix: 'Add the suggested description.' },
  'desc-long': { cat: 'onpage', sev: 'info', title: 'Meta description longer than 160 characters', why: 'It is cut off in results.', fix: 'Trim it to about 150 characters.' },
  'desc-short': { cat: 'onpage', sev: 'info', title: 'Meta description shorter than 70 characters', why: 'A short snippet gives searchers little reason to click.', fix: 'Expand it with what the page offers.' },
  'desc-dup': { cat: 'onpage', sev: 'warning', title: 'Same meta description as another page', why: 'Duplicate snippets make pages look interchangeable.', fix: 'Write a description specific to each page.' },
  'h1-missing': { cat: 'onpage', sev: 'warning', title: 'No <h1> heading', why: 'The H1 tells crawlers and readers what the page is about.', fix: 'Add one H1 that states the page topic.' },
  'h1-multiple': { cat: 'onpage', sev: 'info', title: 'More than one <h1>', why: 'Several top headings blur the page topic.', fix: 'Keep one H1; use H2s for sections.' },
  'canonical-missing': { cat: 'onpage', sev: 'warning', title: 'No canonical URL', why: 'Without it, URL variants (tracking parameters, trailing slashes) compete with each other.', fix: 'Add <link rel="canonical"> pointing to the page itself.' },
  'canonical-other': { cat: 'onpage', sev: 'info', title: 'Canonical points to a different URL', why: 'This page asks search engines to index another URL instead.', fix: 'Check this is intended.' },
  'lang-missing': { cat: 'onpage', sev: 'info', title: 'No lang attribute on <html>', why: 'Search engines and screen readers use it to identify the language.', fix: 'Add lang="en" (or your language) to the <html> tag.' },
  'viewport-missing': { cat: 'onpage', sev: 'warning', title: 'No viewport meta tag', why: 'The page is not treated as mobile-friendly.', fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.' },
  'og-missing': { cat: 'onpage', sev: 'info', title: 'Missing Open Graph title or description', why: 'Links shared on LinkedIn, Slack, WhatsApp and X show a poor preview.', fix: 'Add og:title and og:description (included in the suggested head tags).' },
  'og-image-missing': { cat: 'onpage', sev: 'info', title: 'No og:image', why: 'Shared links show no picture, which lowers clicks.', fix: 'Add a 1200×630 share image as og:image.' },
  'img-alt': { cat: 'onpage', sev: 'info', title: 'Images without alt text', why: 'Image search and screen readers cannot understand them.', fix: 'Add a short alt description (alt="" for decorative images).' },
  'jsonld-invalid': { cat: 'geo', sev: 'warning', title: 'Structured data (JSON-LD) does not parse', why: 'Invalid JSON-LD is ignored entirely.', fix: 'Fix the JSON syntax error shown in the page details.' },
  'jsonld-none': { cat: 'geo', sev: 'info', title: 'No structured data', why: 'Schema markup (Article, Product, FAQ, Breadcrumb…) helps engines understand and cite the page.', fix: 'Add JSON-LD for the page type; a breadcrumb snippet is in the page details.' },
  thin: { cat: 'geo', sev: 'info', title: 'Thin content (under 250 words)', why: 'Short pages rarely rank or get cited unless they answer a precise question.', fix: 'Add useful detail: facts, steps, examples, a short FAQ.' },
  'no-subheadings': { cat: 'geo', sev: 'info', title: 'Long page with no H2 subheadings', why: 'AI engines quote well-labelled sections; a wall of text is hard to cite.', fix: 'Split the page into sections with descriptive or question-style H2s.' },
};

export function analyze(site, pages, opts = {}) {
  const issues = [];
  const add = (id, urls = null, detail = null) => issues.push({ id, ...DEFS[id], urls, detail });

  // Site-level
  const robots = parseRobots(site.robots.ok ? site.robots.body : '');
  if (site.robots.servedAsHtml) add('robots-html', [site.robots.url]);
  else if (!site.robots.ok) add('robots-missing');
  if (site.robots.ok && ['Googlebot', 'Bingbot'].some(b => !robotsAllows(robots, b, '/'))) add('robots-blocks-all');

  const bots = [...SEARCH_BOTS, ...TRAINING_BOTS].map(b => ({ ...b, allowed: robotsAllows(robots, b.ua, '/') }));
  const blockedSearch = bots.filter(b => b.kind !== 'training' && !b.allowed && CRITICAL_BOTS.includes(b.ua) && !['Googlebot', 'Bingbot'].includes(b.ua));
  if (blockedSearch.length) add('ai-search-blocked', null, blockedSearch.map(b => b.ua).join(', '));
  const blockedTraining = bots.filter(b => b.kind === 'training' && !b.allowed);
  if (blockedTraining.length) add('ai-training-blocked', null, blockedTraining.map(b => b.ua).join(', '));

  const goodSitemaps = site.sitemaps.filter(s => s.valid);
  const htmlSitemaps = site.sitemaps.filter(s => s.servedAsHtml);
  if (htmlSitemaps.length) add('sitemap-html', htmlSitemaps.map(s => s.url));
  else if (!goodSitemaps.length) {
    const invalid = site.sitemaps.filter(s => s.status === 200 && !s.valid);
    if (invalid.length) add('sitemap-invalid', invalid.map(s => s.url));
    else add('sitemap-missing');
  }
  if (goodSitemaps.length && site.robots.ok && !robots.sitemaps.length) add('sitemap-not-declared');
  if (site.httpsRedirect === false) add('no-https-redirect');
  if (site.llms.servedAsHtml) add('llms-html', [site.llms.url]);
  else if (!site.llms.ok) add('llms-missing');

  const home = site.home;
  const homeTypes = (home.jsonLd || []).flatMap(j => j.types);
  if (home.html && !homeTypes.some(t => /Organization|WebSite|LocalBusiness|Corporation|Person/.test(t))) add('no-site-schema');

  // Page-level
  const ok = pages.filter(p => p.html && p.status === 200);
  const by = (pred, id) => {
    const urls = pages.filter(pred).map(p => p.url);
    if (urls.length) add(id, urls);
  };
  by(p => p.status !== 200 || (!p.html && p.status !== 200), 'http-error');
  const inSitemap = new Set(site.sitemapUrls.map(u => norm(u.loc)));
  by(p => p.html && /noindex/i.test(`${p.robotsMeta || ''} ${p.xRobots || ''}`), 'noindex');
  by(p => p.ms > 2000, 'slow');
  by(p => p.html && p.jsShell, 'js-shell');
  by(p => p.html && !p.title, 'title-missing');
  by(p => p.title && p.title.length > 60, 'title-long');
  by(p => p.title && p.title.length < 20, 'title-short');
  by(p => p.html && !p.description, 'desc-missing');
  by(p => p.description && p.description.length > 160, 'desc-long');
  by(p => p.description && p.description.length < 70, 'desc-short');

  const dupes = key => {
    const seen = new Map();
    for (const p of ok.filter(isIndexable)) if (p[key]) seen.set(p[key], [...(seen.get(p[key]) || []), p.url]);
    return [...seen.values()].filter(v => v.length > 1).flat();
  };
  const dupTitles = dupes('title');
  const dupDescs = dupes('description');
  if (dupTitles.length) add('title-dup', dupTitles);
  if (dupDescs.length) add('desc-dup', dupDescs);

  by(p => p.html && !p.jsShell && !p.headings.h1.length, 'h1-missing');
  by(p => p.html && p.headings.h1.length > 1, 'h1-multiple');
  by(p => p.html && !p.canonical, 'canonical-missing');
  by(p => p.html && p.canonical && norm(p.canonical) !== norm(p.url), 'canonical-other');
  by(p => p.html && !p.lang, 'lang-missing');
  by(p => p.html && !p.viewport, 'viewport-missing');
  by(p => p.html && (!p.og['og:title'] || !p.og['og:description']), 'og-missing');
  by(p => p.html && !p.og['og:image'], 'og-image-missing');
  by(p => p.imagesNoAlt > 0, 'img-alt');
  by(p => p.jsonLd?.some(j => !j.valid), 'jsonld-invalid');
  by(p => p.html && !p.jsonLd?.length, 'jsonld-none');
  by(p => p.html && !p.jsShell && p.wordCount < 250, 'thin');
  by(p => p.html && p.wordCount > 400 && !p.headings.h2.length, 'no-subheadings');

  const broken = pages.filter(p => inSitemap.has(norm(p.url)) && (p.status !== 200 || p.redirected)).map(p => p.url);
  if (broken.length) add('sitemap-broken', broken);
  if (goodSitemaps.length) {
    const gaps = ok.filter(p => isIndexable(p) && !inSitemap.has(norm(p.url))).map(p => p.url);
    if (gaps.length) add('sitemap-gaps', gaps);
  }

  // Scores: page issues count in proportion to the share of pages affected.
  const total = Math.max(pages.length, 1);
  const penalty = { technical: 0, onpage: 0, geo: 0 };
  for (const i of issues) {
    const share = i.urls && !i.id.startsWith('sitemap') && !i.id.startsWith('robots') && !i.id.startsWith('llms') ? Math.min(1, 0.35 + (0.65 * i.urls.length) / total) : 1;
    penalty[i.cat] += W[i.sev] * share;
  }
  const scores = Object.fromEntries(Object.entries(penalty).map(([k, v]) => [k, Math.max(0, Math.round(100 - v))]));
  scores.overall = Math.round((scores.technical + scores.onpage + scores.geo) / 3);

  const order = { critical: 0, warning: 1, info: 2 };
  issues.sort((a, b) => order[a.sev] - order[b.sev] || (b.urls?.length || 0) - (a.urls?.length || 0));

  return { issues, scores, bots, robots, files: generate(site, pages, robots, opts), name: siteName(site) };
}

// ---------- generated files ----------

function generate(site, pages, robots, opts) {
  const name = siteName(site);
  const origin = site.origin;
  const good = pages.filter(isIndexable);
  const crawled = new Set(pages.map(p => norm(p.url)));

  // sitemap.xml: indexable crawled pages + sitemap URLs the crawl did not reach.
  const entries = new Map();
  for (const p of good) {
    const lm = p.lastModified ? new Date(p.lastModified) : null;
    entries.set(norm(p.url), { loc: p.url, lastmod: lm && !isNaN(lm) ? lm.toISOString().slice(0, 10) : null });
  }
  for (const u of site.sitemapUrls) if (!crawled.has(norm(u.loc)) && !entries.has(norm(u.loc))) entries.set(norm(u.loc), { loc: u.loc, lastmod: u.lastmod?.slice(0, 10) || null });
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...entries.values()].map(e => `  <url><loc>${xmlEsc(e.loc)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;

  // robots.txt: keep the site's existing disallows, open search and answer engines,
  // apply the chosen policy for training crawlers.
  const star = robots.groups.filter(g => g.agents.includes('*')).flatMap(g => g.rules);
  const keep = star.filter(r => r.path && !(r.type === 'disallow' && r.path === '/')).map(r => `${r.type === 'allow' ? 'Allow' : 'Disallow'}: ${r.path}`);
  const rules = ['Allow: /', ...new Set(keep.filter(r => r !== 'Allow: /'))].join('\n');
  const sitemapLines = [...new Set([...(robots.sitemaps.length ? robots.sitemaps : []), `${origin}/sitemap.xml`])].map(s => `Sitemap: ${s}`).join('\n');
  const robotsTxt = `# robots.txt for ${origin}, generated by SEO Master on ${today()}

User-agent: *
${rules}

# AI search and answer engines: they read pages live and cite them with a link.
${SEARCH_BOTS.filter(b => b.kind === 'answer').map(b => `User-agent: ${b.ua}`).join('\n')}
${rules}

# AI training crawlers: ${opts.allowTraining ? 'allowed' : 'blocked'}. This does not affect search or AI answers.
${TRAINING_BOTS.map(b => `User-agent: ${b.ua}`).join('\n')}
${opts.allowTraining ? rules : 'Disallow: /'}

${sitemapLines}
`;

  // llms.txt (llmstxt.org): name, one-paragraph summary, then grouped page links.
  const home = site.home;
  const summary = clip(home.description || home.og?.['og:description'] || home.firstParagraph || `${name} website.`, 400);
  const sections = new Map();
  const optional = [];
  for (const p of good.slice(0, 150)) {
    const path = new URL(p.url).pathname;
    if (norm(p.url) === norm(origin)) continue;
    const title = shortTitle(p.title, name) || p.headings.h1[0] || path;
    const desc = clip(p.description || p.firstParagraph || '', 160);
    const line = `- [${title}](${p.url})${desc ? `: ${desc}` : ''}`;
    if (/privacy|terms|cookie|legal|imprint|impressum|login|sign-?in|sign-?up|account|cart|checkout/i.test(path)) {
      optional.push(line);
      continue;
    }
    const seg = path.split('/').filter(Boolean)[0];
    const key = path.split('/').filter(Boolean).length > 1 && seg ? seg.replace(/[-_]/g, ' ').replace(/^\w/, c => c.toUpperCase()) : 'Main pages';
    sections.set(key, [...(sections.get(key) || []), line]);
  }
  const ordered = [...sections].sort(([a], [b]) => (a === 'Main pages' ? -1 : b === 'Main pages' ? 1 : 0));
  const llms = `# ${name}

> ${summary}

${ordered.map(([k, lines]) => `## ${k}\n\n${lines.join('\n')}`).join('\n\n')}${optional.length ? `\n\n## Optional\n\n${optional.join('\n')}` : ''}
`;

  // Organization + WebSite JSON-LD for the homepage.
  const lang = home.lang || 'en';
  const orgSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${origin}/#organization`,
        name,
        url: `${origin}/`,
        ...(home.icon ? { logo: home.icon } : {}),
        ...(home.description ? { description: home.description } : {}),
        ...(home.social?.length ? { sameAs: home.social } : {}),
      },
      { '@type': 'WebSite', '@id': `${origin}/#website`, url: `${origin}/`, name, inLanguage: lang, publisher: { '@id': `${origin}/#organization` } },
    ],
  };
  const schema = `<script type="application/ld+json">\n${JSON.stringify(orgSchema, null, 2).replace(/</g, '\\u003c')}\n</script>\n`;

  return {
    'robots.txt': robotsTxt,
    'sitemap.xml': sitemap,
    'llms.txt': llms,
    'schema-homepage.html': schema,
  };
}

// Per-page suggestions: title, description and the full recommended <head> tags.
export function pageFixes(page, pages, site) {
  const name = siteName(site);
  const base = page.headings?.h1?.[0] || shortTitle(page.title, name) || new URL(page.url).pathname.split('/').filter(Boolean).pop()?.replace(/[-_]/g, ' ') || name;
  const isHome = norm(page.url) === norm(site.origin);
  let title = page.title;
  const titleDup = page.title && pages.filter(p => p.title === page.title).length > 1;
  if (!title || title.length > 60 || title.length < 20 || titleDup) {
    const t = isHome ? `${name}: ${clip(page.description || page.firstParagraph || base, 60 - name.length - 2)}` : `${base} | ${name}`;
    title = t.length <= 60 ? t : clip(base, 60);
  }
  let description = page.description;
  const descDup = page.description && pages.filter(p => p.description === page.description).length > 1;
  if (!description || description.length > 160 || description.length < 70 || descDup) {
    description = clip(page.firstParagraph || page.textSample || description || '', 155);
  }
  const url = page.url;
  const crumbs = new URL(url).pathname.split('/').filter(Boolean);
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name, item: `${site.origin}/` },
      ...crumbs.map((seg, i) => {
        const href = `${site.origin}/${crumbs.slice(0, i + 1).join('/')}`;
        const known = pages.find(p => norm(p.url) === norm(href));
        return { '@type': 'ListItem', position: i + 2, name: (known && (known.headings?.h1?.[0] || shortTitle(known.title, name))) || seg.replace(/[-_]/g, ' '), item: href };
      }),
    ],
  };
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="${isHome ? 'website' : 'article'}" />`,
    `<meta property="og:site_name" content="${esc(name)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    page.og?.['og:image'] ? `<meta property="og:image" content="${esc(page.og['og:image'])}" />` : `<!-- <meta property="og:image" content="https://…/share-1200x630.png" /> -->`,
    `<meta name="twitter:card" content="${page.og?.['og:image'] ? 'summary_large_image' : 'summary'}" />`,
    ...(crumbs.length ? [`<script type="application/ld+json">${JSON.stringify(breadcrumb).replace(/</g, '\\u003c')}</script>`] : []),
  ].join('\n');
  return { title, titleChanged: title !== page.title, description, descriptionChanged: description !== page.description, head };
}

// A prompt to paste into Claude Code, Cursor or any coding agent working in the site's repo.
export function fixPrompt(site, pages, result) {
  const { issues, files, scores } = result;
  const list = sev =>
    issues
      .filter(i => i.sev === sev)
      .map(i => `- **${i.title}**${i.detail ? ` (${i.detail})` : ''}: ${i.why} Fix: ${i.fix}${i.urls?.length ? `\n${i.urls.slice(0, 12).map(u => `  - ${u}`).join('\n')}${i.urls.length > 12 ? `\n  - …and ${i.urls.length - 12} more` : ''}` : ''}`)
      .join('\n');
  const metaFixes = pages
    .filter(p => p.html && p.status === 200)
    .map(p => ({ p, f: pageFixes(p, pages, site) }))
    .filter(({ f }) => f.titleChanged || f.descriptionChanged)
    .slice(0, 40)
    .map(({ p, f }) => `- ${p.url}\n  - title: ${f.title}\n  - description: ${f.description}`)
    .join('\n');
  return `# SEO and GEO fixes for ${site.origin}

An SEO Master audit on ${today()} crawled ${pages.length} pages. Scores: technical ${scores.technical}, on-page ${scores.onpage}, AI search (GEO) ${scores.geo}, overall ${scores.overall}/100.

Work in this site's codebase and fix the issues below, most severe first. Rules:
- Keep every fact true. Do not invent statistics, reviews, prices, people or claims.
- Put all important content in the server-delivered HTML (server rendering, static generation or prerendering), not only in client-side JavaScript.
- Do not hide text from visitors that is shown to crawlers.
- After each change, verify it by fetching the live or local URL with curl and checking the HTML.

## Critical

${list('critical') || '- None'}

## Warnings

${list('warning') || '- None'}

## Improvements

${list('info') || '- None'}
${metaFixes ? `\n## Suggested titles and descriptions\n\nDrafts from the page content. Improve the wording where you know the product better.\n\n${metaFixes}\n` : ''}
## Files to add at the site root

Serve each as a static file with the right content type (text/plain for .txt, application/xml for .xml), not through the app's HTML fallback. Review before replacing an existing file.

### robots.txt

\`\`\`
${files['robots.txt'].trim()}
\`\`\`

### llms.txt

\`\`\`markdown
${files['llms.txt'].trim()}
\`\`\`

### sitemap.xml

Generate it at build time from the site's real routes if possible, so it stays current. This snapshot lists ${(files['sitemap.xml'].match(/<url>/g) || []).length} URLs:

\`\`\`xml
${files['sitemap.xml'].trim()}
\`\`\`

### Homepage structured data

Add inside the homepage <head>, and add a real logo URL and social profiles if they are missing:

\`\`\`html
${files['schema-homepage.html'].trim()}
\`\`\`
`;
}
