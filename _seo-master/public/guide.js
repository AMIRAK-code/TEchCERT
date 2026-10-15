// The "how to use" walkthrough: a ~1 minute animated video of the results screen, built
// from the visitor's own audit. A clock drives everything (cursor path, clicks, panel
// changes), so it can pause, resume and jump to any chapter like a real video.
// mountGuide(root, data, { autoplay }) -> { destroy }

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const ease = x => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);

export const SAMPLE = {
  host: 'yourwebsite.com',
  pagesCrawled: 38,
  scores: { overall: 62, technical: 71, onpage: 68, geo: 47 },
  issues: [
    { sev: 'critical', title: 'Content only appears after JavaScript runs', cat: 'AI search', count: 24, fix: 'Prerender or server-render the page so its text is in the HTML.', urls: ['/pricing', '/blog/launch', '/features'] },
    { sev: 'warning', title: 'No llms.txt', cat: 'AI search', count: 0 },
    { sev: 'warning', title: 'Missing meta description', cat: 'On-page', count: 9 },
    { sev: 'info', title: 'No og:image', cat: 'On-page', count: 31 },
  ],
  pages: [
    { path: '/', status: 200, title: 'Home' },
    { path: '/pricing', status: 200, title: 'Pricing' },
    { path: '/features', status: 200, title: 'Features' },
    { path: '/blog/launch', status: 200, title: 'We launched' },
    { path: '/old-page', status: 404, title: '' },
  ],
  bots: [
    { ua: 'Googlebot', allowed: true },
    { ua: 'Bingbot', allowed: true },
    { ua: 'OAI-SearchBot', allowed: true },
    { ua: 'Claude-SearchBot', allowed: true },
    { ua: 'PerplexityBot', allowed: false },
    { ua: 'GPTBot', allowed: false },
  ],
  files: { robots: true, llms: false, shells: 24, htmlPages: 38 },
  fix: { title: 'Pricing | Your Website', description: 'Plans for teams of every size. Start free, upgrade when you grow, cancel anytime.' },
  urls: 38,
  key: '9f2c…e41a',
};

const TABS = [
  ['issues', 'Issues'],
  ['ai', 'AI search'],
  ['pages', 'Pages'],
  ['files', 'Files'],
  ['prompt', 'Fix prompt'],
  ['submit', 'Submit'],
];
const SEV = { critical: 'Critical', warning: 'Warning', info: 'Improve' };

// ---------- panel content per tab ----------

