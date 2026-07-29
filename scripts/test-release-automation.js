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
 *      - when no version changes are needed  → creates an explicit release commit
 *
 *   6. release title sync no-op safety
 *      - when release files already match → exits without an empty commit loop
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
const releaseMetadata = require('./release-metadata');

const ROOT_DIR = path.resolve(__dirname, '..');
const LESS_MANIFEST = JSON.parse(
  fs.readFileSync(path.join(ROOT_DIR, 'packages', 'less', 'package.json'), 'utf8')
);
const JESS_TEST_VERSION = LESS_MANIFEST.dependencies['@jesscss/compiler'];

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
 *      (
 *        startsWith(github.event.pull_request.title, 'chore: release v') ||
 *        startsWith(github.event.pull_request.title, 'chore: alpha release v')
 *      ))
 *   )
 */
function publishShouldRun({ repo, prMerged, prBaseRef, prTitle }) {
  if (repo !== 'less/less.js') return false;
  if (!prMerged) return false;

  const isMasterRelease =
    prBaseRef === 'master' &&
    typeof prTitle === 'string' &&
    prTitle.startsWith(releaseMetadata.RELEASE_TITLE_PREFIX);

  const isAlphaRelease =
    prBaseRef === 'alpha' &&
    typeof prTitle === 'string' &&
    (
      prTitle.startsWith(releaseMetadata.RELEASE_TITLE_PREFIX) ||
      prTitle.startsWith(releaseMetadata.LEGACY_ALPHA_RELEASE_TITLE_PREFIX)
    );

  return isMasterRelease || isAlphaRelease;
}

/**
 * create-release-pr.yml `if:` condition:
 *
 *   github.event_name == 'push' &&
 *   github.repository == 'less/less.js' &&
 *   !contains(github.event.head_commit.message, 'chore: release v') &&
 *   !contains(github.event.head_commit.message, 'chore: alpha release v') &&
 *   !contains(github.event.head_commit.message, '/release-v') &&
 *   !contains(github.event.head_commit.message, '/alpha-release-v')
 */
function createReleasePRShouldRun({ repo, eventName, commitMessage }) {
  if (eventName !== 'push') return false;
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
function nextAlphaVersion(current, npmVersion) {
  return releaseMetadata.nextVersion('alpha', current, npmVersion);
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
    JSON.stringify({
      name: 'less',
      version: packageVersion,
      dependencies: {
        '@jesscss/compiler': JESS_TEST_VERSION,
        '@jesscss/core': JESS_TEST_VERSION,
        '@jesscss/plugin-less': JESS_TEST_VERSION,
        '@jesscss/plugin-less-compat': JESS_TEST_VERSION,
        '@jesscss/plugin-node-modules': JESS_TEST_VERSION,
      },
      peerDependencies: {
        '@jesscss/plugin-js': JESS_TEST_VERSION,
      },
      peerDependenciesMeta: {
        '@jesscss/plugin-js': {
          optional: true,
        },
      },
    }, null, '\t') + '\n',
  );

  // Minimal git repo
  execSync('git init -b master', { cwd: dir, stdio: 'ignore' });
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'ignore' });
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'ignore' });
  execSync('git add .', { cwd: dir, stdio: 'ignore' });
  execSync('git commit -m "initial"', { cwd: dir, stdio: 'ignore' });
  const remoteDir = `${dir}-origin.git`;
  execSync(`git init --bare ${JSON.stringify(remoteDir)}`, { stdio: 'ignore' });
  execSync(`git remote add origin ${JSON.stringify(remoteDir)}`, { cwd: dir, stdio: 'ignore' });

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
  const binDir = path.join(fakeRoot, '.test-bin');
  fs.mkdirSync(binDir, { recursive: true });
  fs.writeFileSync(path.join(binDir, 'npm'), `#!/bin/sh
set -eu
if [ "$1" = "view" ] && [ "$2" = "less" ] && [ "$3" = "version" ]; then
  printf '%s\\n' "\${TEST_NPM_LATEST_VERSION:-4.8.1}"
  exit 0
fi
if [ "$1" = "view" ] && [ "$2" = "less" ] && [ "$3" = "dist-tags.alpha" ]; then
  if [ "\${TEST_NPM_ALPHA_VERSION:-}" ]; then
    printf '%s\\n' "$TEST_NPM_ALPHA_VERSION"
    exit 0
  fi
  exit 1
fi
case "$2" in
  less@*)
    if [ "\${TEST_NPM_EXACT_VERSION:-}" ]; then
      printf '%s\\n' "$TEST_NPM_EXACT_VERSION"
      exit 0
    fi
    exit 1
    ;;
esac
exit 1
`);
  fs.chmodSync(path.join(binDir, 'npm'), 0o755);

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
      PATH: `${binDir}:${process.env.PATH}`,
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

