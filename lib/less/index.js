var less = {
    version: [1, 6, 3],
    Parser: require('./parser').Parser,
    tree: require('./tree'),
    render: function (input, options, callback) {
        options = options || {};

        if (typeof(options) === 'function') {
            callback = options;
            options = {};
        }

        var parser = new(less.Parser)(options),
            ee;

        if (callback) {
            parser.parse(input, function (e, root) {
                if (e) { callback(e); return; }
                var css;
                try {
                    css = root && root.toCSS && root.toCSS(options);
                } 
                catch (err) { callback(err); return; }
                callback(null, css);
            });
        } else {
            ee = new (require('events').EventEmitter)();

            process.nextTick(function () {
                parser.parse(input, function (e, root) {
                    if (e) { return ee.emit('error', e); }
                    try { ee.emit('success', root.toCSS(options)); } 
                    catch (err) { ee.emit('error', err); }
                });
            });
            return ee;
        }
    },
    formatError: function(ctx, options) {
        options = options || {};

        var message = "";
        var extract = ctx.extract;
        var error = [];
        var stylize = options.color ? require('./lessc_helper').stylize : function (str) { return str; };

        // only output a stack if it isn't a less error
        if (ctx.stack && !ctx.type) { return stylize(ctx.stack, 'red'); }

        if (!ctx.hasOwnProperty('index') || !extract) {
            return ctx.stack || ctx.message;
        }

        if (typeof(extract[0]) === 'string') {
            error.push(stylize((ctx.line - 1) + ' ' + extract[0], 'grey'));
        }

        if (typeof(extract[1]) === 'string') {
            var errorTxt = ctx.line + ' ';
            if (extract[1]) {
                errorTxt += extract[1].slice(0, ctx.column) +
                                stylize(stylize(stylize(extract[1][ctx.column], 'bold') +
                                extract[1].slice(ctx.column + 1), 'red'), 'inverse');
            }
            error.push(errorTxt);
        }

        if (typeof(extract[2]) === 'string') {
            error.push(stylize((ctx.line + 1) + ' ' + extract[2], 'grey'));
        }
        error = error.join('\n') + stylize('', 'reset') + '\n';

        message += stylize(ctx.type + 'Error: ' + ctx.message, 'red');
        if (ctx.filename) {
            message += stylize(' in ', 'red') + ctx.filename +
                stylize(' on line ' + ctx.line + ', column ' + (ctx.column + 1) + ':', 'grey');
        }

        message += '\n' + error;

        if (ctx.callLine) {
            message += stylize('from ', 'red') + (ctx.filename || '') + '/n';
            message += stylize(ctx.callLine, 'grey') + ' ' + ctx.callExtract + '/n';
        }

        return message;
    },
    writeError: function (ctx, options) {
        options = options || {};
        if (options.silent) { return; }
        console.error(less.formatError(ctx, options));
    }
};

less.Parser.environment = require("./environments/node");

require('./tree/color');
require('./tree/directive');
require('./tree/detached-ruleset');
require('./tree/operation');
require('./tree/dimension');
require('./tree/keyword');
require('./tree/variable');
require('./tree/ruleset');
require('./tree/element');
require('./tree/selector');
require('./tree/quoted');
require('./tree/expression');
require('./tree/rule');
require('./tree/call');
require('./tree/url');
require('./tree/alpha');
require('./tree/import');
require('./tree/mixin');
require('./tree/comment');
require('./tree/anonymous');
require('./tree/value');
require('./tree/javascript');
require('./tree/assignment');
require('./tree/condition');
require('./tree/paren');
require('./tree/media');
require('./tree/unicode-descriptor');
require('./tree/negative');
require('./tree/extend');
require('./tree/ruleset-call');
require('./env');
require('./functions');
require('./colors');
require('./visitor.js');
require('./import-visitor.js');
require('./extend-visitor.js');
require('./join-selector-visitor.js');
require('./to-css-visitor.js');
require('./source-map-output.js');

module.exports = less;