const PANELS = {
  intro: d => `<div class="g-hero"><b>Your audit of ${esc(d.host)} is ready</b><span>Here is how to use it, tab by tab.</span></div>`,
  outro: () => `<div class="g-hero"><b>Fix → publish → run it again</b><span>Every fix you ship raises the score.</span></div>`,
  issues: d => `
    <div class="g-chips"><span class="g-chip on" data-f="all">All</span><span class="g-chip">Technical</span><span class="g-chip">On-page</span><span class="g-chip" data-f="geo">AI search</span></div>
    <div class="g-list">${d.issues
      .slice(0, 4)
      .map(
        i => `<div class="g-issue ${i.sev}"><div class="g-it"><em>${SEV[i.sev]}</em><b>${esc(i.title)}</b><small>${esc(i.cat)}${i.count ? ` · ${i.count} pages` : ''}</small></div>
        <div class="g-more"><p><b>Fix.</b> ${esc(i.fix || 'Follow the fix shown in the issue.')}</p><div class="g-urls">${(i.urls || []).slice(0, 3).map(u => `<span>${esc(u)}</span>`).join('')}</div></div></div>`,
      )
      .join('')}</div>`,
  ai: d => `
    <div class="g-cols">
      <div class="g-card"><h5>What AI crawlers can read</h5>
        <div class="g-fact ${d.files.robots ? 'ok' : 'bad'}"><i></i>robots.txt</div>
        <div class="g-fact ${d.files.llms ? 'ok' : 'bad'}"><i></i>llms.txt</div>
        <div class="g-fact ${d.files.shells ? 'bad' : 'ok'}"><i></i>${d.files.htmlPages - d.files.shells} of ${d.files.htmlPages} pages readable without JavaScript</div>
      </div>
      <div class="g-card"><h5>Crawler access</h5>${d.bots
        .map((b, i) => `<div class="g-bot ${b.allowed ? '' : 'blocked'}" style="animation-delay:${0.15 * i}s"><code>${esc(b.ua)}</code><span>${b.allowed ? 'allowed' : 'blocked'}</span></div>`)
        .join('')}</div>
    </div>`,
  pages: d => `
    <div class="g-table"><div class="g-row g-th"><span>Path</span><span>Status</span><span>Title</span></div>${d.pages
      .slice(0, 5)
      .map(p => `<div class="g-row"><span class="g-path">${esc(p.path)}</span><span class="${p.status === 200 ? '' : 'g-bad'}">${p.status}</span><span>${esc(p.title || '(no title)')}</span></div>`)
      .join('')}</div>`,
  files: () => `
    <div class="g-files">${[
      ['robots.txt', 'Site root'],
      ['sitemap.xml', 'Site root'],
      ['llms.txt', 'Site root'],
      ['schema-homepage.html', 'Homepage <head>'],
    ]
      .map(([n, w]) => `<div class="g-file"><b>${n}</b><small>${esc(w)}</small><span class="g-dl">Download</span></div>`)
      .join('')}</div>`,
  prompt: d => `
    <div class="g-code"><div class="g-bar"><span>seo-fix-prompt.md</span><span class="g-btn" data-copy>Copy</span></div>
    <pre># SEO and GEO fixes for https://${esc(d.host)}
Scores: technical ${d.scores.technical}, on-page ${d.scores.onpage}, AI search ${d.scores.geo}

## Critical
- ${esc(d.issues[0]?.title || 'Issue')}…

## Files to add at the site root
### robots.txt · llms.txt · sitemap.xml</pre></div>`,
  submit: d => `
    <div class="g-subs">
      <div class="g-sub"><em>1</em><span>Download the key file</span><span class="g-btn">${esc(d.key)}.txt</span></div>
      <div class="g-sub"><em>2</em><span>Upload it to your site root and publish</span></div>
      <div class="g-sub"><em>3</em><span>Submit ${d.urls} URLs to IndexNow</span><span class="g-btn dark">Submit</span></div>
      <div class="g-sub"><em>4</em><span>Google: Search Console → Sitemaps → add <code>sitemap.xml</code></span></div>
    </div>`,
};

// ---------- the script ----------

