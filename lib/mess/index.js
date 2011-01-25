var path = require('path'),
    sys = require('sys'),
    fs = require('fs');

require.paths.unshift(path.join(__dirname, '..'));

var mess = {
    version: [1, 0, 40],
    Parser: require('mess/parser').Parser,
    Renderer: require('mess/renderer').Renderer,
    External: require('mess/external'),
    importer: require('mess/parser').importer,
    tree: require('mess/tree'),
    writeError: function(ctx, options) {
        var message = '';
        var extract = ctx.extract;
        var error = [];

        options = options || {};

        if (options.silent) { return }

        options.indent = options.indent || '';

        if (!('index' in ctx) || !extract) {
            return sys.error(options.indent + (ctx.stack || ctx.message));
        }

        if (typeof(extract[0]) === 'string') {
            error.push(stylize((ctx.line - 1) + ' ' + extract[0], 'grey'));
        }

        if (extract[1] === '' && typeof extract[2] === 'undefined') {
            extract[1] = '¶';
        }
        error.push(ctx.line + ' ' + extract[1].slice(0, ctx.column)
                            + stylize(stylize(extract[1][ctx.column], 'bold')
                            + extract[1].slice(ctx.column + 1), 'yellow'));

        if (typeof(extract[2]) === 'string') {
            error.push(stylize((ctx.line + 1) + ' ' + extract[2], 'grey'));
        }
        error = options.indent + error.join('\n' + options.indent) + '\033[0m\n';

        message = options.indent + message + stylize(ctx.message, 'red');
        ctx.filename && (message += stylize(' in ', 'red') + ctx.filename);

        sys.error(message, error);

        if (ctx.callLine) {
            sys.error(stylize('from ', 'red') + (ctx.filename || ''));
            sys.error(stylize(ctx.callLine, 'grey') + ' ' + ctx.callExtract);
        }
        if (ctx.stack) { sys.error(stylize(ctx.stack, 'red')) }
    }
};

[ 'alpha', 'anonymous', 'call', 'color', 'comment', 'comparison',
  'definition', 'dimension', 'directive', 'element', 'expression', 'filter',
  'import', 'javascript', 'keyword', 'layer', 'mixin', 'operation', 'quoted',
  'reference', 'rule', 'ruleset', 'selector', 'style', 'url', 'value',
  'variable', 'zoomfilter', 'invalid', 'fontset'
].forEach(function(n) {
    require(path.join('mess', 'tree', n));
});

mess.Parser.importer = function(file, paths, callback) {
    var pathname;

    paths.unshift('.');

    for (var i = 0; i < paths.length; i++) {
        try {
            pathname = path.join(paths[i], file);
            fs.statSync(pathname);
            break;
        } catch (e) {
            pathname = null;
        }
    }

    if (pathname) {
        fs.readFile(pathname, 'utf-8', function(e, data) {
          if (e) sys.error(e);

          new mess.Parser({
              paths: [path.dirname(pathname)],
              filename: pathname
          }).parse(data, function(e, root) {
              if (e) mess.writeError(e);
              callback(root);
          });
        });
    } else {
        sys.error("file '" + file + "' wasn't found.\n");
        process.exit(1);
    }
};

require('mess/functions');

for (var k in mess) { exports[k] = mess[k] }

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

