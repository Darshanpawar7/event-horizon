// Visual review of every venue. Serves nothing itself: start `npm run preview`
// (or any server for dist/) first, then run
//
//   node scripts/review_scenes.cjs http://127.0.0.1:4173 ./review-shots [venues] [quality]
//   npm run review:scenes
//
// For each venue it pauses the "as reported" timeline at the incident moment
// (T0), saves a wide shot, presses FOCUS for the close-up, then switches to the
// counterfactual at the same moment and saves another wide shot. `venues` is a
// comma-separated list of ids (default: all); `quality` is high (default) or
// low. It drives the installed Google Chrome with software WebGL, so expect
// about a minute per venue at high quality. Exit code 1 means a page error.
//
// (.cjs because package.json declares "type": "module" and this script uses require.)
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright-core');

const [, , baseUrl = 'http://127.0.0.1:4173', outDir = './review-shots', only = '', quality = 'high'] = process.argv;
fs.mkdirSync(outDir, { recursive: true });

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
const SETTLE_MS = 6000;
// Software WebGL draws a frame or two a second, and the camera flight eases
// per frame, so the close-up needs longer to arrive than a wide shot.
const FOCUS_SETTLE_MS = 14000;

/** Move the timeline scrubber the way a user would, so React's onChange fires. */
async function setClock(page, seconds) {
  await page.$eval(
    'input[aria-label="Timeline position in seconds relative to T0"]',
    (el, value) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(el, String(value));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    },
    seconds,
  );
}

async function pause(page) {
  const button = page.locator('button', { hasText: 'PAUSE' }).first();
  if (await button.count()) await button.click();
}

(async () => {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const problems = [];
  page.on('pageerror', (error) => {
    const stack = (error.stack || '').split('\n').slice(0, 6).join('\n    ');
    problems.push(`pageerror: ${error.message}\n    ${stack}`);
  });
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    // The API is not required; its polling failures are expected.
    if (/\/api\//.test(text) || /Failed to load resource/.test(text)) return;
    problems.push(`console.error: ${text}`);
  });

  await page.goto(`${baseUrl}/?quality=${quality}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas', { timeout: 60000 });
  await page.waitForTimeout(4000);

  for (const id of wanted) {
    const started = Date.now();
    await page.locator(`button[title="${VENUES[id]}"]`).first().click();
    await page.waitForTimeout(1500);
    await pause(page);
    if (id !== 'plaza') await setClock(page, 0);
    await page.waitForTimeout(SETTLE_MS);
    await page.screenshot({ path: path.join(outDir, `${id}-1-as-reported.png`) });

    const focus = page.locator('button', { hasText: /^FOCUS / }).first();
    if (await focus.count()) {
      await focus.click();
      await page.waitForTimeout(FOCUS_SETTLE_MS);
      await page.screenshot({ path: path.join(outDir, `${id}-2-focus.png`) });
      await page.locator('button', { hasText: 'RESET VIEW' }).first().click();
      await page.waitForTimeout(SETTLE_MS);
    }

    const branch = page.locator('button', { hasText: 'WITH THE WARNING ACTED ON' });
    if (await branch.count()) {
      await branch.first().click();
      await page.waitForTimeout(1000);
      await pause(page);
      await setClock(page, 0);
      await page.waitForTimeout(SETTLE_MS);
      await page.screenshot({ path: path.join(outDir, `${id}-3-acted-on.png`) });
    }
    console.log(`${id}: ${((Date.now() - started) / 1000).toFixed(0)} s`);
  }

  console.log(problems.length ? `PROBLEMS:\n - ${problems.join('\n - ')}` : 'no page errors');
  await browser.close();
  process.exit(problems.some((problem) => problem.startsWith('pageerror')) ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
