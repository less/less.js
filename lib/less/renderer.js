var path = require('path'),
    fs = require('fs'),
    External = require('./external'),
    Step = require('./step'),
    _ = require('underscore')._,
    sys = require('sys');

require.paths.unshift(path.join(__dirname, '..', 'lib'));

var mess = {},
    less = require('less');

/**
 * Convert a two-element-per-item Array
 * into an object, for the purpose of checking membership
 * and replacing stuff.
 * @param {Array} list a list.
 */
var to = function(list) {
    return _.reduce(list, function(m, r) {
        m[r[0]] = r[1];
        return m;
    }, {});
};

mess.Renderer = function Renderer(env) {
    return {
        /**
         * Wrapper for downloading externals: likely removable
         *
         * @param {String} uri the URI of the resource
         * @param {Function} callback
         */
        grab: function(uri, callback) {
            // console.log('Download external\n\t' + uri);
            new(External)({
                data_dir: 'test'
            }).process(uri, callback);
        },
        /**
         * Download any file-based remote datsources.
         *
         * Usable as an entry point: does not expect any modification to
         * the map object beyond JSON parsing.
         *
         * @param {Object} m map object
         * @param {Function} callback
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
                    var result_map = to(results);
                    m.Map.Layer.forEach(function(l) {
                        if (l.Datasource.file) {
                            l.Datasource.file = result_map[l.Datasource.file];
                        }
                    });
                    callback(err, m);
                }
            );
        },
        /**
         * Download any remote stylesheets
         *
         * @param {Object} m map object
         * @param {Function} callback
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
                    var result_map = to(results);
                    for (s in m.Map.Stylesheet) {
                        m.Map.Stylesheet[s] = result_map[m.Map.Stylesheet[s]];
                    }
                    callback(err, m);
                }
            );
        },

        /**
         * Compile (already downloaded) styles with mess.js,
         * calling callback with an array of [map object, [stylesheet objects]]
         *
         * Called with the results of localizeStyle or localizeExternals: 
         * expects not to handle downloading.
         *
         * @param {Object} m map object
         * @param {Function} callback
         */
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
                    for (var i = 0, l = results.length; i < l; i++) {
                        new(less.Parser)({
                            filename: s
                        }).parse(results[i][1], function(err, tree) {
                            if (err) {
                                less.writeError(err, options);
                                process.exit(1);
                            } else {
                                try {
                                    group()(err, [
                                        results[i][0],
                                        tree.toCSS({ compress: false }),
                                        tree]);
                                } catch (e) {
                                    less.writeError(e, options);
                                    process.exit(2);
                                }
                            }
                        });
                    }
                },
                function(err, results) {
                    var group = this.group();
                    results.forEach(function(r) {
                        fs.writeFile(r[0].replace('.mss', '.xml'),
                            r[1], function(err) {
                            group()(
                                null, [
                                    r[0],
                                    r[0].replace('.mss', '.xml'),
                                    r[2]]);
                        });
                    });
                },
                function(err, results) {
                    var result_map = to(results);
                    for (s in m.Map.Stylesheet) {
                        m.Map.Stylesheet[s] = result_map[m.Map.Stylesheet[s]];
                    }
                    callback(err, [m, results]);
                }
            );
        },
        /**
         * Prepare full XML map output. Called with the results
         * of this.style
         *
         * @param {Array} res array of [map object, stylesheets]
         * @param {Function} callback
         */
        template: function(res, callback) {
            var m = res[0],
                stylesheets = res[1],

                entities = _.template('<?xml version="1.0" ' +
                'encoding="utf-8"?>\n' +
                '<!DOCTYPE Map[\n' +
                '<% for (ref in stylesheets) { %>' +
                '  <!ENTITY <%= ref %> SYSTEM "<%= stylesheets[ref] %>">\n' +
                '<% } %>]>\n'),

                styles = _.template('<StyleName><%= name %></StyleName>'),
                
                layer = _.template('<Layer\n  id="<%= id %>"\n ' +
                ' srs="<%= srs %>">\n' +
                ' <% for (s in styles) { %>\n' +
                '  <StyleName><%= styles[s] %></StyleName>\n' +
                ' <% } %>\n' +
                '  <Datasource>\n<% for (n in Datasource) { %>' +
                '    <Parameter name="<%= n %>"><%= Datasource[n] %>' +
                '</Parameter>\n' +
                '<% } %>  </Datasource>\n' +
                '</Layer>\n'),

                references = _.template('<% for (ref in stylesheets) { %>' +
                '&<%= ref %>;\n' +
                '<% } %>'),

                stylesheet_list = { stylesheets: [] };

            m.Map.Stylesheet.forEach(function(s) {
                // XML entities must begin with a letter, hence a
                stylesheet_list.stylesheets[
                    'a' + require('crypto')
                        .createHash('md5')
                        .update(m.Map.Stylesheet[s])
                        .digest('hex')] =
                        s;
            });

            /**
             * Index a hash of the CSS rules in all stylesheets
             * This is performance-critical: necessary to test
             * at some point
             *
             * @param {Array} stylesheets
             * @return {Array} list of selectors
             */
            var ruleHash = function(stylesheets) {
                return _.flatten(_.map(stylesheets, function(s) {
                    return _.map(s[2].rules, function(r) {
                        if (r && r.selectors[0]._css) {
                            return r.selectors[0]._css;
                        }
                    });
                }));
            };

            /**
             * Add styles to a layer object
             *
             * @param {Object} layer the layer object
             * @param {Array} stylesheets the results of ruleHash()
             * @return Formalized layer definition with .styles = []
             */
            var styleIntersect = function(layer, stylesheets) {
                var hash = ruleHash(stylesheets);
                layer.styles = [];
                if (_.include(hash, 'id-' + layer.id)) {
                    layer.styles.push('id-' + layer.id);
                }
                return layer;
            };

            var output = [entities(stylesheet_list)];

            // TODO: must change when background colors are available
            output.push('<Map background-color="#ffffff">');
            // using array joins here: faster in IE7, unclear in general.
            m.Map.Layer.forEach(function(l) {
                l = styleIntersect(l, stylesheets);
                output.push(layer(l));
            });
            output.push(references(stylesheet_list));
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
