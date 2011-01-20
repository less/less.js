var path = require('path'),
    fs = require('fs'),
    External = require('./external'),
    Step = require('step'),
    _ = require('underscore')._,
    sys = require('sys'),
    mess = require('mess');

require.paths.unshift(path.join(__dirname, '..', 'lib'));

/**
 * Rendering circuitry for JSON map manifests.
 *
 * This is node-only for the time being.
 */

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
        data_dir: env.data_dir || '/tmp/',
        local_data_dir: env.local_data_dir || '',
        validation_data: env.validation_data || false
    };
    return {
        /**
         * Keep a copy of passed-in environment variables
         */
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
                    if (m.Layer.length == 0) group()();
                },
                function(err, results) {
                    var result_map = to(results);
                    m.Layer = _.map(_.filter(m.Layer,
                        function(l) {
                            return l.Datasource.file &&
                                result_map[l.Datasource.file];
                        }),
                        function(l) {
                            l.Datasource.file = result_map[l.Datasource.file];
                            return l;
                        }
                    );
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
            var that = this;
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
                        new(mess.Parser)(_.extend(_.extend({
                            filename: s
                        }, that.env), this.env)).parse(results[i][1],
                            function(err, tree) {
                            if (err) {
                                mess.writeError(err, options);
                                throw err;
                            } else {
                                try {
                                    group()(err, [
                                        results[i][0],
                                        tree.toCSS({ compress: false }),
                                        tree]);
                                    return;
                                } catch (e) {
                                    throw e;
                                    return;
                                }
                            }
                        });
                    }
                },
                function(err, results) {
                    if (err) {
                        callback(err);
                        return;
                    }

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
        template: function(err, res, callback) {
            if (err) {
                callback(err);
                return;
            }

            var m = res[0],
                stylesheets = res[1],

                entities = _.template('<?xml version="1.0" ' +
                    'encoding="utf-8"?>\n' +
                    '<!DOCTYPE Map[\n' +
                    '<% for (ref in externals) { %>' +
                    '  <!ENTITY <%= ref %> SYSTEM "<%= externals[ref] %>">\n' +
                    '<% } %>]>\n'),

                styles = _.template('<StyleName><%= name %></StyleName>'),

                layer = _.template('\n  <Layer\n   id="<%= id %>"\n' +
                    '   name="<%= name %>"\n' +
                    '   srs="<%= srs %>">\n' +
                    '<% for (s in styles) { %>' +
                    '    <StyleName><%= styles[s] %></StyleName>\n' +
                    '<% } %>' +
                    '    <Datasource>\n<% for (n in Datasource) { %>' +
                    '      <Parameter name="<%= n %>"><%= Datasource[n] %>' +
                    '</Parameter>\n' +
                    '<% } %>    </Datasource>\n' +
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

            // var findBackground = function(stylesheets) {
            //     var b = '#FFFFFF';
            //     _.each(stylesheets, function(s) {
            //         _.each(s[2].rules, function(r) {
            //             if (r && r.selectors && r.selectors[0]._css &&
            //                 r.selectors[0]._css === 'Map') {
            //                 var bg = _.detect(r.rules, function(rule) {
            //                     return rule.name == 'background-color';
            //                 });
            //                 if (bg) {
            //                     b = bg.value.toCSS({ compress: false });
            //                 }
            //             }
            //         });
            //     });
            //     return b;
            // };

            /**
             * Add styles to a layer object
             *
             * @param {Object} layer the layer object.
             * @param {Array} stylesheets the results of ruleHash().
             * @return Formalized layer definition with .styles = [].
             */
            
            var rulesets = _.flatten(stylesheets.map(function(rulesets) {
                return rulesets[2].toMSS();
            }));

            var output = [entities(entity_list)];
            // TODO: must change when background colors are available
            output.push('<Map background-color="' 
                    // findBackground(stylesheets)
                    + '" srs="+proj=merc +a=6378137 +b=6378137 '
                    + '+lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m '
                    + '+nadgrids=@null +no_defs">\n');

            m.Layer.forEach(function(l) {
                var classes = (l['class'] || '').split(/\s+/g);

                var matching = rulesets.map(function(ruleset) {
                    var selectors = ruleset.matchingSelectors(id, classes);
                    if (selectors.length) {
                        return { selectors: selectors, rules: ruleset.rules }
                    }
                });

                console.log('Layer ' + l.id);
                console.log(sys.inspect(matching, false, null));
                console.log('______')
            });

            // output.push(references(entity_list));
            // output.push(stylesheet_tmpl(m));
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
                        that.template(err, res, function(err, res) {
                            callback(err, res);
                        });
                    });
                });
            });
        }
    };
};

module.exports = mess;
