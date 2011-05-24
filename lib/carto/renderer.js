var path = require('path'),
    fs = require('fs'),
    External = require('./external'),
    Step = require('step'),
    _ = require('underscore')._,
    sys = require('sys'),
    srs = require('srs'),
    carto = require('carto'),
    tree = require('carto/tree');


require.paths.unshift(path.join(__dirname, '..', 'lib'));

// Rendering circuitry for JSON map manifests.
// This is node-only for the time being.
carto.Renderer = function Renderer(env) {
    env = _.extend({}, env);
    if (!env.alias) env.alias = false;
    if (!env.data_dir) env.data_dir = '/tmp/';
    if (!env.local_data_dir) env.local_data_dir = '';
    if (!env.validation_data) env.validation_data = false;

    return {
        // Keep a copy of passed-in environment variables
        env: env,

        // Ensure that map layers have a populated SRS value and attempt to
        // autodetect SRS if missing. Requires that node-srs is available and
        // that any remote datasources have been localized.
        //
        // - @param {Object} m map object.
        // - @param {Function} callback
        ensureSRS: function(m, callback) {
            if (env.only_validate === true) return callback(null, m);
            Step(function autodetectSRS() {
                var group = this.group();
                _(m.Layer).chain()
                    .filter(function(l) { return !l.srs; })
                    .each(function(l) {
                        var next = group();
                        Step(function() {
                            fs.readdir(path.dirname(l.Datasource.file), this);
                        },
                        function(err, files) {
                            if (err) throw err;
                            // Confirm that layers have .prj files
                            // in line with the .shp and .dbf, etc files.
                            var prj = _(files).detect(function(f) {
                                return path.extname(f).toLowerCase() === '.prj';
                            });
                            if (prj) {
                                prj = path.join(path.dirname(l.Datasource.file), prj);
                                fs.readFile(prj, 'utf-8', this);
                            } else {
                                this(new Error('No projection found'));
                            }
                        },
                        function(err, srs_txt) {
                            if (err) return next(err);
                            try {
                                l.srs = l.srs || srs.parse(srs_txt).proj4;
                            } catch (exc) {}
                            try {
                                l.srs = l.srs || srs.parse('ESRI::' + srs_txt).proj4;
                            } catch (exc) {}
                            next(l.srs ? null : new Error('No projection found'));
                        });
                    });
                group()();
            },
            function waitForDetection(err) {
                m.Layer = _(m.Layer).filter(function(l) { return l.srs; });
                callback(err, m);
            });
        },

        // Download any file-based remote datsources.
        //
        // Usable as an entry point: does not expect any modification to
        // the map object beyond JSON parsing.
        //
        // - @param {Object} m map object.
        // - @param {Function} callback
        localizeExternals: function(m, callback) {
            if (env.only_validate === true) return callback(null, m);
            var that = this;
            Step(function downloadExternals() {
                var group = this.group();
                m.Layer.forEach(function(l) {
                    var next = group();
                    if (!l.Datasource.file) {
                        return next(new Error('Layer does not have a datasource to download.'));
                    }

                    var external = new External(that.env, l.Datasource.file, l.name);
                    external.once('err', next)
                    external.once('complete', function(external) {
                        external.findDataFile(function(err, file) {
                            if (err) {
                                next(new Error('Datasource could not be downloaded.'));
                            } else if (!file) {
                                next(new Error('No .shp file found in zipfile'));
                            } else {
                                l.Datasource.file = file;
                                next();
                            }
                        });
                    });
                });
                // Continue even if we don't have any layers.
                group()();
            }, callback);
        },

        // Download any remote stylesheets
        //
        // - @param {Object} m map object.
        // - @param {Function} callback
        localizeStyle: function(m, callback) {
            var that = this;
            Step(function downloadStyles() {
                var group = this.group();
                m.Stylesheet.forEach(function(s, k) {
                    if (s.id) return;
                    // TODO: handle stylesheet externals
                    // that fail.
                    var next = group();
                    var external = new External(that.env, s, path.basename(s));
                    external.once('complete', function(external) {
                        m.Stylesheet[k] = external.path();
                        next();
                    });
                    external.once('err', function(err) {
                        next(new Error('Stylesheet "' + s + '" could not be loaded.'));
                    });
                });
                group()();
            }, callback);
        },

        // Compile (already downloaded) styles with carto,
        // calling callback with an array of [map object, [stylesheet objects]]
        //
        // Called with the results of localizeStyle or localizeExternals:
        // expects not to handle downloading.
        //
        // - @param {Object} m map object.
        // - @param {Function} callback
        style: function(m, callback) {
            var that = this;
            Step(
                function loadStyles() {
                    var group = this.group();
                    m.Stylesheet.forEach(function(s) {
                        var next = group();
                        // If a stylesheet is an object with an id
                        // property, it will have a .data property
                        // as well which can be parsed directly
                        if (s.id) {
                            next(null, [s.id, s.data]);
                        // Otherwise the value is assumed to be a
                        // string and is read from the filesystem
                        } else {
                            fs.readFile(s, 'utf-8', function(err, data) {
                                next(err, [s, data, 'first callback!']);
                            });
                        }
                    });
                },
                function compileStyles(err, res) {
                    var group = this.group();
                    if (err) { throw err; }
                    res.forEach(function(r) {
                        var next = group();
                        var parsingTime = +new Date();
                        // Maintain a parsing environment from
                        // stylesheet to stylesheet, so that frames
                        // and effects are maintained.
                        var parse_env = _.extend(
                            _.extend(
                                that.env,
                                this.env
                            ), { filename: r[0] });
                        (new carto.Parser(parse_env)).parse(r[1],
                            function(err, tree) {
                                if (env.benchmark) {
                                    console.warn('Parsing time: '
                                    + ((new Date() - parsingTime))
                                    + 'ms');
                                }
                                next(err, tree, 'second callback!');
                        });
                    });
                },
                function waitForCompilation(err, res, res2) {
                    callback(err, m, res);
                }
            );
        },

        addRules: function(current, definition, existing) {
            var newFilters = definition.filters;
            var newRules = definition.rules;
            var updatedFilters, clone, previous;

            // The current definition might have been split up into
            // multiple definitions already.
            for (var k = 0; k < current.length; k++) {
                updatedFilters = current[k].filters.cloneWith(newFilters);
                if (updatedFilters) {
                    previous = existing[updatedFilters];
                    if (previous) {
                        // There's already a definition with those exact
                        // filters. Add the current definitions' rules
                        // and stop processing it as the existing rule
                        // has already gone down the inheritance chain.
                        previous.addRules(newRules);
                    } else {
                        clone = current[k].clone(updatedFilters);
                        // Make sure that we're only maintaining the clone
                        // when we did actually add rules. If not, there's
                        // no need to keep the clone around.
                        if (clone.addRules(newRules)) {
                            // We inserted an element before this one, so we need
                            // to make sure that in the next loop iteration, we're
                            // not performing the same task for this element again,
                            // hence the k++.
                            current.splice(k, 0, clone);
                            k++;
                        }
                    }
                } else if (updatedFilters === null) {
                    // Filters can be added, but they don't change the
                    // filters. This means we don't have to split the
                    // definition.
                    current[k].addRules(newRules);
                }
            }
            return current;
        },

        /**
         * Apply inherited styles from their
         * ancestors to them.
         */
        inheritRules: function(definitions) {
            var inheritTime = +new Date();
            // definitions are ordered by specificity,
            // high (index 0) to low
            var byAttachment = {}, byFilter = {};
            var result = [];
            var current, previous, attachment;

            for (var i = 0; i < definitions.length; i++) {
                attachment = definitions[i].attachment;
                if (!byAttachment[attachment]) {
                    byAttachment[attachment] = [];
                    byAttachment[attachment].attachment = attachment;
                    byFilter[attachment] = {};
                    result.push(byAttachment[attachment]);
                }

                current = [definitions[i]];
                // Iterate over all subsequent rules.
                for (var j = i + 1; j < definitions.length; j++) {
                    if (definitions[j].attachment === attachment) {
                        // Only inherit rules from the same attachment.
                        current = this.addRules(current, definitions[j], byFilter);
                    }
                }

                for (var k = 0; k < current.length; k++) {
                    byFilter[attachment][current[k].filters] = current[k];
                    byAttachment[attachment].push(current[k]);
                }
            }

            if (env.benchmark) console.warn('Inheritance time: ' + ((new Date() - inheritTime)) + 'ms');

            return result;
        },

        // Find a rule like Map { background-color: #fff; },
        // if any, and return a list of properties to be inserted
        // into the <Map element of the resulting XML.
        //
        // - @param {Array} rulesets the output of toList.
        // - @param {Object} env.
        // - @return {String} rendered properties.
        getMapProperties: function(rulesets, env) {
            var rules = {};
            rulesets.filter(function(r) {
                return r.elements.join('') === 'Map';
            }).forEach(function(r) {
                for (var i = 0; i < r.rules.length; i++) {
                    var key = r.rules[i].name;
                    if (!(key in tree.Reference.data.symbolizers.map)) {
                        throw {
                            message: 'Rule ' + key + ' not allowed for Map.',
                            index: r.rules[i].index
                        };
                    }
                    rules[key] = r.rules[i].eval(env).toXML(env);
                }
            });
            return rules;
        },

        // Prepare full XML map output. Called with the results
        // of this.style
        //
        // - @param {Array} res array of [map object, stylesheets].
        // - @param {Function} callback
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
                    effects: [],
                    deferred_externals: []
                }, that.env),
                output = [];

            if (err) {
                callback(err);
                return;
            }

            var rulesets = _.flatten(stylesheets.map(function(ruleset) {
                return ruleset.toList(env);
            }));

            // Iterate through layers and create styles custom-built
            // for each of them, and apply those styles to the layers.
            m.Layer.forEach(function(l) {
                l.styles = [];
                // Classes are given as space-separated alphanumeric
                // strings.
                var classes = (l['class'] || '').split(/\s+/g);

                var matching = rulesets.filter(function(definition) {
                    return definition.appliesTo(l.name, classes);
                });

                var definitions = that.inheritRules(matching);

                for (var i = 0; i < definitions.length; i++) {
                    var style = new tree.Style(l.name, definitions[i].attachment, definitions[i]);
                    if (style) {
                        l.styles.push(style.name);

                        // env.effects can be modified by this call
                        output.push(style.toXML(env));
                    }
                }

                var nl = new carto.tree.Layer(l);
                output.push(nl.toXML());
            });
            output.unshift(env.effects.map(function(e) {
                return e.toXML(env);
            }).join('\n'));

            Step(
                function() {
                    var group = this.group();
                    try {
                        var map_properties = that.getMapProperties(rulesets, env);
                    } catch (err) {
                        env.error(err);
                        callback(env.errors);
                        return;
                    }


                    if (!map_properties.srs) {
                        map_properties.srs = 'srs="+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs +over"';
                    }

                    // The only_validate flag can be set to prevent
                    // any externals from being downloaded - for instance,
                    // when only validation is needed.
                    if (env.only_validate !== true &&
                        env.deferred_externals.length) {
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
                    var properties = [];
                    for (var key in map_properties[0]) {
                        properties.push(' ' + map_properties[0][key]);
                    }

                    output.unshift(
                        '<?xml version="1.0" '
                        + 'encoding="utf-8"?>\n'
                        + '<!DOCTYPE Map[]>\n'
                        + '<Map' + properties.join('') + '>\n');

                    output.push('</Map>');

                    if (env.errors.length) {
                        callback(env.errors);
                    } else {
                        callback(null, output.join('\n'));
                    }
                }
            );
        },

        // Prepare a MML document (given as a string) into a
        // fully-localized XML file ready for Mapnik2 consumption
        //
        // - @param {String} str the JSON file as a string.
        // - @param {Function} callback to be called with err,
        //   XML representation.
        render: function(str, callback) {
            var m = (typeof str === 'string') ? JSON.parse(str) : str,
                localizingTime,
                compilingTime,
                that = this;

            Step(function() {
                localizingTime = +new Date();
                that.localizeExternals(m, this.parallel());
                that.localizeStyle(m, this.parallel());
            },
            function(err) {
                if (err) throw err;
                that.ensureSRS(m, this);
            },
            function(err, m) {
                if (err) throw err;
                env.benchmark && console.warn(
                    'Localizing time: %s ms', +new Date - localizingTime);
                that.style(m, this);
            },
            function(err, m, res) {
                if (err) throw err;
                compilingTime = +new Date();
                that.template(err, m, res, this);
            },
            function(err, res) {
                if (err) throw err;
                env.benchmark && console.warn(
                    'Compiling time: %s ms', +new Date - compilingTime);
                callback(err, res);
            });
        }
    };
};

module.exports = carto;