function scenes(d) {
  const tab = id => ({ at: 0.9, sel: `[data-tab="${id}"]`, click: true, do: c => c.show(id) });
  return [
    {
      id: 'intro', label: 'Start', dur: 4.5,
      cap: 'Your audit is ready. This one-minute guide shows what each tab does and what to do next.',
      steps: [{ at: 0, do: c => c.show('intro', false) }, { at: 0.3, do: c => c.rings(d.scores) }, { at: 2, xy: [52, 62] }],
    },
    {
      id: 'issues', label: 'Issues', dur: 8,
      cap: 'Issues lists everything to fix, worst first: red is critical, amber a warning, green an improvement. Open one to see the fix and the pages it affects.',
      steps: [tab('issues'), { at: 2.6, sel: '.g-issue .g-it', click: true, do: c => c.q('.g-issue')?.classList.add('open') }, { at: 4.8, sel: '.g-issue.open .g-more' }, { at: 6.6, sel: '.g-chip[data-f="geo"]', click: true, do: c => { c.q('.g-chip.on')?.classList.remove('on'); c.q('.g-chip[data-f="geo"]')?.classList.add('on'); } }],
    },
    {
      id: 'ai', label: 'AI search', dur: 7,
      cap: 'AI search shows what ChatGPT, Claude, Perplexity and Google can actually read. Anything red keeps you out of AI answers.',
      steps: [tab('ai'), { at: 2.8, sel: '.g-bot.blocked', do: c => c.q('.g-bot.blocked')?.classList.add('flash') }, { at: 4.8, sel: '.g-fact.bad' }],
    },
    {
      id: 'pages', label: 'Pages', dur: 8,
      cap: 'Pages lists every URL crawled. Click one for a suggested title, description and head tags, then paste them into that page.',
      steps: [
        tab('pages'),
        { at: 2.4, sel: '.g-row:nth-child(3)', click: true, do: c => c.overlay(`<div class="g-dialog"><h6>${esc(d.fix.path || d.pages[1]?.path || '/page')}</h6><label>Suggested title</label><p>${esc(d.fix.title)}</p><label>Suggested description</label><p>${esc(d.fix.description)}</p><div class="g-bar"><span>head.html</span><span class="g-btn" data-copy>Copy</span></div></div>`) },
        { at: 5.2, sel: '.g-dialog [data-copy]', click: true, do: c => { const b = c.q('.g-dialog [data-copy]'); if (b) b.textContent = 'Copied'; } },
      ],
    },
    {
      id: 'files', label: 'Files', dur: 9,
      cap: 'Files: put robots.txt, sitemap.xml and llms.txt in your site root, next to your homepage. Paste the schema snippet into the homepage <head>.',
      steps: [
        tab('files'),
        { at: 2.6, sel: '.g-file .g-dl', click: true, do: c => { const b = c.q('.g-file .g-dl'); if (b) { b.textContent = 'Downloaded'; b.classList.add('done'); } } },
        { at: 4, do: c => c.overlay(`<div class="g-root"><h6>${esc(d.host)}/ <small>site root</small></h6><div class="g-tree"><span class="dim">index.html</span><span>robots.txt</span><span>sitemap.xml</span><span>llms.txt</span></div><p>schema-homepage.html → inside the homepage <code>&lt;head&gt;</code></p></div>`) },
        { at: 4.6, sel: '.g-root .g-tree span:nth-child(3)' },
      ],
    },
    {
      id: 'prompt', label: 'Fix prompt', dur: 8,
      cap: 'Fix prompt: copy it into Claude Code or Cursor, opened in your site’s code. The agent fixes every issue for you.',
      steps: [
        tab('prompt'),
        { at: 2.2, sel: '.g-panel [data-copy]', click: true, do: c => { const b = c.q('.g-panel [data-copy]'); if (b) b.textContent = 'Copied'; } },
        { at: 3.4, do: c => c.overlay(`<div class="g-term"><div class="g-bar"><span>Claude Code · your-site</span></div><pre><b>&gt;</b> <span class="g-type">Fix the SEO issues in this prompt…</span>
<span class="g-l" style="animation-delay:1.1s">✓ Added robots.txt, sitemap.xml, llms.txt</span>
<span class="g-l" style="animation-delay:1.7s">✓ Prerendered 24 pages</span>
<span class="g-l" style="animation-delay:2.3s">✓ Wrote 9 meta descriptions</span></pre></div>`) },
        { at: 3.8, sel: '.g-term pre' },
      ],
    },
    {
      id: 'zip', label: 'Download all', dur: 5,
      cap: 'Download all saves everything in one zip: the four files, the fix prompt and a full report to compare against next time.',
      steps: [
        { at: 1, sel: '[data-zip]', click: true, do: c => c.overlay(`<div class="g-zip"><h6>seo-master-${esc(d.host)}.zip</h6>${['robots.txt', 'sitemap.xml', 'llms.txt', 'schema-homepage.html', 'seo-fix-prompt.md', 'report.json'].map((f, i) => `<span style="animation-delay:${0.12 * i}s">${f}</span>`).join('')}</div>`) },
        { at: 2.4, sel: '.g-zip' },
      ],
    },
    {
      id: 'submit', label: 'Submit', dur: 10.5,
      cap: 'Submit, after you publish: upload the key file, then press Submit so Bing, ChatGPT search and Copilot recrawl you. For Google, add sitemap.xml in Search Console.',
      steps: [
        tab('submit'),
        { at: 2.3, sel: '.g-sub:nth-child(1) .g-btn', click: true, do: c => c.q('.g-sub:nth-child(1)')?.classList.add('done') },
        { at: 3.9, sel: '.g-sub:nth-child(2)', do: c => c.q('.g-sub:nth-child(2)')?.classList.add('done') },
        { at: 5.6, sel: '.g-sub:nth-child(3) .g-btn', click: true, do: c => { c.q('.g-sub:nth-child(3)')?.classList.add('done'); c.q('.g-subs')?.insertAdjacentHTML('beforeend', `<div class="g-ok">Accepted: ${d.urls} URLs sent to Bing, Yandex, Seznam and Naver</div>`); } },
        { at: 8, sel: '.g-sub:nth-child(4)', do: c => c.q('.g-sub:nth-child(4)')?.classList.add('done') },
      ],
    },
    {
      id: 'outro', label: 'Repeat', dur: 4.5,
      cap: 'Fix, publish, then run the audit again in a few days to watch your score climb.',
      steps: [{ at: 0.2, do: c => { c.show('outro', false); c.rings(Object.fromEntries(Object.entries(d.scores).map(([k, v]) => [k, Math.min(98, v + 24)]))); } }, { at: 1.2, xy: [50, 66] }],
    },
  ];
}

