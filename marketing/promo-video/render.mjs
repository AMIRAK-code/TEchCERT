// usage: node render.mjs <html> stills <outdir> t1 t2 ...   |   node render.mjs <html> video <out.mp4> [fps]
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
const [html, mode, out, ...rest] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto('file://' + html + '?render=1');
await p.evaluate(() => window.ready);
const canvas = p.locator('#c');
if (mode === 'stills') {
  for (const t of rest) { await p.evaluate(t => window.render(t), Number(t)); await canvas.screenshot({ path: `${out}/f_${t}.png` }); }
} else {
  const fps = Number(rest[0] || 30), frames = 45 * fps;
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < frames; i++) {
    await p.evaluate(t => window.render(t), i / fps);
    const buf = await canvas.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`frame ${i}/${frames}`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
}
console.log('errors:', errs);
await b.close();
