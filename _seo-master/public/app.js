import { analyze, fixPrompt, pageFixes, parseRobots, robotsAllows } from './analyze.js';
import { zip } from './zip.js';
import { mountGuide, stepsHtml } from './guide.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const SKIP = /\.(pdf|zip|png|jpe?g|gif|webp|avif|svg|ico|mp4|webm|mp3|woff2?|ttf|css|js|json|xml|txt)$/i;
const CONCURRENCY = 3;
const sleep = ms => new Promise(r => setTimeout(r, ms));

let state = null;
let guide = null;
const GUIDE_HIDDEN = 'seo-master-guide-hidden';
const store = {
  get: k => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch {
      /* storage unavailable */
    }
  },
};

async function api(path) {
  const res = await fetch(path);
  const data = await res.json().catch(() => ({ error: `Server error (${res.status})` }));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function progress(done, total, text) {
  $('#bar').style.width = `${Math.round((done / Math.max(total, 1)) * 100)}%`;
  $('#status').textContent = text;
}

async function crawl(input, max) {
  progress(0, 1, `Reading robots.txt, sitemaps and llms.txt for ${input}…`);
  const site = await api(`/api/site?url=${encodeURIComponent(input)}`);
  const host = site.host;
  const key = u => {
    const x = new URL(u);
    x.hash = '';
    return x.href;
  };
  // Polite crawl: skip what robots.txt disallows for crawlers in general.
  const rules = parseRobots(site.robots.ok ? site.robots.body : '');
  const seen = new Set([key(site.home.url)]);
  const fetched = new Set([key(site.home.url)]);
  const pages = [site.home];
  const queue = [];
  let skipped = 0;
  const enqueue = u => {
    try {
      const x = new URL(u);
      if (x.host !== host || SKIP.test(x.pathname)) return;
      if (!robotsAllows(rules, 'SEOMaster', x.pathname + x.search)) {
        if (!seen.has(key(u))) skipped++;
        seen.add(key(u));
        return;
      }
      const k = key(u);
      if (!seen.has(k)) {
        seen.add(k);
        queue.push(k);
      }
    } catch {
      /* ignore malformed links */
    }
  };
  site.sitemapUrls.forEach(u => enqueue(u.loc));
  (site.home.links || []).forEach(enqueue);

  let active = 0;
  await new Promise(resolve => {
    const next = () => {
      while (active < CONCURRENCY && queue.length && pages.length + active < max) {
        const u = queue.shift();
        active++;
        fetchPage(u).then(p => {
            // Redirects can land on a page that was already crawled; keep one copy.
            if (!fetched.has(key(p.url))) {
              fetched.add(key(p.url));
              pages.push(p);
            }
            (p.links || []).forEach(enqueue);
            active--;
            progress(pages.length, Math.min(max, pages.length + queue.length + active), `Crawled ${pages.length} of up to ${Math.min(max, pages.length + queue.length + active)} pages · ${new URL(p.url).pathname}`);
            next();
          });
      }
      if (!active) resolve();
    };
    next();
  });
  site.robotsSkipped = skipped;
  return { site, pages };
}

// Retries once after a pause when the site rate-limits (429/503).
async function fetchPage(u) {
  for (let attempt = 0; ; attempt++) {
    const p = await api(`/api/page?url=${encodeURIComponent(u)}`).catch(err => ({ url: u, status: 0, html: false, error: err.message }));
    if (![429, 503].includes(p.status) || attempt === 2) return p;
    await sleep(1500 * (attempt + 1));
  }
}

// ---------- rendering ----------

const SEV = { critical: 'Critical', warning: 'Warning', info: 'Improve' };
const CAT = { technical: 'Technical', onpage: 'On-page', geo: 'AI search' };

function ring(label, value) {
  const tone = value >= 85 ? 'good' : value >= 60 ? 'mid' : 'bad';
  return `<div class="score ${tone}"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15.9" class="track"/><circle cx="18" cy="18" r="15.9" class="val" stroke-dasharray="${value} 100"/></svg><b>${value}</b><span>${label}</span></div>`;
}

function render() {
  const { site, pages, result } = state;
  $('#site-name').textContent = result.name;
  const counts = result.issues.reduce((a, i) => ((a[i.sev] = (a[i.sev] || 0) + 1), a), {});
  $('#site-meta').innerHTML = `<a href="${esc(site.origin)}" target="_blank" rel="noopener">${esc(site.host)}</a> · ${pages.length} pages crawled${site.robotsSkipped ? ` (${site.robotsSkipped} skipped: disallowed in robots.txt)` : ''} · ${counts.critical || 0} critical, ${counts.warning || 0} warnings, ${counts.info || 0} improvements`;
  $('#scores').innerHTML = ring('Overall', result.scores.overall) + ring('Technical', result.scores.technical) + ring('On-page', result.scores.onpage) + ring('AI search', result.scores.geo);

  renderIssues();
  renderAi();
  renderPages();
  renderFiles();
  renderPrompt();
  renderIndex();
}

function renderIssues(filter = 'all') {
  const { result } = state;
  const list = result.issues.filter(i => filter === 'all' || i.cat === filter);
  const el = document.querySelector('[data-panel="issues"]');
  el.innerHTML = `
    <div class="filters">${['all', 'technical', 'onpage', 'geo'].map(f => `<button class="chip ${f === filter ? 'on' : ''}" data-filter="${f}">${f === 'all' ? 'All' : CAT[f]}</button>`).join('')}</div>
    ${list.length ? '' : '<p class="empty">No issues in this category.</p>'}
    ${list
      .map(
        i => `<details class="issue ${i.sev}">
      <summary><span class="sev">${SEV[i.sev]}</span><span class="t">${esc(i.title)}${i.detail ? ` <small>${esc(i.detail)}</small>` : ''}</span><span class="cat">${CAT[i.cat]}</span>${i.urls ? `<span class="n">${i.urls.length} page${i.urls.length > 1 ? 's' : ''}</span>` : ''}</summary>
      <p><b>Why it matters.</b> ${esc(i.why)}</p>
      <p><b>Fix.</b> ${esc(i.fix)}</p>
      ${i.urls ? `<ul class="urls">${i.urls.slice(0, 50).map(u => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a></li>`).join('')}${i.urls.length > 50 ? `<li>…and ${i.urls.length - 50} more</li>` : ''}</ul>` : ''}
    </details>`,
      )
      .join('')}`;
  el.querySelectorAll('[data-filter]').forEach(b => (b.onclick = () => renderIssues(b.dataset.filter)));
}

function fileStatus(f, label) {
  if (f.ok) return `<span class="pill good">found</span> ${label}`;
  if (f.servedAsHtml) return `<span class="pill bad">served as HTML</span> ${label}`;
  return `<span class="pill bad">missing (${f.status || 'no response'})</span> ${label}`;
}

function renderAi() {
  const { site, pages, result } = state;
  const shells = pages.filter(p => p.jsShell).length;
  const withLd = pages.filter(p => p.jsonLd?.length).length;
  const htmlPages = pages.filter(p => p.html).length || 1;
  const cf = /content signal/i.test(site.robots.body || '');
  document.querySelector('[data-panel="ai"]').innerHTML = `
    <div class="grid2">
      <div class="card">
        <h3>What AI crawlers can read</h3>
        <ul class="facts">
          <li>${fileStatus(site.robots, 'robots.txt')}</li>
          <li>${fileStatus(site.llms, 'llms.txt')}</li>
          <li>${fileStatus(site.llmsFull, 'llms-full.txt (optional)')}</li>
          <li><span class="pill ${shells ? 'bad' : 'good'}">${htmlPages - shells} of ${htmlPages}</span> pages have their text in the HTML${shells ? `, ${shells} only render with JavaScript` : ''}</li>
          <li><span class="pill ${withLd / htmlPages > 0.8 ? 'good' : 'mid'}">${withLd} of ${htmlPages}</span> pages have structured data</li>
        </ul>
        ${cf ? '<p class="note">This robots.txt includes Cloudflare\'s managed content signals. If Cloudflare\'s "Block AI bots" setting is on, it blocks AI crawlers at the network level whatever robots.txt says. Check Security → Bots in the Cloudflare dashboard.</p>' : ''}
      </div>
      <div class="card">
        <h3>Crawler access to the homepage</h3>
        <table class="bots"><tbody>
          ${result.bots.map(b => `<tr><td><code>${esc(b.ua)}</code></td><td class="muted">${esc(b.label)}</td><td><span class="pill ${b.allowed ? 'good' : b.kind === 'training' ? 'mid' : 'bad'}">${b.allowed ? 'allowed' : 'blocked'}</span></td></tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}

function renderPages() {
  const { pages } = state;
  const el = document.querySelector('[data-panel="pages"]');
  const rows = pages
    .map((p, i) => {
      const own = state.result.issues.filter(x => x.urls?.includes(p.url));
      const worst = own.find(x => x.sev === 'critical') ? 'critical' : own.find(x => x.sev === 'warning') ? 'warning' : own.length ? 'info' : 'ok';
      return `<tr data-i="${i}" tabindex="0"><td><span class="dot ${worst}"></span></td><td class="path">${esc(new URL(p.url).pathname + new URL(p.url).search)}</td><td>${p.status || '—'}</td><td class="t">${esc(p.title || (p.html ? '(no title)' : p.error || p.type || ''))}</td><td>${p.html ? p.wordCount : '—'}</td><td>${p.ms ?? '—'} ms</td><td>${own.length}</td></tr>`;
    })
    .join('');
  el.innerHTML = `<div class="table-wrap"><table class="pages"><thead><tr><th></th><th>Path</th><th>Status</th><th>Title</th><th>Words</th><th>Response</th><th>Issues</th></tr></thead><tbody>${rows}</tbody></table></div><p class="muted small">Click a page for its issues, suggested title and description, and ready-to-paste head tags.</p>`;
  el.querySelectorAll('tr[data-i]').forEach(tr => {
    const open = () => showPage(pages[+tr.dataset.i]);
    tr.onclick = open;
    tr.onkeydown = e => e.key === 'Enter' && open();
  });
}

function showPage(p) {
  const { site, pages, result } = state;
  const own = result.issues.filter(x => x.urls?.includes(p.url));
  const f = p.html && p.status === 200 ? pageFixes(p, pages, site) : null;
  $('#page-detail').innerHTML = `
    <div class="dlg-head"><h3>${esc(new URL(p.url).pathname)}</h3><button class="ghost" id="close">Close</button></div>
    <p><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.url)}</a></p>
    <dl class="kv">
      <dt>Status</dt><dd>${p.status} · ${p.ms} ms${p.redirected ? ' · redirected' : ''}</dd>
      ${p.html ? `
      <dt>Title</dt><dd>${esc(p.title || '—')} <small>(${p.title?.length || 0} chars)</small></dd>
      <dt>Description</dt><dd>${esc(p.description || '—')} <small>(${p.description?.length || 0} chars)</small></dd>
      <dt>Canonical</dt><dd>${esc(p.canonical || '—')}</dd>
      <dt>H1</dt><dd>${esc(p.headings.h1.join(' / ') || '—')}</dd>
      <dt>H2s</dt><dd>${p.headings.h2.length}</dd>
      <dt>Words in HTML</dt><dd>${p.wordCount}${p.jsShell ? ' (app shell: content needs JavaScript)' : ''}</dd>
      <dt>Structured data</dt><dd>${p.jsonLd.length ? p.jsonLd.map(j => (j.valid ? esc(j.types.join(', ') || 'untyped') : `<span class="bad-t">invalid: ${esc(j.error)}</span>`)).join('; ') : '—'}</dd>
      <dt>Images</dt><dd>${p.images} (${p.imagesNoAlt} without alt)</dd>` : `<dt>Note</dt><dd>${esc(p.error || 'Not an HTML page')}</dd>`}
    </dl>
    ${own.length ? `<h4>Issues</h4><ul class="mini">${own.map(i => `<li class="${i.sev}"><b>${SEV[i.sev]}</b> ${esc(i.title)}: ${esc(i.fix)}</li>`).join('')}</ul>` : '<p class="good-t">No issues on this page.</p>'}
    ${f ? `<h4>Recommended head tags</h4><p class="muted small">${f.titleChanged || f.descriptionChanged ? 'Title and description are drafts from the page text; edit the wording before you publish.' : 'The existing title and description are kept.'}</p>${codeBox(f.head, 'head.html')}` : ''}`;
  $('#close').onclick = () => $('#page-dialog').close();
  wireCopy($('#page-detail'));
  $('#page-dialog').showModal();
}

const FILE_NOTES = {
  'robots.txt': 'Upload to the site root as /robots.txt. It keeps your existing Disallow rules, opens AI search engines and applies your training-crawler choice.',
  'sitemap.xml': 'Upload as /sitemap.xml, then submit it in Google Search Console and Bing Webmaster Tools. Best long-term: generate it at build time.',
  'llms.txt': 'Upload as /llms.txt (plain text). A map of your key pages for AI assistants, written from your own titles and descriptions.',
  'schema-homepage.html': 'Paste inside the homepage <head>. Add your logo URL and social profiles if they are missing.',
};

function codeBox(text, name) {
  return `<div class="code"><div class="code-bar"><span>${esc(name)}</span><button class="ghost sm" data-copy>Copy</button><button class="ghost sm" data-dl="${esc(name)}">Download</button></div><pre>${esc(text)}</pre></div>`;
}

function wireCopy(root) {
  root.querySelectorAll('[data-copy]').forEach(b => {
    b.onclick = async () => {
      await navigator.clipboard.writeText(b.closest('.code').querySelector('pre').textContent);
      b.textContent = 'Copied';
      setTimeout(() => (b.textContent = 'Copy'), 1500);
    };
  });
  root.querySelectorAll('[data-dl]').forEach(b => {
    b.onclick = () => download(b.dataset.dl, b.closest('.code').querySelector('pre').textContent);
  });
}

function download(name, content) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: 'text/plain;charset=utf-8' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function renderFiles() {
  const el = document.querySelector('[data-panel="files"]');
  el.innerHTML = Object.entries(state.result.files)
    .map(([name, text]) => `<section class="file"><h3>${esc(name)}</h3><p class="muted">${esc(FILE_NOTES[name] || '')}</p>${codeBox(text, name)}</section>`)
    .join('');
  wireCopy(el);
}

function renderPrompt() {
  const el = document.querySelector('[data-panel="prompt"]');
  el.innerHTML = `<p class="muted">Paste this into Claude Code, Cursor or any coding agent opened in your site's repository. It lists every issue with the affected URLs and includes the generated files.</p>${codeBox(state.prompt, 'seo-fix-prompt.md')}`;
  wireCopy(el);
}

