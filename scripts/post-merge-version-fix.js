#!/usr/bin/env node

/**
 * Post-merge hook to preserve alpha versions when merging master into alpha branch
 * 
 * This script runs after a merge and checks if:
 * 1. We're on the alpha branch
 * 2. The version in package.json doesn't contain '-alpha.' (was overwritten)
 * 3. If so, restores the previous alpha version from git history
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const LESS_PKG_PATH = path.join(ROOT_DIR, 'packages', 'less', 'package.json');

// Get current branch
function getCurrentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { 
      cwd: ROOT_DIR, 
      encoding: 'utf8' 
    }).trim();
  } catch (e) {
    return null;
  }
}

// Read package.json version
function getVersion(pkgPath) {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return pkg.version;
  } catch (e) {
    return null;
  }
}

// Update version in package.json
function updateVersion(pkgPath, newVersion) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, '\t') + '\n', 'utf8');
}

// Find last alpha version from git history
function findLastAlphaVersion() {
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
          return pkg.version;
        }
      } catch (e) {
        // Continue to next commit
      }
    }
  } catch (e) {
    // Ignore errors
  }
  return null;
}

// Update all package.json files with new version
function updateAllVersions(newVersion) {
  const packageFiles = [
    path.join(ROOT_DIR, 'package.json'),
    path.join(ROOT_DIR, 'packages', 'less', 'package.json'),
    path.join(ROOT_DIR, 'packages', 'test-data', 'package.json')
  ];
  
  for (const pkgPath of packageFiles) {
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.version) {
        pkg.version = newVersion;
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, '\t') + '\n', 'utf8');
      }
    }
  }
}

// Main function
function main() {
  const branch = getCurrentBranch();
  
  // Only run on alpha branch
  if (branch !== 'alpha') {
    return;
  }
  
  const currentVersion = getVersion(LESS_PKG_PATH);
  
  if (!currentVersion) {
    return;
  }
  
  // Check if version was overwritten (doesn't contain -alpha.)
  if (!currentVersion.includes('-alpha.')) {
    console.log(`\n⚠️  Post-merge: Alpha version was overwritten (${currentVersion})`);
    console.log(`   Attempting to restore alpha version...`);
    
    const lastAlphaVersion = findLastAlphaVersion();
    
    if (lastAlphaVersion) {
      // Increment the alpha number
      const alphaMatch = lastAlphaVersion.match(/^(\d+\.\d+\.\d+)-alpha\.(\d+)$/);
      if (alphaMatch) {
        const alphaNum = parseInt(alphaMatch[2], 10);
        const newAlphaVersion = `${alphaMatch[1]}-alpha.${alphaNum + 1}`;
        console.log(`   Restoring and incrementing: ${lastAlphaVersion} → ${newAlphaVersion}`);
        updateAllVersions(newAlphaVersion);
        console.log(`✅ Restored alpha version: ${newAlphaVersion}`);
        console.log(`   Please commit this change: git add package.json packages/*/package.json && git commit -m "chore: restore alpha version after merge"`);
      } else {
        console.log(`   Restoring to: ${lastAlphaVersion}`);
        updateAllVersions(lastAlphaVersion);
        console.log(`✅ Restored alpha version: ${lastAlphaVersion}`);
        console.log(`   Please commit this change: git add package.json packages/*/package.json && git commit -m "chore: restore alpha version after merge"`);
      }
    } else {
      // No previous alpha version found, create one
      const parts = currentVersion.split('.');
      const nextMajor = parseInt(parts[0], 10) + 1;
      const newAlphaVersion = `${nextMajor}.0.0-alpha.1`;
      console.log(`   No previous alpha version found. Creating: ${newAlphaVersion}`);
      updateAllVersions(newAlphaVersion);
      console.log(`✅ Created new alpha version: ${newAlphaVersion}`);
      console.log(`   Please commit this change: git add package.json packages/*/package.json && git commit -m "chore: restore alpha version after merge"`);
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
