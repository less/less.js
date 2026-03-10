/** @typedef {import('fs')} FS */
import nodeFs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

/** @type {FS} */
let fs;
try {
    fs = require('graceful-fs');
} catch (e) {
    fs = nodeFs;
}
export default fs;
