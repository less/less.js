#!/usr/bin/env node
/**
 * Release-automation test suite
 *
 * Tests four components of the release flow without requiring a live
 * GitHub token or npm credentials:
 *
 *   1. publish.yml `if:` expression
 *      - master release PR merged → publish
 *      - alpha release PR merged  → publish (alpha tag)
 *      - other PRs / direct pushes → skip
 *
 *   2. create-release-pr.yml `if:` expression
 *      - normal merges to master or alpha → trigger
 *      - release PR merges (both flavours) → skip (loop guard)
 *
 *   3. Alpha version increment logic (from create-release-pr.yml)
 *      - Works for any X.Y.Z-alpha.N regardless of major version
 *      - Double-digit rollover (alpha.9 → alpha.10)
 *      - Non-alpha package.json on alpha branch → bump major, start alpha.1
 *
 *   4. bump-and-publish.js behaviour (subprocess, DRY_RUN=true)
 *      - master path: uses package.json version as-is, no commit, no branch push
 *      - master path: rejects when package.json version ≤ npm latest version
 *      - alpha path:  uses package.json version as-is, no commit, no branch push
 *      - alpha path:  rejects when package.json alpha version lacks '-alpha.'
 *
 *   5. create-release-pr no-op safety (isolated temp git repo)
 *      - when a version bump produces changes → a commit is created
 *      - when no version changes are needed  → exits cleanly with no commit
 *
 * Run:
 *   node scripts/test-release-automation.js
 *
 * Uses only Node.js built-ins.  semver is resolved from the workspace
 * node_modules (present after `pnpm install`).  In sandboxes where pnpm
 * install hasn't run, install it manually:
 *   npm install --prefix /tmp/test-deps semver
 */

'use strict';

const assert = require('assert');
const fs     = require('fs');
const os     = require('os');
const path   = require('path');
const { spawnSync, execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Resolve semver — works both after `pnpm install` and in a bare sandbox
// ---------------------------------------------------------------------------

function resolveSemverPath() {
  const candidates = [
    path.join(ROOT_DIR, 'node_modules', 'semver'),
    '/tmp/test-deps/node_modules/semver',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

const SEMVER_PATH = resolveSemverPath();

// ---------------------------------------------------------------------------
// Tiny test harness (no external dependencies)
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failures.push({ name, message: err.message });
    failed++;
  }
}

function section(title) {
  console.log(`\n── ${title}`);
}

// ---------------------------------------------------------------------------
// Workflow condition helpers
//
// These replicate the job-level `if:` expressions from the YAML files
// verbatim in JavaScript so the tests are authoritative.
// ---------------------------------------------------------------------------

/**
 * publish.yml `if:` condition:
 *
 *   github.repository == 'less/less.js' &&
 *   github.event.pull_request.merged == true &&
 *   (
 *     (github.event.pull_request.base.ref == 'master' &&
 *      startsWith(github.event.pull_request.title, 'chore: release v')) ||
 *     (github.event.pull_request.base.ref == 'alpha' &&
 *      startsWith(github.event.pull_request.title, 'chore: alpha release v'))
 *   )
 */
function publishShouldRun({ repo, prMerged, prBaseRef, prTitle }) {
  if (repo !== 'less/less.js') return false;
  if (!prMerged) return false;

  const isMasterRelease =
    prBaseRef === 'master' &&
    typeof prTitle === 'string' &&
    prTitle.startsWith('chore: release v');

  const isAlphaRelease =
    prBaseRef === 'alpha' &&
    typeof prTitle === 'string' &&
    prTitle.startsWith('chore: alpha release v');

  return isMasterRelease || isAlphaRelease;
}

/**
 * create-release-pr.yml `if:` condition:
 *
 *   github.repository == 'less/less.js' &&
 *   !contains(github.event.head_commit.message, 'chore: release v') &&
 *   !contains(github.event.head_commit.message, 'chore: alpha release v') &&
 *   !contains(github.event.head_commit.message, '/release-v') &&
 *   !contains(github.event.head_commit.message, '/alpha-release-v')
 */
function createReleasePRShouldRun({ repo, commitMessage }) {
  if (repo !== 'less/less.js') return false;
  if (commitMessage.includes('chore: release v')) return false;
  if (commitMessage.includes('chore: alpha release v')) return false;
  if (commitMessage.includes('/release-v')) return false;
  if (commitMessage.includes('/alpha-release-v')) return false;
  return true;
}

/**
 * Alpha version increment — mirrors the inline Node script in
 * create-release-pr.yml "Determine next version" step for the alpha branch.
 *
 *   X.Y.Z-alpha.N  →  X.Y.Z-alpha.(N+1)
 *   X.Y.Z          →  (X+1).0.0-alpha.1   (no alpha suffix yet)
 */
function nextAlphaVersion(current) {
  const m = current.match(/^(\d+\.\d+\.\d+)-alpha\.(\d+)$/);
  if (m) {
    return `${m[1]}-alpha.${parseInt(m[2], 10) + 1}`;
  }
  const parts = current.replace(/-.*/, '').split('.');
  const nextMajor = parseInt(parts[0], 10) + 1;
  return `${nextMajor}.0.0-alpha.1`;
}

// ---------------------------------------------------------------------------
// Helpers: temporary git repo
// ---------------------------------------------------------------------------

function makeFakeRepo({ packageVersion }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'less-release-test-'));

  // root package.json (private monorepo root)
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: '@less/root', private: true, version: packageVersion }, null, '\t') + '\n',
  );

  // packages/less/package.json (the publishable package)
  const pkgDir = path.join(dir, 'packages', 'less');
  fs.mkdirSync(pkgDir, { recursive: true });
  fs.writeFileSync(
    path.join(pkgDir, 'package.json'),
    JSON.stringify({ name: 'less', version: packageVersion }, null, '\t') + '\n',
  );

  // Minimal git repo
  execSync('git init -b master', { cwd: dir, stdio: 'ignore' });
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'ignore' });
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'ignore' });
  execSync('git add .', { cwd: dir, stdio: 'ignore' });
  execSync('git commit -m "initial"', { cwd: dir, stdio: 'ignore' });

  return dir;
}

