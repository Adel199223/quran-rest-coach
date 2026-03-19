import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';

const THIS_FILE = fileURLToPath(import.meta.url);
const TOOLING_DIR = path.dirname(THIS_FILE);
const DEFAULT_ROOT_DIR = path.resolve(TOOLING_DIR, '..');

export const DEFAULT_BASE_URL = 'http://127.0.0.1:4173';

export function createArtifactPaths(outputDir) {
  return {
    desktopScreenshot: path.join(outputDir, 'session-validation-desktop.png'),
    mobileScreenshot: path.join(outputDir, 'session-validation-mobile.png'),
    summary: path.join(outputDir, 'session-validation-summary.json'),
    failureScreenshot: path.join(outputDir, 'session-validation-failure.png'),
    trace: path.join(outputDir, 'session-validation-trace.zip')
  };
}

export function parseCliArgs(argv = process.argv.slice(2)) {
  let baseUrl = DEFAULT_BASE_URL;
  let outputDir = path.join(DEFAULT_ROOT_DIR, 'output', 'playwright');

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--base-url') {
      baseUrl = argv[index + 1] ?? DEFAULT_BASE_URL;
      index += 1;
      continue;
    }

    if (argument === '--output-dir') {
      outputDir = argv[index + 1] ?? outputDir;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return { baseUrl, outputDir };
}

export function buildValidationSummary({ baseUrl, checks, artifacts, error = null, startedAt, finishedAt }) {
  return {
    baseUrl,
    startedAt,
    finishedAt,
    status: error ? 'failed' : 'passed',
    checks,
    artifacts,
    error
  };
}

function buildScenarioUrl(baseUrl, scenarioId) {
  const url = new URL(baseUrl);
  url.searchParams.set('review', scenarioId);
  return url.toString();
}

async function writeSummary(summaryPath, summary) {
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
}

