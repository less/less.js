/**
 * Version info for Less.js v5 (Jess wrapper).
 * @module less/lib/version
 */

import { createRequire } from 'module';
import parseNodeVersion from 'parse-node-version';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');
const semver = pkg.version || '5.0.0-alpha.0';
const parsed = parseNodeVersion(`v${semver}`);

export const version = {
  semver,
  array: [parsed.major, parsed.minor, parsed.patch],
};

export default version;
