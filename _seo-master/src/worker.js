// SEO Master API. The browser runs the crawl and calls these endpoints one page at a
// time, so a 100-page audit stays far below the Worker's per-request fetch limits.
//   GET  /api/site?url=   robots.txt, sitemaps, llms.txt, HTTPS redirect, parsed homepage
//   GET  /api/page?url=   one parsed page (no raw HTML is returned, so this is not a proxy)
//   POST /api/indexnow    { host, key, urls } -> checks the key file, then submits
import { parsePage, parseSitemap } from './parse.js';

const UA = 'Mozilla/5.0 (compatible; SEOMaster/1.0; +https://assist365.app)';
const MAX_BYTES = 3_000_000;
const TIMEOUT_MS = 12_000;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/site' && request.method === 'GET') return json(await site(url.searchParams.get('url')));
      if (url.pathname === '/api/page' && request.method === 'GET') return json(await page(url.searchParams.get('url')));
      if (url.pathname === '/api/indexnow' && request.method === 'POST') return json(await indexNow(await request.json()));
      return json({ error: 'Not found' }, 404);
    } catch (err) {
      return json({ error: err.message || String(err) }, err.status || 400);
    }
  },
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

const fail = (message, status = 400) => Object.assign(new Error(message), { status });

// Public websites only: no IP literals, local names or custom ports.
export function publicUrl(input) {
  if (!input || typeof input !== 'string') throw fail('Enter a website address.');
  let u;
  try {
    u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
  } catch {
    throw fail('That does not look like a website address.');
  }
  const host = u.hostname.toLowerCase();
  if (!/^https?:$/.test(u.protocol)) throw fail('Only http and https addresses can be audited.');
  if (u.port || u.username || u.password) throw fail('Addresses with a port or credentials are not supported.');
  if (!host.includes('.') || /^[\d.]+$/.test(host) || host.startsWith('[')) throw fail('Use a public domain name, not an IP address.');
  if (/(^|\.)(localhost|local|internal|lan|home|corp|test|invalid|example)$/.test(host)) throw fail('Only public websites can be audited.');
  u.hash = '';
  return u;
}

