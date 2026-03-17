import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const THIS_FILE = fileURLToPath(import.meta.url);
const TOOLING_DIR = path.dirname(THIS_FILE);
export const DEFAULT_ROOT_DIR = path.resolve(TOOLING_DIR, '..');

export const REQUIRED_FILES = [
  'AGENTS.md',
  'agent.md',
  'APP_KNOWLEDGE.md',
  '.codex/config.toml',
  '.codex/agents/session_domain_reviewer.toml',
  '.codex/agents/ui_validation_runner.toml',
  '.codex/agents/docs_sync_gardener.toml',
  'docs/assistant/APP_KNOWLEDGE.md',
  'docs/assistant/INDEX.md',
  'docs/assistant/manifest.json',
  'docs/assistant/GOLDEN_PRINCIPLES.md',
  'docs/assistant/LOCAL_PERSISTENCE_KNOWLEDGE.md',
  'docs/assistant/LOCALIZATION_GLOSSARY.md',
  'docs/assistant/PERFORMANCE_BASELINES.md',
  'docs/assistant/exec_plans/PLANS.md',
  'docs/assistant/exec_plans/active/.gitkeep',
  'docs/assistant/exec_plans/completed/.gitkeep',
  'docs/assistant/features/APP_USER_GUIDE.md',
  'docs/assistant/features/READING_SESSION_USER_GUIDE.md',
  'docs/assistant/workflows/READING_SESSION_WORKFLOW.md',
  'docs/assistant/workflows/LOCAL_PERSISTENCE_WORKFLOW.md',
  'docs/assistant/workflows/UI_SURFACE_VALIDATION_WORKFLOW.md',
  'docs/assistant/workflows/LOCALIZATION_WORKFLOW.md',
  'docs/assistant/workflows/PERFORMANCE_WORKFLOW.md',
  'docs/assistant/workflows/REFERENCE_DISCOVERY_WORKFLOW.md',
  'docs/assistant/workflows/CI_REPO_WORKFLOW.md',
  'docs/assistant/workflows/COMMIT_PUBLISH_WORKFLOW.md',
  'docs/assistant/workflows/DOCS_MAINTENANCE_WORKFLOW.md'
];

export const REQUIRED_WORKFLOW_IDS = [
  'reading_session',
  'local_persistence',
  'ui_surface_validation',
  'localization',
  'workspace_performance',
  'reference_discovery',
  'ci_repo_ops',
  'commit_publish_ops',
  'docs_maintenance'
];

export const REQUIRED_WORKFLOW_HEADINGS = [
  '## What This Workflow Is For',
  '## Expected Outputs',
  '## When To Use',
  '## What Not To Do',
  '## Primary Files',
  '## Minimal Commands',
  '## Targeted Tests',
  '## Failure Modes and Fallback Steps',
  '## Handoff Checklist'
];

export const REQUIRED_USER_GUIDE_HEADINGS = [
  '## Use This Guide When',
  '## Do Not Use This Guide For',
  '## For Agents: Support Interaction Contract',
  '## Canonical Deference Rule',
  '## Quick Start (No Technical Background)',
  '## Terms in Plain English'
];

export const REQUIRED_MANIFEST_KEYS = [
  'version',
  'canonical',
  'bridges',
  'user_guides',
  'workflows',
  'global_commands',
  'contracts',
  'last_updated'
];

export const REQUIRED_CONTRACT_KEYS = [
  'template_read_policy',
  'post_change_docs_sync_prompt_policy',
  'sub_agent_routing_policy',
  'validation_environment_policy',
  'artifact_capture_policy',
  'validation_fallback_policy',
  'user_guides_support_usage_policy',
  'user_guides_canonical_deference_policy',
  'user_guides_update_sync_policy',
  'golden_principles_source_of_truth',
  'execplan_policy',
  'approval_gates_policy',
  'worktree_isolation_policy',
  'local_persistence_source_of_truth',
  'ui_surface_validation_policy',
  'benchmark_matrix_policy',
  'inspiration_reference_discovery_policy'
];

