// HTML and sitemap parsing for the audit. Regex-based on purpose: it only needs the
// tags crawlers care about, and it runs the same way in the Worker and in Node.

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

export function decode(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

export function attrs(tag) {
  const out = {};
  const inner = tag.replace(/^<\/?[a-z0-9-]+/i, '').replace(/\/?>$/, '');
  for (const m of inner.matchAll(/([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    out[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return out;
}

const squash = s => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const SOCIAL = /(^|\.)(linkedin\.com|x\.com|twitter\.com|github\.com|facebook\.com|instagram\.com|youtube\.com|tiktok\.com|threads\.net|bsky\.app|mastodon\.social)$/i;
const SKIP_EXT = /\.(pdf|zip|png|jpe?g|gif|webp|avif|svg|ico|mp4|webm|mp3|woff2?|ttf|css|js|json|xml|txt|rss|atom)$/i;

function jsonLdTypes(node, out = new Set()) {
  if (Array.isArray(node)) node.forEach(n => jsonLdTypes(n, out));
  else if (node && typeof node === 'object') {
    for (const t of [].concat(node['@type'] || [])) out.add(String(t));
    for (const v of Object.values(node)) if (v && typeof v === 'object') jsonLdTypes(v, out);
  }
  return out;
}

export function parsePage(rawHtml, pageUrl) {
  const html = rawHtml.replace(/<!--[\s\S]*?-->/g, '');
  // Search the whole document, not just <head>: frameworks such as Next.js stream the
  // title and meta tags into the body for visitors they don't recognise as bots.
  const head = html.replace(/<(svg|template)\b[\s\S]*?<\/\1>/gi, ' ');
  const base = new URL(pageUrl);

  const meta = {};
  for (const m of head.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    const key = (a.name || a.property || a['http-equiv'] || '').toLowerCase();
    if (key && a.content !== undefined && !(key in meta)) meta[key] = a.content.trim();
  }

  let canonical = null;
  let icon = null;
  const hreflang = [];
  for (const m of head.matchAll(/<link\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    const rel = (a.rel || '').toLowerCase().split(/\s+/);
    const href = a.href ? safeResolve(a.href, base) : null;
    if (!href) continue;
    if (rel.includes('canonical') && !canonical) canonical = href;
    if (rel.includes('alternate') && a.hreflang) hreflang.push({ lang: a.hreflang, href });
    if (rel.includes('apple-touch-icon') || (rel.includes('icon') && !icon)) icon = href;
  }

  const titleMatch = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const htmlTag = html.match(/<html\b[^>]*>/i);

  const jsonLd = [];
  let moduleScripts = 0;
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const a = attrs(`<script ${m[1]}>`);
    if (a.type === 'module') moduleScripts++;
    if ((a.type || '').toLowerCase() !== 'application/ld+json') continue;
    try {
      const data = JSON.parse(m[2].trim());
      jsonLd.push({ valid: true, types: [...jsonLdTypes(data)], raw: m[2].trim().slice(0, 4000) });
    } catch (e) {
      jsonLd.push({ valid: false, types: [], error: e.message, raw: m[2].trim().slice(0, 1000) });
    }
  }

  const bodyStart = html.search(/<body\b/i);
  const body = (bodyStart > -1 ? html.slice(bodyStart) : html).replace(
    /<(script|style|noscript|template|svg|iframe|canvas)\b[\s\S]*?<\/\1>/gi,
    ' ',
  );

  const headings = { h1: [], h2: [], h3: [] };
  for (const m of body.matchAll(/<(h[1-3])\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const t = squash(m[2]);
    if (t) headings[m[1].toLowerCase()].push(t.slice(0, 200));
  }

  let firstParagraph = '';
  for (const m of body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const t = squash(m[1]);
    if (t.length >= 60) {
      firstParagraph = t.slice(0, 600);
      break;
    }
  }

  const text = squash(body);
  const wordCount = text ? text.split(' ').filter(w => /[\p{L}\p{N}]/u.test(w)).length : 0;

  const links = new Set();
  const social = new Set();
  for (const m of body.matchAll(/<a\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    if (!a.href || /^(mailto|tel|javascript):/i.test(a.href)) continue;
    const u = safeResolve(a.href, base);
    if (!u) continue;
    const parsed = new URL(u);
    if (parsed.host === base.host) {
      parsed.hash = '';
      if (!SKIP_EXT.test(parsed.pathname) && links.size < 300) links.add(parsed.href);
    } else if (SOCIAL.test(parsed.hostname)) social.add(u);
  }

  let images = 0;
  let imagesNoAlt = 0;
  for (const m of body.matchAll(/<img\b[^>]*>/gi)) {
    images++;
    if (!('alt' in attrs(m[0]))) imagesNoAlt++;
  }

  const emptyRoot = /<div\b[^>]*\bid=["'](root|app|__next|__nuxt|svelte)["'][^>]*>\s*<\/div>/i.test(html);

  return {
    title: titleMatch ? squash(titleMatch[1]) : null,
    description: meta.description ?? null,
    robotsMeta: [meta.robots, meta.googlebot].filter(Boolean).join(', ') || null,
    viewport: meta.viewport ?? null,
    lang: htmlTag ? attrs(htmlTag[0]).lang || null : null,
    canonical,
    icon,
    hreflang,
    og: Object.fromEntries(Object.entries(meta).filter(([k]) => k.startsWith('og:'))),
    twitter: Object.fromEntries(Object.entries(meta).filter(([k]) => k.startsWith('twitter:'))),
    jsonLd,
    headings,
    firstParagraph,
    textSample: text.slice(0, 600),
    wordCount,
    links: [...links],
    social: [...social].slice(0, 12),
    images,
    imagesNoAlt,
    // An app shell: almost no text in the HTML, content only appears after JavaScript runs.
    jsShell: wordCount < 60 && (emptyRoot || moduleScripts > 0),
  };
}

function safeResolve(href, base) {
  try {
    const u = new URL(href.trim(), base);
    return /^https?:$/.test(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}

export function parseSitemap(xml) {
  const kind = /<sitemapindex\b/i.test(xml) ? 'index' : /<urlset\b/i.test(xml) ? 'urlset' : null;
  const entries = [];
  const block = kind === 'index' ? 'sitemap' : 'url';
  for (const m of xml.matchAll(new RegExp(`<${block}\\b[^>]*>([\\s\\S]*?)<\\/${block}>`, 'gi'))) {
    const loc = m[1].match(/<loc>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/loc>/i);
    const lastmod = m[1].match(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/i);
    if (loc) entries.push({ loc: decode(loc[1].trim()), lastmod: lastmod ? lastmod[1] : null });
  }
  return { kind, entries };
}