function runCreateReleasePRStep({ repoDir, nextVersion, releaseBranch, releaseBase = releaseBranch.includes('alpha') ? 'alpha' : 'master' }) {
  // Stub `gh` binary so any calls are recorded but do nothing
  const binDir = path.join(repoDir, '.test-bin');
  fs.mkdirSync(binDir, { recursive: true });
  const ghLog = path.join(repoDir, 'gh-calls.log');
  fs.writeFileSync(path.join(binDir, 'gh'), `#!/bin/sh\necho "$@" >> "${ghLog}"\n`);
  fs.chmodSync(path.join(binDir, 'gh'), 0o755);
  const scriptsDir = path.join(repoDir, 'scripts');
  fs.mkdirSync(scriptsDir, { recursive: true });
  let releaseScript = fs.readFileSync(path.join(ROOT_DIR, 'scripts', 'release-metadata.js'), 'utf8')
    .replace(/^#!.*\n/, '');
  if (SEMVER_PATH) {
    releaseScript = releaseScript.replace(
      /require\('semver'\)/g,
      `require(${JSON.stringify(SEMVER_PATH)})`,
    );
  }
  fs.writeFileSync(path.join(scriptsDir, 'release-metadata.js'), releaseScript);

  const initialHead = execSync('git rev-parse HEAD', { cwd: repoDir, encoding: 'utf8' }).trim();

  const script = `
set -euo pipefail
NEXT_VERSION=${JSON.stringify(nextVersion)}
RELEASE_BRANCH=${JSON.stringify(releaseBranch)}
RELEASE_BASE=${JSON.stringify(releaseBase)}
TITLE="chore: release v\${NEXT_VERSION}"

git checkout -b "\${RELEASE_BRANCH}"

node scripts/release-metadata.js sync-package-versions "\${RELEASE_BASE}" "\${NEXT_VERSION}"

git add package.json packages/*/package.json
if git diff --cached --quiet; then
  echo "STATUS:NO_CHANGES"
fi
git commit --allow-empty -m "\${TITLE}"
echo "STATUS:COMMITTED=true"
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
      prTitle: 'chore: release v5.0.0-alpha.2',
    }),
    true,
  );
});

test('legacy alpha release PR title merged → SHOULD publish (alpha tag)', () => {
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

test('alpha-looking canonical title against master base → trigger, then validation rejects', () => {
  assert.strictEqual(
    publishShouldRun({
      repo: 'less/less.js',
      prMerged: true,
      prBaseRef: 'master',
      prTitle: 'chore: release v5.0.0-alpha.1',
    }),
    true,
  );
  assert.throws(
    () => releaseMetadata.parseReleaseTitle('master', 'chore: release v5.0.0-alpha.1'),
    /Master releases must not use a prerelease version/,
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
// Section 1b — release title metadata
// ----------------------------------------------------------------------------

section('1b. release title metadata — title as version source');

test('master title parses the requested release version', () => {
  assert.strictEqual(
    releaseMetadata.parseReleaseTitle('master', 'chore: release v4.9.0'),
    '4.9.0',
  );
});

test('alpha title uses the same canonical title shape', () => {
  assert.strictEqual(
    releaseMetadata.releaseTitle('alpha', '5.0.0-alpha.3'),
    'chore: release v5.0.0-alpha.3',
  );
  assert.strictEqual(
    releaseMetadata.parseReleaseTitle('alpha', 'chore: release v5.0.0-alpha.3'),
    '5.0.0-alpha.3',
  );
});

test('legacy alpha title remains accepted for existing PRs', () => {
  assert.strictEqual(
    releaseMetadata.parseReleaseTitle('alpha', 'chore: alpha release v5.0.0-alpha.3'),
    '5.0.0-alpha.3',
  );
});

test('master release title rejects alpha prerelease versions', () => {
  assert.throws(
    () => releaseMetadata.parseReleaseTitle('master', 'chore: release v5.0.0-alpha.3'),
    /Master releases must not use a prerelease version/,
  );
});

test('master release title rejects legacy alpha prefix', () => {
  assert.throws(
    () => releaseMetadata.parseReleaseTitle('master', 'chore: alpha release v5.0.0'),
    /Release title must start with "chore: release v"/,
  );
});

test('alpha release title rejects non-alpha versions', () => {
  assert.throws(
    () => releaseMetadata.parseReleaseTitle('alpha', 'chore: release v5.0.0'),
    /Alpha releases must use X\.Y\.Z-alpha\.N/,
  );
});

test('release body does not repeat the version', () => {
  assert.ok(!releaseMetadata.releaseBody().includes('4.9.0'));
  assert.ok(releaseMetadata.releaseBody().includes('PR title'));
});

test('npm latest check rejects a master title version that is already published', () => {
  assert.throws(
    () => releaseMetadata.validateAgainstNpm('master', '4.9.0', '4.9.0'),
    /must be greater than npm latest version/,
  );
});

test('npm alpha check rejects an alpha title version that is already published', () => {
  assert.throws(
    () => releaseMetadata.validateAgainstNpm('alpha', '5.0.0-alpha.3', '5.0.0-alpha.3'),
    /must be greater than npm alpha version/,
  );
});

test('next version ignores invalid npm version input while choosing a default', () => {
  assert.strictEqual(
    releaseMetadata.nextVersion('master', '4.9.0', 'npm ERR registry unavailable'),
    '4.9.1',
  );
  assert.strictEqual(
    releaseMetadata.nextVersion('alpha', '5.0.0-alpha.3', 'not-a-version'),
    '5.0.0-alpha.3',
  );
});

test('title sync rejects versions lower than the release branch package version', () => {
  assert.throws(
    () => releaseMetadata.validateTitleSync('master', '4.8.0', '4.9.0', '4.7.0'),
    /must not be lower than current branch version/,
  );
});

test('title sync allows versions equal to the release branch package version', () => {
  assert.doesNotThrow(
    () => releaseMetadata.validateTitleSync('master', '4.9.0', '4.9.0', '4.8.0'),
  );
});

test('changelog title sync updates the matching current release heading only', () => {
  const changelog = [
    '# Changelog',
    '',
    '### v4.8.1 (2026-07-26)',
    '',
    '#### Changes',
    '',
    '- something',
    '',
    '### v4.8.0 (2026-07-25)',
    '',
  ].join('\n');

  const result = releaseMetadata.replaceChangelogVersion(changelog, '4.9.0', '4.8.1');
  assert.strictEqual(result.changed, true);
  assert.ok(result.content.includes('### v4.9.0 (2026-07-26)'));
  assert.ok(result.content.includes('### v4.8.0 (2026-07-25)'));
});

test('changelog title sync inserts a current heading when only history exists', () => {
  const changelog = [
    '# Changelog',
    '',
    '### v4.8.0 (2026-07-25)',
    '',
    '#### Changes',
    '',
    '- older change',
    '',
  ].join('\n');

  const result = releaseMetadata.changelogUpdateForContent(changelog, '4.9.0', '4.8.1', '2026-07-26');
  assert.strictEqual(result.status, 'inserted');
  assert.ok(result.content.includes('### v4.9.0 (2026-07-26)\n\n### v4.8.0 (2026-07-25)'));
  assert.ok(result.content.includes('- older change'));
});

test('changelog title sync inserts a heading when no dated release heading exists', () => {
  const changelog = [
    '# Changelog',
    '',
    'Unreleased notes without a dated release heading.',
    '',
  ].join('\n');

  const result = releaseMetadata.changelogUpdateForContent(changelog, '4.9.0', '4.8.1', '2026-07-26');
  assert.strictEqual(result.status, 'inserted');
  assert.ok(result.content.includes('# Changelog\n\n### v4.9.0 (2026-07-26)\n'));
  assert.ok(result.content.includes('Unreleased notes without a dated release heading.'));
});

test('changelog title sync is idempotent when the heading already matches the title', () => {
  const changelog = [
    '# Changelog',
    '',
    '### v4.9.0 (2026-07-26)',
    '',
    '#### Changes',
    '',
    '- something',
    '',
    '### v4.8.0 (2026-07-25)',
    '',
  ].join('\n');

  const result = releaseMetadata.changelogUpdateForContent(changelog, '4.9.0', '4.8.1');
  assert.strictEqual(result.status, 'unchanged');
  assert.strictEqual(result.content, changelog);
});

// ----------------------------------------------------------------------------
// Section 2 — create-release-pr.yml trigger conditions
// ----------------------------------------------------------------------------

section('2. create-release-pr.yml — workflow trigger conditions');

test('normal merge to master → SHOULD trigger', () => {
  assert.strictEqual(
    createReleasePRShouldRun({ repo: 'less/less.js', eventName: 'push', commitMessage: 'fix: correct color parsing' }),
    true,
  );
});

test('normal merge to alpha → SHOULD trigger', () => {
  assert.strictEqual(
    createReleasePRShouldRun({ repo: 'less/less.js', eventName: 'push', commitMessage: 'feat: new feature for next major' }),
    true,
  );
});

test('master release PR merge → should NOT trigger (loop guard)', () => {
  assert.strictEqual(
    createReleasePRShouldRun({ repo: 'less/less.js', eventName: 'push', commitMessage: 'chore: release v4.6.4' }),
    false,
  );
});

test('alpha release PR merge → should NOT trigger (loop guard)', () => {
  assert.strictEqual(
    createReleasePRShouldRun({ repo: 'less/less.js', eventName: 'push', commitMessage: 'chore: alpha release v5.0.0-alpha.2' }),
    false,
  );
});

test('release branch ref in commit message → should NOT trigger (loop guard for master)', () => {
  assert.strictEqual(
    createReleasePRShouldRun({
      repo: 'less/less.js',
      eventName: 'push',
      commitMessage: 'Merge chore/release-v4.6.4 into master',
    }),
    false,
  );
});

test('alpha release branch ref in commit message → should NOT trigger (loop guard for alpha)', () => {
  assert.strictEqual(
    createReleasePRShouldRun({
      repo: 'less/less.js',
      eventName: 'push',
      commitMessage: 'Merge chore/alpha-release-v5.0.0-alpha.2 into alpha',
    }),
    false,
  );
});

test('wrong repository → should NOT trigger', () => {
  assert.strictEqual(
    createReleasePRShouldRun({ repo: 'fork/less.js', eventName: 'push', commitMessage: 'fix: something' }),
    false,
  );
});

test('pull request event → should NOT trigger', () => {
  assert.strictEqual(
    createReleasePRShouldRun({ repo: 'less/less.js', eventName: 'pull_request', commitMessage: 'fix: something' }),
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

test('unpublished alpha manifest is preserved: 5.0.0-alpha.1 → 5.0.0-alpha.1', () => {
  assert.strictEqual(nextAlphaVersion('5.0.0-alpha.1'), '5.0.0-alpha.1');
});

test('published alpha increments: 5.0.0-alpha.1 → 5.0.0-alpha.2', () => {
  assert.strictEqual(nextAlphaVersion('5.0.0-alpha.1', '5.0.0-alpha.1'), '5.0.0-alpha.2');
});

test('5.x: 5.0.0-alpha.3 → 5.0.0-alpha.4  (preserves major, not 4.x)', () => {
  assert.strictEqual(nextAlphaVersion('5.0.0-alpha.3', '5.0.0-alpha.3'), '5.0.0-alpha.4');
});

test('5.x minor/patch: 5.1.2-alpha.7 → 5.1.2-alpha.8', () => {
  assert.strictEqual(nextAlphaVersion('5.1.2-alpha.7', '5.1.2-alpha.7'), '5.1.2-alpha.8');
});

test('double-digit rollover: 5.0.0-alpha.9 → 5.0.0-alpha.10  (integer, not string comparison)', () => {
  assert.strictEqual(nextAlphaVersion('5.0.0-alpha.9', '5.0.0-alpha.9'), '5.0.0-alpha.10');
});

test('npm alpha ahead of package.json: 5.0.0-alpha.1 with npm alpha.4 → 5.0.0-alpha.5', () => {
  assert.strictEqual(nextAlphaVersion('5.0.0-alpha.1', '5.0.0-alpha.4'), '5.0.0-alpha.5');
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
      stdout.includes('Using committed alpha version') ||
        stdout.includes('no auto-increment on alpha') ||
        stdout.includes('Using package.json version'),
      `Expected committed-version/no-auto-increment message.\nSTDOUT: ${stdout}`,
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

test('no version bump needed: creates explicit release commit, no gh calls', () => {
  // Repo starts at 4.6.4 (target version) → no diff → explicit release commit
  const repoDir = makeFakeRepo({ packageVersion: '4.6.4' });
  try {
    const res = runCreateReleasePRStep({
      repoDir,
      nextVersion: '4.6.4',
      releaseBranch: 'chore/release-v4.6.4',
    });
    assert.strictEqual(res.exitCode, 0, `Script exited ${res.exitCode}.\nSTDOUT: ${res.stdout}\nSTDERR: ${res.stderr}`);
    assert.ok(res.newCommitCreated, 'Expected an explicit release commit when version is already at target');
    assert.ok(
      res.stdout.includes('STATUS:NO_CHANGES'),
      `Expected NO_CHANGES status.\nSTDOUT: ${res.stdout}`,
    );
    assert.ok(
      res.stdout.includes('STATUS:COMMITTED=true'),
      `Expected COMMITTED=true status.\nSTDOUT: ${res.stdout}`,
    );
    assert.strictEqual(
      res.ghCalls, '',
      `Expected no gh commands to be invoked.\ngh calls log: ${res.ghCalls}`,
    );
  } finally {
    fs.rmSync(repoDir, { recursive: true, force: true });
  }
});

test('release title sync no-op exits without an empty commit', () => {
  const workflow = fs.readFileSync(path.join(ROOT_DIR, '.github', 'workflows', 'create-release-pr.yml'), 'utf8');
  const syncStep = workflow.slice(workflow.indexOf('      - name: Sync release files to title version'));
  assert.ok(
    syncStep.includes('echo "Release files already match v${VERSION}"\n            exit 0'),
    'Expected sync-title no-op path to exit cleanly',
  );
  assert.ok(
    !syncStep.includes('git commit --allow-empty'),
    'Sync-title no-op must not create empty commits on synchronize events',
  );
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

// ----------------------------------------------------------------------------
// Section 7 — pnpm version / lockfile compatibility
//
// Guards against the recurring breakage where a contributor regenerates
// pnpm-lock.yaml with a newer pnpm but forgets to update the "packageManager"
// field in package.json.  When the two are out of sync, pnpm/action-setup@v4
// installs the (stale) version from packageManager, which then rejects the
// lockfile with ERR_PNPM_NO_LOCKFILE and the entire workflow fails.
//
// Compatibility rule (based on pnpm changelog):
//   lockfileVersion 6.x  →  generated by pnpm 6/7/8 (pnpm <9 cannot read v9)
//   lockfileVersion 9.x  →  generated by pnpm 9+; pnpm 8 treats it as absent
// ----------------------------------------------------------------------------

section('7. pnpm version / lockfile compatibility');

test('packageManager in package.json is compatible with pnpm-lock.yaml lockfileVersion', () => {
  const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
  const packageManager = rootPkg.packageManager || '';

  const pmMatch = packageManager.match(/^pnpm@(\d+)\./);
  assert.ok(
    pmMatch,
    `packageManager field should be "pnpm@X.Y.Z", got: "${packageManager}"`,
  );
  const pnpmMajor = parseInt(pmMatch[1], 10);

  const lockfilePath = path.join(ROOT_DIR, 'pnpm-lock.yaml');
  const lockfileContent = fs.readFileSync(lockfilePath, 'utf8');
  const lockVersionMatch = lockfileContent.match(/^lockfileVersion:\s+'?(\d+)/m);
  assert.ok(lockVersionMatch, 'Could not find lockfileVersion in pnpm-lock.yaml');
  const lockfileMajor = parseInt(lockVersionMatch[1], 10);

  // lockfileVersion 9 was introduced in pnpm 9.  pnpm 8 ignores it entirely
  // (ERR_PNPM_NO_LOCKFILE), which is what broke create-release-pr.yml.
  if (lockfileMajor >= 9) {
    assert.ok(
      pnpmMajor >= 9,
      `pnpm-lock.yaml uses lockfileVersion ${lockVersionMatch[1]} which requires pnpm 9+, ` +
        `but packageManager is "${packageManager}". ` +
        `Update packageManager in package.json to match the pnpm version used to generate the lockfile.`,
    );
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
