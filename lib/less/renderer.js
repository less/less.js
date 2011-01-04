var path = require('path'),
    fs = require('fs'),
    External = require('./external'),
    Step = require('./step'),
    _ = require('underscore')._,
    sys = require('sys');

require.paths.unshift(path.join(__dirname, '..', 'lib'));

var mess = {},
    less = require('less');

mess.Renderer = function Renderer(env) {
    return {
        grab: function(uri, callback) {
            console.log('Download external\n\t' + uri);
            new(External)({
                data_dir: 'test'
            }).process(uri, callback);
        },
        /**
         * Download any file-based remote datsources
         */
        localizeExternals: function(m, callback) {
            var that = this;
            Step(
                function() {
                    var group = this.group();
                    m.Map.Layer.forEach(function(l) {
                        if (l.Datasource.file) {
                            that.grab(l.Datasource.file, group());
                        }
                    });
                },
                function(err, results) {
                    var result_map = _.reduce(results, function(m, r) {
                        m[r[0]] = r[1];
                        return m;
                    }, {});
                    m.Map.Layer.forEach(function(l) {
                        if (l.Datasource.file) {
                            l.Datasource.file = result_map[l.Datasource.file];
                        }
                    });
                    callback(err, m);
                    // require('eyes').inspect(m);
                }
            );
        },
        /**
         * Download any remote stylesheets
         */
        localizeStyle: function(m, callback) {
            var that = this;
            Step(
                function() {
                    var group = this.group();
                    m.Map.Stylesheet.forEach(function(s) {
                        that.grab(s, group());
                    });
                },
                function(err, results) {
                    var result_map = _.reduce(results, function(m, r) {
                        m[r[0]] = r[1];
                        return m;
                    }, {});
                    for (s in m.Map.Stylesheet) {
                        m.Map.Stylesheet[s] = result_map[m.Map.Stylesheet[s]];
                    }
                    callback(err, m);
                }
            );
        },
        style: function(m, callback) {
            Step(
                function() {
                    var group = this.group();
                    m.Map.Stylesheet.forEach(function(s) {
                        fs.readFile(s, 'utf-8', function(err, data) {
                            group()(err, [s, data]);
                        });
                    });
                },
                function(e, results) {
                    var options = {},
                        group = this.group();
                    if (e) {
                        sys.puts('lessc: ' + e.message);
                        process.exit(1);
                    }
                    for (var i=0, l=results.length; i < l; i++) {
                        new(less.Parser)({
                            filename: s
                        }).parse(results[i][1], function(err, tree) {
                            // require('eyes').inspect(err);
                            if (err) {
                                less.writeError(err, options);
                                process.exit(1);
                            } else {
                                try {
                                    group()(err, [results[i][0], tree.toCSS({ compress: false })]);
                                } catch (e) {
                                    less.writeError(e, options);
                                    process.exit(2);
                                }
                            }
                        });
                    }
                },
                function(err, results) {
                    require('eyes').inspect(results);
                    var group = this.group();
                    results.forEach(function(r) {
                        fs.writeFile(r[0].replace('.mss', '.xml'), r[1], function(err) {
                            group()(null, [r[0], r[0].replace('.mss', '.xml')]);
                        });
                    });
                },
                function(err, results) {
                    var result_map = _.reduce(results, function(m, r) {
                        m[r[0]] = r[1];
                        return m;
                    }, {});
                    for (s in m.Map.Stylesheet) {
                        m.Map.Stylesheet[s] = result_map[m.Map.Stylesheet[s]];
                    }
                    callback(err, m);
                }
            );
        },
        template: function(m, callback) {
            var entities = _.template('<?xml version="1.0" encoding="utf-8"?>\n'+
                '<!DOCTYPE Map[\n<% for (ref in stylesheets) { %>' +
                '  <!ENTITY <%= ref %> SYSTEM "<%= stylesheets[ref] %>">\n' +
                '<% } %>]>\n');
            var layer = _.template('<Layer\n  id="<%= id %>"\n  srs="<%= srs %>">\n' +
                '  <Datasource>\n<% for (n in Datasource) { %>' + 
                '    <Parameter name="<%= n %>"><%= Datasource[n] %></Parameter>\n' + 
                '<% } %>  </Datasource>\n' + 
                '</Layer>\n');
            var references = _.template('<% for (ref in stylesheets) { %>' +
                '&<%= ref %>;\n' +
                '<% } %>');

            var stylesheets = { stylesheets: [] };
            m.Map.Stylesheet.forEach(function(s) {
                stylesheets.stylesheets[
                    'a' + require('crypto')
                        .createHash('md5')
                        .update(m.Map.Stylesheet[s])
                        .digest("hex")] =
                        s;
            });
            var output = [entities(stylesheets)];
            output.push('<Map>');
            // using array joins here: faster in IE7, unclear in general.
            m.Map.Layer.forEach(function(l) {
                // require('eyes').inspect(l);
                output.push(layer(l));
            });
            output.push(references(stylesheets));
            output.push('</Map>');
            callback(null, output.join(''));
        },
        render: function(str, callback) {
            var m = JSON.parse(str),
                that = this;
            this.localizeExternals(m, function(err, res) {
                that.localizeStyle(res, function(err, res) {
                    that.style(res, function(err, res) {
                        that.template(res, function(err, res) {
                            console.log(res);
                        });
                    });
                });
            });
        }
    };
};

module.exports = mess;