function indexKey(host) {
  const k = `seo-master-indexnow:${host}`;
  try {
    const saved = localStorage.getItem(k);
    if (saved) return saved;
  } catch {
    /* storage unavailable */
  }
  const fresh = [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
  try {
    localStorage.setItem(k, fresh);
  } catch {
    /* storage unavailable */
  }
  return fresh;
}

function renderIndex() {
  const { site, result } = state;
  const key = indexKey(site.host);
  const urls = [...result.files['sitemap.xml'].matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].replace(/&amp;/g, '&'));
  const el = document.querySelector('[data-panel="index"]');
  el.innerHTML = `
    <div class="card">
      <h3>Ask search engines to recrawl now (IndexNow)</h3>
      <p class="muted">IndexNow notifies Bing, Yandex, Seznam and Naver in one request. Bing's index also feeds ChatGPT search and Microsoft Copilot. Google does not use IndexNow; submit your sitemap in Google Search Console instead.</p>
      <ol class="steps">
        <li>Download the key file and upload it to your site root, so it loads at <code>${esc(site.origin)}/${key}.txt</code>. ${codeBox(key, `${key}.txt`)}</li>
        <li>After deploying it, submit the ${urls.length} URLs from the generated sitemap. <button id="submit" ${urls.length ? '' : 'disabled'}>Submit ${urls.length} URLs</button></li>
      </ol>
      <p id="index-result" class="note" hidden></p>
    </div>`;
  wireCopy(el);
  $('#submit').onclick = async () => {
    const out = $('#index-result');
    out.hidden = false;
    out.className = 'note';
    out.textContent = 'Checking the key file and submitting…';
    try {
      const res = await fetch('/api/indexnow', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ host: site.origin, key, urls }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      out.className = `note ${data.ok ? 'good-b' : 'bad-b'}`;
      out.textContent = `${data.message} (HTTP ${data.status}, ${data.submitted} URLs)`;
    } catch (err) {
      out.className = 'note bad-b';
      out.textContent = err.message;
    }
  };
}

