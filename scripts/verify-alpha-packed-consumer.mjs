#!/usr/bin/env node
/**
 * Prove the unpublished Less v5 alpha package works as a real npm consumer.
 *
 * The alpha checkout commits exact published Jess alpha dependencies. This
 * check packs the unpublished Less package, installs it in a clean temporary
 * consumer, and lets npm resolve those committed registry dependencies. Nothing
 * in the Less checkout is rewritten, installed, published, tagged, or committed
 * by this script.
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
const keep = process.argv.includes('--keep');
const lessJessDependencies = [
  '@jesscss/core',
  '@jesscss/plugin-less',
  '@jesscss/plugin-less-compat',
  'jess'
];
const expectedJessVersion = '2.0.0-alpha.9';

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

function packTemporaryLess(packDir) {
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
    const specifier = String(manifest.dependencies?.[name] ?? '');
    assert(specifier === expectedJessVersion,
      `Expected committed Less dependency ${name} to be ${expectedJessVersion}, found ${specifier}`);
  }
  run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', packDir], tempLessDir);
  const tarball = findPackedTarball(packDir, 'less');
  const packed = readPackedManifest(tarball);
  assert(packed.version === manifest.version, `Packed Less version is ${packed.version}, expected ${manifest.version}`);
  for (const name of lessJessDependencies) {
    const specifier = packed.dependencies?.[name];
    assert(specifier === expectedJessVersion,
      `Packed Less dependency ${name} is ${specifier}, expected ${expectedJessVersion}`);
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

function assertConsumerRegistryPackages(consumerDir, forbiddenRoots, packageNames) {
  const normalizedRoots = forbiddenRoots.map(root => realpathSync.native(root));
  const assertOutside = (candidate, description) => {
    const resolved = realpathSync.native(candidate);
    for (const root of normalizedRoots) {
      assert(resolved !== root && !resolved.startsWith(`${root}${path.sep}`),
        `${description} resolves into a workspace: ${resolved}`);
    }
  };
  const modulesDir = path.join(consumerDir, 'node_modules');
  const lock = readJson(path.join(consumerDir, 'package-lock.json'));
  for (const name of packageNames) {
    const installed = path.join(modulesDir, packageDirFor(name));
    assert(existsSync(installed), `consumer install omitted ${name}`);
    assert(!lstatSync(installed).isSymbolicLink(), `consumer installed ${name} as a symlink`);
    assertOutside(installed, `consumer package ${name}`);
    const manifest = readJson(path.join(installed, 'package.json'));
    assert(manifest.version === expectedJessVersion,
      `consumer installed ${name}@${manifest.version ?? '(missing version)'}, expected ${expectedJessVersion}`);
    const entry = lock.packages?.[`node_modules/${name}`];
    assert(entry, `consumer lock omitted ${name}`);
    assert(entry.version === expectedJessVersion,
      `consumer lock installed ${name}@${entry.version ?? '(missing version)'}, expected ${expectedJessVersion}`);
  }
  const jessManifest = readJson(path.join(modulesDir, 'jess', 'package.json'));
  assert(!Object.prototype.hasOwnProperty.call(jessManifest.bin ?? {}, 'lessc'),
    'consumer jess package declares the Less-owned lessc command');
  assert(!existsSync(path.join(modulesDir, 'jess', 'bin', 'lessc.mjs')),
    'consumer jess package contains the removed Less-owned lessc bin');
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
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'less-alpha-packed-consumer-'));
  const packDir = path.join(tempRoot, 'packs');
  const consumerDir = path.join(tempRoot, 'consumer');
  try {
    mkdirSync(packDir, { recursive: true });
    mkdirSync(consumerDir, { recursive: true });
    const less = packTemporaryLess(packDir);
    const dependencies = Object.fromEntries([
      ['less', `file:${path.relative(consumerDir, less.tarball)}`],
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
      [lessRoot],
      ['less'],
      new Map([['less', less.tarball]])
    );
    assertConsumerRegistryPackages(consumerDir, [lessRoot], lessJessDependencies);
    run(process.execPath, [writeConsumerChecks(consumerDir)], consumerDir);
    console.log(`\nPacked Less ${less.version} consumer proof passed with Jess ${expectedJessVersion}.`);
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
