#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const semver = require('semver');

const ROOT_DIR = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');
const RELEASE_TITLE_PREFIX = 'chore: release v';
const LEGACY_ALPHA_RELEASE_TITLE_PREFIX = 'chore: alpha release v';

function isAlphaBase(base) {
  return base === 'alpha';
}

function releaseTitle(base, version) {
  validateVersionForBase(base, version);
  return `${RELEASE_TITLE_PREFIX}${version}`;
}

function releaseBranch(base, version) {
  validateVersionForBase(base, version);
  return isAlphaBase(base) ? `chore/alpha-release-v${version}` : `chore/release-v${version}`;
}

function releaseBody() {
  return 'Merging this PR publishes the version named in the PR title.';
}

function parseReleaseTitle(base, title) {
  if (typeof title !== 'string') {
    throw new Error('Release title must be a string');
  }

  let version = null;
  if (title.startsWith(RELEASE_TITLE_PREFIX)) {
    version = title.slice(RELEASE_TITLE_PREFIX.length).trim();
  } else if (isAlphaBase(base) && title.startsWith(LEGACY_ALPHA_RELEASE_TITLE_PREFIX)) {
    version = title.slice(LEGACY_ALPHA_RELEASE_TITLE_PREFIX.length).trim();
  }

  if (!version) {
    throw new Error(
      isAlphaBase(base)
        ? `Release title must start with "${RELEASE_TITLE_PREFIX}" or "${LEGACY_ALPHA_RELEASE_TITLE_PREFIX}"`
        : `Release title must start with "${RELEASE_TITLE_PREFIX}"`,
    );
  }

  validateVersionForBase(base, version);
  return version;
}

function validateVersionForBase(base, version) {
  const normalized = semver.valid(version);
  if (!normalized || normalized !== version) {
    throw new Error(`Invalid semver version: ${version}`);
  }

  const parsed = semver.parse(version);
  const prerelease = parsed.prerelease;
  if (isAlphaBase(base)) {
    if (
      prerelease.length !== 2 ||
      prerelease[0] !== 'alpha' ||
      typeof prerelease[1] !== 'number'
    ) {
      throw new Error(`Alpha releases must use X.Y.Z-alpha.N, got: ${version}`);
    }
  } else if (base === 'master') {
    if (prerelease.length > 0) {
      throw new Error(`Master releases must not use a prerelease version, got: ${version}`);
    }
  } else {
    throw new Error(`Release base must be "master" or "alpha", got: ${base}`);
  }
}

function validateAgainstNpm(base, version, npmVersion) {
  validateVersionForBase(base, version);
  if (!npmVersion) return;
  if (!semver.valid(npmVersion)) {
    throw new Error(`Invalid npm version: ${npmVersion}`);
  }
  if (!semver.gt(version, npmVersion)) {
    const tag = isAlphaBase(base) ? 'alpha' : 'latest';
    throw new Error(`Release version ${version} must be greater than npm ${tag} version ${npmVersion}`);
  }
}

function validateTitleSync(base, version, previousVersion, npmVersion) {
  validateAgainstNpm(base, version, npmVersion);

  if (!semver.valid(previousVersion)) {
    throw new Error(`Invalid previous package version: ${previousVersion}`);
  }
  if (semver.lt(version, previousVersion)) {
    throw new Error(`Release title version ${version} must not be lower than current branch version ${previousVersion}`);
  }
}

function nextVersion(base, currentVersion, npmVersion) {
  if (!semver.valid(currentVersion)) {
    throw new Error(`Invalid current package version: ${currentVersion}`);
  }

  if (isAlphaBase(base)) {
    const baseVersion = npmVersion && semver.valid(npmVersion) && semver.gt(npmVersion, currentVersion)
      ? npmVersion
      : currentVersion;
    const match = baseVersion.match(/^(\d+\.\d+\.\d+)-alpha\.(\d+)$/);
    if (match) {
      return `${match[1]}-alpha.${parseInt(match[2], 10) + 1}`;
    }
    const parsed = semver.parse(baseVersion);
    return `${parsed.major + 1}.0.0-alpha.1`;
  }

  if (npmVersion && semver.valid(npmVersion) && semver.gt(currentVersion, npmVersion)) {
    return currentVersion;
  }
  return semver.inc(npmVersion || currentVersion, 'patch');
}

