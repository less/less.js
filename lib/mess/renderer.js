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
         * Split definitions into sub-lists of definitions
         * containing rules pertaining to only one
         * symbolizer each
         */
        split_symbolizers: function(definitions) {
            var by_symbolizer = {};
            for (var i = 0; i < definitions.length; i++) {
                definitions[i].symbolizers().forEach(function(sym) {
                    if(!by_symbolizer[sym]) {
                        by_symbolizer[sym] = [];
                    }
                    by_symbolizer[sym].push(
                        definitions[i].filter_symbolizer(sym));
                });
            }
            return by_symbolizer;
        },

        /**
         * Pick the 'winners' - all elements that select
         * properly. Apply inherited styles from their
         * ancestors to them.
         */
        process_chain: function(definitions) {
            // definitions are ordered in specificity,
            // high to low
            //
            // basically if 'this level' has 
            // a filter, then keep going, otherwise
            // this is the final selector.
            var winners = [];
            var ancestors = [];
            var below_threshold = false;

            while (def = definitions.shift()) {
                if (below_threshold) {
                    ancestors.push(def)
                } else if (def.selector.specificity()[2] > 0) {
                    winners.push(def);
                } else {
                    winners.push(def);
                    // nothing below this level will win
                    below_threshold = true;
                }
            }

            // iterate in reverse - low to high specificity
            for (var i = ancestors.length - 1; i >= 0; i--) {
                for (var j = 0; j < winners.length; j++) {
                    winners[j].inherit_from(ancestors[i]);
                }
            }


            winners = this.resolve_filters(winners);

            return winners;
        },

        resolve_filters: function(definitions) {
            var negated_filters = [];
            for (var i = 0; i < definitions.length; i++) {
                if (definitions[i].selector.filters.length) {
                    // array of the negation of this definition's filters
                    var negation = definitions[i].selector.filters.map(
                        function(f) { return f.negate(); });

                    // add in existing negations
                    // TODO: run uniq on this.
                    definitions[i].selector.filters = 
                        definitions[i].selector.filters.concat(negated_filters);

                    // add this definition's filter's negations to the list
                    negated_filters = negated_filters.concat(negation);
                }
            }
            return definitions;
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

            var that = this,
                m = res[0],
                stylesheets = res[1],

                entities = _.template('<?xml version="1.0" ' +
                    'encoding="utf-8"?>\n' +
                    '<!DOCTYPE Map[\n' +
                    '<% for (ref in externals) { %>' +
                    '  <!ENTITY <%= ref %> SYSTEM "<%= externals[ref] %>">\n' +
                    '<% } %>]>\n'),

                // for the Map[] doctype: XML entities to
                // organize code
                entity_list = { externals: [], symbols: [] };

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

            // TODO: must change when background colors are available
            var output = [
                '<?xml version="1.0" '
                + 'encoding="utf-8"?>\n'
                + '<!DOCTYPE Map[]>\n'
                + '<Map background-color="' 
                + "#ffffff"
                // findBackground(stylesheets)
                + '" srs="+proj=merc +a=6378137 +b=6378137 '
                + '+lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m '
                + '+nadgrids=@null +no_defs">\n'];

            m.Layer.forEach(function(l) {
                l.styles = [];
                var classes = (l['class'] || '').split(/\s+/g);

                var matching = rulesets.filter(function(ruleset) {
                    return ruleset.selector.matches(l.id, classes);
                });
                
                // matching is an array of matching selectors,
                // in order from high specificity to low.
                var by_symbolizer = that.split_symbolizers(matching);

                for (sym in by_symbolizer) {
                    // Create styles out of chains of one-symbolizer rules,
                    // and assign those styles to layers
                    var new_style = new(mess.tree.Style)(
                        l.id,
                        sym,
                        that.process_chain(by_symbolizer[sym]));
                    l.styles.push(new_style.name());
                    output.push(new_style.toXML());
                }

                var nl = new(mess.tree.Layer)(l);
                output.push(nl.toXML());
            });

            output.push('</Map>');
            
            callback(null, output.join('\n'));
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
