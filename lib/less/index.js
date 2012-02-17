var path = require('path'),
    sys = require('util'),
    fs = require('fs');

var less = {
    version: [1, 2, 2],
    Parser: require('./parser').Parser,
    importer: require('./parser').importer,
    tree: require('./tree'),
    render: function (input, options, callback) {
        options = options || {};

        if (typeof(options) === 'function') {
            callback = options, options = {};
        }

        var parser = new(less.Parser)(options),
            ee;

        if (callback) {
            parser.parse(input, function (e, root) {
                callback(e, root && root.toCSS && root.toCSS(options));
            });
        } else {
            ee = new(require('events').EventEmitter);

            process.nextTick(function () {
                parser.parse(input, function (e, root) {
                    if (e) { ee.emit('error', e) }
                    else   { ee.emit('success', root.toCSS(options)) }
                });
            });
            return ee;
        }
    },
    writeError: function (ctx, options) {
        options = options || {};

        var message = "";
        var extract = ctx.extract;
        var error = [];
        var stylize = options.color ? less.stylize : function (str) { return str };

        if (options.silent) { return }

        if (ctx.stack) { return sys.error(stylize(ctx.stack, 'red')) }

        if (!ctx.hasOwnProperty('index')) {
            return sys.error(ctx.stack || ctx.message);
        }

        if (typeof(extract[0]) === 'string') {
            error.push(stylize((ctx.line - 1) + ' ' + extract[0], 'grey'));
        }

        if (extract[1]) {
            error.push(ctx.line + ' ' + extract[1].slice(0, ctx.column)
                                + stylize(stylize(stylize(extract[1][ctx.column], 'bold')
                                + extract[1].slice(ctx.column + 1), 'red'), 'inverse'));
        }

        if (typeof(extract[2]) === 'string') {
            error.push(stylize((ctx.line + 1) + ' ' + extract[2], 'grey'));
        }
        error = error.join('\n') + '\033[0m\n';

        message += stylize(ctx.type + 'Error: ' + ctx.message, 'red');
        ctx.filename && (message += stylize(' in ', 'red') + ctx.filename +
                stylize(':' + ctx.line + ':' + ctx.column, 'grey'));

        sys.error(message, error);

        if (ctx.callLine) {
            sys.error(stylize('from ', 'red')       + (ctx.filename || ''));
            sys.error(stylize(ctx.callLine, 'grey') + ' ' + ctx.callExtract);
        }
    }
};

['color',      'directive',  'operation',  'dimension',
 'keyword',    'variable',   'ruleset',    'element',
 'selector',   'quoted',     'expression', 'rule',
 'call',       'url',        'alpha',      'import',
 'mixin',      'comment',    'anonymous',  'value',
 'javascript', 'assignment', 'condition',  'paren'
].forEach(function (n) {
    require('./tree/' + n);
});

less.Parser.importer = function (file, paths, callback, env) {
    var pathname;

    // TODO: Undo this at some point,
    // or use different approach.
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
            if (e) return callback(e);

            new(less.Parser)({
                paths: [path.dirname(pathname)].concat(paths),
                filename: pathname
            }).parse(data, function (e, root) {
                callback(e, root, data);
            });
        });
    } else {
        if (typeof(env.errback) === "function") {
            env.errback(file, paths, callback);
        } else {
            callback({ type: 'File', message: "'" + file + "' wasn't found.\n" });
        }
    }
}

require('./functions');
require('./colors');

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
less.stylize = stylize;

