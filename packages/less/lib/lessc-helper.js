/**
 * Helper functions for lessc CLI.
 * Adapted from lib.bak/less-node/lessc-helper.js.
 * @module less/lib/lessc-helper
 */

/** @type {Record<string, [number, number]>} */
const STYLES = {
  reset: [0, 0],
  bold: [1, 22],
  inverse: [7, 27],
  underline: [4, 24],
  yellow: [33, 39],
  green: [32, 39],
  red: [31, 39],
  grey: [90, 39],
};

const lesscHelper = {
  /** @param {string} str @param {string} style */
  stylize(str, style) {
    const s = STYLES[style] ?? STYLES.reset;
    return `\x1b[${s[0]}m${str}\x1b[${s[1]}m`;
  },

  printUsage() {
    console.log('usage: lessc [option option=parameter ...] <source> [destination]');
    console.log('');
    console.log('If source is set to `-\' (dash or hyphen-minus), input is read from stdin.');
    console.log('');
    console.log('options:');
    console.log('  -h, --help                   Prints help (this message) and exit.');
    console.log('  --include-path=PATHS         Sets include paths. Separated by `:\'. `;\' also supported on windows.');
    console.log('  -M, --depends                Outputs a makefile import dependency list to stdout.');
    console.log('  --no-color                   Disables colorized output.');
    console.log('  --ie-compat                  Enables IE8 compatibility checks.');
    console.log('  --js                         Enables inline JavaScript in less files');
    console.log('  -l, --lint                   Syntax check only (lint).');
    console.log('  -s, --silent                 Suppresses output of error messages.');
    console.log('  --quiet                      Suppresses output of warnings.');
    console.log('  -v, --version                Prints version number and exit.');
    console.log('  --verbose                    Be verbose.');
    console.log('  --source-map[=FILENAME]      Outputs a v3 sourcemap to the filename (or output filename.map).');
    console.log('  --source-map-rootpath=X      Adds this path onto the sourcemap filename and less file paths.');
    console.log('  --source-map-basepath=X      Sets sourcemap base path, defaults to current working directory.');
    console.log('  --source-map-include-source  Puts the less files into the map instead of referencing them.');
    console.log('  --source-map-inline          Puts the map (and any less files) as a base64 data uri into the output css file.');
    console.log('  -rp, --rootpath=URL          Sets rootpath for url rewriting in relative imports and urls');
    console.log('  -ru=, --rewrite-urls=        Rewrites URLs to make them relative to the base less file.');
    console.log('    all|local|off              \'all\' rewrites all URLs, \'local\' just those starting with a \'.\'');
    console.log('');
    console.log('  -m=, --math=');
    console.log('     always                    Less will eagerly perform math operations always.');
    console.log('     parens-division           Math performed except for division (/) operator');
    console.log('     parens | strict           Math only performed inside parentheses');
    console.log('');
    console.log('  --global-var=\'VAR=VALUE\'     Defines a variable that can be referenced by the file.');
    console.log('  --modify-var=\'VAR=VALUE\'     Modifies a variable already declared in the file.');
    console.log('  --plugin=PLUGIN=OPTIONS      Loads a plugin.');
    console.log('');
    console.log('Report bugs to: http://github.com/less/less.js/issues');
    console.log('Home page: <http://lesscss.org/>');
  },
};

export { lesscHelper };
export default lesscHelper;
