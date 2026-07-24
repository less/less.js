import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  determineAlphaVersion,
  getJessPublishVersion,
  verifyJessPublishedVersion,
  verifyReleaseManifestVersions,
  verifyUnpublishedVersion,
} = require('./bump-and-publish.js');

test('preserves an explicitly configured first Less v5 alpha when unpublished', () => {
  assert.equal(
    determineAlphaVersion('5.0.0-alpha.1', null),
    '5.0.0-alpha.1',
  );
});

test('does not silently increment a committed alpha manifest', () => {
  assert.equal(
    determineAlphaVersion('5.0.0-alpha.1', '5.0.0-alpha.1'),
    '5.0.0-alpha.1',
  );
});

test('rejects an environment version that does not match the committed alpha', () => {
  assert.throws(
    () => determineAlphaVersion('5.0.0-alpha.1', null, '5.0.0-alpha.2'),
    /must match the committed alpha manifest/u,
  );
});

test('requires an exact Jess alpha for a Less alpha publish', () => {
  assert.equal(getJessPublishVersion(), '2.0.0-alpha.9');
});

test('requires Jess to be published before a non-dry Less alpha publish', () => {
  assert.equal(
    verifyJessPublishedVersion('2.0.0-alpha.9', (_name, version) => version),
    '2.0.0-alpha.9',
  );
  assert.throws(
    () => verifyJessPublishedVersion('2.0.0-alpha.9', () => null),
    /must be published before a Less alpha publish/u,
  );
});

test('requires every public release manifest to use the committed alpha version', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'less-release-manifests-'));
  const matching = path.join(dir, 'matching.json');
  const stale = path.join(dir, 'stale.json');
  fs.writeFileSync(matching, '{"version":"5.0.0-alpha.1"}\n');
  fs.writeFileSync(stale, '{"version":"5.0.0-alpha.2"}\n');

  assert.doesNotThrow(() => verifyReleaseManifestVersions('5.0.0-alpha.1', [matching]));
  assert.throws(
    () => verifyReleaseManifestVersions('5.0.0-alpha.1', [matching, stale]),
    /stale\.json has version 5\.0\.0-alpha\.2/u,
  );
});

test('rejects an already-published Less alpha before release mutations', () => {
  assert.doesNotThrow(() => verifyUnpublishedVersion('less', '5.0.0-alpha.1', () => null));
  assert.throws(
    () => verifyUnpublishedVersion('less', '5.0.0-alpha.1', () => '5.0.0-alpha.1'),
    /already published/u,
  );
});
