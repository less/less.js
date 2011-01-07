var path = require('path'),
    fs = require('fs'),
    External = require('./external'),
    Step = require('step'),
    _ = require('underscore')._,
    sys = require('sys');

require.paths.unshift(path.join(__dirname, '..', 'lib'));

var mess = require('mess');

/**
 * Convert a two-element-per-item Array
 * into an object, for the purpose of checking membership
 * and replacing stuff.
 * @param {Array} list a list.
 */
var to = function(list) {
    return list && list[0] && _.reduce(list, function(m, r) {
        if (r && r.length > 1) {
          m[r[0]] = r[1];
        }
        return m;
    }, {});
};

mess.Renderer = function Renderer(env) {
    var env = {
        data_dir: env.data_dir || '/tmp/'
    };
    return {
        env: env,
        /**
         * Wrapper for downloading externals: likely removable
         *
         * @param {String} uri the URI of the resource.
         * @param {Function} callback
         */
        grab: function(uri, callback) {
            new(External)(this.env).process(uri, callback);
        },

        /**
         * Download any file-based remote datsources.
         *
         * Usable as an entry point: does not expect any modification to
         * the map object beyond JSON parsing.
         *
         * @param {Object} m map object.
         * @param {Function} callback
         */
        localizeExternals: function(m, callback) {
            var that = this;
            Step(
                function() {
                    var group = this.group();
                    m.Layer.forEach(function(l) {
                        if (l.Datasource.file) {
                            that.grab(l.Datasource.file, group());
                        }
                    });
                },
                function(err, results) {
                    var result_map = to(results);
                    m.Layer.forEach(function(l) {
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
         * @param {Object} m map object.
         * @param {Function} callback
         */
        localizeStyle: function(m, callback) {
            var that = this;
            Step(
                function() {
                    var group = this.group();
                    m.Stylesheet.forEach(function(s) {
                        if (!s.id) {
                            that.grab(s, group());
                        }
                    });
                    group()();
                },
                function(err, results) {
                    var result_map = to(results);
                    for (s in m.Stylesheet) {
                        if (!m.Stylesheet[s].id) {
                            m.Stylesheet[s] = result_map[m.Stylesheet[s]];
                        }
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
         * @param {Object} m map object.
         * @param {Function} callback
         */
        style: function(m, callback) {
            Step(
                function() {
                    var group = this.group();
                    m.Stylesheet.forEach(function(s) {
                        if (s.id) {
                            group()(null, [s.id, s.data]);
                        } else {
                            fs.readFile(s, 'utf-8', function(err, data) {
                                group()(err, [s, data]);
                            });
                        }
                    });
                },
                function(e, results) {
                    var options = {},
                        group = this.group();
                    for (var i = 0, l = results.length; i < l; i++) {
                        new(mess.Parser)({
                            filename: s
                        }).parse(results[i][1], function(err, tree) {
                            if (err) {
                                mess.writeError(err, options);
                                process.exit(1);
                            } else {
                                try {
                                    var css = tree.toCSS({ compress: false });
                                    group()(err, [
                                        results[i][0],
                                        css,
                                        tree]);
                                } catch (e) {
                                    mess.writeError(e, options);
                                    process.exit(2);
                                }
                            }
                        });
                    }
                },
                function(err, results) {
                    var result_map = to(results);
                    for (s in m.Stylesheet) {
                        if (!m.Stylesheet[s].id) {
                            m.Stylesheet[s] = result_map[m.Stylesheet[s]];
                        } else {
                            m.Stylesheet[s] = result_map[m.Stylesheet[s].id];
                        }
                    }
                    callback(err, [m, results]);
                }
            );
        },

        /**
         * Prepare full XML map output. Called with the results
         * of this.style
         *
         * @param {Array} res array of [map object, stylesheets].
         * @param {Function} callback
         */
        template: function(res, callback) {
            var m = res[0],
                stylesheets = res[1],

                entities = _.template('<?xml version="1.0" ' +
                'encoding="utf-8"?>\n' +
                '<!DOCTYPE Map[\n' +
                '<% for (ref in externals) { %>' +
                '  <!ENTITY <%= ref %> SYSTEM "<%= externals[ref] %>">\n' +
                '<% } %>]>\n'),

                styles = _.template('<StyleName><%= name %></StyleName>'),

                layer = _.template('  <Layer\n  id="<%= id %>"\n ' +
                '   srs="<%= srs %>">\n' +
                '<% for (s in styles) { %>' +
                '    <StyleName><%= styles[s] %></StyleName>\n' +
                '<% } %>' +
                '    <Datasource>\n<% for (n in Datasource) { %>' +
                '      <Parameter name="<%= n %>"><%= Datasource[n] %>' +
                '</Parameter>\n' +
                '<% } %>  </Datasource>\n' +
                '  </Layer>\n'),

                stylesheet_tmpl = _.template('  <% for (i in Stylesheet) { %>' +
                    '<%= Stylesheet[i] %>\n' +
                    '<% } %>\n'),

                // referencing externals in the body of the map
                references = _.template('<% for (ref in externals) { %>' +
                '&<%= ref %>;\n' +
                '<% } %>'),

                // for the Map[] doctype: XML entities to
                // organize code
                entity_list = { externals: [], symbols: [] };

            /**
             * Index a hash of the CSS rules in all stylesheets
             * This is performance-critical: necessary to test
             * at some point
             *
             * @param {Array} stylesheets
             * @return {Array} list of selectors.
             */
            var ruleHash = function(stylesheets) {
                return _.flatten(_.map(stylesheets, function(s) {
                    return _.map(s[2].rules, function(r) {
                        if (r && r.selectors && r.selectors[0]._css) {
                            return r.selectors[0]._css;
                        }
                    });
                }));
            };

            /**
             * Add styles to a layer object
             *
             * @param {Object} layer the layer object.
             * @param {Array} stylesheets the results of ruleHash().
             * @return Formalized layer definition with .styles = [].
             */
            var styleIntersect = function(layer, stylesheets) {
                var hash = ruleHash(stylesheets);
                layer.styles = [];
                if (_.include(hash, 'id-' + layer.id)) {
                    layer.styles.push('id-' + layer.id);
                }
                return layer;
            };

            var output = [entities(entity_list)];
            // TODO: must change when background colors are available
            output.push('<Map srs="+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs" background-color="#ffffff">\n');
            // using array joins here: faster in IE7, unclear in general.
            m.Layer.forEach(function(l) {
                l = styleIntersect(l, stylesheets);
                output.push(layer(l));
            });
            output.push(references(entity_list));
            output.push(stylesheet_tmpl(m));
            output.push('</Map>');
            callback(null, output.join(''));
        },

        /**
         * Prepare a JML document (given as a string) into a
         * fully-localized XML file ready for Mapnik2 consumption
         *
         * @param {String} str the JSON file as a string.
         * @param {Function} callback to be called with err, XML representation.
         */
        render: function(str, callback) {
            var m = JSON.parse(str),
                that = this;
            this.localizeExternals(m, function(err, res) {
                that.localizeStyle(res, function(err, res) {
                    that.style(res, function(err, res) {
                        that.template(res, function(err, res) {
                            callback(err, res);
                        });
                    });
                });
            });
        }
    };
};

module.exports = mess;