async function validateDesktopSurface(baseUrl, artifacts, checks) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();

  try {
    await page.goto(baseUrl, {
      waitUntil: 'networkidle',
      timeout: 15_000
    });
    await page.getByRole('button', { name: /understand/i }).click();
    await page.getByRole('button', { name: /start session/i }).waitFor();
    await page.getByRole('button', { name: /start session/i }).click();
    await page.getByRole('button', { name: /start now/i }).waitFor();
    await page.getByRole('button', { name: /start now/i }).click();
    await page.getByText(/^understand$/i).first().waitFor();
    await page.getByRole('button', { name: /add 2 pages/i }).click();
    await page.getByRole('dialog', { name: /micro break/i }).waitFor();
    await page.getByRole('button', { name: /resume now/i }).click();
    await page.getByRole('dialog', { name: /micro break/i }).waitFor({
      state: 'detached',
      timeout: 15_000
    });
    await page.getByRole('button', { name: /end session/i }).waitFor();
    await page.getByRole('button', { name: /end session/i }).click();
    await page.getByRole('heading', { name: /session complete/i }).waitFor();
    await page.getByRole('button', { name: /view history/i }).click();
    await page.getByRole('heading', { name: /history/i }).waitFor();
    checks.push(
      { name: 'live app starts with the selected reading intent', status: 'passed' },
      { name: 'live app resumes from the first break', status: 'passed' },
      { name: 'live app keeps the completion summary on the session surface', status: 'passed' },
      { name: 'live app saves a finished session to history', status: 'passed' }
    );

    await page.evaluate(() => {
      window.localStorage.clear();
    });

    await page.goto(baseUrl, {
      waitUntil: 'networkidle',
      timeout: 15_000
    });
    await page.getByRole('button', { name: /start session/i }).click();
    await page.getByRole('button', { name: /start now/i }).click();
    await page.getByRole('button', { name: /end session/i }).waitFor();
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('dialog', { name: /resume your last session/i }).waitFor();
    await page.getByRole('button', { name: /discard saved session/i }).click();
    await page.getByRole('dialog', { name: /resume your last session/i }).waitFor({
      state: 'detached',
      timeout: 15_000
    });
    await page.getByRole('button', { name: /start session/i }).waitFor();
    checks.push({ name: 'live app discards a saved session after reload', status: 'passed' });

    await page.getByRole('button', { name: /start session/i }).click();
    await page.getByRole('button', { name: /start now/i }).click();
    await page.getByRole('button', { name: /end session/i }).waitFor();
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('dialog', { name: /resume your last session/i }).waitFor();
    await page.getByRole('button', { name: /resume saved session/i }).click();
    await page.getByRole('dialog', { name: /resume your last session/i }).waitFor({
      state: 'detached',
      timeout: 15_000
    });
    await page.getByRole('button', { name: /end session/i }).waitFor();
    checks.push({ name: 'live app resumes a saved session after reload', status: 'passed' });

    await page.evaluate(() => {
      window.localStorage.clear();
    });

    await page.goto(baseUrl, {
      waitUntil: 'networkidle',
      timeout: 15_000
    });
    await page.getByRole('button', { name: /settings/i }).click();
    const hiddenPaceField = page.getByLabel('Default pace for 2 pages (seconds)');
    if ((await hiddenPaceField.count()) > 0 && await hiddenPaceField.first().isVisible()) {
      throw new Error('Live settings should keep advanced timing collapsed until opened.');
    }
    await page.getByLabel(/show countdown during breaks/i).click();
    await page.getByLabel(/play sound at break/i).click();
    await page.getByRole('button', { name: /apply calm-focus defaults/i }).click();

    if (await page.getByLabel(/show countdown during breaks/i).isChecked()) {
      throw new Error('Calm-focus defaults should turn the rest countdown back off.');
    }

    if (await page.getByLabel(/play sound at break/i).isChecked()) {
      throw new Error('Calm-focus defaults should turn the break sound back off.');
    }

    await page.getByRole('button', { name: /advanced timing/i }).click();
    await page.getByLabel('Default pace for 2 pages (seconds)').waitFor();
    checks.push(
      { name: 'live settings keep advanced timing behind disclosure', status: 'passed' },
      { name: 'live settings apply calm-focus defaults', status: 'passed' }
    );

    await page.goto(buildScenarioUrl(baseUrl, 'idle-simplified-standalone'), {
      waitUntil: 'networkidle',
      timeout: 15_000
    });
    await page.getByRole('heading', { name: 'Session', exact: true }).waitFor();
    await page.getByRole('status').waitFor();

    const idleAddButton = page.getByRole('button', { name: /add 1 page/i });
    const idlePauseButton = page.getByRole('button', { name: /^pause$/i });

    if ((await idleAddButton.count()) > 0 || (await idlePauseButton.count()) > 0) {
      throw new Error('Idle standalone review should hide disabled page and pause controls.');
    }

    checks.push({ name: 'idle standalone hides disabled controls', status: 'passed' });

    await page.goto(buildScenarioUrl(baseUrl, 'history-standalone'), {
      waitUntil: 'networkidle',
      timeout: 15_000
    });
    await page.getByRole('heading', { name: /history/i }).waitFor();
    await page.getByText(/study later/i).waitFor();
    await page.getByText(/duration/i).waitFor();
    checks.push({ name: 'standalone history scenario visible', status: 'passed' });

    await page.goto(buildScenarioUrl(baseUrl, 'reading-extension'), {
      waitUntil: 'networkidle',
      timeout: 15_000
    });
    await page.getByRole('heading', { name: 'Session', exact: true }).waitFor();
    await page.getByText(/automatic tracking on/i).waitFor();
    await page.getByText(/correction tools/i).waitFor();
    await page.getByText(/^break target$/i).waitFor();
    await page.getByText(/^timer$/i).waitFor();
    await page.getByText(/^status$/i).waitFor();

    const correctionButton = page.getByRole('button', { name: /correct \+1/i });
    const correctionButtonVisible =
      (await correctionButton.count()) > 0 ? await correctionButton.first().isVisible() : false;

    if (correctionButtonVisible) {
      throw new Error('Correction tools should stay collapsed by default in the simplified reading panel.');
    }

    checks.push(
      { name: 'session heading visible', status: 'passed' },
      { name: 'simplified extension reading scenario visible', status: 'passed' },
      { name: 'correction tools collapsed by default', status: 'passed' }
    );

    await page.goto(buildScenarioUrl(baseUrl, 'reading-pressure-halfway-standalone'), {
      waitUntil: 'networkidle',
      timeout: 15_000
    });
    await page.locator('.metric-card-pressure-halfway').first().waitFor();
    await page.getByText(/^halfway$/i).waitFor();
    checks.push({ name: 'standalone pressure halfway scenario visible', status: 'passed' });

    await page.goto(buildScenarioUrl(baseUrl, 'reading-pressure-final-ten-standalone'), {
      waitUntil: 'networkidle',
      timeout: 15_000
    });
    await page.locator('.metric-card-pressure-final-ten').first().waitFor();
    await page.getByText(/^timer$/i).waitFor();
    await page.getByText(/\ds left|now/i).first().waitFor();
    checks.push({ name: 'standalone pressure final-ten scenario visible', status: 'passed' });

    await page.goto(buildScenarioUrl(baseUrl, 'reading-pressure-halfway-extension'), {
      waitUntil: 'networkidle',
      timeout: 15_000
    });
    await page.locator('.metric-card-pressure-halfway').first().waitFor();
    await page.getByText(/automatic tracking on/i).waitFor();
    await page.getByText(/^halfway$/i).waitFor();
    checks.push({ name: 'extension-density pressure halfway scenario visible', status: 'passed' });

    await page.goto(buildScenarioUrl(baseUrl, 'reading-pressure-final-ten-extension'), {
      waitUntil: 'networkidle',
      timeout: 15_000
    });
    await page.locator('.metric-card-pressure-final-ten').first().waitFor();
    await page.getByText(/^timer$/i).waitFor();
    checks.push({ name: 'extension-density pressure final-ten scenario visible', status: 'passed' });

    await page.goto(buildScenarioUrl(baseUrl, 'reading-pressure-catch-up-standalone'), {
      waitUntil: 'networkidle',
      timeout: 15_000
    });
    await page.getByText(/catch-up window/i).waitFor();
    await page.getByText(/1 page late/i).first().waitFor();
    checks.push({ name: 'standalone catch-up scenario visible', status: 'passed' });

    await page.goto(buildScenarioUrl(baseUrl, 'reading-standalone-narrow'), {
      waitUntil: 'networkidle',
      timeout: 15_000
    });
    await page.locator('[data-review-width=\"narrow\"]').waitFor();
    await page.getByRole('button', { name: /add 1 page/i }).waitFor();
    checks.push({ name: 'narrow standalone reading scenario visible', status: 'passed' });
    await page.screenshot({ path: artifacts.desktopScreenshot, fullPage: true });

    await page.goto(buildScenarioUrl(baseUrl, 'reading-standalone'), {
      waitUntil: 'networkidle',
      timeout: 15_000
    });
    await page.getByRole('button', { name: /park this verse for later/i }).click();
    await page.getByRole('heading', { name: /history/i }).waitFor();
    const studyLaterLinks = page.getByRole('link', { name: /open on quran\.com/i });
    if ((await studyLaterLinks.count()) < 1) {
      throw new Error('Review reading scenario should show at least one saved Quran.com link after parking a verse.');
    }
    const studyViewLinks = page.getByRole('link', { name: /open study view/i });
    if ((await studyViewLinks.count()) < 1) {
      throw new Error('Review reading scenario should show at least one study-view link after parking a verse.');
    }
    checks.push({ name: 'review reading scenario can park the current verse for later', status: 'passed' });

    await page.goto(buildScenarioUrl(baseUrl, 'reading-standalone'), {
      waitUntil: 'networkidle',
      timeout: 15_000
    });
    await page.getByRole('button', { name: /add 1 page/i }).click();
    await page.getByRole('dialog', { name: /micro break/i }).waitFor();
    checks.push({ name: 'review reading scenario can trigger the next break', status: 'passed' });

    await page.goto(buildScenarioUrl(baseUrl, 'pre-start-standalone'), {
      waitUntil: 'networkidle',
      timeout: 15_000
    });
    await page.getByRole('button', { name: /start now/i }).waitFor();
    await page.getByRole('button', { name: /cancel/i }).waitFor();
    checks.push({ name: 'standalone pre-start scenario visible', status: 'passed' });

    await page.goto(buildScenarioUrl(baseUrl, 'pre-start-final-three-standalone'), {
      waitUntil: 'networkidle',
      timeout: 15_000
    });
    await page.getByText(/^3$/i).waitFor();
    await page.getByText(/reading starts soon/i).waitFor();
    checks.push({ name: 'standalone final-three pre-start scenario visible', status: 'passed' });

    await page.goto(buildScenarioUrl(baseUrl, 'pre-start-extension'), {
      waitUntil: 'networkidle',
      timeout: 15_000
    });
    await page.getByRole('button', { name: /start now/i }).waitFor();
    await page.getByText(/automatic tracking on/i).waitFor();
    checks.push({ name: 'extension-density pre-start scenario visible', status: 'passed' });

    await page.goto(buildScenarioUrl(baseUrl, 'break-active-standalone'), {
      waitUntil: 'networkidle',
      timeout: 15_000
    });
    await page.getByRole('dialog', { name: /micro break/i }).waitFor();
    await page.getByRole('button', { name: /resume now/i }).waitFor();

    const snoozeInCalmBreak = page.getByRole('button', { name: /snooze 30s/i });
    const skipInCalmBreak = page.getByRole('button', { name: /skip once/i });
    const visibleSnoozeInCalmBreak =
      (await snoozeInCalmBreak.count()) > 0 ? await snoozeInCalmBreak.first().isVisible() : false;
    const visibleSkipInCalmBreak =
      (await skipInCalmBreak.count()) > 0 ? await skipInCalmBreak.first().isVisible() : false;

    if (visibleSnoozeInCalmBreak || visibleSkipInCalmBreak) {
      throw new Error('Calm break scenario should keep snooze and skip behind More options.');
    }

    checks.push({ name: 'standalone calm break hides secondary actions by default', status: 'passed' });

    await page.getByRole('button', { name: /more options/i }).click();
    await page.getByRole('button', { name: /snooze 30s/i }).waitFor();
    await page.getByRole('button', { name: /skip once/i }).waitFor();
    checks.push({ name: 'review calm break reveals secondary actions interactively', status: 'passed' });

    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('dialog', { name: /micro break/i }).waitFor();
    await page.getByRole('button', { name: /resume now/i }).click();
    await page.getByRole('dialog', { name: /micro break/i }).waitFor({
      state: 'detached',
      timeout: 15_000
    });
    await page.getByText(/^reading$/i).first().waitFor();
    checks.push({ name: 'review calm break resumes into reading state', status: 'passed' });

    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('dialog', { name: /micro break/i }).waitFor();
    checks.push({ name: 'review calm break resets on refresh', status: 'passed' });

    await page.goto(buildScenarioUrl(baseUrl, 'break-active-standalone-expanded'), {
      waitUntil: 'networkidle',
      timeout: 15_000
    });
    await page.getByRole('dialog', { name: /micro break/i }).waitFor();
    await page.getByRole('button', { name: /snooze 30s/i }).waitFor();
    await page.getByRole('button', { name: /skip once/i }).waitFor();
    checks.push({ name: 'standalone calm break exposes secondary actions when expanded', status: 'passed' });

    await page.goto(buildScenarioUrl(baseUrl, 'settings-calm-standalone'), {
      waitUntil: 'networkidle',
      timeout: 15_000
    });
    await page.getByRole('button', { name: /apply calm-focus defaults/i }).waitFor();
    const paceField = page.getByLabel('Default pace for 2 pages (seconds)');
    if ((await paceField.count()) > 0 && await paceField.first().isVisible()) {
      throw new Error('Calm settings scenario should keep advanced timing controls collapsed.');
    }
    checks.push({ name: 'settings calm defaults scenario visible', status: 'passed' });

    await page.goto(buildScenarioUrl(baseUrl, 'settings-advanced-standalone'), {
      waitUntil: 'networkidle',
      timeout: 15_000
    });
    await page.getByLabel('Default pace for 2 pages (seconds)').waitFor();
    checks.push({ name: 'settings advanced timing scenario visible', status: 'passed' });

    await page.goto(buildScenarioUrl(baseUrl, 'resume-saved-standalone'), {
      waitUntil: 'networkidle',
      timeout: 15_000
    });
    await page.getByRole('dialog', { name: /resume your last session/i }).waitFor();
    checks.push({ name: 'resume-saved scenario visible', status: 'passed' });

    await context.tracing.stop();
    await context.close();
    await browser.close();
  } catch (error) {
    try {
      await page.screenshot({ path: artifacts.failureScreenshot, fullPage: true });
    } catch {
      // Ignore screenshot fallback failures.
    }

    try {
      await context.tracing.stop({ path: artifacts.trace });
    } catch {
      // Ignore trace fallback failures.
    }

    await context.close();
    await browser.close();

    const message =
      error instanceof Error
        ? `${error.message}. Start the app at ${baseUrl} and rerun validate:ui.`
        : `Unknown UI validation failure. Start the app at ${baseUrl} and rerun validate:ui.`;
    throw new Error(message);
  }
}

