// Frame-rate check of every venue on this machine's real GPU. Serves nothing
// itself: start `npm run preview` (or any server for dist/) first, then run
//
//   node scripts/perf_scenes.cjs http://127.0.0.1:4173 [venues] [quality] [dpr] [seconds]
//   npm run perf:scenes
//
// It drives the installed Google Chrome with its hardware renderer (ANGLE on
// Direct3D 11 on Windows), vsync off, so frame rates above the display's
// refresh rate show the headroom. Per venue it prints the frames per second
// while the timeline plays, the median and 95th-percentile frame time, the
// share of frames over 50 ms, draw calls per frame, the longest frame right
// after switching to the venue and while running, and the tier AUTO chose.
// `quality` is auto (default), high, medium or low; `dpr` defaults to 1.25,
// a 125 % Windows display. Numbers vary a few tens of percent between runs
// as a laptop GPU changes clock, so compare runs made back to back.
//
// (.cjs because package.json declares "type": "module" and this script uses require.)
const { chromium } = require('playwright-core');

const [, , baseUrl = 'http://127.0.0.1:4173', only = '', quality = 'auto', dpr = '1.25', seconds = '5'] = process.argv;

// Venue ids and the names their picker buttons carry as `title`.
const VENUES = {
  plaza: 'Venue plaza',
  ndls: 'New Delhi Railway Station — platforms 14/15',
  chinnaswamy: 'M. Chinnaswamy Stadium — gate 6/7 approach',
  sangam: 'Sangam nose, Maha Kumbh Mela',
  itaewon: 'Itaewon alley beside the Hamilton Hotel',
  loveparade: 'Love Parade — the ramp and the tunnels',
};
const wanted = only ? only.split(',') : Object.keys(VENUES);

/** Frame statistics over `ms` milliseconds of requestAnimationFrame. */
async function measure(page, ms) {
  return page.evaluate(
    (duration) =>
      new Promise((resolve) => {
        const deltas = [];
        const draws0 = window.__draws;
        let last = performance.now();
        const start = last;
        function frame(now) {
          deltas.push(now - last);
          last = now;
          if (now - start < duration) {
            requestAnimationFrame(frame);
            return;
          }
          const sorted = [...deltas].sort((a, b) => a - b);
          const pick = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
          resolve({
            fps: +(deltas.length / ((now - start) / 1000)).toFixed(1),
            median: +pick(0.5).toFixed(1),
            p95: +pick(0.95).toFixed(1),
            slow: Math.round((deltas.filter((d) => d > 50).length / deltas.length) * 100),
            longest: Math.round(sorted[sorted.length - 1]),
            draws: Math.round((window.__draws - draws0) / deltas.length),
          });
        }
        requestAnimationFrame(frame);
      }),
    ms,
  );
}

(async () => {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--disable-frame-rate-limit', '--disable-gpu-vsync'],
  });
  const page = await browser.newPage({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: Number(dpr) });
  const problems = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    // The API is not required; its polling failures are expected.
    if (/\/api\//.test(text) || /Failed to load resource/.test(text)) return;
    problems.push(`console.error: ${text}`);
  });
  // Count draw calls, the main CPU cost of a scene in WebGL.
  await page.addInitScript(() => {
    const proto = WebGL2RenderingContext.prototype;
    window.__draws = 0;
    for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
      const original = proto[name];
      proto[name] = function counted(...args) {
        window.__draws += 1;
        return original.apply(this, args);
      };
    }
  });

  await page.goto(`${baseUrl}/?quality=${quality}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas', { timeout: 60000 });
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const info = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  console.log(`renderer: ${renderer} · device pixel ratio ${dpr} · quality ${quality}`);
  await page.waitForTimeout(4000);

  for (const id of wanted) {
    await page.locator(`button[title="${VENUES[id]}"]`).first().click();
    const switching = await measure(page, 5000);
    const running = await measure(page, Number(seconds) * 1000);
    const chose = await page
      .locator('text=/AUTO CHOSE/')
      .first()
      .textContent({ timeout: 300 })
      .catch(() => '');
    console.log(
      `${id.padEnd(12)} ${String(running.fps).padStart(6)} fps · median ${running.median} ms · p95 ${running.p95} ms · ` +
        `>50 ms ${running.slow}% · ${running.draws} draws/frame · longest frame ${switching.longest} ms after switch, ` +
        `${running.longest} ms running${chose ? ` ${chose.trim()}` : ''}`,
    );
  }

  console.log(problems.length ? `PROBLEMS:\n - ${problems.join('\n - ')}` : 'no page errors');
  await browser.close();
  process.exit(problems.some((problem) => problem.startsWith('pageerror')) ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
