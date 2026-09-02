#!/usr/bin/env node

/**
 * Version bumping and publishing script for Less.js monorepo
 * 
 * This script:
 * 1. Determines the next version (patch increment or explicit)
 * 2. Updates all package.json files to the same version
 * 3. Creates and pushes an annotated git tag
 * 4. Publishes all packages to NPM
 * 
 * Both master and alpha now use a PR-based release flow:
 *
 *   master → "chore: release vX.Y.Z" PR        created by create-release-pr.yml
 *   alpha  → "chore: alpha release vX.Y.Z" PR  created by create-release-pr.yml
 *
 * Merging the release PR lands the version-bump commit on the branch and
 * triggers this script.  At that point package.json already carries the
 * target version.  This script validates it, creates an annotated tag, pushes
 * the tag, and publishes to npm.  No local commit or branch push is made here.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const semver = require('semver');

const ROOT_DIR = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');
const JESS_RUNTIME_DEPENDENCIES = [
  '@jesscss/compiler',
  '@jesscss/core',
  '@jesscss/plugin-less',
  '@jesscss/plugin-less-compat',
  '@jesscss/plugin-node-modules'
];
const OPTIONAL_SCRIPT_PLUGIN_PEER = '@jesscss/plugin-js';
const FORBIDDEN_LESS_RUNTIME_DEPENDENCIES = ['jess'];

// Get all package.json files
function getPackageFiles() {
  const packages = [];
  
  // Root package.json
  const rootPkgPath = path.join(ROOT_DIR, 'package.json');
  if (fs.existsSync(rootPkgPath)) {
    packages.push(rootPkgPath);
  }
  
  // Package directories
  const packageDirs = fs.readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => path.join(PACKAGES_DIR, dirent.name));
  
  for (const pkgDir of packageDirs) {
    const pkgPath = path.join(pkgDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      packages.push(pkgPath);
    }
  }
  
  return packages;
}

// A release has one workspace version only for its root manifest and public
// packages. Private fixtures deliberately retain their own compatibility
// version and must never be rewritten as a side effect of publishing Less.
function getReleasePackageFiles() {
  return getPackageFiles().filter(pkgPath => {
    if (pkgPath === path.join(ROOT_DIR, 'package.json')) {
      return true;
    }
    return !readPackage(pkgPath).private;
  });
}

// Read package.json
function readPackage(pkgPath) {
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
}

// Write package.json
function writePackage(pkgPath, pkg) {
  const content = JSON.stringify(pkg, null, '\t') + '\n';
  fs.writeFileSync(pkgPath, content, 'utf8');
}

// Parse version string
function parseVersion(version) {
  const parts = version.split('.');
  return {
    major: parseInt(parts[0], 10),
    minor: parseInt(parts[1], 10),
    patch: parseInt(parts[2], 10),
    prerelease: parts[3] || null
  };
}

// Get current version from main package
function getCurrentVersion() {
  const lessPkgPath = path.join(PACKAGES_DIR, 'less', 'package.json');
  const pkg = readPackage(lessPkgPath);
  return pkg.version;
}

// Get the latest published version from NPM
function getNpmVersion(packageName) {
  try {
    return execSync(`npm view ${packageName} version`, { encoding: 'utf8' }).trim();
  } catch (e) {
    // Package not yet published
    return null;
  }
}

// Return the exact published version when it exists. The unqualified `version`
// query follows `latest`, which is not useful on the alpha branch while Less
// v5 is still unpublished (latest remains on the Less 4 line).
function getExactNpmVersion(packageName, version) {
  try {
    return execSync(`npm view ${packageName}@${version} version`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch (e) {
    // An unpublished exact version is the expected first-alpha case.
    return null;
  }
}

// Get the current alpha dist-tag version from NPM
function getNpmAlphaVersion(packageName) {
  try {
    const result = execSync(`npm view ${packageName} dist-tags.alpha`, { encoding: 'utf8' }).trim();
    return result || null;
  } catch (e) {
    return null;
  }
}

/**
 * Resolve the Jess alpha version that the published Less package must use.
 * The release branch must commit exact published Jess alpha dependencies; the
 * publish command validates that committed manifest instead of rewriting it.
 */
