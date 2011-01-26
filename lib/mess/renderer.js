var path = require('path'),
    fs = require('fs'),
    External = require('./external'),
    Step = require('step'),
    _ = require('underscore')._,
    sys = require('sys'),
    mess = require('mess'),
    tree = require('mess/tree');

require.paths.unshift(path.join(__dirname, '..', 'lib'));

/**
 * Rendering circuitry for JSON map manifests.
 *
 * This is node-only for the time being.
 */

mess.Renderer = function Renderer(env) {
    env = _.extend(env, {});
    if (!env.data_dir) env.data_dir = '/tmp/';
    if (!env.local_data_dir) env.local_data_dir = '';
    if (!env.validation_data) env.validation_data = false;

    return {
        /**
         * Keep a copy of passed-in environment variables
         */
        env: env,

        /**
         * Ensure that map layers have a populated SRS value and attempt to
         * autodetect SRS if missing. Requires that node-srs is available and
         * that any remote datasources have been localized.
         *
         * @param {Object} m map object.
         * @param {Function} callback
         */
        ensureSRS: function(m, callback) {
            Step(
                function autodetectSRS() {
                    var group = this.group();
                    var autodetect = _.filter(m.Layer, function(l) { return !l.srs; });
                    _.each(autodetect, function(l) {
                        var finish = group();
                        Step(
                            function() {
                                fs.readdir(path.dirname(l.Datasource.file), this);
                            },
                            function(err, files) {
                                var prj = _.detect(files, function(f) {
                                    return path.extname(f).toLowerCase() == '.prj';
                                });
                                if (prj) {
                                    prj = path.join(path.dirname(l.Datasource.file), prj);
                                    fs.readFile(prj, 'utf-8', this);
                                } else {
                                    this(new Error('No projection found'));
                                }
                            },
                            function(err, srs) {
                                if (!err) {
                                    try {
                                        l.srs = require('srs').parse(srs).proj4;
                                    } catch (err) {
                                        finish(err);
                                    }
                                }
                                finish(err);
                            }
                        );
                    });
                    // If no layers missing SRS information, next.
                    autodetect.length === 0 && group()();
                },
                function waitForDetection(err) {
                    m.Layer = _.filter(m.Layer, function(l) { return l.srs; });
                    callback(err, m);
                }
            );
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
                function downloadExternals() {
                    var group = this.group();
                    m.Layer.forEach(function(l) {
                        if (l.Datasource.file) {
                            var next = group();
                            new External(that.env, l.Datasource.file)
                                .on('complete', function(external) {
                                    external.findByExtension('.shp', function(err, files) {
                                        if (err) {
                                            next(err);
                                        }
                                        else if (files.length) {
                                            l.Datasource.file = files[0];
                                            next(null);
                                        }
                                        else {
                                            next("No .shp file found in zipfile.");
                                        }
                                    });
                                });
                        } else {
                            throw 'Layer does not have a datasource';
                        }
                    });
                    // Continue even if we don't have any layers.
                    group()();
                },
                function waitForDownloads(err) {
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
                function downloadStyles() {
                    var group = this.group();
                    m.Stylesheet.forEach(function(s, k) {
                        if (!s.id) {
                            var next = group();
                            new External(that.env, s)
                                .on('complete', function(external) {
                                    m.Stylesheet[k] = external.path();
                                    next();
                                });
                        }
                    });
                    group()();
                },
                function waitForDownloads(err, results) {
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
                function loadStyles() {
                    var group = this.group();
                    m.Stylesheet.forEach(function(s) {
                        var next = group();
                        if (s.id) {
                            next(null, [s.id, s.data]);
                        } else {
                            fs.readFile(s, 'utf-8', function(err, data) {
                                next(err, [s, data]);
                            });
                        }
                    });
                },
                function compileStyles(e, results) {
                    var options = {},
                        group = this.group();
                    for (var i = 0, l = results.length; i < l; i++) {
                        new mess.Parser(_.extend(_.extend({
                            filename: results[i][0]
                        }, that.env), this.env)).parse(results[i][1],
                            function(err, tree) {
                            if (err) {
                                mess.writeError(err, options);
                                throw err;
                            } else {
                                try {
                                    group()(err, [
                                        results[i][0],
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
                function waitForCompilation(err, res) {
                    callback(err, m, res);
                }
            );
        },

        /**
         * Split definitions into sub-lists of definitions
         * containing rules pertaining to only one
         * symbolizer each
         */
        splitSymbolizers: function(definitions) {
            var bySymbolizer = {};
            for (var i = 0; i < definitions.length; i++) {
                definitions[i].symbolizers().forEach(function(sym) {
                    var index = sym + '/' + definitions[i].selector.attachment;
                    if(!bySymbolizer[index]) {
                        bySymbolizer[index] = [];
                    }
                    bySymbolizer[index].push(
                        definitions[i].filterSymbolizer(sym));
                });
            }
            return bySymbolizer;
        },

        /**
         * Pick the 'winners' - all elements that select
         * properly. Apply inherited styles from their
         * ancestors to them.
         */
        processChain: function(definitions) {
            // definitions are ordered in specificity,
            // high to low
            //
            // basically if 'this level' has
            // a filter, then keep going, otherwise
            // this is the final selector.
            var winners = [];
            var ancestors = [];
            var belowThreshold = false;
            var def;

            while (def = definitions.shift()) {
                if (belowThreshold) {
                    ancestors.push(def);
                } else if (def.selector.specificity()[2] > 0) {
                    winners.push(def);
                } else {
                    winners.push(def);
                    // nothing below this level will win
                    belowThreshold = true;
                }
            }

            for (var i = 0; i < winners.length; i++) {
                for (var j = i + 1; j < winners.length; j++) {
                    winners[i].inheritFrom(winners[j]);
                }
                for (var j = 0; j < ancestors.length; j++) {
                    winners[i].inheritFrom(ancestors[j]);
                }
            }

            return this.resolveConditions(winners);
        },

        resolveConditions: function(definitions) {
            var rules = [];
            var negatedFilters = [];
            var negatedZoom = tree.Zoom.newFromRange([0, Infinity]);

            for (var i = 0; i < definitions.length; i++) {
                var selector = definitions[i].selector;

                // Only add the negated current zoom when there actually are zoom filters.
                if (selector.zoom) {
                    var zoom = selector.zoom.clone();
                    var negation = zoom.negate();
                    zoom.intersection(negatedZoom);
                } else {
                    var zoom = negatedZoom.clone();
                }

                var zoomRanges = zoom.getRanges();
                if (!zoomRanges.length) {
                    continue;
                } else if (negation) {
                    // This zoom range has ranged. Add it so that future rules
                    // will exclude the current zoom.
                    negatedZoom.intersection(negation);
                }

                // Resolve regular filters.
                var filters = selector.filters.filter(function(f) {
                    return f instanceof tree.Filter;
                });

                var negation = filters.map(function(f) { return f.negate(); });

                // add in existing negations
                filters.push.apply(filters, negatedFilters);

                // Throw out contradicting rules.
                if (!tree.Filter.sound(filters)) {
                    continue;
                } else {
                    // add this definition's filter's negations to the list
                    negatedFilters.push.apply(negatedFilters, negation);
                }

                selector.filters = filters;
                selector.zoom = zoom;

                // Add a separate rule for each zoom range.
                for (var j = 0; j < zoomRanges.length; j++) {
                    var rule = definitions[i].clone();
                    rule.selector.zoom = tree.Zoom.newFromRange(zoomRanges[j]);
                    rules.push(rule);
                }
            }
            return rules;
        },

        /**
         * Find a rule like Map { background-color: #fff; },
         * if any, and return a list of properties to be inserted
         * into the <Map element of the resulting XML.
         *
         * @param {Array} rulesets the output of toList.
         * @param {Object} env.
         * @return {String} rendered properties.
         */
        getMapProperties: function(rulesets, env) {
            var properties = [];
            rulesets.filter(function(r) {
                return r.selector.layers() === 'Map';
            }).forEach(function(r) {
                for (var i = 0; i < r.rules.length; i++) {
                    if (r.rules[i].eval) r.rules[i] = r.rules[i].eval(env);
                    properties.push(r.rules[i].toXML(env));
                }
            });
            return properties.join('');
        },

        /**
         * Prepare full XML map output. Called with the results
         * of this.style
         *
         * @param {Array} res array of [map object, stylesheets].
         * @param {Function} callback
         */
        template: function(err, m, stylesheets, callback) {
            if (err) {
                callback(err);
                return;
            }

            // frames is a container for variables and other less.js
            // constructs.
            //
            // effects is a container for side-effects, which currently
            // are limited to FontSets.
            var that = this,
                env = _.extend({
                    frames: [],
                    effects: [],
                    deferred_externals: []
                }, that.env),
                output = [];

            var rulesets = _.flatten(stylesheets.map(function(rulesets) {
                return rulesets[1].toList(env);
            }));

            m.Layer.forEach(function(l) {
                l.styles = [];
                var classes = (l['class'] || '').split(/\s+/g);

                var matching = rulesets.filter(function(ruleset) {
                    return ruleset.selector.matches(l.id, classes);
                });

                // matching is an array of matching selectors,
                // in order from high specificity to low.
                var bySymbolizer = that.splitSymbolizers(matching);

                for (var sym in bySymbolizer) {
                    // Create styles out of chains of one-symbolizer rules,
                    // and assign those styles to layers
                    var new_style = new mess.tree.Style(
                        l.id,
                        sym,
                        that.processChain(bySymbolizer[sym]));
                    l.styles.push(new_style.name());
                    // env.effects can be modified by this call
                    output.push(new_style.toXML(env));
                }

                var nl = new mess.tree.Layer(l);
                output.push(nl.toXML());
            });

            output.unshift(env.effects.map(function(e) {
                return e.toXML(env);
            }).join('\n'));

            Step(
                function() {
                    var group = this.group();
                    if (env.deferred_externals.length) {
                        env.deferred_externals.forEach(function(def) {
                            var next = group();
                            new External(that.env, def)
                                .on('complete', function(external) {
                                    next();
                                });
                        });
                    } else {
                        var next = group();
                        next()();
                    }
                },
                function(err, results) {
                    output.unshift(
                        '<?xml version="1.0" '
                        + 'encoding="utf-8"?>\n'
                        + '<!DOCTYPE Map[]>\n'
                        + '<Map '
                        + that.getMapProperties(rulesets, env)
                        + ' srs="+proj=merc +a=6378137 +b=6378137 '
                        + '+lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m '
                        + '+nadgrids=@null +no_defs">\n');

                    output.push('</Map>');
                    callback(null, output.join('\n'));
                }
            );
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
                that.ensureSRS(res, function(err, res) {
                    that.localizeStyle(res, function(err, res) {
                        that.style(res, function(err, m, res) {
                            that.template(err, m, res, function(err, res) {
                                callback(err, res);
                            });
                        });
                    });
                });
            });
        }
    };
};

module.exports = mess;
