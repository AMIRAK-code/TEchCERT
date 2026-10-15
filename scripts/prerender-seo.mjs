// Runs after `vite build`. techCert is a single-page app, so crawlers that don't run
// JavaScript (most AI answer engines, social previews) would only see an empty
// <div id="root">. This writes a static HTML file per public route into dist/ with its
// own title, description, canonical URL, JSON-LD and readable content. React replaces
// that content when it mounts. It also writes robots.txt, sitemap.xml, llms.txt and
// llms-full.txt from the same course data, so they never drift from the site.
//
// Cloudflare serves /courses/ai-security from courses/ai-security.html (html_handling:
// auto-trailing-slash), so every page keeps its clean URL.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const SITE = 'https://techcert.assist365.app';
const HUB = 'https://assist365.app';
const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const DATA = path.join(ROOT, 'src', 'data');
const TODAY = new Date().toISOString().slice(0, 10);

// Same course order as the site: read the imports in src/data/courses.js.
const coursesSrc = fs.readFileSync(path.join(DATA, 'courses.js'), 'utf8');
const order = [...coursesSrc.matchAll(/^import (\w+) from '\.\/(\w+)';$/gm)].map(m => m[2]);
const courses = [];
for (const file of order) {
  const mod = await import(pathToFileURL(path.join(DATA, `${file}.js`)).href);
  courses.push({ ...mod.default, file: `src/data/${file}.js` });
}

// Last commit date of a file, so sitemap lastmod changes only when the content does.
function lastmod(file) {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cs', '--', file], { encoding: 'utf8' }).trim() || TODAY;
  } catch {
    return TODAY;
  }
}

const lessonsOf = c => c.modules.flatMap(m => m.lessons.map(l => ({ ...l, module: m })));
const minutesOf = c => lessonsOf(c).reduce((a, l) => a + (l.minutes || 0), 0);

const esc = s =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Inline formatting used in course content: **bold**, `code`, *italic* (see src/lib/RichText.jsx).
const rich = s =>
  esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
const plain = s => String(s).replace(/\*\*|`|\*/g, '');
const clip = (s, n = 158) => (s.length <= n ? s : `${s.slice(0, s.lastIndexOf(' ', n - 1))}…`);
const jsonLd = obj => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

const ORG = {
  '@type': 'Organization',
  '@id': `${HUB}/#organization`,
  name: 'assist365',
  url: HUB,
};
const ACADEMY = {
  '@type': 'EducationalOrganization',
  '@id': `${SITE}/#organization`,
  name: 'techCert365 Academy',
  alternateName: 'techCert',
  url: SITE,
  parentOrganization: { '@id': `${HUB}/#organization` },
};
const crumbs = items => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: url })),
});

const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');

function page({ route, title, description, type = 'website', graph, body }) {
  const url = SITE + route;
  const head = [
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:site_name" content="techCert" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<link rel="alternate" type="text/plain" title="llms.txt" href="${SITE}/llms.txt" />`,
    jsonLd({ '@context': 'https://schema.org', '@graph': [ORG, ACADEMY, ...graph] }),
  ].join('\n    ');
  const html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(description)}" />`)
    .replace('</head>', `    ${head}\n  </head>`)
    .replace(
      '<div id="root"></div>',
      // index.html is also the fallback for every other path (/dashboard, /exam/...); hide
      // the home content there so it doesn't flash before React renders the real page.
      `<div id="root"><div class="container narrow prerender">${body}${FOOTER}</div></div>` +
        (route === '/' ? `\n    <script>if (location.pathname !== '/') document.querySelector('.prerender').hidden = true;</script>` : ''),
    );
  if (html === template) throw new Error('dist/index.html did not match the expected template');
  const file = route === '/' ? 'index.html' : `${route.slice(1)}.html`;
  fs.mkdirSync(path.dirname(path.join(DIST, file)), { recursive: true });
  fs.writeFileSync(path.join(DIST, file), html);
  return url;
}

// Plain links to every assist365 product, so crawlers can move across the subdomains.
const FOOTER = `
<nav aria-label="assist365 products"><p>techCert is part of <a href="${HUB}">assist365</a>:
<a href="${SITE}/">techCert</a> (AI certifications) ·
<a href="https://vibeassist.assist365.app">VibeAssist</a> (for indie app makers) ·
<a href="https://exam.assist365.app">Examer</a> (admission test prep) ·
<a href="https://sop.assist365.app">SOP Assist</a> (statement of purpose builder)</p></nav>`;

function renderBlock(b) {
  switch (b.type) {
    case 'heading':
      return `<h2>${esc(b.text)}</h2>`;
    case 'text':
      return [].concat(b.text).map(p => `<p>${rich(p)}</p>`).join('\n');
    case 'list':
      return `<ul>${b.items.map(i => `<li>${rich(i)}</li>`).join('')}</ul>`;
    case 'code':
      return `<figure>${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ''}<pre>${esc(b.text)}</pre></figure>`;
    case 'callout':
      return `<aside>${b.title ? `<strong>${esc(b.title)}</strong> ` : ''}<p>${rich(b.text)}</p></aside>`;
    default:
      // Interactive exercises run in the browser; answers stay out of the static HTML.
      return b.title ? `<p><em>Interactive exercise: ${esc(b.title)}</em></p>` : '';
  }
}

