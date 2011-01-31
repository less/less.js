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
    env = _.extend({}, env);
    if (!env.debug) env.debug = false;
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
                        var next = group();
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
                                    } catch (err) {}
                                }
                                next(err);
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
            if (env.only_validate === true) {
                callback(null, m);
                return;
            }
            Step(
                function downloadExternals() {
                    var group = this.group();
                    m.Layer.forEach(function(l) {
                        if (l.Datasource.file) {
                            var next = group();
                            new External(that.env, l.Datasource.file)
                                .on('err', function() {
                                    next('Datasource could not be downloaded.');
                                })
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
                    results.forEach(function(result) {
                        var next = group();
                        var parsingTime = +new Date;
                        var parse_env = _.extend(
                            _.extend(
                                that.env,
                                this.env
                            ), { filename: result[0] });
                        new mess.Parser(parse_env).parse(result[1],
                            function(err, tree) {
                            if (env.debug) console.warn('Parsing time: '
                                + ((new Date - parsingTime))
                                + 'ms (' + result[0] + ')');
                            try {
                                next(err, [
                                    result[0],
                                    tree]);
                                return;
                            } catch (e) {
                                throw e;
                                return;
                            }
                        });
                    });
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
            var splitTime = +new Date;
            var bySymbolizer = {};
            for (var i = 0; i < definitions.length; i++) {
                definitions[i].symbolizers().forEach(function(sym) {
                    var index = sym + (definitions[i].selector.attachment ? '/' + definitions[i].selector.attachment : '');
                    if(!bySymbolizer[index]) {
                        bySymbolizer[index] = [];
                    }
                    bySymbolizer[index].push(
                        definitions[i].filterSymbolizer(sym));
                });
            }
            if (env.debug) console.warn('Splitting symbolizers: ' + ((new Date - splitTime)) + 'ms');
            return bySymbolizer;
        },

        /**
         * Pick the 'winners' - all elements that select
         * properly. Apply inherited styles from their
         * ancestors to them.
         */
        processChain: function(definitions) {
            var processTime = +new Date();
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

            if (env.debug) console.warn('Processing time: ' + ((new Date - processTime)) + 'ms');

            return winners;
        },

        mergeSelectors: function(selectors) {
            // Shortcut for the simple case.
            if (selectors.length === 1) {
                tree.Filter.simplify(selectors[0].filters);
                return selectors;
            }

            var selector;
            var byFilter = {};
            var id;
            // Simplify all selectors and merge zoom levels for the same filters.
            for (var i = 0; i < selectors.length; i++) {
                selector = selectors[i];
                tree.Filter.simplify(selector.filters);
                id = selector.fid();

                // Merge zooms for identical filters.
                if (id in byFilter) {
                    byFilter[id].zoom |= selector.zoom;
                } else {
                    byFilter[id] = selector;
                }
            }

            // Merge complementary selectors.
            var filters;
            for (var id1 in byFilter) {
                for (var id2 in byFilter) {
                    if (id1 === id2) continue;
                    if (byFilter[id1].zoom != byFilter[id2].zoom) continue;
                    if (filters = tree.Filter.mergable(byFilter[id1].filters, byFilter[id2].filters)) {
                        byFilter[id1].filters = filters;
                        delete byFilter[id2];
                    }
                }
            }

            var result = [];
            for (var id in byFilter) {
                result.push(byFilter[id]);
            }
            return result;
        },

        resolveConditions: function(definitions) {
            var renderer = this;
            var resolvingTime = +new Date;
            var rules = [];
            var output, inverted, negation, rest;

            var input = [ new tree.Selector ];
            for (var i = 0; i < definitions.length; i++) {
                var next = [];
                var results = [];
                var main = definitions[i].selector;

                for (var id = 0; id < input.length; id++) {
                    output = main.cloneMerge(input[id]);
                    if (!output) {
                        // Passthrough when the output is invalid.
                        next.push(input[id]);
                    } else {
                        results.push(output);
                        // Generate NEXT rules.
                        // Figure out differences in filters.
                        rest = output;
                        previousID = null;
                        for (var curID in main.filters) {
                            rest = rest.clone();
                            if (previousID) delete rest.filters[previousID];
                            delete rest.filters[curID];
                            var filter = main.filters[curID].negate();
                            rest.filters[filter.id] = filter;
                            previousID = filter.id;
                            if (tree.Filter.sound(rest.filters)) {
                                next.push(rest);
                            }
                        }
                    }

                    if (inverted = ~main.zoom & input[id].zoom) {
                        negation = input[id].clone();
                        negation.zoom = inverted;
                        next.push(negation);
                    }
                }

                results = renderer.mergeSelectors(results);
                for (var id = 0; id < results.length; id++) {
                    var clone = definitions[i].clone();
                    clone.selector = results[id];
                    rules.push(clone);
                }

                input = next;
            }

            if (env.debug) console.warn('Resolving time: ' + ((new Date - resolvingTime)) + 'ms');
            // process.exit();
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
            // frames is a container for variables and other less.js
            // constructs.
            //
            // effects is a container for side-effects, which currently
            // are limited to FontSets.
            //
            // deferred_externals is a list of externals, like
            // pattern images, etc (by string URL)
            // referred to by url() constructs in styles
            var that = this,
                env = _.extend({
                    frames: [],
                    effects: [],
                    deferred_externals: []
                }, that.env),
                output = [];

            if (err) {
                callback(err)
                return;
            }

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

                    var definitions = that.processChain(bySymbolizer[sym]);
                    definitions = that.resolveConditions(definitions);

                    var new_style = new mess.tree.Style(
                        l.id,
                        sym,
                        definitions);
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
                    var map_properties = that.getMapProperties(rulesets, env);
                    if (env.only_validate !== true && env.deferred_externals.length) {
                        env.deferred_externals.forEach(function(def) {
                            var next = group();
                            new External(that.env, def)
                                .on('complete', function(external) {
                                    next(null, map_properties);
                                });
                        });
                    } else {
                        var next = group();
                        next(null, map_properties);
                    }
                },
                function(err, map_properties) {
                    output.unshift(
                        '<?xml version="1.0" '
                        + 'encoding="utf-8"?>\n'
                        + '<!DOCTYPE Map[]>\n'
                        + '<Map '
                        + map_properties[0]
                        + ' srs="+proj=merc +a=6378137 +b=6378137 '
                        + '+lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m '
                        + '+nadgrids=@null +no_defs">\n');

                    output.push('</Map>');

                    env.errors.map(function(e) {
                        if (!e.line && e.index && e.filename) {
                            var matches = stylesheets.filter(function(s) {
                                return s[0] == e.filename;
                            });
                            if (matches.length && matches[0][1]) {
                                return _.extend(e, matches[0][1].makeError(e));
                            }
                        }
                    });

                    callback(env.errors.length ? env.errors : null, output.join('\n'));
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
            var m = (typeof str == "string") ? JSON.parse(str) : str,
                that = this;

            var localizingTime = +new Date;
            this.localizeExternals(m, function(err, res) {
                that.ensureSRS(res, function(err, res) {
                    that.localizeStyle(res, function(err, res) {
                        if (env.debug) console.warn('Localizing time: ' + ((new Date - localizingTime)) + 'ms');
                        that.style(res, function(err, m, res) {
                            var compilingTime = +new Date;
                            that.template(err, m, res, function(err, res) {
                                if (env.debug) console.warn('COMPILING TIME: ' + ((new Date - compilingTime)) + 'ms');
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
