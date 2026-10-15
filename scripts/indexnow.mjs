// Tells IndexNow search engines (Bing, Yandex, Seznam, Naver; Bing also feeds ChatGPT
// search and Copilot) that pages changed. Run after a deploy: `npm run indexnow`.
// It reads each live sitemap and submits every URL in it. The key is public by design:
// each host serves it at /<key>.txt (public/ for techCert, _assist365-hub/ for the hub).
const KEY = '9901cde4d4dbd4bac081aa420b28025d';
const HOSTS = ['techcert.assist365.app', 'assist365.app'];

for (const host of HOSTS) {
  const res = await fetch(`https://${host}/sitemap.xml`);
  const xml = await res.text();
  const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  if (!res.ok || urlList.length === 0) {
    console.error(`${host}: no URLs found in sitemap.xml (HTTP ${res.status}), skipped`);
    continue;
  }
  const ping = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key: KEY, keyLocation: `https://${host}/${KEY}.txt`, urlList }),
  });
  console.log(`${host}: submitted ${urlList.length} URLs, IndexNow answered HTTP ${ping.status}`);
}
