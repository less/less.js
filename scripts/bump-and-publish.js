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

// Increment patch version
function incrementPatch(version) {
  const parsed = parseVersion(version);
  return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
}

// Get current version from main package
function getCurrentVersion() {
  const lessPkgPath = path.join(PACKAGES_DIR, 'less', 'package.json');
  const pkg = readPackage(lessPkgPath);
  return pkg.version;
}

// Check if version was explicitly set (via environment variable or git commit message)
function getExplicitVersion() {
  // Check for explicit version in environment
  if (process.env.EXPLICIT_VERSION) {
    return process.env.EXPLICIT_VERSION;
  }
  
  // Check git commit message for version bump instruction
  try {
    const commitMsg = execSync('git log -1 --pretty=%B', { encoding: 'utf8' });
    const versionMatch = commitMsg.match(/version[:\s]+v?(\d+\.\d+\.\d+(?:-[a-z]+\.\d+)?)/i);
    if (versionMatch) {
      return versionMatch[1];
    }
  } catch (e) {
    // Ignore errors
  }
  
  return null;
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
  let currentVersion = getCurrentVersion();
  console.log(`📦 Current version: ${currentVersion}`);
  
  // Protection: If on alpha branch and version was overwritten by a merge from master
  if (isAlpha && !currentVersion.includes('-alpha.')) {
    console.log(`\n⚠️  WARNING: Alpha branch version (${currentVersion}) doesn't contain '-alpha.'`);
    console.log(`   This likely happened due to merging master into alpha.`);
    console.log(`   Attempting to restore alpha version...`);
    
    // Try to find the last alpha version from alpha branch history
    let restoredVersion = null;
    try {
      // Get recent commits on alpha that modified package.json
      const commits = execSync(
        'git log alpha --oneline -20 -- packages/less/package.json',
        { cwd: ROOT_DIR, encoding: 'utf8' }
      ).trim().split('\n');
      
      // Search through commits to find the last alpha version
      for (const commitLine of commits) {
        const commitHash = commitLine.split(' ')[0];
        try {
          const pkgContent = execSync(
            `git show ${commitHash}:packages/less/package.json 2>/dev/null`,
            { cwd: ROOT_DIR, encoding: 'utf8' }
          );
          const pkg = JSON.parse(pkgContent);
          if (pkg.version && pkg.version.includes('-alpha.')) {
            restoredVersion = pkg.version;
            console.log(`   Found previous alpha version in commit ${commitHash}: ${restoredVersion}`);
            break;
          }
        } catch (e) {
          // Continue to next commit
        }
      }
      
      if (restoredVersion) {
        // Increment the alpha number from the restored version
        const alphaMatch = restoredVersion.match(/^(\d+\.\d+\.\d+)-alpha\.(\d+)$/);
        if (alphaMatch) {
          const alphaNum = parseInt(alphaMatch[2], 10);
          const newAlphaVersion = `${alphaMatch[1]}-alpha.${alphaNum + 1}`;
          console.log(`   Restoring and incrementing to: ${newAlphaVersion}`);
          currentVersion = newAlphaVersion;
          updateAllVersions(newAlphaVersion);
        } else {
          console.log(`   Restoring to: ${restoredVersion}`);
          currentVersion = restoredVersion;
          updateAllVersions(restoredVersion);
        }
      } else {
        // No previous alpha version found, create one from current version
        const parsed = parseVersion(currentVersion);
        const nextMajor = parsed.major + 1;
        const newAlphaVersion = `${nextMajor}.0.0-alpha.1`;
        console.log(`   No previous alpha version found. Creating new: ${newAlphaVersion}`);
        currentVersion = newAlphaVersion;
        updateAllVersions(newAlphaVersion);
      }
    } catch (e) {
      // If we can't find previous version, create a new alpha version
      const parsed = parseVersion(currentVersion);
      const nextMajor = parsed.major + 1;
      const newAlphaVersion = `${nextMajor}.0.0-alpha.1`;
      console.log(`   Could not find previous alpha version. Creating: ${newAlphaVersion}`);
      currentVersion = newAlphaVersion;
      updateAllVersions(newAlphaVersion);
    }
    
    console.log(`✅ Restored/created alpha version: ${currentVersion}\n`);
  }
  
  // Determine next version
  const explicitVersion = getExplicitVersion();
  let nextVersion;
  
  if (explicitVersion) {
    nextVersion = explicitVersion;
    console.log(`✨ Using explicit version: ${nextVersion}`);
  } else if (isAlpha) {
    // For alpha branch, use alpha versions
    const parsed = parseVersion(currentVersion);
    if (parsed.prerelease) {
      // Already an alpha, increment alpha number
      const alphaMatch = currentVersion.match(/^(\d+\.\d+\.\d+)-alpha\.(\d+)$/);
      if (alphaMatch) {
        const alphaNum = parseInt(alphaMatch[2], 10);
        nextVersion = `${alphaMatch[1]}-alpha.${alphaNum + 1}`;
      } else {
        // Other prerelease format, determine base version and start alpha.1
        const baseVersion = `${parsed.major}.${parsed.minor}.${parsed.patch}`;
        nextVersion = `${baseVersion}-alpha.1`;
      }
    } else {
      // Not an alpha version, determine next major and start alpha.1
      const parsed = parseVersion(currentVersion);
      const nextMajor = parsed.major + 1;
      nextVersion = `${nextMajor}.0.0-alpha.1`;
    }
    console.log(`🔢 Auto-incrementing alpha version: ${nextVersion}`);
  } else {
    // For master, increment patch
    nextVersion = incrementPatch(currentVersion);
    console.log(`🔢 Auto-incrementing patch version: ${nextVersion}`);
  }
  
  // Update all package.json files
  console.log(`📝 Updating all package.json files to version ${nextVersion}...`);
  const updated = updateAllVersions(nextVersion);
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
    try {
      execSync(`git commit -m "chore: bump version to ${nextVersion}"`, { 
        cwd: ROOT_DIR, 
        stdio: 'inherit' 
      });
    } catch (e) {
      // Commit might fail if nothing changed, that's okay
      console.log(`⚠️  Commit skipped (no changes or already committed)`);
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
  
  for (const pkg of publishable) {
    console.log(`\n📤 Publishing ${pkg.name}...`);
    if (dryRun) {
      console.log(`   [DRY RUN] Would publish: ${pkg.name}@${nextVersion} with tag: ${npmTag}`);
      console.log(`   [DRY RUN] Command: npm publish --tag ${npmTag}`);
    } else {
      try {
        execSync(`npm publish --tag ${npmTag}`, { 
          cwd: pkg.dir, 
          stdio: 'inherit',
          env: { ...process.env, NODE_AUTH_TOKEN: process.env.NPM_TOKEN }
        });
        console.log(`✅ Successfully published ${pkg.name}@${nextVersion}`);
      } catch (e) {
        console.error(`❌ Failed to publish ${pkg.name}:`, e.message);
        process.exit(1);
      }
    }
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
    const fs = require('fs');
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