function getJessPublishVersion() {
  const lessPkgPath = path.join(PACKAGES_DIR, 'less', 'package.json');
  const dependencies = readPackage(lessPkgPath).dependencies || {};
  const missing = JESS_RUNTIME_DEPENDENCIES.filter(name => !(name in dependencies));
  if (missing.length > 0) {
    throw new Error(`less package is missing Jess runtime dependencies: ${missing.join(', ')}`);
  }

  const pinned = JESS_RUNTIME_DEPENDENCIES.map(name => dependencies[name]);
  const unique = [...new Set(pinned)];
  if (unique.length !== 1) {
    throw new Error(`Jess runtime dependencies must all use the same published alpha version: ${unique.join(', ')}`);
  }

  const manifestVersion = unique[0];
  if (!semver.valid(manifestVersion) || !manifestVersion.includes('-alpha.')) {
    throw new Error(`Jess runtime dependencies must be pinned to a valid published alpha version, received: ${manifestVersion}`);
  }
  return manifestVersion;
}

/**
 * A non-dry alpha publish must name Jess runtime packages that are already on
 * npm. Keep this guard ahead of all release mutations: failing it must not
 * create a Less commit, tag, or push.
 */
function verifyJessRuntimePublishedVersion(version, lookup = getExactNpmVersion) {
  const missing = JESS_RUNTIME_DEPENDENCIES.filter(name => lookup(name, version) !== version);
  if (missing.length > 0) {
    throw new Error(`Jess runtime packages must be published before a Less alpha publish: ${missing.join(', ')}@${version}`);
  }
  return version;
}

function verifyScriptPluginOptionalPeer(version, manifest = readPackage(path.join(PACKAGES_DIR, 'less', 'package.json'))) {
  for (const name of FORBIDDEN_LESS_RUNTIME_DEPENDENCIES) {
    if (manifest.dependencies && name in manifest.dependencies) {
      throw new Error(`${name} must not be a Less runtime dependency`);
    }
    if (manifest.optionalDependencies && name in manifest.optionalDependencies) {
      throw new Error(`${name} must not be a Less optionalDependency`);
    }
  }
  if (manifest.dependencies && OPTIONAL_SCRIPT_PLUGIN_PEER in manifest.dependencies) {
    throw new Error(`${OPTIONAL_SCRIPT_PLUGIN_PEER} must not be a Less runtime dependency`);
  }
  if (manifest.optionalDependencies && OPTIONAL_SCRIPT_PLUGIN_PEER in manifest.optionalDependencies) {
    throw new Error(`${OPTIONAL_SCRIPT_PLUGIN_PEER} must be an optional peer, not an optionalDependency`);
  }
  if (manifest.peerDependencies?.[OPTIONAL_SCRIPT_PLUGIN_PEER] !== version) {
    throw new Error(`${OPTIONAL_SCRIPT_PLUGIN_PEER} optional peer must be pinned to ${version}`);
  }
  if (manifest.peerDependenciesMeta?.[OPTIONAL_SCRIPT_PLUGIN_PEER]?.optional !== true) {
    throw new Error(`${OPTIONAL_SCRIPT_PLUGIN_PEER} peer dependency must be marked optional`);
  }
  return version;
}

/**
 * Select the alpha version without treating the `latest` Less 4 release as
 * evidence that an explicitly configured Less 5 alpha should be bumped.
 * `exactPublishedVersion` is null when the current version is not on npm.
 */
function determineAlphaVersion(currentVersion, exactPublishedVersion, explicitVersion) {
  if (explicitVersion && explicitVersion !== currentVersion) {
    throw new Error(
      `EXPLICIT_VERSION (${explicitVersion}) must match the committed alpha manifest (${currentVersion}); prepare the version change before publishing`
    );
  }
  if (!semver.valid(currentVersion) || !/-alpha\.\d+$/u.test(currentVersion)) {
    throw new Error(`Alpha manifest version must be X.Y.Z-alpha.N, received: ${currentVersion}`);
  }
  // Alpha manifests are intentional release inputs, never something this
  // script guesses and rewrites. In particular, a first alpha remains .1.
  // The exact-published lookup is accepted for backwards-compatible callers;
  // `verifyUnpublishedVersion` is the actionable release guard.
  void exactPublishedVersion;
  return currentVersion;
}

