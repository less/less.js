#!/usr/bin/env node
/**
 * Release-automation test suite
 *
 * Tests three components of the release flow without requiring a live
 * GitHub token or npm credentials:
 *
 *   1. Workflow trigger-condition logic
 *      - publish.yml `if:` expression (6 scenarios)
 *      - create-release-pr.yml `if:` expression (4 scenarios)
 *
 *   2. bump-and-publish.js behaviour (subprocess, DRY_RUN=true)
 *      - master path: uses package.json version as-is, no commit, no branch push
 *      - master path: rejects when package.json version ≤ published npm version
 *      - alpha path: auto-increments alpha version number
 *
 *   3. create-release-pr no-op safety (isolated temp git repo)
 *      - when a version bump produces changes → a commit is created
 *      - when no version changes are needed  → exits cleanly with no commit
 *
 * Run:
 *   node scripts/test-release-automation.js
 *
 * Uses only Node.js built-ins.  semver is resolved from either the workspace
 * node_modules (after `pnpm install`) or /tmp/test-deps/node_modules (the
 * fallback used in this sandbox).
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
 *   (
 *     (github.event_name == 'pull_request' &&
 *      github.event.pull_request.merged == true &&
 *      startsWith(github.event.pull_request.title, 'chore: release v')) ||
 *     (github.event_name == 'push' &&
 *      github.ref_name == 'alpha' &&
 *      !startsWith(github.event.head_commit.message, 'chore: bump version to'))
 *   )
 */
function publishShouldRun({ repo, eventName, prMerged, prTitle, refName, commitMessage }) {
  if (repo !== 'less/less.js') return false;

  const isReleasePRMerge =
    eventName === 'pull_request' &&
    prMerged === true &&
    typeof prTitle === 'string' &&
    prTitle.startsWith('chore: release v');

  const isAlphaPush =
    eventName === 'push' &&
    refName === 'alpha' &&
    typeof commitMessage === 'string' &&
    !commitMessage.startsWith('chore: bump version to');

  return isReleasePRMerge || isAlphaPush;
}

/**
 * create-release-pr.yml `if:` condition:
 *
 *   github.repository == 'less/less.js' &&
 *   !contains(github.event.head_commit.message, 'chore: release v') &&
 *   !contains(github.event.head_commit.message, '/release-v')
 */