const REQUIRED_RUNBOOK_HEADINGS = [
  '## Approval Gates',
  '## ExecPlans',
  '## Worktree Isolation'
];

const REQUIRED_RUNBOOK_PHRASES = [
  'Would you like me to run Assistant Docs Sync for this change now?',
  'REFERENCE_DISCOVERY_WORKFLOW.md',
  'UI_SURFACE_VALIDATION_WORKFLOW.md',
  'APP_USER_GUIDE.md',
  'Sub-Agent'
];

function resolvePath(rootDir, relativePath) {
  return path.join(rootDir, relativePath);
}

function readText(rootDir, relativePath) {
  return fs.readFileSync(resolvePath(rootDir, relativePath), 'utf8');
}

function pathExists(rootDir, relativePath) {
  return fs.existsSync(resolvePath(rootDir, relativePath));
}

function collectObjectStringPaths(value, results = []) {
  if (typeof value === 'string') {
    results.push(value);
    return results;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectObjectStringPaths(item, results);
    }
    return results;
  }

  if (value && typeof value === 'object') {
    for (const nestedValue of Object.values(value)) {
      collectObjectStringPaths(nestedValue, results);
    }
  }

  return results;
}

function validateRequiredFiles(rootDir, errors) {
  for (const relativePath of REQUIRED_FILES) {
    if (!pathExists(rootDir, relativePath)) {
      errors.push(`Missing required file: ${relativePath}`);
    }
  }
}

function validateRunbook(rootDir, relativePath, errors) {
  const text = readText(rootDir, relativePath);

  for (const heading of REQUIRED_RUNBOOK_HEADINGS) {
    if (!text.includes(heading)) {
      errors.push(`${relativePath} is missing required heading: ${heading}`);
    }
  }

  for (const phrase of REQUIRED_RUNBOOK_PHRASES) {
    if (!text.includes(phrase)) {
      errors.push(`${relativePath} is missing required routing phrase: ${phrase}`);
    }
  }
}

function validateUserGuide(rootDir, relativePath, errors) {
  const text = readText(rootDir, relativePath);

  for (const heading of REQUIRED_USER_GUIDE_HEADINGS) {
    if (!text.includes(heading)) {
      errors.push(`${relativePath} is missing required user-guide heading: ${heading}`);
    }
  }
}

function validateWorkflowDoc(rootDir, relativePath, errors) {
  const text = readText(rootDir, relativePath);

  for (const heading of REQUIRED_WORKFLOW_HEADINGS) {
    if (!text.includes(heading)) {
      errors.push(`${relativePath} is missing workflow heading: ${heading}`);
    }
  }

  if (!text.includes("Don't use this workflow when")) {
    errors.push(`${relativePath} is missing explicit negative routing language`);
  }

  if (!text.includes('Instead use')) {
    errors.push(`${relativePath} is missing explicit alternative routing language`);
  }
}

