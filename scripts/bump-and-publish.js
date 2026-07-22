#!/usr/bin/env node

/**
 * Version bumping and publishing script for Less.js monorepo
 * 
 * This script:
 * 1. Determines the next version (patch increment or explicit)
 * 2. Updates all package.json files to the same version
 * 3. Creates a git tag
 * 4. Commits version changes
 * 5. Publishes all packages to NPM
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const semver = require('semver');

const ROOT_DIR = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');
const JESS_RUNTIME_DEPENDENCIES = [
  '@jesscss/core',
  '@jesscss/plugin-less',
  '@jesscss/plugin-less-compat',
  'jess'
];

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

/**
 * Resolve the Jess alpha version that the published Less package must use.
 * Local alpha development intentionally keeps `link:` dependencies, but npm
 * rejects those specifiers in a clean consumer. The Jess alpha must therefore
 * be published first, and the release command must be given that exact version
 * explicitly instead of silently selecting a stale registry tag.
 */
function getJessPublishVersion(value = process.env.JESS_VERSION) {
  if (!value) {
    throw new Error(
      'JESS_VERSION is required for a Less alpha publish; publish Jess first and set it to the exact Jess alpha (for example 2.0.0-alpha.9).'
    );
  }
  if (!semver.valid(value) || !value.includes('-alpha.')) {
    throw new Error(`JESS_VERSION must be a valid Jess alpha version, received: ${value}`);
  }
  return value;
}

/**
 * A non-dry alpha publish must name a Jess alpha that is already on npm. Keep
 * this guard ahead of all release mutations: failing it must not create a Less
 * commit, tag, or push.
 */
function verifyJessPublishedVersion(version, lookup = getExactNpmVersion) {
  if (lookup('jess', version) !== version) {
    throw new Error(`Jess ${version} must be published before a Less alpha publish`);
  }
  return version;
}

/**
 * Temporarily normalize Jess runtime dependencies in less/package.json to the
 * already-published Jess alpha version (local `link:` specs and stale registry
 * versions alike). The original manifest bytes are restored after npm publish
 * (including failures), so local alpha development continues to use the
 * workspace-linked Jess build.
 */