// ---------- player ----------

export function mountGuide(root, data = SAMPLE, { autoplay = true } = {}) {
  const S = scenes(data);
  let acc = 0;
  for (const s of S) {
    s.start = acc;
    acc += s.dur;
  }
  const TOTAL = acc;

  root.innerHTML = `
    <div class="guide">
      <div class="g-stage" tabindex="0" aria-label="How to use SEO Master, animated walkthrough">
        <div class="g-chrome"><i></i><i></i><i></i><span>seo.assist365.app/?url=${esc(data.host)}</span></div>
        <div class="g-app">
          <div class="g-head"><div><b>${esc(data.host)}</b><small>${data.pagesCrawled} pages crawled</small></div><div class="g-rings">${[
            ['overall', 'Overall'],
            ['technical', 'Technical'],
            ['onpage', 'On-page'],
            ['geo', 'AI search'],
          ]
            .map(([k, l]) => `<span class="g-ring" data-k="${k}"><svg viewBox="0 0 36 36"><circle class="tr" cx="18" cy="18" r="15.9"/><circle class="val" cx="18" cy="18" r="15.9" stroke-dasharray="0 100"/></svg><b>0</b><i>${l}</i></span>`)
            .join('')}</div></div>
          <div class="g-tabs">${TABS.map(([id, l]) => `<span class="g-tab" data-tab="${id}">${l}</span>`).join('')}<span class="g-grow"></span><span class="g-btn" data-zip>Download all</span></div>
          <div class="g-panel"></div>
        </div>
        <div class="g-layer"></div>
        <div class="g-cursor" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 2l15 9.5-6.8 1.3 3.9 7.4-3 1.5-3.8-7.5L4 19z"/></svg></div>
        <div class="g-cap" aria-live="polite"><em></em><p></p></div>
        <button class="g-big" aria-label="Play guide"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>
      </div>
      <div class="g-controls">
        <button class="g-play" aria-label="Pause">❚❚</button>
        <div class="g-track" role="slider" aria-label="Guide position" tabindex="0">${S.map(s => `<span class="g-tick" style="left:${(s.start / TOTAL) * 100}%" title="${esc(s.label)}"></span>`).join('')}<i class="g-fill"></i></div>
        <span class="g-time">0:00 / ${fmt(TOTAL)}</span>
      </div>
      <div class="g-chapters">${S.map((s, i) => `<button data-i="${i}">${i ? `${i}. ` : ''}${esc(s.label)}</button>`).join('')}</div>
    </div>`;

  const $ = s => root.querySelector(s);
  const stage = $('.g-stage');
  const panel = $('.g-panel');
  const layer = $('.g-layer');
  const cursor = $('.g-cursor');
  let t = 0;
  let playing = false;
  let visible = true;
  let last = 0;
  let raf = 0;
  let sceneIdx = -1;
  let stepIdx = 0;
  let instant = false;
  let from = [62, 78]; // cursor start, % of stage
  let pos = [...from];

  const ctx = {
    q: sel => stage.querySelector(sel),
    show(id, isTab = true) {
      stage.querySelectorAll('.g-tab').forEach(el => el.classList.toggle('on', isTab && el.dataset.tab === id));
      panel.innerHTML = PANELS[id](data);
      panel.className = `g-panel p-${id}`;
      layer.innerHTML = '';
    },
    overlay(html) {
      layer.innerHTML = html;
    },
    rings(scores) {
      stage.querySelectorAll('.g-ring').forEach(r => {
        const v = scores[r.dataset.k] ?? 0;
        r.querySelector('.val').setAttribute('stroke-dasharray', `${v} 100`);
        r.querySelector('b').textContent = v;
        r.className = `g-ring ${v >= 85 ? 'good' : v >= 60 ? 'mid' : 'bad'}`;
      });
    },
  };

  const pct = sel => {
    const el = typeof sel === 'string' ? stage.querySelector(sel) : null;
    if (!el) return null;
    const a = stage.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    if (!a.width) return null;
    return [((b.left + Math.min(b.width / 2, 40) - a.left) / a.width) * 100, ((b.top + b.height / 2 - a.top) / a.height) * 100];
  };
  const target = st => (st.xy ? st.xy : st.sel ? pct(st.sel) : null);

  function ripple() {
    const r = document.createElement('span');
    r.className = 'g-ripple';
    r.style.left = `${pos[0]}%`;
    r.style.top = `${pos[1]}%`;
    stage.appendChild(r);
    setTimeout(() => r.remove(), 700);
  }

  function runStep(st) {
    if (st.do) st.do(ctx);
    if (st.click && !instant) ripple();
    const p = target(st);
    if (p) from = p;
  }

  function enter(i) {
    sceneIdx = i;
    stepIdx = 0;
    const s = S[i];
    $('.g-cap em').textContent = i && i < S.length - 1 ? `Step ${i} of ${S.length - 2} · ${s.label}` : s.label === 'Start' ? 'How to use SEO Master' : 'Next';
    $('.g-cap p').textContent = s.cap;
    root.querySelectorAll('.g-chapters button').forEach((b, k) => b.classList.toggle('on', k === i));
  }

  // Jump anywhere: replay every earlier scene instantly, then this one up to the new time.
  function seek(nt) {
    t = Math.max(0, Math.min(TOTAL - 0.01, nt));
    const i = S.findIndex(s => t < s.start + s.dur);
    instant = true;
    from = [62, 78];
    stage.classList.add('instant');
    ctx.rings({ overall: 0, technical: 0, onpage: 0, geo: 0 });
    for (let k = 0; k < i; k++) {
      enter(k);
      S[k].steps.forEach(runStep);
    }
    enter(i);
    for (const st of S[i].steps) {
      if (st.at > t - S[i].start) break;
      runStep(st);
      stepIdx++;
    }
    instant = false;
    pos = [...from];
    requestAnimationFrame(() => stage.classList.remove('instant'));
    draw();
  }

  function draw() {
    const s = S[sceneIdx];
    const local = t - s.start;
    // Cursor: glide toward the next target during the 0.9 s before its time.
    const next = s.steps.slice(stepIdx).find(st => st.xy || st.sel);
    if (next) {
      const lead = 0.9;
      const k = (local - (next.at - lead)) / lead;
      if (k > 0) {
        const p = target(next);
        if (p) pos = [from[0] + (p[0] - from[0]) * ease(Math.min(1, k)), from[1] + (p[1] - from[1]) * ease(Math.min(1, k))];
      } else pos = [...from];
    } else pos = [...from];
    cursor.style.left = `${pos[0]}%`;
    cursor.style.top = `${pos[1]}%`;
    $('.g-fill').style.width = `${(t / TOTAL) * 100}%`;
    $('.g-time').textContent = `${fmt(t)} / ${fmt(TOTAL)}`;
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!playing || !visible) return;
    t += dt;
    if (t >= TOTAL) {
      t = TOTAL;
      setPlaying(false);
      stage.classList.add('ended');
      draw();
      return;
    }
    const i = S.findIndex(s => t < s.start + s.dur);
    if (i !== sceneIdx) enter(i);
    const s = S[sceneIdx];
    while (stepIdx < s.steps.length && s.steps[stepIdx].at <= t - s.start) runStep(s.steps[stepIdx++]);
    draw();
  }

  function setPlaying(on) {
    playing = on;
    stage.classList.toggle('paused', !on);
    $('.g-play').textContent = on ? '❚❚' : '▶';
    $('.g-play').setAttribute('aria-label', on ? 'Pause' : 'Play');
  }

  function toggle() {
    if (!playing && t >= TOTAL - 0.05) {
      stage.classList.remove('ended');
      seek(0);
    }
    setPlaying(!playing);
  }

  $('.g-play').onclick = toggle;
  $('.g-big').onclick = toggle;
  stage.onclick = e => {
    if (!e.target.closest('.g-big')) toggle();
  };
  stage.onkeydown = e => {
    if (e.key === ' ' || e.key === 'k') {
      e.preventDefault();
      toggle();
    }
  };
  const track = $('.g-track');
  track.onclick = e => {
    const r = track.getBoundingClientRect();
    stage.classList.remove('ended');
    seek(((e.clientX - r.left) / r.width) * TOTAL);
  };
  track.onkeydown = e => {
    if (e.key === 'ArrowRight') seek(t + 5);
    if (e.key === 'ArrowLeft') seek(t - 5);
  };
  root.querySelectorAll('.g-chapters button').forEach(b => {
    b.onclick = () => {
      stage.classList.remove('ended');
      seek(S[+b.dataset.i].start + 0.01);
      setPlaying(true);
    };
  });

  // Pause while scrolled out of view, so nobody misses the start.
  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.35 });
  io.observe(stage);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  seek(0);
  setPlaying(autoplay && !reduced);
  last = performance.now();
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      io.disconnect();
      root.innerHTML = '';
    },
  };
}