async function validateMobileSurface(baseUrl, artifacts, checks) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    viewport: { width: 390, height: 844 }
  });
  const page = await context.newPage();

  try {
    await page.goto(buildScenarioUrl(baseUrl, 'idle-simplified-standalone'), {
      waitUntil: 'networkidle',
      timeout: 15_000
    });
    await page.getByRole('heading', { name: 'Session', exact: true }).waitFor();
    const mobileAddButton = page.getByRole('button', { name: /add 1 page/i });
    if ((await mobileAddButton.count()) > 0) {
      throw new Error('Mobile idle scenario should hide disabled page controls.');
    }
    checks.push({ name: 'mobile session surface visible', status: 'passed' });

    await page.goto(buildScenarioUrl(baseUrl, 'history-standalone'), {
      waitUntil: 'networkidle',
      timeout: 15_000
    });
    await page.getByRole('heading', { name: /history/i }).waitFor();
    await page.getByText(/duration/i).waitFor();
    checks.push({ name: 'mobile history surface visible', status: 'passed' });
    await page.screenshot({ path: artifacts.mobileScreenshot, fullPage: true });
    await context.close();
    await browser.close();
  } catch (error) {
    try {
      await page.screenshot({ path: artifacts.failureScreenshot, fullPage: true });
    } catch {
      // Ignore screenshot fallback failures.
    }

    await context.close();
    await browser.close();
    throw error;
  }
}

