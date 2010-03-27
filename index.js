var path = require('path'),
    fs = require('fs');

require.paths.unshift(path.join(__dirname, 'lib'));

var less = {
    version: [2, 0, 0],
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
    }
};

['color',    'directive', 'operation',  'dimension',
 'keyword',  'variable',  'ruleset',    'element',
 'selector', 'quoted',    'expression', 'rule',
 'call',     'url',       'alpha',      'import',
 'mixin',    'comment'
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
        fs.stat(pathname, function (e, stats) {
            if (e) process.stdio.writeError(e);

            fs.open(pathname, process.O_RDONLY, stats.mode, function (e, fd) {
                if (e) process.stdio.writeError(e);

                fs.read(fd, stats.size, 0, "utf8", function (e, data) {
                    if (e) process.stdio.writeError(e);

                    new(less.Parser)({
                        paths: [path.dirname(pathname)]
                    }).parse(data, function (e, root) {
                        if (e) process.stdio.writeError(e);
                        callback(root);
                    });
                });
            });
        });
    } else {
        process.stdio.writeError("file '" + file + "' wasn't found.\n");
        process.exit(1);
    }
}

require('less/functions');

for (var k in less) { exports[k] = less[k] }

