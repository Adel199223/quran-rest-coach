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

async function writeSummary(summaryPath, summary) {
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
}

async function validateDesktopSurface(baseUrl, artifacts, checks) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 15_000 });
    await page.getByRole('heading', { name: 'Session', exact: true }).waitFor();
    await page.getByRole('button', { name: /start session/i }).click();
    await page.getByRole('button', { name: /\+2 pages/i }).click();
    await page.getByRole('dialog', { name: /micro break/i }).waitFor();

    checks.push(
      { name: 'session heading visible', status: 'passed' },
      { name: 'micro break overlay reachable from +2 pages', status: 'passed' }
    );

    await page.screenshot({ path: artifacts.desktopScreenshot, fullPage: true });
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
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 15_000 });
    await page.getByRole('heading', { name: 'Session', exact: true }).waitFor();
    checks.push({ name: 'mobile session surface visible', status: 'passed' });
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