async function get(target, { redirect = 'follow', accept = 'text/html,application/xhtml+xml,*/*;q=0.8' } = {}) {
  const started = Date.now();
  try {
    const res = await fetch(target, {
      redirect,
      headers: { 'user-agent': UA, accept, 'accept-language': 'en' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    let body = '';
    if (redirect === 'follow') {
      const buf = await res.arrayBuffer();
      body = new TextDecoder().decode(buf.byteLength > MAX_BYTES ? buf.slice(0, MAX_BYTES) : buf);
    }
    return {
      status: res.status,
      url: res.url || String(target),
      redirected: res.redirected,
      ms: Date.now() - started,
      type: (res.headers.get('content-type') || '').toLowerCase(),
      xRobots: res.headers.get('x-robots-tag'),
      lastModified: res.headers.get('last-modified'),
      location: res.headers.get('location'),
      body,
    };
  } catch (err) {
    return { status: 0, url: String(target), ms: Date.now() - started, type: '', body: '', error: err.name === 'TimeoutError' ? 'Timed out' : err.message };
  }
}

const looksHtml = r => r.type.includes('html') || /^\s*<(!doctype|html)/i.test(r.body);

// A text file is only usable when it is served as text, not as an app's HTML fallback page.
function textFile(r, cap = 40_000) {
  return { url: r.url, status: r.status, type: r.type, ok: r.status === 200 && !looksHtml(r), servedAsHtml: r.status === 200 && looksHtml(r), size: r.body.length, body: r.body.slice(0, cap), error: r.error };
}

function pageResult(r) {
  const base = { url: r.url, status: r.status, ms: r.ms, type: r.type, redirected: r.redirected, xRobots: r.xRobots, lastModified: r.lastModified, error: r.error };
  if (r.status !== 200 || !looksHtml(r)) return { ...base, html: false };
  return { ...base, html: true, ...parsePage(r.body, r.url) };
}

async function page(input) {
  return pageResult(await get(publicUrl(input).href));
}

async function site(input) {
  const start = publicUrl(input);
  const home = await get(start.href);
  if (home.status === 0) throw fail(`Could not reach ${start.host}: ${home.error}`, 502);
  const origin = new URL(home.url).origin;
  publicUrl(origin); // the final host after redirects must be public too

  const [robots, llms, llmsFull, http] = await Promise.all([
    get(`${origin}/robots.txt`, { accept: 'text/plain,*/*' }),
    get(`${origin}/llms.txt`, { accept: 'text/plain,text/markdown,*/*' }),
    get(`${origin}/llms-full.txt`, { accept: 'text/plain,text/markdown,*/*' }),
    get(`http://${new URL(origin).host}/`, { redirect: 'manual' }),
  ]);

  const robotsFile = textFile(robots);
  const declared = robotsFile.ok ? [...robotsFile.body.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map(m => m[1]) : [];
  const queue = declared.length ? declared : [`${origin}/sitemap.xml`];
  const sitemaps = [];
  const urls = new Map();
  for (let i = 0; i < queue.length && sitemaps.length < 6; i++) {
    let sm;
    try {
      sm = publicUrl(queue[i]).href;
    } catch {
      continue;
    }
    const r = await get(sm, { accept: 'application/xml,text/xml,*/*' });
    const info = { url: sm, status: r.status, type: r.type, declared: declared.includes(queue[i]), servedAsHtml: r.status === 200 && looksHtml(r) && !/<(urlset|sitemapindex)\b/i.test(r.body) };
    if (r.status === 200 && !info.servedAsHtml) {
      const parsed = parseSitemap(r.body);
      info.kind = parsed.kind;
      info.count = parsed.entries.length;
      info.valid = !!parsed.kind;
      if (parsed.kind === 'index') parsed.entries.forEach(e => queue.push(e.loc));
      else for (const e of parsed.entries) if (urls.size < 2000) urls.set(e.loc, e.lastmod);
    }
    sitemaps.push(info);
  }

  const httpsRedirect = http.status === 0 ? null : http.status >= 300 && http.status < 400 && /^https:/i.test(http.location || '');

  return {
    origin,
    host: new URL(origin).host,
    home: pageResult(home),
    robots: robotsFile,
    llms: textFile(llms),
    llmsFull: { ...textFile(llmsFull, 0) },
    sitemaps,
    sitemapUrls: [...urls].map(([loc, lastmod]) => ({ loc, lastmod })),
    httpsRedirect,
    fetchedAt: new Date().toISOString(),
  };
}

async function indexNow({ host, key, urls } = {}) {
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(key || '')) throw fail('The IndexNow key must be 8 to 128 letters, digits or dashes.');
  const origin = publicUrl(host).origin;
  const hostname = new URL(origin).host;
  const list = [...new Set((Array.isArray(urls) ? urls : []).filter(u => typeof u === 'string'))]
    .filter(u => {
      try {
        return new URL(u).host === hostname;
      } catch {
        return false;
      }
    })
    .slice(0, 10_000);
  if (!list.length) throw fail(`No URLs on ${hostname} to submit.`);

  const keyLocation = `${origin}/${key}.txt`;
  const check = await get(keyLocation, { accept: 'text/plain,*/*' });
  if (check.status !== 200 || check.body.trim() !== key) {
    throw fail(`The key file is not live yet: ${keyLocation} returned ${check.status || check.error}${check.status === 200 ? ' but the content does not match the key' : ''}. Upload it to your site root and try again.`);
  }

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: hostname, key, keyLocation, urlList: list }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const messages = {
    200: 'Accepted. Search engines will recrawl these URLs.',
    202: 'Received. The key is being validated; the URLs will be processed after that.',
    400: 'Bad request: the submission format was rejected.',
    403: 'Forbidden: the key was not valid for this host.',
    422: 'Rejected: some URLs do not belong to this host or do not match the key.',
    429: 'Too many requests: wait a while before submitting again.',
  };
  return { ok: res.status === 200 || res.status === 202, status: res.status, submitted: list.length, message: messages[res.status] || `IndexNow answered HTTP ${res.status}.` };
}
