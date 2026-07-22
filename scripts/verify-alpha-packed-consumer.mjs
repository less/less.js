#!/usr/bin/env node
/**
 * Prove the unpublished Less v5 alpha package works as a real npm consumer.
 *
 * The alpha checkout intentionally uses local Jess `link:` dependencies for
 * development. npm consumers cannot install those paths, so this check copies
 * only the Less package to a temporary directory and rewrites exactly those
 * four direct dependencies to the current local Jess alpha tarballs. Nothing
 * in the Less checkout is rewritten, packed, installed, published, tagged, or
 * committed by this script.
 *
 * Set JESS_ALPHA_ROOT when the local alpha checkout is not adjacent to this
 * repository. The default is ../jess-alpha, next to this Less checkout. A
 * test-only JESS_ALPHA_JESS_TARBALL may replace that closure's `jess` tarball
 * while proving a pending alpha snapshot cut; it must preserve the exact
 * alpha.9 manifest and contain no Less-owned `lessc` bin.
 */
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const lessRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lessPackageDir = path.join(lessRoot, 'packages', 'less');
const jessAlphaRoot = path.resolve(process.env.JESS_ALPHA_ROOT ?? path.join(lessRoot, '..', 'jess-alpha'));
const keep = process.argv.includes('--keep');
const lessJessDependencies = [
  '@jesscss/core',
  '@jesscss/plugin-less',
  '@jesscss/plugin-less-compat',
  'jess'
];

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function run(command, args, cwd, options = {}) {
  const rendered = [command, ...args].join(' ');
  console.log(`\n$ ${rendered}`);
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    ...options
  });
  if (result.error) {
    fail(`${rendered} failed to start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    fail(`${rendered} failed with ${result.status ?? 'unknown exit'}${output ? `:\n${output}` : ''}`);
  }
  return result;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function packageDirFor(name) {
  return name.startsWith('@') ? path.join(...name.split('/')) : name;
}

function readPackedManifest(tarball, { quiet = false } = {}) {
  const result = spawnSync('tar', ['-xOf', tarball, 'package/package.json'], {
    encoding: 'utf8',
    shell: process.platform === 'win32'
  });
  if (result.error || result.status !== 0) {
    if (!quiet) {
      fail(`Unable to read packed manifest ${tarball}: ${result.error?.message ?? result.stderr ?? 'tar failed'}`);
    }
    return null;
  }
  return JSON.parse(result.stdout);
}

function findPackedTarball(packDir, name) {
  for (const file of readdirSync(packDir)) {
    if (!file.endsWith('.tgz')) {
      continue;
    }
    const tarball = path.join(packDir, file);
    if (readPackedManifest(tarball, { quiet: true })?.name === name) {
      return tarball;
    }
  }
  fail(`No packed tarball found for ${name}`);
}

function assertPackedDependencySpecs(manifest) {
  for (const sectionName of ['dependencies', 'optionalDependencies', 'peerDependencies', 'devDependencies']) {
    for (const [name, specifier] of Object.entries(manifest[sectionName] ?? {})) {
      assert(!String(specifier).startsWith('workspace:'),
        `${manifest.name}: packed ${sectionName}.${name} still uses ${specifier}`);
      assert(!String(specifier).startsWith('link:'),
        `${manifest.name}: packed ${sectionName}.${name} still uses ${specifier}`);
    }
  }
}

function assertJessDoesNotOwnLessc(tarball, manifest = readPackedManifest(tarball)) {
  assert(!Object.prototype.hasOwnProperty.call(manifest.bin ?? {}, 'lessc'),
    `Packed Jess manifest still declares the Less-owned lessc command: ${tarball}`);

  // Keep checking for the former file as defense in depth. A package with an
  // unreferenced copy would not create an npm bin collision, but shipping it
  // would still leave the removed command in the Jess release artifact.
  const result = spawnSync('tar', ['-tzf', tarball], {
    encoding: 'utf8',
    shell: process.platform === 'win32'
  });
  assert(!result.error && result.status === 0, `Unable to list packed tarball ${tarball}`);
  assert(!result.stdout.split(/\r?\n/u).includes('package/bin/lessc.mjs'),
    `Packed jess tarball still contains the Less-owned lessc bin: ${tarball}`);
}

function assertJessAlphaSource() {
  assert(existsSync(jessAlphaRoot),
    `Jess alpha checkout is missing: ${jessAlphaRoot} (set JESS_ALPHA_ROOT to its path)`);
  const allowlistPath = path.join(jessAlphaRoot, 'scripts', 'release', 'alpha-allowlist.json');
  assert(existsSync(allowlistPath), `Jess alpha allowlist is missing: ${allowlistPath}`);
  const names = readJson(allowlistPath);
  assert(Array.isArray(names) && names.length > 0, 'Jess alpha allowlist is empty');
  const packagesDir = path.join(jessAlphaRoot, 'packages');
  const manifestsByName = new Map();
  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const packagePath = path.join(packagesDir, entry.name, 'package.json');
    if (!existsSync(packagePath)) {
      continue;
    }
    const manifest = readJson(packagePath);
    if (manifest.name) {
      manifestsByName.set(manifest.name, { packagePath, dir: path.dirname(packagePath), manifest });
    }
  }
  const manifests = names.map((name) => {
    const entry = manifestsByName.get(name);
    assert(entry, `Jess alpha allowlist package is missing: ${name}`);
    return { name, ...entry };
  });
  const versions = new Set(manifests.map(({ manifest }) => manifest.version));
  assert(versions.size === 1, `Jess alpha closure is not lockstep: ${[...versions].join(', ')}`);
  const version = [...versions][0];
  assert(version === '2.0.0-alpha.9', `Expected local Jess alpha.9 closure, found ${version}`);
  return { names, manifests, version };
}

function packJessClosure(closure, packDir) {
  const tarballs = new Map();
  const candidateJessTarball = process.env.JESS_ALPHA_JESS_TARBALL
    ? path.resolve(process.env.JESS_ALPHA_JESS_TARBALL)
    : null;
  if (candidateJessTarball) {
    assert(existsSync(candidateJessTarball), `Candidate Jess tarball is missing: ${candidateJessTarball}`);
  }
  for (const pkg of closure.manifests) {
    if (pkg.name === 'jess' && candidateJessTarball) {
      const manifest = readPackedManifest(candidateJessTarball);
      assert(manifest.name === 'jess', `Candidate tarball is ${manifest.name ?? '(unnamed)'}, expected jess`);
      assert(manifest.version === closure.version,
        `Candidate Jess tarball is ${manifest.version ?? '(missing version)'}, expected ${closure.version}`);
      assertPackedDependencySpecs(manifest);
      assertJessDoesNotOwnLessc(candidateJessTarball, manifest);
      tarballs.set(pkg.name, candidateJessTarball);
      continue;
    }
    run('pnpm', ['pack', '--pack-destination', packDir], pkg.dir);
    const tarball = findPackedTarball(packDir, pkg.name);
    const manifest = readPackedManifest(tarball);
    assert(manifest.version === closure.version,
      `${pkg.name}: packed ${manifest.version ?? '(missing version)'}, expected ${closure.version}`);
    assertPackedDependencySpecs(manifest);
    if (pkg.name === 'jess') {
      assertJessDoesNotOwnLessc(tarball, manifest);
    }
    tarballs.set(pkg.name, tarball);
  }
  return tarballs;
}

function packTemporaryLess(packDir, jessTarballs) {
  const tempLessDir = path.join(path.dirname(packDir), 'less');
  cpSync(lessPackageDir, tempLessDir, {
    recursive: true,
    filter(source) {
      const relative = path.relative(lessPackageDir, source);
      return !relative.startsWith('node_modules') && !relative.startsWith('.git');
    }
  });
  const packagePath = path.join(tempLessDir, 'package.json');
  const manifest = readJson(packagePath);
  assert(manifest.name === 'less', `Expected Less package manifest, got ${manifest.name ?? '(unnamed)'}`);
  assert(manifest.version === '5.0.0-alpha.1',
    `Expected Less 5.0.0-alpha.1 manifest, found ${manifest.version}`);
  for (const name of lessJessDependencies) {
    assert(String(manifest.dependencies?.[name] ?? '').startsWith('link:'),
      `Expected local alpha manifest dependency ${name} to be a link: specifier`);
    const tarball = jessTarballs.get(name);
    assert(tarball, `Jess alpha closure omitted direct Less dependency ${name}`);
    manifest.dependencies[name] = `file:${tarball}`;
  }
  writeJson(packagePath, manifest);
  run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', packDir], tempLessDir);
  const tarball = findPackedTarball(packDir, 'less');
  const packed = readPackedManifest(tarball);
  assert(packed.version === manifest.version, `Packed Less version is ${packed.version}, expected ${manifest.version}`);
  for (const name of lessJessDependencies) {
    const specifier = packed.dependencies?.[name];
    assert(String(specifier).startsWith('file:'),
      `Packed Less dependency ${name} is not a temporary tarball file specifier: ${specifier}`);
  }
  return { tarball, version: manifest.version };
}

function assertConsumerDoesNotResolveInto(consumerDir, forbiddenRoots, packageNames, tarballs) {
  const normalizedRoots = forbiddenRoots.map(root => realpathSync.native(root));
  const assertOutside = (candidate, description) => {
    const resolved = realpathSync.native(candidate);
    for (const root of normalizedRoots) {
      assert(resolved !== root && !resolved.startsWith(`${root}${path.sep}`),
        `${description} resolves into a workspace: ${resolved}`);
    }
  };
  const modulesDir = path.join(consumerDir, 'node_modules');
  for (const name of packageNames) {
    const installed = path.join(modulesDir, packageDirFor(name));
    assert(existsSync(installed), `consumer install omitted ${name}`);
    assert(!lstatSync(installed).isSymbolicLink(), `consumer installed ${name} as a symlink`);
    assertOutside(installed, `consumer package ${name}`);
  }
  const lock = readJson(path.join(consumerDir, 'package-lock.json'));
  for (const name of packageNames) {
    const entry = lock.packages?.[`node_modules/${name}`];
    assert(entry, `consumer lock omitted ${name}`);
    const expected = `file:${path.relative(consumerDir, tarballs.get(name))}`;
    assert(entry.resolved === expected,
      `consumer did not install ${name} from its expected packed tarball: ${entry.resolved ?? '(missing resolved)'}`);
  }
  const pending = [modulesDir];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const candidate = path.join(current, entry.name);
      if (entry.isSymbolicLink()) {
        assertOutside(candidate, `consumer symlink ${candidate}`);
      } else if (entry.isDirectory()) {
        pending.push(candidate);
      }
    }
  }
}

function writeConsumerChecks(consumerDir) {
  const checkPath = path.join(consumerDir, 'verify-lessc.mjs');
  writeFileSync(checkPath, `
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const consumer = process.cwd();
const lessc = path.join(consumer, 'node_modules', '.bin', process.platform === 'win32' ? 'lessc.cmd' : 'lessc');
const lessPackageCli = path.join(consumer, 'node_modules', 'less', 'bin', 'lessc');
const fixture = path.join(consumer, 'fixtures');
mkdirSync(fixture, { recursive: true });
assert.ok(existsSync(lessc), 'packed install did not expose lessc');
if (process.platform === 'win32') {
  const shim = readFileSync(lessc, 'utf8').replaceAll('/', '\\\\');
  assert.match(
    shim,
    /\\\\less\\\\bin\\\\lessc/u,
    'packed consumer lessc resolves to another package; the Less tarball must own its public CLI'
  );
} else {
  assert.equal(
    realpathSync(lessc),
    realpathSync(lessPackageCli),
    'packed consumer lessc resolves to another package; the Less tarball must own its public CLI'
  );
}
function run(args, options = {}) {
  const result = spawnSync(lessc, args, { cwd: fixture, encoding: 'utf8', ...options });
  if (result.error) throw result.error;
  return result;
}

const version = run(['--version']);
assert.equal(version.status, 0, version.stderr);
assert.match(version.stdout, /^lessc 5\\.0\\.0-alpha\\.1 \\(Less Compiler\\) \\[Jess\\]\\n$/u);

const stdin = run(['-'], { input: '.stdin { color: red; }\\n' });
assert.equal(stdin.status, 0, stdin.stderr);
assert.match(stdin.stdout, /\\.stdin[\\s\\S]*color: red;/u);

writeFileSync(path.join(fixture, 'dep.less'), '.dep { color: blue; }\\n');
writeFileSync(path.join(fixture, 'entry.less'), '@import "./dep.less";\\n.entry { color: red; }\\n');
const output = path.join(fixture, 'entry.css');
const file = run(['entry.less', output]);
assert.equal(file.status, 0, file.stderr);
const css = readFileSync(output, 'utf8');
assert.match(css, /\\.dep[\\s\\S]*color: blue;/u);
assert.match(css, /\\.entry[\\s\\S]*color: red;/u);

writeFileSync(path.join(fixture, 'bad.less'), '.broken { color: }\\n.next {\\n');
const malformed = run(['bad.less']);
assert.notEqual(malformed.status, 0, 'lessc accepted malformed input');
assert.ok(malformed.stderr.trim().length > 0, 'lessc emitted no malformed-input diagnostic');
console.log('packed lessc stdin, file/import, and malformed-input paths passed');
`.trimStart());
  return checkPath;
}

function main() {
  const closure = assertJessAlphaSource();
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'less-alpha-packed-consumer-'));
  const packDir = path.join(tempRoot, 'packs');
  const consumerDir = path.join(tempRoot, 'consumer');
  try {
    mkdirSync(packDir, { recursive: true });
    mkdirSync(consumerDir, { recursive: true });
    const jessTarballs = packJessClosure(closure, packDir);
    const less = packTemporaryLess(packDir, jessTarballs);
    const dependencies = Object.fromEntries([
      ['less', `file:${path.relative(consumerDir, less.tarball)}`],
      ...closure.names.map(name => [name, `file:${path.relative(consumerDir, jessTarballs.get(name))}`])
    ]);
    writeJson(path.join(consumerDir, 'package.json'), {
      name: 'less-alpha-packed-consumer-proof',
      private: true,
      type: 'module',
      version: '0.0.0',
      dependencies
    });
    run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--omit=dev'], consumerDir);
    assertConsumerDoesNotResolveInto(
      consumerDir,
      [lessRoot, jessAlphaRoot],
      ['less', ...closure.names],
      new Map([['less', less.tarball], ...jessTarballs])
    );
    run(process.execPath, [writeConsumerChecks(consumerDir)], consumerDir);
    console.log(`\nPacked Less ${less.version} consumer proof passed with Jess ${closure.version}.`);
  } finally {
    if (keep) {
      console.log(`Kept packed consumer fixture: ${tempRoot}`);
    } else {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  }
}

try {
  main();
} catch (error) {
  console.error(`\nPacked Less alpha consumer proof failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