// ---------- guide video ----------

// The walkthrough replays the visitor's own results: their host, scores, issues and pages.
function guideData() {
  const { site, pages, result } = state;
  const html = pages.filter(p => p.html);
  const ok = html.filter(p => p.status === 200);
  const shown = pages.slice(0, 5);
  const sample = shown[1]?.html && shown[1].status === 200 ? shown[1] : ok[0];
  const fix = sample ? pageFixes(sample, pages, site) : { title: '', description: '' };
  const key = indexKey(site.host);
  const path = u => new URL(u).pathname + new URL(u).search;
  return {
    host: site.host,
    pagesCrawled: pages.length,
    scores: result.scores,
    issues: result.issues.slice(0, 4).map(i => ({ sev: i.sev, title: i.title, cat: CAT[i.cat], count: i.urls?.length || 0, fix: i.fix, urls: (i.urls || []).map(path) })),
    pages: shown.map(p => ({ path: path(p.url), status: p.status, title: p.title })),
    bots: ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot', 'GPTBot'].map(ua => result.bots.find(b => b.ua === ua)).filter(Boolean),
    files: { robots: site.robots.ok, llms: site.llms.ok, shells: html.filter(p => p.jsShell).length, htmlPages: html.length || 1 },
    fix: { path: sample ? path(sample.url) : '/', title: fix.title, description: fix.description },
    urls: (result.files['sitemap.xml'].match(/<loc>/g) || []).length,
    key: `${key.slice(0, 4)}…${key.slice(-4)}`,
  };
}

