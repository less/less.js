var path = require('path'),
    fs = require('fs'),
    External = require('./external'),
    Step = require('step'),
    _ = require('underscore')._,
    sys = require('sys'),
    carto = require('carto'),
    tree = require('carto/tree');

require.paths.unshift(path.join(__dirname, '..', 'lib'));

// Rendering circuitry for JSON map manifests.
// This is node-only for the time being.
carto.Renderer = function Renderer(env) {
    env = _.extend({}, env);
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
                                // Confirm that layers have .prj files 
                                // in line with the .shp and .dbf, etc files.
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
                                    if (!l.srs) {
                                        try {
                                            l.srs = require('srs').parse('ESRI::' + srs).proj4;
                                        } catch(err) {}
                                    }
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

        // Download any file-based remote datsources.
        //
        // Usable as an entry point: does not expect any modification to
        // the map object beyond JSON parsing.
        //
        // - @param {Object} m map object.
        // - @param {Function} callback
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
                                    external.findDataFile(function(err, file) {
                                        if (err) {
                                            next(err);
                                        }
                                        else if (file) {
                                            l.Datasource.file = file;
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

        // Download any remote stylesheets
        //
        // - @param {Object} m map object.
        // - @param {Function} callback
        localizeStyle: function(m, callback) {
            var that = this;
            Step(
                function downloadStyles() {
                    var group = this.group();
                    m.Stylesheet.forEach(function(s, k) {
                        if (!s.id) {
                            var next = group();
                            // TODO: handle stylesheet externals
                            // that fail.
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
                        // Maintain a parsing environment from
                        // stylesheet to stylesheet, so that frames
                        // and effects are maintained.
                        var parse_env = _.extend(
                            _.extend(
                                that.env,
                                this.env
                            ), { filename: result[0] });
                        new carto.Parser(parse_env).parse(result[1],
                            function(err, tree) {
                            if (env.benchmark) console.warn('Parsing time: '
                                + ((new Date - parsingTime))
                                + 'ms');
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

                current = [ definitions[i] ];
                // Iterate over all subsequent rules.
                for (var j = i + 1; j < definitions.length; j++) {
                    if (definitions[j].attachment === attachment) {
                        // Only inherit rules from the same attachment.
                        current = this.addRules(current, definitions[j], byFilter);
                    }
                }

                for (var j = 0; j < current.length; j++) {
                    byFilter[attachment][current[j].filters] = current[j];
                    byAttachment[attachment].push(current[j]);
                }
            }

            if (env.benchmark) console.warn('Inheritance time: ' + ((new Date - inheritTime)) + 'ms');

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

            var rulesets = _.flatten(stylesheets.map(function(rulesets) {
                return rulesets[1].toList(env);
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
                    } catch(err) {
                        env.error(err);
                        callback(env.errors);
                        return;
                    }


                    if (!map_properties.srs) {
                        map_properties.srs = 'srs="+proj=merc +a=6378137 ' +
                            '+b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 ' +
                            '+k=1.0 +units=m +nadgrids=@null +no_defs +over"';
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
                        callback(null, output.join('\n'))
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
            var m = (typeof str == "string") ? JSON.parse(str) : str,
                that = this;

            var localizingTime = +new Date;
            this.localizeExternals(m, function(err, res) {
                that.ensureSRS(res, function(err, res) {
                    that.localizeStyle(res, function(err, res) {
                        if (env.benchmark) console.warn('Localizing time: '
                            + ((new Date - localizingTime)) + 'ms');
                        that.style(res, function(err, m, res) {
                            var compilingTime = +new Date;
                            that.template(err, m, res, function(err, res) {
                                if (env.benchmark) console.warn('Compiling time: '
                                    + ((new Date - compilingTime)) + 'ms');
                                callback(err, res);
                            });
                        });
                    });
                });
            });
        }
    };
};

module.exports = carto;
