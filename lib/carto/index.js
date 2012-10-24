var util = require('util');
var fs = require('fs');
var path = require('path');

function getVersion() {
    if (parseInt(process.version.split('.')[1]) > 4) {
        return require('../../package.json').version.split('.');
    } else {
        // older node
        var package_json = JSON.parse(fs.readFileSync(path.join(__dirname,'../../package.json')))
        return package_json.version.split('.');
    }
}

var carto = {
    version: getVersion(),
    Parser: require('./parser').Parser,
    Renderer: require('./renderer').Renderer,
    tree: require('./tree'),

    // @TODO
    writeError: function(ctx, options) {
        var message = '';
        var extract = ctx.extract;
        var error = [];

        options = options || {};

        if (options.silent) { return; }

        options.indent = options.indent || '';

        if (!('index' in ctx) || !extract) {
            return util.error(options.indent + (ctx.stack || ctx.message));
        }

        if (typeof(extract[0]) === 'string') {
            error.push(stylize((ctx.line - 1) + ' ' + extract[0], 'grey'));
        }

        if (extract[1] === '' && typeof extract[2] === 'undefined') {
            extract[1] = '¶';
        }
        error.push(ctx.line + ' ' + extract[1].slice(0, ctx.column) +
            stylize(stylize(extract[1][ctx.column], 'bold') +
            extract[1].slice(ctx.column + 1), 'yellow'));

        if (typeof(extract[2]) === 'string') {
            error.push(stylize((ctx.line + 1) + ' ' + extract[2], 'grey'));
        }
        error = options.indent + error.join('\n' + options.indent) + '\033[0m\n';

        message = options.indent + message + stylize(ctx.message, 'red');
        if (ctx.filename) (message += stylize(' in ', 'red') + ctx.filename);

        util.error(message, error);

        if (ctx.callLine) {
            util.error(stylize('from ', 'red') + (ctx.filename || ''));
            util.error(stylize(ctx.callLine, 'grey') + ' ' + ctx.callExtract);
        }
        if (ctx.stack) { util.error(stylize(ctx.stack, 'red')); }
    }
};

[ 'call', 'color', 'comment', 'definition', 'dimension',
  'element', 'expression', 'filterset', 'filter', 'field',
  'keyword', 'layer', 'literal', 'operation', 'quoted', 'imagefilter',
  'reference', 'rule', 'ruleset', 'selector', 'style', 'url', 'value',
  'variable', 'zoom', 'invalid', 'fontset'
].forEach(function(n) {
    require('./tree/' +  n);
});

require('./functions');

for (var k in carto) { exports[k] = carto[k]; }

// Stylize a string
function stylize(str, style) {
    var styles = {
        'bold' : [1, 22],
        'inverse' : [7, 27],
        'underline' : [4, 24],
        'yellow' : [33, 39],
        'green' : [32, 39],
        'red' : [31, 39],
        'grey' : [90, 39]
    };
    return '\033[' + styles[style][0] + 'm' + str +
           '\033[' + styles[style][1] + 'm';
}