// ---------------------------------------------------------------------------
// Run bump-and-publish.js in a fake repo
//
// Strategy: copy the script into the temp repo with ROOT_DIR patched so it
// reads/writes from the temp dir.  semver is resolved via NODE_PATH.
// ---------------------------------------------------------------------------

function runBumpAndPublish(fakeRoot, extraEnv = {}) {
  const scriptsDir = path.join(fakeRoot, 'scripts');
  fs.mkdirSync(scriptsDir, { recursive: true });

  // Read the production script and patch the ROOT_DIR line.
  let src = fs.readFileSync(path.join(ROOT_DIR, 'scripts', 'bump-and-publish.js'), 'utf8');

  // Remove shebang so Node can require() it without SyntaxError
  src = src.replace(/^#!.*\n/, '');

  // Override ROOT_DIR to point at fakeRoot
  src = src.replace(
    /const ROOT_DIR\s*=\s*path\.resolve\(__dirname,\s*'\.\.'\s*\);/,
    `const ROOT_DIR = ${JSON.stringify(fakeRoot)};`,
  );

  // Redirect require('semver') to the resolved absolute path so the patched
  // script works even when run from an isolated temp directory that has no
  // node_modules of its own.
  if (SEMVER_PATH) {
    src = src.replace(
      /require\('semver'\)/g,
      `require(${JSON.stringify(SEMVER_PATH)})`,
    );
  }

  const patchedScript = path.join(scriptsDir, '_bap_patched.cjs');
  fs.writeFileSync(patchedScript, src);

  const result = spawnSync('node', [patchedScript], {
    cwd: fakeRoot,
    env: {
      ...process.env,
      ...extraEnv,
    },
    encoding: 'utf8',
  });

  // Clean up patched script; ENOENT is fine if it was never written
  try { fs.unlinkSync(patchedScript); } catch (e) { if (e.code !== 'ENOENT') throw e; }

  return {
    exitCode: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

// ---------------------------------------------------------------------------
// Run the core shell logic from create-release-pr.yml in an isolated repo.
//
// We run everything up to (but not including) `git push` and `gh pr create`
// so we don't need network access.  The critical behaviour under test is
// whether a commit is created when there are (or aren't) version changes.
// ---------------------------------------------------------------------------

function runCreateReleasePRStep({ repoDir, nextVersion, releaseBranch }) {
  // Stub `gh` binary so any calls are recorded but do nothing
  const binDir = path.join(repoDir, '.test-bin');
  fs.mkdirSync(binDir, { recursive: true });
  const ghLog = path.join(repoDir, 'gh-calls.log');
  fs.writeFileSync(path.join(binDir, 'gh'), `#!/bin/sh\necho "$@" >> "${ghLog}"\n`);
  fs.chmodSync(path.join(binDir, 'gh'), 0o755);

  const initialHead = execSync('git rev-parse HEAD', { cwd: repoDir, encoding: 'utf8' }).trim();

  const script = `
set -euo pipefail
NEXT_VERSION=${JSON.stringify(nextVersion)}
RELEASE_BRANCH=${JSON.stringify(releaseBranch)}
TITLE="chore: release v\${NEXT_VERSION}"

git checkout -b "\${RELEASE_BRANCH}"

node -e "
  const fs = require('fs');
  const version = process.env.NEXT_VERSION;
  const dirs = fs.readdirSync('packages', { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => 'packages/' + d.name + '/package.json');
  for (const f of ['package.json', ...dirs].filter(f => fs.existsSync(f))) {
    const pkg = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!pkg.version) continue;
    pkg.version = version;
    fs.writeFileSync(f, JSON.stringify(pkg, null, '\\t') + '\\n');
  }
"

git add package.json packages/*/package.json
COMMITTED=false
if git diff --cached --quiet; then
  echo "STATUS:NO_CHANGES"
else
  git commit -m "\${TITLE}"
  COMMITTED=true
fi
echo "STATUS:COMMITTED=\${COMMITTED}"
`;

  const result = spawnSync('bash', ['-c', script], {
    cwd: repoDir,
    env: {
      ...process.env,
      NEXT_VERSION: nextVersion,
      GH_TOKEN: 'fake-token',
      PATH: `${binDir}:${process.env.PATH}`,
    },
    encoding: 'utf8',
  });

  const finalHead = execSync('git rev-parse HEAD', { cwd: repoDir, encoding: 'utf8' }).trim();
  const ghCalls = fs.existsSync(ghLog) ? fs.readFileSync(ghLog, 'utf8').trim() : '';

  return {
    exitCode: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    initialHead,
    finalHead,
    newCommitCreated: finalHead !== initialHead,
    ghCalls,
  };
}

// ============================================================================
// TEST SUITE
// ============================================================================

// ----------------------------------------------------------------------------
// Section 1 — publish.yml trigger conditions
// ----------------------------------------------------------------------------

section('1. publish.yml — workflow trigger conditions');

test('master release PR merged → SHOULD publish', () => {
  assert.strictEqual(
    publishShouldRun({
      repo: 'less/less.js',
      prMerged: true,
      prBaseRef: 'master',
      prTitle: 'chore: release v4.6.4',
    }),
    true,
  );
});

test('alpha release PR merged → SHOULD publish (alpha tag)', () => {
  assert.strictEqual(
    publishShouldRun({
      repo: 'less/less.js',
      prMerged: true,
      prBaseRef: 'alpha',
      prTitle: 'chore: alpha release v5.0.0-alpha.2',
    }),
    true,
  );
});

test('non-release PR merged into master → should NOT publish', () => {
  assert.strictEqual(
    publishShouldRun({
      repo: 'less/less.js',
      prMerged: true,
      prBaseRef: 'master',
      prTitle: 'fix: some bug fix',
    }),
    false,
  );
});

test('non-release PR merged into alpha → should NOT publish', () => {
  assert.strictEqual(
    publishShouldRun({
      repo: 'less/less.js',
      prMerged: true,
      prBaseRef: 'alpha',
      prTitle: 'feat: add something for next major',
    }),
    false,
  );
});

test('release PR closed but NOT merged → should NOT publish', () => {
  assert.strictEqual(
    publishShouldRun({
      repo: 'less/less.js',
      prMerged: false,
      prBaseRef: 'master',
      prTitle: 'chore: release v4.6.4',
    }),
    false,
  );
});

test('alpha release PR title used against master base → should NOT publish', () => {
  // Wrong convention: "chore: alpha release v" into master should not trigger
  assert.strictEqual(
    publishShouldRun({
      repo: 'less/less.js',
      prMerged: true,
      prBaseRef: 'master',
      prTitle: 'chore: alpha release v5.0.0-alpha.1',
    }),
    false,
  );
});

test('wrong repository → should NOT publish', () => {
  assert.strictEqual(
    publishShouldRun({
      repo: 'fork/less.js',
      prMerged: true,
      prBaseRef: 'master',
      prTitle: 'chore: release v4.6.4',
    }),
    false,
  );
});

// ----------------------------------------------------------------------------
// Section 2 — create-release-pr.yml trigger conditions
// ----------------------------------------------------------------------------

section('2. create-release-pr.yml — workflow trigger conditions');

test('normal merge to master → SHOULD trigger', () => {
  assert.strictEqual(
    createReleasePRShouldRun({ repo: 'less/less.js', commitMessage: 'fix: correct color parsing' }),
    true,
  );
});

test('normal merge to alpha → SHOULD trigger', () => {
  assert.strictEqual(
    createReleasePRShouldRun({ repo: 'less/less.js', commitMessage: 'feat: new feature for next major' }),
    true,
  );
});

test('master release PR merge → should NOT trigger (loop guard)', () => {
  assert.strictEqual(
    createReleasePRShouldRun({ repo: 'less/less.js', commitMessage: 'chore: release v4.6.4' }),
    false,
  );
});

test('alpha release PR merge → should NOT trigger (loop guard)', () => {
  assert.strictEqual(
    createReleasePRShouldRun({ repo: 'less/less.js', commitMessage: 'chore: alpha release v5.0.0-alpha.2' }),
    false,
  );
});

test('release branch ref in commit message → should NOT trigger (loop guard for master)', () => {
  assert.strictEqual(
    createReleasePRShouldRun({
      repo: 'less/less.js',
      commitMessage: 'Merge chore/release-v4.6.4 into master',
    }),
    false,
  );
});

test('alpha release branch ref in commit message → should NOT trigger (loop guard for alpha)', () => {
  assert.strictEqual(
    createReleasePRShouldRun({
      repo: 'less/less.js',
      commitMessage: 'Merge chore/alpha-release-v5.0.0-alpha.2 into alpha',
    }),
    false,
  );
});

test('wrong repository → should NOT trigger', () => {
  assert.strictEqual(
    createReleasePRShouldRun({ repo: 'fork/less.js', commitMessage: 'fix: something' }),
    false,
  );
});

// ----------------------------------------------------------------------------
// Section 3 — Alpha version increment logic (from create-release-pr.yml)
//
// These are pure-logic tests of the nextAlphaVersion() helper, which mirrors
// the inline Node script in the "Determine next version" step of the workflow.
// This directly answers: "does this work for 5.x alphas as well?"
// ----------------------------------------------------------------------------

section('3. create-release-pr.yml — alpha version increment logic');

test('4.x: 4.6.3-alpha.1 → 4.6.3-alpha.2', () => {
  assert.strictEqual(nextAlphaVersion('4.6.3-alpha.1'), '4.6.3-alpha.2');
});

test('5.x: 5.0.0-alpha.1 → 5.0.0-alpha.2  (answers the original question)', () => {
  assert.strictEqual(nextAlphaVersion('5.0.0-alpha.1'), '5.0.0-alpha.2');
});

test('5.x: 5.0.0-alpha.3 → 5.0.0-alpha.4  (preserves major, not 4.x)', () => {
  assert.strictEqual(nextAlphaVersion('5.0.0-alpha.3'), '5.0.0-alpha.4');
});

test('5.x minor/patch: 5.1.2-alpha.7 → 5.1.2-alpha.8', () => {
  assert.strictEqual(nextAlphaVersion('5.1.2-alpha.7'), '5.1.2-alpha.8');
});

test('double-digit rollover: 5.0.0-alpha.9 → 5.0.0-alpha.10  (integer, not string comparison)', () => {
  assert.strictEqual(nextAlphaVersion('5.0.0-alpha.9'), '5.0.0-alpha.10');
});

test('non-alpha version on alpha branch: 4.6.3 → 5.0.0-alpha.1  (bumps major, starts fresh)', () => {
  assert.strictEqual(nextAlphaVersion('4.6.3'), '5.0.0-alpha.1');
});

test('non-alpha 5.x version: 5.0.0 → 6.0.0-alpha.1', () => {
  assert.strictEqual(nextAlphaVersion('5.0.0'), '6.0.0-alpha.1');
});

// ----------------------------------------------------------------------------
// Section 4 — bump-and-publish.js master path
// ----------------------------------------------------------------------------

section('4. bump-and-publish.js — master path (DRY_RUN=true)');

// A version clearly higher than any real npm publish so validation passes
const MASTER_TEST_VERSION = '999.0.0';

test('master: uses package.json version as-is (no auto-increment)', () => {
  const fakeDir = makeFakeRepo({ packageVersion: MASTER_TEST_VERSION });
  try {
    const { exitCode, stdout, stderr } = runBumpAndPublish(fakeDir, {
      GITHUB_REF_NAME: 'master',
      DRY_RUN: 'true',
    });
    assert.strictEqual(exitCode, 0, `Expected exit 0.\nSTDOUT: ${stdout}\nSTDERR: ${stderr}`);
    assert.ok(
      stdout.includes(MASTER_TEST_VERSION),
      `Expected version ${MASTER_TEST_VERSION} in output.\nSTDOUT: ${stdout}`,
    );
    assert.ok(
      stdout.includes('no auto-increment on master') || stdout.includes('Using package.json version'),
      `Expected "no auto-increment" message.\nSTDOUT: ${stdout}`,
    );
  } finally {
    fs.rmSync(fakeDir, { recursive: true, force: true });
  }
});

test('master: no commit step (version bump is skipped)', () => {
  const fakeDir = makeFakeRepo({ packageVersion: MASTER_TEST_VERSION });
  try {
    const { stdout, stderr } = runBumpAndPublish(fakeDir, {
      GITHUB_REF_NAME: 'master',
      DRY_RUN: 'true',
    });
    assert.ok(
      !stdout.includes('[DRY RUN] Would commit'),
      `Expected no commit step on master path.\nSTDOUT: ${stdout}\nSTDERR: ${stderr}`,
    );
  } finally {
    fs.rmSync(fakeDir, { recursive: true, force: true });
  }
});

test('master: no branch push step', () => {
  const fakeDir = makeFakeRepo({ packageVersion: MASTER_TEST_VERSION });
  try {
    const { stdout, stderr } = runBumpAndPublish(fakeDir, {
      GITHUB_REF_NAME: 'master',
      DRY_RUN: 'true',
    });
    assert.ok(
      !stdout.includes('Would push to: origin master'),
      `Expected no branch push on master path.\nSTDOUT: ${stdout}\nSTDERR: ${stderr}`,
    );
  } finally {
    fs.rmSync(fakeDir, { recursive: true, force: true });
  }
});

test('master: rejects when package.json version ≤ npm published version', () => {
  // 0.0.1 is well below the real npm "less" version, so validation should fail
  const fakeDir = makeFakeRepo({ packageVersion: '0.0.1' });
  try {
    const { exitCode, stdout, stderr } = runBumpAndPublish(fakeDir, {
      GITHUB_REF_NAME: 'master',
      DRY_RUN: 'true',
    });
    assert.notStrictEqual(exitCode, 0, `Expected non-zero exit.\nSTDOUT: ${stdout}\nSTDERR: ${stderr}`);
    const combined = stdout + stderr;
    assert.ok(
      combined.includes('must be greater than NPM version') || combined.includes('ERROR'),
      `Expected error message about version being too low.\nCombined: ${combined}`,
    );
  } finally {
    fs.rmSync(fakeDir, { recursive: true, force: true });
  }
});

// ----------------------------------------------------------------------------
// Section 5 — bump-and-publish.js alpha path
//
// Alpha now uses the same PR-based flow as master: the version bump is applied
// by the release PR, and bump-and-publish.js uses the existing version as-is.
// ----------------------------------------------------------------------------

section('5. bump-and-publish.js — alpha path (DRY_RUN=true)');

test('alpha: uses package.json version as-is (no auto-increment)', () => {
  const fakeDir = makeFakeRepo({ packageVersion: '5.0.0-alpha.2' });
  try {
    const { exitCode, stdout, stderr } = runBumpAndPublish(fakeDir, {
      GITHUB_REF_NAME: 'alpha',
      DRY_RUN: 'true',
    });
    assert.strictEqual(exitCode, 0, `Expected exit 0.\nSTDOUT: ${stdout}\nSTDERR: ${stderr}`);
    assert.ok(
      stdout.includes('5.0.0-alpha.2'),
      `Expected version 5.0.0-alpha.2 in output.\nSTDOUT: ${stdout}`,
    );
    assert.ok(
      stdout.includes('no auto-increment on alpha') || stdout.includes('Using package.json version'),
      `Expected "no auto-increment" message.\nSTDOUT: ${stdout}`,
    );
  } finally {
    fs.rmSync(fakeDir, { recursive: true, force: true });
  }
});

test('alpha: no commit step (same as master)', () => {
  const fakeDir = makeFakeRepo({ packageVersion: '5.0.0-alpha.2' });
  try {
    const { stdout, stderr } = runBumpAndPublish(fakeDir, {
      GITHUB_REF_NAME: 'alpha',
      DRY_RUN: 'true',
    });
    assert.ok(
      !stdout.includes('[DRY RUN] Would commit'),
      `Expected no commit step on alpha path.\nSTDOUT: ${stdout}\nSTDERR: ${stderr}`,
    );
  } finally {
    fs.rmSync(fakeDir, { recursive: true, force: true });
  }
});

test('alpha: no branch push step (same as master)', () => {
  const fakeDir = makeFakeRepo({ packageVersion: '5.0.0-alpha.2' });
  try {
    const { stdout, stderr } = runBumpAndPublish(fakeDir, {
      GITHUB_REF_NAME: 'alpha',
      DRY_RUN: 'true',
    });
    assert.ok(
      !stdout.includes('Would push to: origin alpha'),
      `Expected no branch push on alpha path.\nSTDOUT: ${stdout}\nSTDERR: ${stderr}`,
    );
  } finally {
    fs.rmSync(fakeDir, { recursive: true, force: true });
  }
});

test('alpha: publishes with "alpha" npm tag (not "latest")', () => {
  const fakeDir = makeFakeRepo({ packageVersion: '5.0.0-alpha.2' });
  try {
    const { exitCode, stdout, stderr } = runBumpAndPublish(fakeDir, {
      GITHUB_REF_NAME: 'alpha',
      DRY_RUN: 'true',
    });
    assert.strictEqual(exitCode, 0, `Expected exit 0.\nSTDOUT: ${stdout}\nSTDERR: ${stderr}`);
    assert.ok(
      stdout.includes('tag: alpha'),
      `Expected npm tag "alpha" in output.\nSTDOUT: ${stdout}`,
    );
    assert.ok(
      !stdout.includes('tag: latest'),
      `Expected no "latest" npm tag for alpha versions.\nSTDOUT: ${stdout}`,
    );
  } finally {
    fs.rmSync(fakeDir, { recursive: true, force: true });
  }
});

test('alpha: rejects when package.json version lacks "-alpha." suffix', () => {
  // If somehow the alpha release PR bumped to a non-alpha version, the script
  // must fail fast before publishing.
  const fakeDir = makeFakeRepo({ packageVersion: '5.0.0' });
  try {
    const { exitCode, stdout, stderr } = runBumpAndPublish(fakeDir, {
      GITHUB_REF_NAME: 'alpha',
      DRY_RUN: 'true',
    });
    assert.notStrictEqual(exitCode, 0, `Expected non-zero exit.\nSTDOUT: ${stdout}\nSTDERR: ${stderr}`);
    const combined = stdout + stderr;
    assert.ok(
      combined.includes('-alpha.') || combined.includes('ERROR'),
      `Expected error about missing '-alpha.' suffix.\nCombined: ${combined}`,
    );
  } finally {
    fs.rmSync(fakeDir, { recursive: true, force: true });
  }
});

test('alpha: 4.x alpha version also accepted (4.6.3-alpha.2)', () => {
  const fakeDir = makeFakeRepo({ packageVersion: '4.6.3-alpha.2' });
  try {
    const { exitCode, stdout, stderr } = runBumpAndPublish(fakeDir, {
      GITHUB_REF_NAME: 'alpha',
      DRY_RUN: 'true',
    });
    assert.strictEqual(exitCode, 0, `Expected exit 0.\nSTDOUT: ${stdout}\nSTDERR: ${stderr}`);
    assert.ok(
      stdout.includes('4.6.3-alpha.2'),
      `Expected version 4.6.3-alpha.2 in output.\nSTDOUT: ${stdout}`,
    );
  } finally {
    fs.rmSync(fakeDir, { recursive: true, force: true });
  }
});

// ----------------------------------------------------------------------------
// Section 6 — create-release-pr no-op safety
// ----------------------------------------------------------------------------

section('6. create-release-pr — no-op safety');

test('version bump needed: creates a commit on the release branch', () => {
  // Repo starts at 4.6.3; bump target is 4.6.4 → files change → commit
  const repoDir = makeFakeRepo({ packageVersion: '4.6.3' });
  try {
    const res = runCreateReleasePRStep({
      repoDir,
      nextVersion: '4.6.4',
      releaseBranch: 'chore/release-v4.6.4',
    });
    assert.strictEqual(res.exitCode, 0, `Script exited ${res.exitCode}.\nSTDOUT: ${res.stdout}\nSTDERR: ${res.stderr}`);
    assert.ok(res.newCommitCreated, 'Expected a new commit when versions differ');
    assert.ok(
      res.stdout.includes('STATUS:COMMITTED=true'),
      `Expected COMMITTED=true status.\nSTDOUT: ${res.stdout}`,
    );
  } finally {
    fs.rmSync(repoDir, { recursive: true, force: true });
  }
});

test('no version bump needed: exits cleanly, no new commit, no gh calls', () => {
  // Repo starts at 4.6.4 (target version) → no diff → no commit
  const repoDir = makeFakeRepo({ packageVersion: '4.6.4' });
  try {
    const res = runCreateReleasePRStep({
      repoDir,
      nextVersion: '4.6.4',
      releaseBranch: 'chore/release-v4.6.4',
    });
    assert.strictEqual(res.exitCode, 0, `Script exited ${res.exitCode}.\nSTDOUT: ${res.stdout}\nSTDERR: ${res.stderr}`);
    assert.ok(!res.newCommitCreated, 'Expected NO new commit when version is already at target');
    assert.ok(
      res.stdout.includes('STATUS:NO_CHANGES'),
      `Expected NO_CHANGES status.\nSTDOUT: ${res.stdout}`,
    );
    assert.strictEqual(
      res.ghCalls, '',
      `Expected no gh commands to be invoked.\ngh calls log: ${res.ghCalls}`,
    );
  } finally {
    fs.rmSync(repoDir, { recursive: true, force: true });
  }
});

test('alpha version bump needed: commit created for alpha release branch', () => {
  // Repo at 5.0.0-alpha.1; bump target is 5.0.0-alpha.2 → diff → commit
  const repoDir = makeFakeRepo({ packageVersion: '5.0.0-alpha.1' });
  try {
    const res = runCreateReleasePRStep({
      repoDir,
      nextVersion: '5.0.0-alpha.2',
      releaseBranch: 'chore/alpha-release-v5.0.0-alpha.2',
    });
    assert.strictEqual(res.exitCode, 0, `Script exited ${res.exitCode}.\nSTDOUT: ${res.stdout}\nSTDERR: ${res.stderr}`);
    assert.ok(res.newCommitCreated, 'Expected a new commit for alpha version bump');
    assert.ok(
      res.stdout.includes('STATUS:COMMITTED=true'),
      `Expected COMMITTED=true status.\nSTDOUT: ${res.stdout}`,
    );
  } finally {
    fs.rmSync(repoDir, { recursive: true, force: true });
  }
});

// ============================================================================
// Summary
// ============================================================================

console.log(`\n${'─'.repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failures.length > 0) {
  console.error('\nFailed tests:');
  failures.forEach(f => console.error(`  ✗ ${f.name}\n    ${f.message}`));
  process.exit(1);
} else {
  console.log('All release automation tests passed! ✅');
}