// Determine the target version for publishing.
// Priority: EXPLICIT_VERSION env > package.json (if ahead of NPM) > NPM patch bump
function getTargetVersion(currentVersion, npmVersion) {
  // 1. Explicit override via environment variable
  if (process.env.EXPLICIT_VERSION) {
    console.log(`✨ Using explicit version from env: ${process.env.EXPLICIT_VERSION}`);
    return process.env.EXPLICIT_VERSION;
  }

  // 2. If package.json is ahead of NPM, use it
  if (npmVersion && semver.valid(currentVersion) && semver.gt(currentVersion, npmVersion)) {
    console.log(`📦 package.json (${currentVersion}) is ahead of NPM (${npmVersion}), using it`);
    return currentVersion;
  }

  // 3. Otherwise, bump from the latest NPM version
  const base = npmVersion || currentVersion;
  const next = semver.inc(base, 'patch');
  console.log(`🔢 Auto-incrementing patch: ${base} → ${next}`);
  return next;
}

// Update all package.json files with new version
function updateAllVersions(newVersion) {
  const packageFiles = getReleasePackageFiles();
  const updated = [];
  
  for (const pkgPath of packageFiles) {
    const pkg = readPackage(pkgPath);
    if (pkg.version) {
      pkg.version = newVersion;
      writePackage(pkgPath, pkg);
      updated.push(pkgPath);
    }
  }
  
  return updated;
}

function verifyReleaseManifestVersions(version, packageFiles = getReleasePackageFiles()) {
  for (const pkgPath of packageFiles) {
    const pkg = readPackage(pkgPath);
    if (pkg.version !== version) {
      throw new Error(
        `Release manifest ${path.relative(ROOT_DIR, pkgPath)} has version ${pkg.version}; expected ${version}`
      );
    }
  }
}

function verifyWorkspacePackageJson() {
  // Parse every workspace package manifest, including private fixtures. This
  // catches malformed package metadata without assigning private packages the
  // public release version.
  for (const pkgPath of getPackageFiles()) {
    readPackage(pkgPath);
  }
}

function verifyCleanWorktree() {
  const status = execSync('git status --porcelain --untracked-files=all', {
    cwd: ROOT_DIR,
    encoding: 'utf8'
  }).trim();
  if (status) {
    throw new Error('Release worktree is not clean; commit, stash, or remove local changes before publishing');
  }
}

function hasStagedChanges() {
  try {
    execSync('git diff --cached --quiet', { cwd: ROOT_DIR, stdio: 'ignore' });
    return false;
  } catch (error) {
    if (error.status === 1) {
      return true;
    }
    throw error;
  }
}

function verifyAlphaRepositoryState(version) {
  execSync('git fetch origin alpha master', { cwd: ROOT_DIR, stdio: 'ignore' });

  const [behind, ahead] = execSync('git rev-list --left-right --count origin/alpha...HEAD', {
    cwd: ROOT_DIR,
    encoding: 'utf8'
  }).trim().split(/\s+/u).map(Number);
  if (behind !== 0 || ahead !== 0) {
    throw new Error(
      `Local alpha must exactly match origin/alpha before publishing (behind ${behind}, ahead ${ahead})`
    );
  }

  // The Less 5 alpha branch is a deliberately divergent rewrite that does not
  // carry every v4.x master hotfix, so we intentionally do NOT gate on the alpha
  // branch being "behind" master. The alpha-base >= master version check below
  // is the real guard against an alpha undercutting the published 4.x latest.
  if (!semver.valid(version) || !/-alpha\.\d+$/u.test(version)) {
    throw new Error(`Alpha release version must be X.Y.Z-alpha.N, received: ${version}`);
  }
  const masterPkg = JSON.parse(execSync('git show origin/master:packages/less/package.json', {
    cwd: ROOT_DIR,
    encoding: 'utf8'
  }));
  const alphaBase = version.replace(/-alpha\.\d+$/u, '');
  if (!semver.gte(alphaBase, masterPkg.version)) {
    throw new Error(`Alpha base version ${alphaBase} is lower than origin/master ${masterPkg.version}`);
  }
}

