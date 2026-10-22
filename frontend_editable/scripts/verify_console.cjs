// Headless check of the built console. Serves nothing itself: start
// `npm run preview` (or any server for dist/) first, then run
//
//   node scripts/verify_console.cjs http://127.0.0.1:4173 ./shots chrome   (or: npm run verify:console)
//
// (.cjs because package.json declares "type": "module" and this script uses require.)
//
// It drives the installed Google Chrome (or Microsoft Edge with `msedge`) with
// software WebGL, walks every venue and both timeline branches, clicks through
// the whole pitch walkthrough, records page errors and console errors, checks
// the key labels are on screen and saves a screenshot per state. Exit code 1
// means a page error occurred. The API is not required: its polling failures
// in backend mode are filtered out as expected.
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright-core');

const [, , baseUrl = 'http://127.0.0.1:4173', outDir = './shots', channel = 'chrome'] = process.argv;
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
const WALKTHROUGH_STEPS = 11;

(async () => {
  const browser = await chromium.launch({
    channel,
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const problems = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() !== 'error' && message.type() !== 'warning') return;
    const text = message.text();
    if (/\/api\//.test(text) || /Failed to load resource/.test(text)) return;
    problems.push(`console.${message.type()}: ${text}`);
  });

  const started = Date.now();
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForTimeout(2500);
  console.log(`loaded in ${Date.now() - started} ms; webgl canvas present`);
  await page.screenshot({ path: path.join(outDir, '00-plaza-clear.png') });

  const results = [];
  for (const [venue, title] of Object.entries(VENUES)) {
    await page.locator(`button[title="${title}"]`).first().click();
    // Long enough for the camera flight to land under software rendering.
    await page.waitForTimeout(3200);
    const banner = await page.locator('text=/RECONSTRUCTION|GENERIC VENUE/').first().textContent();
    const row = {
      venue,
      banner: banner?.trim(),
      timelinePanel: await page.locator('text=/SIMULATED CROWD/').count(),
      brief: await page.locator('text=/Incident brief/').count(),
      warning: await page.locator('text=/of warning|No usable warning|never crosses/').count(),
    };
    await page.screenshot({ path: path.join(outDir, `${venue}-as-reported.png`) });

    const branch = page.locator('button', { hasText: 'WITH THE WARNING ACTED ON' });
    if (await branch.count()) {
      await branch.first().click();
      await page.waitForTimeout(1800);
      row.comparison = await page.locator('text=/WARNING ACTED ON/').count();
      await page.screenshot({ path: path.join(outDir, `${venue}-intervention.png`) });
    }
    results.push(row);
  }

  for (let step = 0; step < WALKTHROUGH_STEPS; step += 1) {
    const next = page.locator('button', { hasText: /START ▸|NEXT ▸/ }).first();
    if (!(await next.count()) || (await next.isDisabled())) break;
    await next.click();
    await page.waitForTimeout(900);
  }
  await page.screenshot({ path: path.join(outDir, 'zz-after-walkthrough.png') });

  console.table(results);
  if (problems.length) {
    console.log('PROBLEMS:');
    for (const problem of problems) console.log(' -', problem);
  } else {
    console.log('no console or page errors');
  }
  await browser.close();
  process.exit(problems.some((problem) => problem.startsWith('pageerror')) ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