function createReleasePRShouldRun({ repo, commitMessage }) {
  if (repo !== 'less/less.js') return false;
  if (commitMessage.includes('chore: release v')) return false;
  if (commitMessage.includes('/release-v')) return false;
  return true;
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
// Strategy: copy the script into the temp repo's scripts/ directory, replace
// the ROOT_DIR constant so it points at fakeRoot, then execute it.  semver is
// resolved via NODE_PATH.
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

  const patchedScript = path.join(scriptsDir, '_bap_patched.cjs');
  fs.writeFileSync(patchedScript, src);

  const nodePathParts = [
    SEMVER_PATH ? path.dirname(SEMVER_PATH) : null,
    process.env.NODE_PATH,
  ].filter(Boolean).join(path.delimiter);

  const result = spawnSync('node', [patchedScript], {
    cwd: fakeRoot,
    env: {
      ...process.env,
      ...extraEnv,
      ...(nodePathParts ? { NODE_PATH: nodePathParts } : {}),
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

  // Run the version-bump portion of create-release-pr.yml:
  //   - checkout release branch
  //   - rewrite version in all package.json files
  //   - git add + conditional commit
  // We do NOT run `git push` or `gh pr create` (no remote / no auth needed).
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

test('release PR merged → SHOULD publish', () => {
  assert.strictEqual(
    publishShouldRun({
      repo: 'less/less.js',
      eventName: 'pull_request',
      prMerged: true,
      prTitle: 'chore: release v4.6.4',
    }),
    true,
  );
});

test('non-release PR merged → should NOT publish', () => {
  assert.strictEqual(
    publishShouldRun({
      repo: 'less/less.js',
      eventName: 'pull_request',
      prMerged: true,
      prTitle: 'fix: some bug fix',
    }),
    false,
  );
});

test('release PR closed but NOT merged → should NOT publish', () => {
  assert.strictEqual(
    publishShouldRun({
      repo: 'less/less.js',
      eventName: 'pull_request',
      prMerged: false,
      prTitle: 'chore: release v4.6.4',
    }),
    false,
  );
});

test('direct push to master → should NOT publish', () => {
  assert.strictEqual(
    publishShouldRun({
      repo: 'less/less.js',
      eventName: 'push',
      refName: 'master',
      commitMessage: 'fix: something',
    }),
    false,
  );
});

test('push to alpha (regular commit) → SHOULD publish', () => {
  assert.strictEqual(
    publishShouldRun({
      repo: 'less/less.js',
      eventName: 'push',
      refName: 'alpha',
      commitMessage: 'fix: something on alpha',
    }),
    true,
  );
});

test('push to alpha with bump-commit message → should NOT publish (loop guard)', () => {
  assert.strictEqual(
    publishShouldRun({
      repo: 'less/less.js',
      eventName: 'push',
      refName: 'alpha',
      commitMessage: 'chore: bump version to 5.0.0-alpha.2',
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

test('release PR merge (squash) → should NOT trigger (loop guard)', () => {
  assert.strictEqual(
    createReleasePRShouldRun({ repo: 'less/less.js', commitMessage: 'chore: release v4.6.4' }),
    false,
  );
});

test('release branch ref in commit message → should NOT trigger (loop guard)', () => {
  assert.strictEqual(
    createReleasePRShouldRun({
      repo: 'less/less.js',
      commitMessage: 'Merge chore/release-v4.6.4 into master',
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
// Section 3 — bump-and-publish.js master path
// ----------------------------------------------------------------------------

section('3. bump-and-publish.js — master path (DRY_RUN=true)');

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
// Section 4 — bump-and-publish.js alpha path
// ----------------------------------------------------------------------------

section('4. bump-and-publish.js — alpha path (DRY_RUN=true)');

test('alpha: auto-increments alpha version (4.6.3-alpha.1 → 4.6.3-alpha.2)', () => {
  const fakeDir = makeFakeRepo({ packageVersion: '4.6.3-alpha.1' });
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

test('alpha: includes a commit step', () => {
  const fakeDir = makeFakeRepo({ packageVersion: '4.6.3-alpha.1' });
  try {
    const { stdout, stderr } = runBumpAndPublish(fakeDir, {
      GITHUB_REF_NAME: 'alpha',
      DRY_RUN: 'true',
    });
    assert.ok(
      stdout.includes('[DRY RUN] Would commit'),
      `Expected a commit step on alpha path.\nSTDOUT: ${stdout}\nSTDERR: ${stderr}`,
    );
  } finally {
    fs.rmSync(fakeDir, { recursive: true, force: true });
  }
});

test('alpha: includes a branch push step (not master push)', () => {
  const fakeDir = makeFakeRepo({ packageVersion: '4.6.3-alpha.1' });
  try {
    const { stdout, stderr } = runBumpAndPublish(fakeDir, {
      GITHUB_REF_NAME: 'alpha',
      DRY_RUN: 'true',
    });
    assert.ok(
      stdout.includes('Would push to: origin alpha'),
      `Expected "push to: origin alpha" in output.\nSTDOUT: ${stdout}\nSTDERR: ${stderr}`,
    );
    assert.ok(
      !stdout.includes('Would push to: origin master'),
      `Expected NO push to master from alpha path.\nSTDOUT: ${stdout}`,
    );
  } finally {
    fs.rmSync(fakeDir, { recursive: true, force: true });
  }
});

test('alpha: publishes with "alpha" npm tag', () => {
  const fakeDir = makeFakeRepo({ packageVersion: '4.6.3-alpha.5' });
  try {
    const { stdout, stderr } = runBumpAndPublish(fakeDir, {
      GITHUB_REF_NAME: 'alpha',
      DRY_RUN: 'true',
    });
    assert.ok(
      stdout.includes('tag: alpha'),
      `Expected npm tag "alpha" in output.\nSTDOUT: ${stdout}\nSTDERR: ${stderr}`,
    );
  } finally {
    fs.rmSync(fakeDir, { recursive: true, force: true });
  }
});

// ----------------------------------------------------------------------------
// Section 5 — create-release-pr no-op safety (the key correctness fix)
// ----------------------------------------------------------------------------

section('5. create-release-pr — no-op safety');

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