export async function runUiSurfaceValidation(options = {}) {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const outputDir = options.outputDir ?? path.join(DEFAULT_ROOT_DIR, 'output', 'playwright');
  const artifacts = createArtifactPaths(outputDir);
  const checks = [];
  const startedAt = new Date().toISOString();

  await fs.mkdir(outputDir, { recursive: true });

  try {
    await validateDesktopSurface(baseUrl, artifacts, checks);
    await validateMobileSurface(baseUrl, artifacts, checks);

    const summary = buildValidationSummary({
      baseUrl,
      checks,
      artifacts: {
        desktopScreenshot: path.basename(artifacts.desktopScreenshot),
        mobileScreenshot: path.basename(artifacts.mobileScreenshot),
        summary: path.basename(artifacts.summary)
      },
      startedAt,
      finishedAt: new Date().toISOString()
    });

    await fs.rm(artifacts.failureScreenshot, { force: true });
    await fs.rm(artifacts.trace, { force: true });
    await writeSummary(artifacts.summary, summary);
    return summary;
  } catch (error) {
    const summary = buildValidationSummary({
      baseUrl,
      checks,
      artifacts: {
        failureScreenshot: path.basename(artifacts.failureScreenshot),
        trace: path.basename(artifacts.trace),
        summary: path.basename(artifacts.summary)
      },
      error: error instanceof Error ? error.message : String(error),
      startedAt,
      finishedAt: new Date().toISOString()
    });

    await writeSummary(artifacts.summary, summary);
    throw error;
  }
}

async function main() {
  const options = parseCliArgs();

  try {
    const summary = await runUiSurfaceValidation(options);
    console.log(`UI surface validation passed for ${summary.baseUrl}.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] === THIS_FILE) {
  await main();
}
