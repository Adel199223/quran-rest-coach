import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const THIS_FILE = fileURLToPath(import.meta.url);
const TOOLING_DIR = path.dirname(THIS_FILE);
export const DEFAULT_ROOT_DIR = path.resolve(TOOLING_DIR, '..');
export const REQUIRED_EXCLUDES = ['**/node_modules/**', '**/dist/**', '**/output/**'];

function resolvePath(rootDir, relativePath) {
  return path.join(rootDir, relativePath);
}

export function validateWorkspaceHygiene(options = {}) {
  const rootDir = options.rootDir ?? DEFAULT_ROOT_DIR;
  const errors = [];

  const gitignorePath = resolvePath(rootDir, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    errors.push('Missing .gitignore');
  } else {
    const gitignore = fs.readFileSync(gitignorePath, 'utf8');
    if (!gitignore.includes('output/')) {
      errors.push('.gitignore must ignore output/');
    }
  }

  const vscodeSettingsPath = resolvePath(rootDir, '.vscode/settings.json');
  if (!fs.existsSync(vscodeSettingsPath)) {
    errors.push('Missing .vscode/settings.json');
    return errors;
  }

  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(vscodeSettingsPath, 'utf8'));
  } catch (error) {
    errors.push(`Unable to parse .vscode/settings.json: ${error instanceof Error ? error.message : String(error)}`);
    return errors;
  }

  for (const key of REQUIRED_EXCLUDES) {
    if (settings?.['files.watcherExclude']?.[key] !== true) {
      errors.push(`.vscode/settings.json is missing watcher exclude: ${key}`);
    }

    if (settings?.['search.exclude']?.[key] !== true) {
      errors.push(`.vscode/settings.json is missing search exclude: ${key}`);
    }
  }

  if (settings?.['files.exclude']?.['**/output'] !== true) {
    errors.push('.vscode/settings.json is missing files.exclude for **/output');
  }

  if (settings?.['files.exclude']?.['**/dist'] !== true) {
    errors.push('.vscode/settings.json is missing files.exclude for **/dist');
  }

  return errors;
}

function main() {
  const errors = validateWorkspaceHygiene();

  if (errors.length > 0) {
    console.error('Workspace hygiene validation failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('Workspace hygiene validation passed.');
}

if (process.argv[1] === THIS_FILE) {
  main();
}
