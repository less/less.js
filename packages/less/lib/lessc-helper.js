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
    console.log('  -I PATH, -IPATH              Adds an import search path.');
    console.log('  --include-path=PATHS         Sets include paths. Separated by `:\'. `;\' also supported on windows.');
    console.log('  --no-color                   Disables colorized output.');
    console.log('  -s, --silent                 Suppresses output of error messages.');
    console.log('  --quiet                      Suppresses output of warnings.');
    console.log('  -v, --version                Prints version number and exit.');
    console.log('  --verbose                    Be verbose.');
    console.log('  --collapse-nesting           Flatten nested rules after preserving source-order cascade.');
    console.log('');
    console.log('Less 5 alpha.1 intentionally supports a smaller CLI surface than Less 4.');
    console.log('Source maps, browser compilation, legacy plugin flags, lint-only mode, and');
    console.log('URL rewrite flags will be revisited in later alphas.');
    console.log('');
    console.log('Report bugs to: http://github.com/less/less.js/issues');
    console.log('Home page: <http://lesscss.org/>');
  },
};

export { lesscHelper };
export default lesscHelper;