function renderGuide() {
  guide?.destroy();
  const hidden = store.get(GUIDE_HIDDEN) === '1';
  const el = $('#guide');
  el.className = `guide-wrap${hidden ? ' guide-collapsed' : ''}`;
  el.innerHTML = `<div class="guide-top"><h3>How to use your results <span>1-minute guide</span></h3><button class="ghost" id="guide-toggle">${hidden ? 'Watch the guide' : 'Hide guide'}</button></div><div class="guide-body"><div id="guide-player"></div>${stepsHtml()}</div>`;
  guide = mountGuide($('#guide-player'), guideData(), { autoplay: !hidden });
  $('#guide-toggle').onclick = () => {
    store.set(GUIDE_HIDDEN, hidden ? null : '1');
    renderGuide();
  };
}

// ---------- wiring ----------

document.querySelectorAll('[role="tab"]').forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll('[role="tab"]').forEach(t => t.setAttribute('aria-selected', String(t === tab)));
    document.querySelectorAll('.panel').forEach(p => (p.hidden = p.dataset.panel !== tab.dataset.tab));
  };
});

$('#zip').onclick = () => {
  const { site, result, prompt, pages } = state;
  const report = { site: site.origin, crawledAt: site.fetchedAt, scores: result.scores, issues: result.issues, pages: pages.map(({ links: _links, social: _social, ...p }) => p) };
  download(`seo-master-${site.host}.zip`, zip({ ...result.files, 'seo-fix-prompt.md': prompt, 'report.json': JSON.stringify(report, null, 2) }));
};