function validateManifest(rootDir, errors) {
  const manifestPath = resolvePath(rootDir, 'docs/assistant/manifest.json');
  let manifest;

  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    errors.push(`Unable to parse manifest.json: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  for (const key of REQUIRED_MANIFEST_KEYS) {
    if (!(key in manifest)) {
      errors.push(`Manifest is missing required key: ${key}`);
    }
  }

  if (!Array.isArray(manifest.workflows)) {
    errors.push('Manifest workflows must be an array');
    return;
  }

  const workflowIds = new Set(manifest.workflows.map((workflow) => workflow?.id));
  for (const workflowId of REQUIRED_WORKFLOW_IDS) {
    if (!workflowIds.has(workflowId)) {
      errors.push(`Manifest is missing required workflow id: ${workflowId}`);
    }
  }

  const manifestPaths = new Set([
    ...collectObjectStringPaths(manifest.canonical),
    ...collectObjectStringPaths(manifest.bridges),
    ...collectObjectStringPaths(manifest.user_guides),
    ...manifest.workflows.map((workflow) => workflow?.doc).filter(Boolean)
  ]);

  for (const relativePath of manifestPaths) {
    if (typeof relativePath !== 'string') {
      continue;
    }

    if (!pathExists(rootDir, relativePath)) {
      errors.push(`Manifest path does not exist: ${relativePath}`);
    }
  }

  if (!manifest.contracts || typeof manifest.contracts !== 'object') {
    errors.push('Manifest contracts must be an object');
  } else {
    for (const key of REQUIRED_CONTRACT_KEYS) {
      if (!(key in manifest.contracts)) {
        errors.push(`Manifest contracts is missing required key: ${key}`);
      }
    }
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(manifest.last_updated ?? ''))) {
    errors.push('Manifest last_updated must be in YYYY-MM-DD format');
  }

  if (!manifest.global_commands || typeof manifest.global_commands !== 'object') {
    errors.push('Manifest global_commands must be an object');
  } else {
    for (const [name, command] of Object.entries(manifest.global_commands)) {
      if (typeof command !== 'string' || !command.includes('wsl.exe bash -lc')) {
        errors.push(`Manifest global command "${name}" must use the WSL-safe wrapper`);
      }
    }
  }
}

function validateCorePhrases(rootDir, errors) {
  const canonical = readText(rootDir, 'APP_KNOWLEDGE.md');
  if (!canonical.includes('This is the canonical app-level architecture and status brief.')) {
    errors.push('APP_KNOWLEDGE.md is missing the canonical contract phrase');
  }

  const bridge = readText(rootDir, 'docs/assistant/APP_KNOWLEDGE.md');
  if (!bridge.includes('This bridge doc is intentionally shorter than the canonical APP_KNOWLEDGE.md.')) {
    errors.push('docs/assistant/APP_KNOWLEDGE.md is missing the bridge contract phrase');
  }

  if (!bridge.includes('defer to them')) {
    errors.push('docs/assistant/APP_KNOWLEDGE.md is missing deference language');
  }

  const index = readText(rootDir, 'docs/assistant/INDEX.md');
  if (!index.includes('APP_USER_GUIDE.md') || !index.includes('READING_SESSION_USER_GUIDE.md')) {
    errors.push('docs/assistant/INDEX.md must route to both user guides');
  }

  const docsMaintenance = readText(rootDir, 'docs/assistant/workflows/DOCS_MAINTENANCE_WORKFLOW.md');
  if (!docsMaintenance.toLowerCase().includes('user-guide')) {
    errors.push('DOCS_MAINTENANCE_WORKFLOW.md must mention user-guide sync guidance');
  }

  const codexConfig = readText(rootDir, '.codex/config.toml');
  if (!codexConfig.includes('max_threads = 4') || !codexConfig.includes('max_depth = 1')) {
    errors.push('.codex/config.toml must define the repo-level sub-agent limits');
  }
}

export function validateAgentDocs(options = {}) {
  const rootDir = options.rootDir ?? DEFAULT_ROOT_DIR;
  const errors = [];

  validateRequiredFiles(rootDir, errors);

  if (errors.length > 0) {
    return errors;
  }

  validateRunbook(rootDir, 'AGENTS.md', errors);
  validateRunbook(rootDir, 'agent.md', errors);
  validateUserGuide(rootDir, 'docs/assistant/features/APP_USER_GUIDE.md', errors);
  validateUserGuide(rootDir, 'docs/assistant/features/READING_SESSION_USER_GUIDE.md', errors);

  for (const relativePath of REQUIRED_FILES.filter((entry) => entry.includes('docs/assistant/workflows/'))) {
    validateWorkflowDoc(rootDir, relativePath, errors);
  }

  validateManifest(rootDir, errors);
  validateCorePhrases(rootDir, errors);

  return errors;
}

function main() {
  const errors = validateAgentDocs();

  if (errors.length > 0) {
    console.error('Agent docs validation failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('Agent docs validation passed.');
}

if (process.argv[1] === THIS_FILE) {
  main();
}
