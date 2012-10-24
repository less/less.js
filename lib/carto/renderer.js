var _ = require('underscore');
var carto = require('./index');
var tree = require('./tree');

carto.Renderer = function Renderer(env, options) {
    this.env = env || {};
    this.options = options || {};
    this.options.mapnik_version = this.options.mapnik_version || 'latest';
};

// Prepare a MML document (given as an object) into a
// fully-localized XML file ready for Mapnik2 consumption
//
// - @param {String} str the JSON file as a string.
// - @param {Object} env renderer environment options.
carto.Renderer.prototype.render = function render(m, callback) {
    // effects is a container for side-effects, which currently
    // are limited to FontSets.
    var env = _(this.env).defaults({
        benchmark: false,
        validation_data: false,
        effects: []
    });

    if (!tree.Reference.setVersion(this.options.mapnik_version)) {
        return callback(new Error("Could not set mapnik version to " + this.options.mapnik_version), null);
    }

    var output = [];

    // Transform stylesheets into rulesets.
    var rulesets = _(m.Stylesheet).chain()
        .map(function(s) {
            if (typeof s == 'string') {
               throw new Error("Stylesheet object is expected not a string: '" + s + "'");
            }
            // Passing the environment from stylesheet to stylesheet,
            // allows frames and effects to be maintained.
            env = _(env).extend({filename:s.id});

            // @TODO try/catch?
            var time = +new Date(),
                root = (carto.Parser(env)).parse(s.data);
            if (env.benchmark)
                console.warn('Parsing time: ' + (new Date() - time) + 'ms');
            return root.toList(env);
        })
        .flatten()
        .value();

    // Iterate through layers and create styles custom-built
    // for each of them, and apply those styles to the layers.
    m.Layer.forEach(function(l) {
        if (env.benchmark) console.warn('processing layer: ' + l.id);
        l.styles = [];
        // Classes are given as space-separated alphanumeric strings.
        var classes = (l['class'] || '').split(/\s+/g);
        var matching = rulesets.filter(function(definition) {
            return definition.appliesTo(l.name, classes);
        });
        var rules = inheritRules(matching, env);
        var sorted = sortStyles(rules, env);
        _(sorted).each(function(rule) {
            var style = new tree.Style(l.name, rule.attachment, rule);
            if (style) {
                l.styles.push(style.name);

                // env.effects can be modified by this call
                output.push(style.toXML(env));
            }
        });
        if (l.styles.length) {
            output.push((new carto.tree.Layer(l)).toXML());
        }
    });

    output.unshift(env.effects.map(function(e) {
        return e.toXML(env);
    }).join('\n'));

    var map_properties;
    try {
        map_properties = getMapProperties(m, rulesets, env);
    } catch (err) {
        env.error(err);
        return callback(err);
    }

    // Exit on errors.
    if (env.errors) return callback(env.errors);

    // Pass TileJSON and other custom parameters through to Mapnik XML.
    var parameters = _(m).reduce(function(memo, v, k) {
        if (!v && v !== 0) return memo;

        switch (k) {
        // Non URL-bound TileJSON properties.
        case 'bounds':
        case 'center':
        case 'minzoom':
        case 'maxzoom':
        case 'version':
            memo.push('  <Parameter name="' + k + '">' + v + '</Parameter>');
            break;
        // Properties that require CDATA.
        case 'name':
        case 'description':
        case 'legend':
        case 'attribution':
        case 'template':
            memo.push('  <Parameter name="' + k + '"><![CDATA[' + v + ']]></Parameter>');
            break;
        // Mapnik image format.
        case 'format':
            memo.push('  <Parameter name="' + k + '">' + v + '</Parameter>');
            break;
        // Mapnik interactivity settings.
        case 'interactivity':
            memo.push('  <Parameter name="interactivity_layer">' + v.layer + '</Parameter>');
            memo.push('  <Parameter name="interactivity_fields">' + v.fields + '</Parameter>');
            break;
        }
        return memo;
    }, []);
    if (parameters.length) output.unshift(
        '<Parameters>\n' +
        parameters.join('\n') +
        '\n</Parameters>\n'
    );

    var properties = _(map_properties).map(function(v) { return ' ' + v; }).join('');
    output.unshift(
        '<?xml version="1.0" ' +
        'encoding="utf-8"?>\n' +
        '<!DOCTYPE Map[]>\n' +
        '<Map' + properties + ' maximum-extent="-20037508.34,-20037508.34,20037508.34,20037508.34">\n');
    output.push('</Map>');
    return callback(null, output.join('\n'));
};

// This function currently modifies 'current'
function addRules(current, definition, existing) {
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
            current[k] = current[k].clone();
            current[k].addRules(newRules);
        }
    }
    return current;
}

// Apply inherited styles from their ancestors to them.
function inheritRules(definitions, env) {
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
                current = addRules(current, definitions[j], byFilter);
            }
        }

        for (var k = 0; k < current.length; k++) {
            byFilter[attachment][current[k].filters] = current[k];
            byAttachment[attachment].push(current[k]);
        }
    }

    if (env.benchmark) console.warn('Inheritance time: ' + ((new Date() - inheritTime)) + 'ms');

    return result;
}

// Sort styles by the minimum index of their rules.
// This sorts a slice of the styles, so it returns a sorted
// array but does not change the input.
function sortStyles(styles, env) {
    styles.forEach(function(style) {
        style.index = Infinity;
        style.forEach(function(block) {
            block.rules.forEach(function(rule) {
                if (rule.index < style.index) {
                    style.index = rule.index;
                }
            });
        });
    });

    var result = styles.slice();
    result.sort(function(a, b) {
        return b.index - a.index;
    });
    return result;
}

// Find a rule like Map { background-color: #fff; },
// if any, and return a list of properties to be inserted
// into the <Map element of the resulting XML. Translates
// properties of the mml object at `m` directly into XML
// properties.
//
// - @param {Object} m the mml object.
// - @param {Array} rulesets the output of toList.
// - @param {Object} env.
// - @return {String} rendered properties.
function getMapProperties(m, rulesets, env) {
    var rules = {};
    var symbolizers = tree.Reference.data.symbolizers.map;

    _(m).each(function(value, key) {
        if (key in symbolizers) rules[key] = key + '="' + value + '"';
    });

    rulesets.filter(function(r) {
        return r.elements.join('') === 'Map';
    }).forEach(function(r) {
        for (var i = 0; i < r.rules.length; i++) {
            var key = r.rules[i].name;
            if (!(key in symbolizers)) {
                env.error({
                    message: 'Rule ' + key + ' not allowed for Map.',
                    index: r.rules[i].index
                });
            }
            rules[key] = r.rules[i].eval(env).toXML(env);
        }
    });
    return rules;
}

module.exports = carto;
module.exports.addRules = addRules;
module.exports.inheritRules = inheritRules;
module.exports.sortStyles = sortStyles;