$('#form').onsubmit = async e => {
  e.preventDefault();
  const input = $('#url').value.trim();
  if (!input) return;
  $('#go').disabled = true;
  $('#error').hidden = true;
  $('#results').hidden = true;
  $('#progress').hidden = false;
  try {
    const { site, pages } = await crawl(input, +$('#max').value);
    const result = analyze(site, pages, { allowTraining: $('#training').checked });
    state = { site, pages, result, prompt: fixPrompt(site, pages, result) };
    render();
    $('#results').hidden = false;
    renderGuide();
    $('#hero').classList.add('compact');
    history.replaceState(null, '', `?url=${encodeURIComponent(site.host)}`);
  } catch (err) {
    $('#error').textContent = err.message;
    $('#error').hidden = false;
  } finally {
    $('#progress').hidden = true;
    $('#go').disabled = false;
  }
};

// Changing the training-crawler policy only changes the generated files; no new crawl.
$('#training').onchange = () => {
  if (!state) return;
  state.result = analyze(state.site, state.pages, { allowTraining: $('#training').checked });
  state.prompt = fixPrompt(state.site, state.pages, state.result);
  render();
};

const preset = new URLSearchParams(location.search).get('url');
if (preset) {
  $('#url').value = preset;
  $('#form').requestSubmit();
}
