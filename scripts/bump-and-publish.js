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

// Get the current alpha dist-tag version from NPM
function getNpmAlphaVersion(packageName) {
  try {
    const result = execSync(`npm view ${packageName} dist-tags.alpha`, { encoding: 'utf8' }).trim();
    return result || null;
  } catch (e) {
    return null;
  }
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
  const packageFiles = getPackageFiles();
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

  if (isAlpha) {
    // Validate that the version carries the expected '-alpha.' prerelease tag.
    if (!currentVersion.includes('-alpha.')) {
      console.error(`❌ ERROR: Alpha branch package.json version (${currentVersion}) must contain '-alpha.'`);
      console.error(`   The alpha release PR should have bumped to an X.Y.Z-alpha.N version.`);
      process.exit(1);
    }

    const npmAlphaVersion = getNpmAlphaVersion('less');
    console.log(`📦 NPM alpha version: ${npmAlphaVersion || '(not published)'}`);
    if (npmAlphaVersion && semver.valid(currentVersion) && !semver.gt(currentVersion, npmAlphaVersion)) {
      console.error(`❌ ERROR: package.json version (${currentVersion}) must be greater than NPM alpha version (${npmAlphaVersion})`);
      console.error(`   On alpha the version bump should have arrived via the alpha release PR.`);
      process.exit(1);
    }
    nextVersion = currentVersion;
    console.log(`📦 Using package.json version (no auto-increment on alpha): ${nextVersion}`);
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

  // Get publishable packages
  const publishable = getPublishablePackages();
  console.log(`📦 Found ${publishable.length} publishable packages:`);
  publishable.forEach(pkg => console.log(`   - ${pkg.name}`));

  // Both master and alpha: the version-bump commit already lives on the branch
  // (it came from the release PR).  Do NOT create another local commit or push
  // to the branch — doing so would produce a tag pointing at a commit that is
  // not on the target branch.
  //
  // Only the annotated tag is pushed.  Tag pushes bypass branch-protection
  // "require pull request" rules.
  
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
  
  // For master the version-bump commit already lives in master (it came from
  // the release PR).  Only push the git tag — tag pushes bypass branch
  // protection "require pull request" rules.
  // Alpha follows the same pattern: the version bump arrived via the alpha
  // release PR, so we only push the tag here too.  console.log(`📤 Pushing tag ${tagName}...`);
  if (!dryRun) {
    execSync(`git push origin "${tagName}"`, { cwd: ROOT_DIR, stdio: 'inherit' });
  } else {
    console.log(`   [DRY RUN] Would push tag: origin ${tagName}`);
  }
  
  // Validate alpha branch requirements
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
      execSync('git fetch origin master:master 2>/dev/null || true', { cwd: ROOT_DIR });
      const masterCommits = execSync('git rev-list --count alpha..master 2>/dev/null || echo "0"', { 
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
      const masterVersionStr = execSync('git show master:packages/less/package.json 2>/dev/null', { 
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

module.exports = { main };
