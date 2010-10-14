var path = require('path'),
    sys = require('sys'),
    fs = require('fs');

require.paths.unshift(path.join(__dirname, '..'));

var less = {
    version: [1, 0, 36],
    Parser: require('less/parser').Parser,
    importer: require('less/parser').importer,
    tree: require('less/tree'),
    render: function (input, options, callback) {
        options = options || {};

        if (typeof(options) === 'function') {
            callback = options, options = {};
        }

        var parser = new(this.Parser)(options),
            ee;

        if (callback) {
            parser.parse(input, function (e, root) {
                callback(e, root.toCSS());
            });
        } else {
            ee = new(require('events').EventEmitter);

            process.nextTick(function () {
                parser.parse(input, function (e, root) {
                    if (e) { ee.emit('error', e) }
                    else   { ee.emit('success', root.toCSS()) }
                });
            });
            return ee;
        }
    },
    writeError: function (ctx, options) {
        var message = "";
        var extract = ctx.extract;
        var error = [];

        options = options || {};

        if (options.silent) { return }

        if (!ctx.index) {
            return sys.error(ctx.stack || ctx.message);
        }

        if (typeof(extract[0]) === 'string') {
            error.push(stylize((ctx.line - 1) + ' ' + extract[0], 'grey'));
        }

        error.push(ctx.line + ' ' + extract[1].slice(0, ctx.column)
                            + stylize(stylize(extract[1][ctx.column], 'bold')
                            + extract[1].slice(ctx.column + 1), 'yellow'));

        if (typeof(extract[2]) === 'string') {
            error.push(stylize((ctx.line + 1) + ' ' + extract[2], 'grey'));
        }
        error = error.join('\n') + '\033[0m\n';

        message += stylize(ctx.message, 'red');
        ctx.filename && (message += stylize(' in ', 'red') + ctx.filename);

        sys.error(message, error);

        if (ctx.callLine) {
            sys.error(stylize('from ', 'red')       + (ctx.filename || ''));
            sys.error(stylize(ctx.callLine, 'grey') + ' ' + ctx.callExtract);
        }
        if (ctx.stack) { sys.error(stylize(ctx.stack, 'red')) }
    }
};

['color',    'directive', 'operation',  'dimension',
 'keyword',  'variable',  'ruleset',    'element',
 'selector', 'quoted',    'expression', 'rule',
 'call',     'url',       'alpha',      'import',
 'mixin',    'comment',   'anonymous',  'value', 'javascript'
].forEach(function (n) {
    require(path.join('less', 'tree', n));
});

less.Parser.importer = function (file, paths, callback) {
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

          new(less.Parser)({
              paths: [path.dirname(pathname)],
              filename: pathname
          }).parse(data, function (e, root) {
              if (e) less.writeError(e);
              callback(root);
          });
        });
    } else {
        sys.error("file '" + file + "' wasn't found.\n");
        process.exit(1);
    }
}

require('less/functions');

for (var k in less) { exports[k] = less[k] }

// Stylize a string
function stylize(str, style) {
    var styles = {
        'bold'      : [1,  22],
        'inverse'   : [7,  27],
        'underline' : [4,  24],
        'yellow'    : [33, 39],
        'green'     : [32, 39],
        'red'       : [31, 39],
        'grey'      : [90, 39]
    };
    return '\033[' + styles[style][0] + 'm' + str +
           '\033[' + styles[style][1] + 'm';
}

