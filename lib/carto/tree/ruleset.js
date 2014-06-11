(function(tree) {

tree.Ruleset = function Ruleset(selectors, rules) {
    this.selectors = selectors;
    this.rules = rules;
    // static cache of find() function
    this._lookups = {};
};
tree.Ruleset.prototype = {
    is: 'ruleset',
    'ev': function(env) {
        var i,
            ruleset = new tree.Ruleset(this.selectors, this.rules.slice(0));
        ruleset.root = this.root;

        // push the current ruleset to the frames stack
        env.frames.unshift(ruleset);

        // Evaluate everything else
        for (i = 0, rule; i < ruleset.rules.length; i++) {
            rule = ruleset.rules[i];
            ruleset.rules[i] = rule.ev ? rule.ev(env) : rule;
        }

        // Pop the stack
        env.frames.shift();

        return ruleset;
    },
    match: function(args) {
        return !args || args.length === 0;
    },
    variables: function() {
        if (this._variables) { return this._variables; }
        else {
            return this._variables = this.rules.reduce(function(hash, r) {
                if (r instanceof tree.Rule && r.variable === true) {
                    hash[r.name] = r;
                }
                return hash;
            }, {});
        }
    },
    variable: function(name) {
        return this.variables()[name];
    },
    rulesets: function() {
        if (this._rulesets) { return this._rulesets; }
        else {
            return this._rulesets = this.rules.filter(function(r) {
                return (r instanceof tree.Ruleset);
            });
        }
    },
    find: function(selector, self) {
        self = self || this;
        var rules = [], rule, match,
            key = selector.toString();

        if (key in this._lookups) { return this._lookups[key]; }

        this.rulesets().forEach(function(rule) {
            if (rule !== self) {
                for (var j = 0; j < rule.selectors.length; j++) {
                    match = selector.match(rule.selectors[j]);
                    if (match) {
                        if (selector.elements.length > 1) {
                            Array.prototype.push.apply(rules, rule.find(
                                new tree.Selector(null, null, null, selector.elements.slice(1)), self));
                        } else {
                            rules.push(rule);
                        }
                        break;
                    }
                }
            }
        });
        return this._lookups[key] = rules;
    },
    // Zooms can use variables. This replaces tree.Zoom objects on selectors
    // with simple bit-arrays that we can compare easily.
    evZooms: function(env) {
        for (var i = 0; i < this.selectors.length; i++) {
            var zval = tree.Zoom.all;
            for (var z = 0; z < this.selectors[i].zoom.length; z++) {
                zval = zval & this.selectors[i].zoom[z].ev(env).zoom;
            }
            this.selectors[i].zoom = zval;
        }
    },
    flatten: function(result, parents, env) {
        var selectors = [], i, j;
        if (this.selectors.length === 0) {
            env.frames = env.frames.concat(this.rules);
        }
        // evaluate zoom variables on this object.
        this.evZooms(env);
        for (i = 0; i < this.selectors.length; i++) {
            var child = this.selectors[i];

            if (!child.filters) {
                // TODO: is this internal inconsistency?
                // This is an invalid filterset.
                continue;
            }

            if (parents.length) {
                for (j = 0; j < parents.length; j++) {
                    var parent = parents[j];

                    var mergedFilters = parent.filters.cloneWith(child.filters);
                    if (mergedFilters === null) {
                        // Filters could be added, but they didn't change the
                        // filters. This means that we only have to clone when
                        // the zoom levels or the attachment is different too.
                        if (parent.zoom === (parent.zoom & child.zoom) &&
                            parent.frame_offset === child.frame_offset &&
                            parent.attachment === child.attachment &&
                            parent.elements.join() === child.elements.join()) {
                            selectors.push(parent);
                            continue;
                        } else {
                            mergedFilters = parent.filters;
                        }
                    } else if (!mergedFilters) {
                        // The merged filters are invalid, that means we don't
                        // have to clone.
                        continue;
                    }

                    var clone = Object.create(tree.Selector.prototype);
                    clone.filters = mergedFilters;
                    clone.zoom = parent.zoom & child.zoom;
                    clone.frame_offset = child.frame_offset;
                    clone.elements = parent.elements.concat(child.elements);
                    if (parent.attachment && child.attachment) {
                        clone.attachment = parent.attachment + '/' + child.attachment;
                    }
                    else clone.attachment = child.attachment || parent.attachment;
                    clone.conditions = parent.conditions + child.conditions;
                    clone.index = child.index;
                    selectors.push(clone);
                }
            } else {
                selectors.push(child);
            }
        }

        var rules = [];
        for (i = 0; i < this.rules.length; i++) {
            var rule = this.rules[i];

            // Recursively flatten any nested rulesets
            if (rule instanceof tree.Ruleset) {
                rule.flatten(result, selectors, env);
            } else if (rule instanceof tree.Rule) {
                rules.push(rule);
            } else if (rule instanceof tree.Invalid) {
                env.error(rule);
            }
        }

        var index = rules.length ? rules[0].index : false;
        for (i = 0; i < selectors.length; i++) {
            // For specificity sort, use the position of the first rule to allow
            // defining attachments that are under current element as a descendant
            // selector.
            if (index !== false) {
                selectors[i].index = index;
            }
            result.push(new tree.Definition(selectors[i], rules.slice()));
        }

        return result;
    }
};
})(require('../tree'));