// The same steps in writing, under the video and on /guide.
export function stepsHtml({ open = false } = {}) {
  return `
  <details class="steps-text"${open ? ' open' : ''}>
    <summary>Read the steps instead</summary>
    <ol>
      <li><b>Issues.</b> Everything to fix, worst first. Red is critical (fix now), amber is a warning, green is an improvement. Use the filters for Technical, On-page or AI search, and open an issue to see why it matters, how to fix it and which pages are affected.</li>
      <li><b>AI search.</b> Whether robots.txt and llms.txt work, how many pages show their text without JavaScript, and which crawlers (Google, Bing, ChatGPT, Claude, Perplexity and AI training bots) may read your site. Red here keeps you out of AI answers.</li>
      <li><b>Pages.</b> Every URL crawled with its status, title, word count and issues. Click a page for a suggested title and description plus ready-made head tags; paste them into that page's <code>&lt;head&gt;</code>.</li>
      <li><b>Files.</b> Ready-to-upload <code>robots.txt</code>, <code>sitemap.xml</code>, <code>llms.txt</code> and homepage structured data. Copy or download each one.</li>
      <li><b>Fix prompt.</b> Copy it into Claude Code, Cursor or another coding agent opened in your site's code. It lists every issue with the affected URLs and includes the files, so the agent can fix everything in one go.</li>
      <li><b>Download all.</b> Saves the files, the fix prompt and a full report as one zip.</li>
      <li><b>Submit.</b> After you publish your fixes, tell search engines to recrawl (steps below).</li>
    </ol>
    <h4>What to do with the download</h4>
    <ul>
      <li><code>robots.txt</code>, <code>sitemap.xml</code>, <code>llms.txt</code>: upload to your site root, the folder that holds your homepage, so they open at <code>yoursite.com/robots.txt</code> and so on. In Vite, Astro or Next.js that is the <code>public/</code> folder. On WordPress use your SEO plugin (Yoast, Rank Math) for robots.txt and the sitemap, and upload llms.txt with your host's file manager. If a file already exists, compare before replacing it.</li>
      <li><code>schema-homepage.html</code>: paste inside the <code>&lt;head&gt;</code> of your homepage. Add your real logo and social profile links if they are missing.</li>
      <li><code>seo-fix-prompt.md</code>: give it to your coding agent, or work through it yourself from the top.</li>
      <li><code>report.json</code>: keep it to compare with your next audit.</li>
      <li>Open each uploaded file in your browser afterwards. It should show plain text or XML, not your website.</li>
    </ul>
    <h4>Submission process</h4>
    <ol>
      <li><b>Publish your fixes</b> and check them live.</li>
      <li><b>IndexNow (Bing, Yandex, Seznam, Naver; Bing also feeds ChatGPT search and Copilot).</b> In Submit, download the key file, upload it to your site root, check it opens at <code>yoursite.com/&lt;key&gt;.txt</code>, then press Submit. "Accepted" or "Received" means it worked.</li>
      <li><b>Google.</b> In <a href="https://search.google.com/search-console" target="_blank" rel="noopener">Google Search Console</a>, add your site, open Sitemaps and submit <code>sitemap.xml</code>. Use URL Inspection → Request indexing for your most important pages.</li>
      <li><b>Bing.</b> In <a href="https://www.bing.com/webmasters" target="_blank" rel="noopener">Bing Webmaster Tools</a>, import your site from Search Console and submit the same sitemap.</li>
      <li><b>Re-run the audit</b> after a few days. Search engines take days to weeks to recrawl, so rankings move slower than the score.</li>
    </ol>
  </details>`;
}