function rewriteJessRuntimeDependencies(packagePath, jessVersion) {
  const raw = fs.readFileSync(packagePath, 'utf8');
  const pkg = JSON.parse(raw);
  if (pkg.name !== 'less') {
    return () => {};
  }
  const dependencies = pkg.dependencies || {};
  const missing = JESS_RUNTIME_DEPENDENCIES.filter(name => !(name in dependencies));
  if (missing.length > 0) {
    throw new Error(`less package is missing Jess runtime dependencies: ${missing.join(', ')}`);
  }
  const needsRewrite = JESS_RUNTIME_DEPENDENCIES.filter(name => dependencies[name] !== jessVersion);
  if (needsRewrite.length === 0) {
    return () => {};
  }
  for (const name of needsRewrite) {
    dependencies[name] = jessVersion;
  }
  writePackage(packagePath, pkg);
  return () => fs.writeFileSync(packagePath, raw, 'utf8');
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

  const missingMasterCommits = Number(execSync('git rev-list --count HEAD..origin/master', {
    cwd: ROOT_DIR,
    encoding: 'utf8'
  }).trim());
  if (missingMasterCommits > 0) {
    throw new Error(`Alpha branch is behind origin/master by ${missingMasterCommits} commit(s)`);
  }

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
  let currentVersion = getCurrentVersion();
  console.log(`📦 Current version: ${currentVersion}`);
  
  // An alpha release is always prepared and committed before publication. Do
  // not "repair" a merge by changing manifests from the publish command.
  if (isAlpha && !currentVersion.includes('-alpha.')) {
    console.error(
      `❌ ERROR: Alpha manifest version (${currentVersion}) is not a prerelease; prepare and commit an X.Y.Z-alpha.N version before publishing`
    );
    process.exit(1);
  }
  
  // Determine next version
  let nextVersion;

  if (isAlpha) {
    // The committed alpha manifest is authoritative. A publish command must
    // never silently invent the next alpha number or rewrite a merged branch.
    try {
      const explicitVersion = process.env.EXPLICIT_VERSION;
      nextVersion = determineAlphaVersion(currentVersion, null, explicitVersion);
      console.log(`📦 Using committed alpha version: ${nextVersion}`);
    } catch (error) {
      console.error(`❌ ERROR: ${error.message || error}`);
      process.exit(1);
    }
  } else {
    // For master: compare package.json vs NPM, bump accordingly
    const npmVersion = getNpmVersion('less');
    console.log(`📦 NPM version: ${npmVersion || '(not published)'}`);
    nextVersion = getTargetVersion(currentVersion, npmVersion);
  }

  // A release must fail before it stages, commits, tags, or pushes if its
  // required Jess alpha is absent. Dry runs deliberately exercise the release
  // shape before Jess is published and therefore skip only the registry lookup.
  let jessPublishVersion;
  if (isAlpha) {
    try {
      jessPublishVersion = getJessPublishVersion();
      if (!dryRun) {
        verifyJessPublishedVersion(jessPublishVersion);
      }
    } catch (error) {
      console.error(`❌ ERROR: ${error.message || error}`);
      process.exit(1);
    }
    console.log(`✅ Less package will publish against Jess ${jessPublishVersion}`);
  }

  // These are real release guards, not post-release diagnostics. A real
  // release must fail before it mutates manifests, commits, tags, pushes, or
  // talks to npm. Dry-run is intentionally only a plan: it can run before the
  // prerequisite Jess alpha is published, but cannot claim release readiness.
  try {
    if (isAlpha) {
      verifyWorkspacePackageJson();
      verifyReleaseManifestVersions(nextVersion);
      if (!dryRun) {
        verifyCleanWorktree();
        verifyAlphaRepositoryState(nextVersion);
        for (const pkg of getPublishablePackages()) {
          verifyUnpublishedVersion(pkg.name, nextVersion);
        }
      }
    }
  } catch (error) {
    console.error(`❌ ERROR: ${error.message || error}`);
    process.exit(1);
  }
  
  // Update all package.json files
  console.log(`📝 Updating all package.json files to version ${nextVersion}...`);
  const updated = dryRun || currentVersion === nextVersion ? [] : updateAllVersions(nextVersion);
  console.log(`✅ Updated ${updated.length} package.json files`);
  
  // Get publishable packages
  const publishable = getPublishablePackages();
  console.log(`📦 Found ${publishable.length} publishable packages:`);
  publishable.forEach(pkg => console.log(`   - ${pkg.name}`));
  
  // Stage changes
  console.log(`📌 Staging version changes...`);
  if (!dryRun) {
    execSync('git add package.json packages/*/package.json', { cwd: ROOT_DIR, stdio: 'inherit' });
  } else {
    console.log(`   [DRY RUN] Would stage: package.json packages/*/package.json`);
  }
  
  // Commit
  console.log(`💾 Committing version bump...`);
  if (!dryRun) {
    if (hasStagedChanges()) {
      execSync(`git commit -m "chore: bump version to ${nextVersion}"`, { 
        cwd: ROOT_DIR, 
        stdio: 'inherit' 
      });
    } else {
      console.log(`   No version changes to commit`);
    }
  } else {
    console.log(`   [DRY RUN] Would commit: "chore: bump version to ${nextVersion}"`);
  }
  
  // Create tag
  const tagName = `v${nextVersion}`;
  console.log(`🏷️  Creating git tag: ${tagName}...`);
  if (!dryRun) {
    try {
      execSync(`git tag -a "${tagName}" -m "Release ${tagName}"`, { 
        cwd: ROOT_DIR, 
        stdio: 'inherit' 
      });
    } catch (e) {
      console.log(`⚠️  Tag might already exist, continuing...`);
    }
  } else {
    console.log(`   [DRY RUN] Would create tag: ${tagName}`);
  }
  
  // Push commit and tag
  console.log(`📤 Pushing to ${branch}...`);
  if (!dryRun) {
    try {
      execSync(`git push origin ${branch}`, { cwd: ROOT_DIR, stdio: 'inherit' });
      execSync(`git push origin "${tagName}"`, { cwd: ROOT_DIR, stdio: 'inherit' });
    } catch (e) {
      console.log(`⚠️  Push failed, but continuing with publish...`);
    }
  } else {
    console.log(`   [DRY RUN] Would push to: origin ${branch}`);
    console.log(`   [DRY RUN] Would push tag: origin ${tagName}`);
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
    
    // Validation 3: Check if alpha is behind master
    try {
      execSync('git fetch origin master', { cwd: ROOT_DIR, stdio: 'ignore' });
      const masterCommits = execSync('git rev-list --count alpha..origin/master', {
        cwd: ROOT_DIR, 
        encoding: 'utf8' 
      }).trim();
      
      if (parseInt(masterCommits, 10) > 0) {
        console.error(`❌ ERROR: Alpha branch is behind master by ${masterCommits} commit(s)`);
        console.error(`   Alpha branch must include all commits from master before publishing`);
        console.error(`   Please merge master into alpha first`);
        process.exit(1);
      }
      console.log(`✅ Alpha branch is up to date with master`);
    } catch (e) {
      console.log(`⚠️  Could not verify master sync status, continuing...`);
    }
    
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
    } else {
      let restoreJessDependencies = () => {};
      try {
        if (isAlpha) {
          restoreJessDependencies = rewriteJessRuntimeDependencies(pkg.path, jessPublishVersion);
        }
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
      } finally {
        restoreJessDependencies();
      }
    }
  }
  
  // Report any publish errors at the end
  if (publishErrors.length > 0) {
    console.error(`\n❌ Publishing completed with ${publishErrors.length} error(s):`);
    publishErrors.forEach(({ name, error }) => {
      console.error(`   - ${name}: ${error}`);
    });
    console.error(`\n⚠️  Note: Version bump and commit were successful.`);
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
  getJessPublishVersion,
  verifyJessPublishedVersion,
  verifyReleaseManifestVersions,
  verifyUnpublishedVersion,
  rewriteJessRuntimeDependencies,
  main
};