function blockMarkdown(b) {
  switch (b.type) {
    case 'heading':
      return `### ${b.text}`;
    case 'text':
      return [].concat(b.text).join('\n\n');
    case 'list':
      return b.items.map(i => `- ${i}`).join('\n');
    case 'code':
      return `${b.caption ? `${b.caption}:\n\n` : ''}\`\`\`\n${b.text}\n\`\`\``;
    case 'callout':
      return `> ${b.title ? `**${b.title}.** ` : ''}${b.text}`;
    default:
      return '';
  }
}

const firstText = lesson => {
  const t = lesson.blocks.find(b => b.type === 'text');
  return t ? plain([].concat(t.text).join(' ')) : '';
};

const sitemap = [];

// Home
const homeUrl = page({
  route: '/',
  title: 'techCert | AI Certifications in Prompt Engineering, AI Security, SEO & GEO and Marketing',
  description:
    'Free interactive AI courses with hands-on labs, and verifiable certificates for AI Prompt Engineer, AI Security Professional, AI SEO & GEO Specialist and AI Marketing Specialist.',
  graph: [
    { '@type': 'WebSite', '@id': `${SITE}/#website`, url: SITE, name: 'techCert', publisher: { '@id': `${SITE}/#organization` } },
    {
      '@type': 'ItemList',
      name: 'techCert certifications',
      itemListElement: courses.map((c, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/courses/${c.id}` })),
    },
  ],
  body: `
<h1>Practical AI certifications you can verify</h1>
<p>techCert, by techCert365 Academy, teaches AI skills by doing. Every lesson is free and built around interactive exercises that run in the browser. Finish a course, pass a timed exam, and get a certificate that anyone can check online.</p>
<h2>Certifications</h2>
<ul>${courses
    .map(c => `<li><a href="/courses/${c.id}"><strong>${esc(c.title)}</strong></a>: ${esc(c.description)} ${esc(c.duration)}, ${esc(c.level)}.</li>`)
    .join('')}</ul>
<h2>How certification works</h2>
<ol><li>Complete every lesson of a course. All lessons are free.</li><li>Unlock and pass the timed exam (${courses[0].examSize} questions, ${courses[0].examMinutes} minutes, pass mark ${courses[0].passMark}%).</li><li>Receive a certificate with a credential ID that anyone can check on the <a href="/verify">verification page</a>.</li></ol>`,
});
sitemap.push({ loc: homeUrl, lastmod: courses.map(c => lastmod(c.file)).sort().at(-1) });

// Verify
sitemap.push({
  loc: page({
    route: '/verify',
    title: 'Verify a techCert certificate',
    description: 'Check that a techCert certificate is genuine by entering its credential ID.',
    graph: [crumbs([['techCert', `${SITE}/`], ['Verify a certificate', `${SITE}/verify`]])],
    body: `<h1>Verify a techCert certificate</h1><p>Every techCert certificate carries a credential ID (for example TC-XXXX-XXXX). Enter it on this page to confirm the holder, the certification and the issue date.</p>`,
  }),
  lastmod: lastmod('src/pages/Verify.jsx'),
});

// Courses and lessons
for (const c of courses) {
  const courseUrl = `${SITE}/courses/${c.id}`;
  const lessons = lessonsOf(c);
  const updated = lastmod(c.file);
  const hours = Math.round(minutesOf(c) / 60) || parseInt(c.duration, 10);

  page({
    route: `/courses/${c.id}`,
    title: `${c.title} Certification | techCert`,
    description: clip(`${c.description} ${lessons.length} free interactive lessons, then a timed exam for a verifiable certificate.`),
    graph: [
      {
        '@type': 'Course',
        '@id': `${courseUrl}#course`,
        name: `${c.title} Certification`,
        description: c.description,
        url: courseUrl,
        provider: { '@id': `${SITE}/#organization` },
        educationalLevel: c.level,
        teaches: c.outcomes,
        inLanguage: 'en',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', category: 'Free' },
        educationalCredentialAwarded: `${c.title} certificate (techCert365 Academy)`,
        hasCourseInstance: {
          '@type': 'CourseInstance',
          courseMode: 'Online',
          courseWorkload: `PT${hours}H`,
        },
        syllabusSections: c.modules.map(m => ({ '@type': 'Syllabus', name: m.title, description: m.lessons.map(l => l.title).join('; ') })),
      },
      crumbs([['techCert', `${SITE}/`], [c.title, courseUrl]]),
    ],
    body: `
<p><a href="/">techCert</a> › ${esc(c.title)}</p>
<h1>${esc(c.title)} Certification</h1>
<p><strong>${esc(c.tagline)}</strong> ${esc(c.description)}</p>
<p>${lessons.length} lessons · ${esc(c.duration)} · ${esc(c.level)} · exam: ${c.examSize} questions in ${c.examMinutes} minutes, pass mark ${c.passMark}%.</p>
<h2>What you will learn</h2>
<ul>${c.outcomes.map(o => `<li>${esc(o)}</li>`).join('')}</ul>
<h2>Syllabus</h2>
${c.modules
  .map(m => `<h3>${esc(m.title)}</h3><ol>${m.lessons.map(l => `<li><a href="/courses/${c.id}/learn/${l.id}">${esc(l.title)}</a>${l.minutes ? ` (${l.minutes} min)` : ''}</li>`).join('')}</ol>`)
  .join('\n')}`,
  });
  sitemap.push({ loc: courseUrl, lastmod: updated });

  lessons.forEach((l, i) => {
    const route = `/courses/${c.id}/learn/${l.id}`;
    const prev = lessons[i - 1];
    const next = lessons[i + 1];
    page({
      route,
      title: `${l.title} | ${c.title} | techCert`,
      description: clip(firstText(l) || `${l.title}: lesson ${i + 1} of the ${c.title} course.`),
      type: 'article',
      graph: [
        {
          '@type': 'LearningResource',
          '@id': `${SITE}${route}#lesson`,
          name: l.title,
          url: SITE + route,
          learningResourceType: 'Lesson',
          educationalLevel: c.level,
          inLanguage: 'en',
          isAccessibleForFree: true,
          timeRequired: l.minutes ? `PT${l.minutes}M` : undefined,
          isPartOf: { '@id': `${courseUrl}#course` },
          provider: { '@id': `${SITE}/#organization` },
          dateModified: updated,
        },
        crumbs([['techCert', `${SITE}/`], [c.title, courseUrl], [l.title, SITE + route]]),
      ],
      body: `
<p><a href="/">techCert</a> › <a href="/courses/${c.id}">${esc(c.title)}</a> › ${esc(l.module.title)}</p>
<article>
<h1>${esc(l.title)}</h1>
<p>Lesson ${i + 1} of ${lessons.length}${l.minutes ? ` · ${l.minutes} min` : ''} · part of the <a href="/courses/${c.id}">${esc(c.title)} certification</a></p>
${l.blocks.map(renderBlock).filter(Boolean).join('\n')}
</article>
<p>${prev ? `← <a href="${`/courses/${c.id}/learn/${prev.id}`}">${esc(prev.title)}</a>` : ''}${prev && next ? ' · ' : ''}${next ? `<a href="${`/courses/${c.id}/learn/${next.id}`}">${esc(next.title)}</a> →` : ''}</p>`,
    });
    sitemap.push({ loc: SITE + route, lastmod: updated });
  });
}

// sitemap.xml
fs.writeFileSync(
  path.join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemap.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}
</urlset>
`,
);

// robots.txt: search engines and AI answer engines may crawl the public pages.
// Private, per-user routes are excluded.
fs.writeFileSync(
  path.join(DIST, 'robots.txt'),
  `User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /admin
Disallow: /exam/

Sitemap: ${SITE}/sitemap.xml
`,
);

// llms.txt (https://llmstxt.org): a short map for AI assistants.
const llms = `# techCert

> techCert, run by techCert365 Academy (part of assist365), is an online certification platform for practical AI skills. All lessons are free and built around interactive in-browser exercises. Learners who complete a course can take a timed exam (${courses[0].examSize} questions, ${courses[0].examMinutes} minutes, pass mark ${courses[0].passMark}%) and receive a certificate with a credential ID that anyone can verify at ${SITE}/verify.

## Certifications

${courses.map(c => `- [${c.title}](${SITE}/courses/${c.id}): ${c.description} ${lessonsOf(c).length} lessons, ${c.duration}, ${c.level}.`).join('\n')}

## Lessons

${courses.map(c => `### ${c.title}\n\n${lessonsOf(c).map(l => `- [${l.title}](${SITE}/courses/${c.id}/learn/${l.id})`).join('\n')}`).join('\n\n')}

## Optional

- [Full lesson text](${SITE}/llms-full.txt): every lesson as Markdown
- [Verify a certificate](${SITE}/verify)
- [assist365](${HUB}): the parent hub, with VibeAssist, Examer and SOP Assist
`;
fs.writeFileSync(path.join(DIST, 'llms.txt'), llms);

const llmsFull = `# techCert: full course content

> Lesson text for every techCert course. Interactive exercises are not included. Source: ${SITE}

${courses
  .map(
    c => `## ${c.title} (${SITE}/courses/${c.id})

${c.description}

What you will learn:
${c.outcomes.map(o => `- ${o}`).join('\n')}

${lessonsOf(c)
  .map(l => `### ${l.title}\n\nURL: ${SITE}/courses/${c.id}/learn/${l.id}\n\n${l.blocks.map(blockMarkdown).filter(Boolean).join('\n\n')}`)
  .join('\n\n')}`,
  )
  .join('\n\n')}
`;
fs.writeFileSync(path.join(DIST, 'llms-full.txt'), llmsFull);

console.log(`[seo] prerendered ${sitemap.length} pages; wrote sitemap.xml, robots.txt, llms.txt, llms-full.txt`);