function verifyUnpublishedVersion(packageName, version, lookup = getExactNpmVersion) {
  if (lookup(packageName, version)) {
    throw new Error(`${packageName}@${version} is already published; prepare and commit the next release version first`);
  }
}

function getAlreadyPublishedPackages(packages, version, lookup = getExactNpmVersion) {
  return packages.filter(pkg => lookup(pkg.name, version));
}

function verifyRemoteTagCommit(tagName, remoteTagCommit, headCommit) {
  if (remoteTagCommit && remoteTagCommit !== headCommit) {
    throw new Error(
      `Remote tag ${tagName} points at ${remoteTagCommit}, which differs from HEAD ${headCommit}; aborting publish`
    );
  }
}

// Get packages that should be published (not private)
function getPublishablePackages() {
  const packageFiles = getPackageFiles();
  const publishable = [];
  
  for (const pkgPath of packageFiles) {
    const pkg = readPackage(pkgPath);
    // Skip root package and private packages
    if (!pkg.private && pkg.name && pkg.name !== '@less/root') {
      publishable.push({
        path: pkgPath,
        name: pkg.name,
        dir: path.dirname(pkgPath)
      });
    }
  }
  
  return publishable;
}

// Main function
function main() {
  const dryRun = process.env.DRY_RUN === 'true' || process.argv.includes('--dry-run');
  const branch = process.env.GITHUB_REF_NAME || execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  const isAlpha = branch === 'alpha';
  const isMaster = branch === 'master';
  
  if (dryRun) {
    console.log(`🧪 DRY RUN MODE - No changes will be committed or published\n`);
  }
  
  // Enforce branch restrictions - only allow publishing from master or alpha branches
  if (!isMaster && !isAlpha) {
    console.error(`❌ ERROR: Publishing is only allowed from 'master' or 'alpha' branches`);
    console.error(`   Current branch: ${branch}`);
    console.error(`   Please switch to 'master' or 'alpha' branch before publishing`);
    process.exit(1);
  }
  
  console.log(`🚀 Starting publish process for branch: ${branch}`);
  
  // Get current version
  const currentVersion = getCurrentVersion();
  console.log(`📦 Current version: ${currentVersion}`);

  // Determine next version.
  // Both master and alpha now use the PR-based release flow: the version bump
  // was already applied by the release PR.  Use the version in package.json
  // as-is and fail fast if it is not ahead of the already-published version.
  let nextVersion;

  let jessPublishVersion;
  const publishable = getPublishablePackages();
  let alreadyPublished = [];

  if (isAlpha) {
    try {
      const exactPublishedVersion = getExactNpmVersion('less', currentVersion);
      const npmAlphaVersion = getNpmAlphaVersion('less');
      console.log(`📦 NPM alpha version: ${npmAlphaVersion || '(not published)'}`);
      nextVersion = determineAlphaVersion(currentVersion, exactPublishedVersion, process.env.EXPLICIT_VERSION);
      console.log(`📦 Using committed alpha version: ${nextVersion}`);

      jessPublishVersion = getJessPublishVersion();
      verifyScriptPluginOptionalPeer(jessPublishVersion);
      if (!dryRun) {
        verifyJessRuntimePublishedVersion(jessPublishVersion);
      }
      console.log(`✅ Less package will publish against Jess ${jessPublishVersion}`);
    } catch (error) {
      console.error(`❌ ERROR: ${error.message || error}`);
      process.exit(1);
    }
  } else {
    // For master: the version bump was already applied via the release PR.
    // Use the version already in package.json as-is; never auto-increment here
    // because that would create a local commit whose tag would point to a
    // commit that is NOT on the master branch.
    const npmVersion = getNpmVersion('less');
    console.log(`📦 NPM version: ${npmVersion || '(not published)'}`);
    if (npmVersion && semver.valid(currentVersion) && !semver.gt(currentVersion, npmVersion)) {
      console.error(`❌ ERROR: package.json version (${currentVersion}) must be greater than NPM version (${npmVersion})`);
      console.error(`   On master the version bump should have arrived via the release PR.`);
      process.exit(1);
    }
    nextVersion = currentVersion;
    console.log(`📦 Using package.json version (no auto-increment on master): ${nextVersion}`);
  }

  // These are real release guards, not post-release diagnostics. A real
  // release must fail before it mutates tags or talks to npm. Dry-run is
  // intentionally only a plan: it can run before the prerequisite Jess alpha is
  // published, but cannot claim release readiness.
  try {
    verifyWorkspacePackageJson();
    verifyReleaseManifestVersions(nextVersion);
    if (isAlpha && !dryRun) {
      verifyCleanWorktree();
      verifyAlphaRepositoryState(nextVersion);
      alreadyPublished = getAlreadyPublishedPackages(publishable, nextVersion);
      if (alreadyPublished.length > 0) {
        console.warn(
          `⚠️  ${alreadyPublished.length} package(s) already exist on npm for ${nextVersion}; ` +
          'assuming a publish rerun and skipping them.'
        );
      }
    }
  } catch (error) {
    console.error(`❌ ERROR: ${error.message || error}`);
    process.exit(1);
  }

  // Get publishable packages
  console.log(`📦 Found ${publishable.length} publishable packages:`);
  publishable.forEach(pkg => console.log(`   - ${pkg.name}`));
  const alreadyPublishedNames = new Set(alreadyPublished.map(pkg => pkg.name));

  // Both master and alpha: the version-bump commit already lives on the branch
  // (it came from the release PR).  Do NOT create another local commit or push
  // to the branch — doing so would produce a tag pointing at a commit that is
  // not on the target branch.
  //
  // Only the annotated tag is pushed.  Tag pushes bypass branch-protection
  // "require pull request" rules.

  // Create and push the annotated tag — idempotently.
  //
  // The tag is created and pushed BEFORE the npm publish loop below.  If a
  // previous run pushed the tag but then failed partway through publishing,
  // the remote tag already exists.  A naive rerun would die on `git tag` /
  // `git push` for the existing tag before it ever reached the publish retry,
  // leaving the release stuck until someone deletes the tag by hand.
  //
  // To make reruns safe we check the remote for the tag: if it already exists
  // and still points at HEAD, we simply skip the tag step and fall straight
  // through to the publish retry. If the remote tag points anywhere else,
  // abort instead of publishing packages for a version tagged to another
  // commit. Only when the tag is genuinely absent do we create + push a fresh
  // annotated tag.
  //
  // For master the version-bump commit already lives on the branch (it came
  // from the release PR).  Only the annotated tag is pushed — tag pushes bypass
  // branch-protection "require pull request" rules.  Alpha follows the same
  // pattern: the version bump arrived via the alpha release PR.
  const tagName = `v${nextVersion}`;

  // Resolve the commit a remote tag points at.  `^{}` dereferences an
  // annotated tag to the commit it wraps; lightweight tags have no `^{}` line
  // and the plain ref already IS the commit.  Returns null when absent.
  function getRemoteTagCommit(name) {
    const out = execSync(`git ls-remote origin "refs/tags/${name}" "refs/tags/${name}^{}"`, {
      cwd: ROOT_DIR,
      encoding: 'utf8'
    }).trim();
    if (!out) return null;
    const lines = out.split('\n').filter(Boolean);
    // Prefer the dereferenced (annotated) commit line if present.
    const derefLine = lines.find(l => l.endsWith(`refs/tags/${name}^{}`));
    const plainLine = lines.find(l => l.endsWith(`refs/tags/${name}`));
    const line = derefLine || plainLine;
    return line ? line.split('\t')[0] : null;
  }

  console.log(`🏷️  Preparing git tag: ${tagName}...`);
  const remoteTagCommit = getRemoteTagCommit(tagName);

  if (remoteTagCommit) {
    // Rerun-after-failed-publish path: the version is already tagged on the
    // remote.  Skip create/push and fall through to the publish retry only if
    // the tag still points at the checked-out release commit.
    const headCommit = execSync('git rev-parse HEAD', { cwd: ROOT_DIR, encoding: 'utf8' }).trim();
    try {
      verifyRemoteTagCommit(tagName, remoteTagCommit, headCommit);
    } catch (error) {
      console.error(`❌ ERROR: ${error.message || error}`);
      process.exit(1);
    }
    console.log(`✅ Remote tag ${tagName} already exists and points at HEAD; skipping tag create/push, proceeding to publish.`);
  } else if (dryRun) {
    console.log(`   [DRY RUN] Remote tag ${tagName} not found — would create annotated tag and push to origin.`);
  } else {
    // Tag is absent on the remote — always create a FRESH annotated tag.  Delete
    // any pre-existing local tag of any type first (a no-op when none exists) so
    // we never reuse or push a stale/lightweight tag.
    try {
      execSync(`git tag -d "${tagName}"`, { cwd: ROOT_DIR, stdio: 'inherit' });
    } catch (e) {
      // No local tag to delete — fine.
    }

    console.log(`🏷️  Creating git tag: ${tagName}...`);
    execSync(`git tag -a "${tagName}" -m "Release ${tagName}"`, { cwd: ROOT_DIR, stdio: 'inherit' });

    console.log(`📤 Pushing tag ${tagName}...`);
    execSync(`git push origin "${tagName}"`, { cwd: ROOT_DIR, stdio: 'inherit' });
  }
  
  // Compatibility log for the preflight validation above.
  if (isAlpha) {
    console.log(`\n🔍 Validating alpha branch requirements...`);
    
    // Validation 1: Version must contain 'alpha'
    if (!nextVersion.includes('-alpha.')) {
      console.error(`❌ ERROR: Alpha branch version must contain '-alpha.'`);
      console.error(`   Generated version: ${nextVersion}`);
      console.error(`   Expected format: X.Y.Z-alpha.N`);
      process.exit(1);
    }
    console.log(`✅ Version contains 'alpha' suffix: ${nextVersion}`);
    
    // Validation 2: Must publish with 'alpha' tag
    // (This is enforced in the code below, but we log it for clarity)
    console.log(`✅ Will publish with 'alpha' tag (enforced)`);
    
    if (dryRun) {
      console.log(`✅ Repository state checks are skipped in dry-run mode`);
    } else {
      // NOTE: No "alpha must be caught up with master" gate here — the Less 5
      // alpha is a divergent rewrite that does not carry every v4.x master
      // hotfix. Validation 4 (alpha base >= master version) is the real guard.
      //
      // origin/master is already fetched by verifyAlphaRepositoryState() during
      // preflight (before the tag push), so we do NOT re-fetch here: a transient
      // fetch failure at this point runs AFTER the release tag is pushed and
      // would strand a tagged-but-unpublished release.

      // Validation 4: Alpha base version must be >= master version
      try {
        const masterVersionStr = execSync('git show origin/master:packages/less/package.json', {
          cwd: ROOT_DIR,
          encoding: 'utf8'
        });
        const masterPkg = JSON.parse(masterVersionStr);
        const masterVersion = masterPkg.version;

        // Extract base version from alpha version (remove -alpha.X)
        const alphaBase = nextVersion.replace(/-alpha\.\d+$/, '');

        // Semver comparison using semver library
        const isGreaterOrEqual = semver.gte(alphaBase, masterVersion);

        if (!isGreaterOrEqual) {
          console.error(`❌ ERROR: Alpha base version (${alphaBase}) is lower than master version (${masterVersion})`);
          console.error(`   According to semver, alpha base version must be >= master version`);
          process.exit(1);
        }
        console.log(`✅ Alpha base version (${alphaBase}) is >= master version (${masterVersion})`);
      } catch (e) {
        console.log(`⚠️  Could not compare with master version, continuing...`);
      }
    }
  }
  
  // Determine NPM tag based on branch and version
  const npmTag = isAlpha ? 'alpha' : 'latest';
  const isAlphaVersion = nextVersion.includes('-alpha.');

  // Validation: Alpha versions must use 'alpha' tag, non-alpha versions must use 'latest' tag
  if (isAlphaVersion && npmTag !== 'alpha') {
    console.error(`❌ ERROR: Alpha version (${nextVersion}) must be published with 'alpha' tag, not '${npmTag}'`);
    console.error(`   Alpha versions cannot be published to 'latest' tag`);
    process.exit(1);
  }
  
  if (!isAlphaVersion && npmTag === 'alpha') {
    console.error(`❌ ERROR: Non-alpha version (${nextVersion}) cannot be published with 'alpha' tag`);
    console.error(`   Only versions containing '-alpha.' can be published to 'alpha' tag`);
    process.exit(1);
  }
  
  // Enforce alpha tag for alpha branch
  if (isAlpha && npmTag !== 'alpha') {
    console.error(`❌ ERROR: Alpha branch must publish with 'alpha' tag, not '${npmTag}'`);
    process.exit(1);
  }
  
  console.log(`\n📦 Publishing packages to NPM with tag: ${npmTag}...`);
  
  const publishErrors = [];
  
  for (const pkg of publishable) {
    console.log(`\n📤 Publishing ${pkg.name}...`);
    if (dryRun) {
      console.log(`   [DRY RUN] Would publish: ${pkg.name}@${nextVersion} with tag: ${npmTag}`);
      console.log(`   [DRY RUN] Command: npm publish --tag ${npmTag}`);
    } else if (alreadyPublishedNames.has(pkg.name)) {
      console.log(`⏭️  ${pkg.name}@${nextVersion} is already published; skipping.`);
    } else {
      try {
        // For scoped packages, ensure access is set correctly
        const publishCmd = `npm publish --tag ${npmTag} --access public`;
        execSync(publishCmd, { 
          cwd: pkg.dir, 
          stdio: 'inherit',
          env: { ...process.env, NODE_AUTH_TOKEN: process.env.NPM_TOKEN }
        });
        console.log(`✅ Successfully published ${pkg.name}@${nextVersion}`);
      } catch (e) {
        const errorMsg = e.message || String(e);
        console.error(`❌ Failed to publish ${pkg.name}: ${errorMsg}`);
        publishErrors.push({ name: pkg.name, error: errorMsg });
        // Continue with other packages instead of exiting immediately
      }
    }
  }
  
  // Report any publish errors at the end
  if (publishErrors.length > 0) {
    console.error(`\n❌ Publishing completed with ${publishErrors.length} error(s):`);
    publishErrors.forEach(({ name, error }) => {
      console.error(`   - ${name}: ${error}`);
    });
    console.error(`\n⚠️  Note: Git tag was pushed successfully.`);
    console.error(`   Some packages failed to publish. You may need to publish them manually.`);
    process.exit(1);
  }
  
  if (dryRun) {
    console.log(`\n🧪 DRY RUN COMPLETE - No changes were made`);
    console.log(`   Would publish version: ${nextVersion}`);
    console.log(`   Would create tag: ${tagName}`);
    console.log(`   Would use NPM tag: ${npmTag}`);
  } else {
    console.log(`\n🎉 Successfully published all packages!`);
    console.log(`   Version: ${nextVersion}`);
    console.log(`   Tag: ${tagName}`);
    console.log(`   NPM Tag: ${npmTag}`);
  }
  
  // Output version for GitHub Actions
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${nextVersion}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `tag=${tagName}\n`);
  }
  
  return { version: nextVersion, tag: tagName };
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  determineAlphaVersion,
  getAlreadyPublishedPackages,
  getJessPublishVersion,
  verifyJessRuntimePublishedVersion,
  verifyScriptPluginOptionalPeer,
  verifyReleaseManifestVersions,
  verifyRemoteTagCommit,
  verifyUnpublishedVersion,
  main
};
