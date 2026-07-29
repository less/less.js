#!/usr/bin/env node

/**
 * Publish a beta release locally.
 * 1. Fetches latest version from npm
 * 2. Sets version to next patch + beta.0 (e.g. 4.6.2 → 4.6.3-beta.0)
 * 3. Updates all package.json files
 * 4. Builds and runs tests
 * 5. Publishes to npm with --tag beta (use NPM_TAG=xyz to override)
 *
 * Usage: pnpm run publish:beta
 *        pnpm run publish:beta -- --no-test      # skip tests
 *        pnpm run publish:beta -- --dry-run        # no publish
 *        NPM_TAG=next pnpm run publish:beta      # use different tag (default: beta)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const semver = require('semver');

const ROOT_DIR = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');

function getPackageFiles() {
  const packages = [path.join(ROOT_DIR, 'package.json')];
  const dirs = fs.readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => path.join(PACKAGES_DIR, d.name, 'package.json'))
    .filter(p => fs.existsSync(p));
  return [...packages, ...dirs];
}

function getNpmVersion(name) {
  try {
    return execSync(`npm view ${name} version`, { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function updateAllVersions(version) {
  for (const pkgPath of getPackageFiles()) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.version) {
      pkg.version = version;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, '\t') + '\n');
    }
  }
}

function getPublishablePackages() {
  const publishable = [];
  for (const pkgPath of getPackageFiles()) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (!pkg.private && pkg.name && pkg.name !== '@less/root') {
      publishable.push({ name: pkg.name, dir: path.dirname(pkgPath) });
    }
  }
  return publishable;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipTest = args.includes('--no-test');
  const npmTag = process.env.NPM_TAG || 'beta';

  const npmVersion = getNpmVersion('less');
  if (!npmVersion) {
    console.error('Could not fetch latest version from npm');
    process.exit(1);
  }

  const nextPatch = semver.inc(npmVersion, 'patch');
  const betaVersion = `${nextPatch}-beta.0`;

  console.log(`📦 NPM latest: ${npmVersion}`);
  console.log(`🔢 Setting version: ${betaVersion}\n`);

  if (!dryRun) {
    updateAllVersions(betaVersion);
    console.log(`✅ Updated all package.json files\n`);
  } else {
    console.log(`   [DRY RUN] Would update package.json files to ${betaVersion}\n`);
  }

  console.log('🔨 Building...');
  execSync('pnpm run build', { cwd: path.join(PACKAGES_DIR, 'less'), stdio: 'inherit' });
  console.log('');

  if (!skipTest) {
    console.log('🧪 Running tests...');
    execSync('pnpm run test:node', { cwd: ROOT_DIR, stdio: 'inherit' });
    console.log('');
  }

  if (dryRun) {
    console.log(`🧪 DRY RUN - Would publish ${betaVersion} with tag '${npmTag}'`);
    return;
  }

  const publishable = getPublishablePackages();
  console.log(`📤 Publishing to npm with tag '${npmTag}'...\n`);

  for (const pkg of publishable) {
    console.log(`   Publishing ${pkg.name}@${betaVersion}...`);
    execSync(`npm publish --tag ${npmTag} --access public`, {
      cwd: pkg.dir,
      stdio: 'inherit'
    });
  }

  console.log(`\n🎉 Published ${betaVersion} to npm`);
  console.log(`   Install with: npm install less@${npmTag}`);
}

main();
