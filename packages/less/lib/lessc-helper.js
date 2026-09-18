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
    console.log('  --collapse-nesting[=MODE]    Flatten nested rules: native (default), or compact.');
    console.log('  -x, --compress               Compress output by removing whitespace.');
    console.log('  --math=MODE                  Math mode: parens-division (default), always, or parens.');
    console.log('  --unit-mode=MODE             Unit handling in math: preserve (default), strict, or loose (Less 4.x guessing).');
    console.log('  --strict-units[=on|off]      Deprecated: on is --unit-mode=strict, off is the default (preserve).');
    console.log('  --source-map[=FILE]          Emit a source map (FILE, or <destination>.map by default).');
    console.log('  --source-map-inline          Embed the source map as a data URI instead of a file.');
    console.log('  --source-map-include-source  Embed the source files in the map (sourcesContent).');
    console.log('  --source-map-rootpath=PATH   Prepend PATH to every source in the map.');
    console.log('  --source-map-basepath=PATH   Strip PATH from the front of every source in the map.');
    console.log('  --source-map-url=URL         Override the sourceMappingURL annotation.');
    console.log('  --rewrite-urls[=all|local|off]  Rewrite url(...) references in imported files.');
    console.log('  --rootpath=PATH              Prepend PATH to url(...) and import references.');
    console.log('  --url-args=ARGS             Append ARGS (e.g. cache-buster) to every url(...).');
    console.log('');
    console.log('This release intentionally supports a smaller CLI surface.');
    console.log('Browser compilation, legacy plugin flags, and lint-only mode are not supported.');
    console.log('');
    console.log('Report bugs to: http://github.com/less/less.js/issues');
    console.log('Home page: <http://lesscss.org/>');
  },
};

export { lesscHelper };
export default lesscHelper;