function packageFiles() {
  const files = [path.join(ROOT_DIR, 'package.json')];
  const packageDirs = fs.readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => path.join(PACKAGES_DIR, dirent.name, 'package.json'));
  return [...files, ...packageDirs].filter(file => fs.existsSync(file));
}

function syncPackageVersions(version) {
  validateVersionForBase(version.includes('-alpha.') ? 'alpha' : 'master', version);
  for (const file of packageFiles()) {
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!pkg.version) continue;
    pkg.version = version;
    fs.writeFileSync(file, JSON.stringify(pkg, null, '\t') + '\n');
  }
}

function replaceChangelogVersion(content, version, previousVersion) {
  const heading = content.match(/^(### v)(\d+\.\d+\.\d+(?:-alpha\.\d+)?)( \(\d{4}-\d{2}-\d{2}\))$/m);
  if (!heading || heading[2] !== previousVersion) {
    return { changed: false, content };
  }

  return {
    changed: true,
    content: content.slice(0, heading.index) +
      `${heading[1]}${version}${heading[3]}` +
      content.slice(heading.index + heading[0].length),
  };
}

function readChangelogUpdate(version, previousVersion) {
  const changelog = path.join(ROOT_DIR, 'CHANGELOG.md');
  if (!fs.existsSync(changelog)) return { path: changelog, status: 'missing' };

  const original = fs.readFileSync(changelog, 'utf8');
  if (version === previousVersion) {
    return { path: changelog, status: 'unchanged', content: original };
  }

  const { changed, content } = replaceChangelogVersion(original, version, previousVersion);
  if (!changed) {
    throw new Error(`CHANGELOG.md first release heading does not match previous version ${previousVersion}`);
  }

  return { path: changelog, status: 'updated', content };
}

function syncChangelogVersion(version, previousVersion) {
  const update = readChangelogUpdate(version, previousVersion);
  if (update.status !== 'updated') return false;

  fs.writeFileSync(update.path, update.content);
  return true;
}

function syncFiles(version, previousVersion) {
  const changelogUpdate = readChangelogUpdate(version, previousVersion);

  syncPackageVersions(version);
  if (changelogUpdate.status === 'updated') {
    fs.writeFileSync(changelogUpdate.path, changelogUpdate.content);
  }

  return true;
}

function usage() {
  console.error(`Usage:
  node scripts/release-metadata.js title <base> <version>
  node scripts/release-metadata.js branch <base> <version>
  node scripts/release-metadata.js body
  node scripts/release-metadata.js parse-title <base> <title>
  node scripts/release-metadata.js validate <base> <version> [npmVersion]
  node scripts/release-metadata.js validate-title-sync <base> <version> <previousVersion> [npmVersion]
  node scripts/release-metadata.js next-version <base> <currentVersion> [npmVersion]
  node scripts/release-metadata.js sync-package-versions <version>
  node scripts/release-metadata.js sync-files <version> <previousVersion>`);
}

function main(argv = process.argv.slice(2)) {
  const [command, ...args] = argv;
  try {
    if (command === 'title') {
      process.stdout.write(releaseTitle(args[0], args[1]));
    } else if (command === 'branch') {
      process.stdout.write(releaseBranch(args[0], args[1]));
    } else if (command === 'body') {
      process.stdout.write(releaseBody());
    } else if (command === 'parse-title') {
      process.stdout.write(parseReleaseTitle(args[0], args.slice(1).join(' ')));
    } else if (command === 'validate') {
      validateAgainstNpm(args[0], args[1], args[2] || '');
    } else if (command === 'validate-title-sync') {
      validateTitleSync(args[0], args[1], args[2], args[3] || '');
    } else if (command === 'next-version') {
      process.stdout.write(nextVersion(args[0], args[1], args[2] || ''));
    } else if (command === 'sync-package-versions') {
      syncPackageVersions(args[0]);
    } else if (command === 'sync-files') {
      syncFiles(args[0], args[1]);
    } else {
      usage();
      process.exit(1);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  LEGACY_ALPHA_RELEASE_TITLE_PREFIX,
  RELEASE_TITLE_PREFIX,
  nextVersion,
  parseReleaseTitle,
  readChangelogUpdate,
  replaceChangelogVersion,
  releaseBody,
  releaseBranch,
  releaseTitle,
  syncFiles,
  syncChangelogVersion,
  syncPackageVersions,
  validateAgainstNpm,
  validateTitleSync,
  validateVersionForBase,
};
