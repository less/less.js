(function (tree) {
    tree.extendFinderVisitor = function() {
        this._visitor = new tree.visitor(this);
        this.contexts = [];
        this.allExtendsStack = [[]];
    };

    tree.extendFinderVisitor.prototype = {
        run: function (root) {
            root = this._visitor.visit(root);
            root.allExtends = this.allExtendsStack[0];
            return root;
        },
        visitRule: function (ruleNode, visitArgs) {
            visitArgs.visitDeeper = false;
        },
        visitMixinDefinition: function (mixinDefinitionNode, visitArgs) {
            visitArgs.visitDeeper = false;
        },
        visitRuleset: function (rulesetNode, visitArgs) {

            if (rulesetNode.root) {
                return;
            }

            var i, j, extend, allSelectorsExtendList = [], extendList;

            // get &:extend(.a); rules which apply to all selectors in this ruleset
            for(i = 0; i < rulesetNode.rules.length; i++) {
                if (rulesetNode.rules[i] instanceof tree.Extend) {
                    allSelectorsExtendList.push(rulesetNode.rules[i]);
                }
            }

            // now find every selector and apply the extends that apply to all extends
            // and the ones which apply to an individual extend
            for(i = 0; i < rulesetNode.selectors.length; i++) {
                var selector = rulesetNode.selectors[i];
                extendList = selector.extendList.slice(0).concat(allSelectorsExtendList.map(function(allSelectorsExtend) {
                    return allSelectorsExtend.clone();
                }));
                for(j = 0; j < extendList.length; j++) {
                    extend = extendList[j];
                    extend.findSelfSelectors([[selector]].concat(this.contexts.slice(0)));
                    this.allExtendsStack[this.allExtendsStack.length-1].push(extend);
                }
            }

            this.contexts.push(rulesetNode.selectors);
        },
        visitRulesetOut: function (rulesetNode) {
            if (!rulesetNode.root) {
                this.contexts.length = this.contexts.length - 1;
            }
        },
        visitMedia: function (mediaNode, visitArgs) {
            mediaNode.allExtends = [];
            this.allExtendsStack.push(mediaNode.allExtends);
        },
        visitMediaOut: function (mediaNode) {
            this.allExtendsStack.length = this.allExtendsStack.length - 1;
        },
        visitDirective: function (directiveNode, visitArgs) {
            directiveNode.allExtends = [];
            this.allExtendsStack.push(directiveNode.allExtends);
        },
        visitDirectiveOut: function (directiveNode) {
            this.allExtendsStack.length = this.allExtendsStack.length - 1;
        }
    };

    tree.processExtendsVisitor = function() {
        this._visitor = new tree.visitor(this);
        this._searches
    };

    tree.processExtendsVisitor.prototype = {
        run: function(root) {
            var extendFinder = new tree.extendFinderVisitor();
            extendFinder.run(root);
            this.allExtendsStack = [root.allExtends];
            return this._visitor.visit(root);
        },
        visitRule: function (ruleNode, visitArgs) {
            visitArgs.visitDeeper = false;
        },
        visitMixinDefinition: function (mixinDefinitionNode, visitArgs) {
            visitArgs.visitDeeper = false;
        },
        visitSelector: function (selectorNode, visitArgs) {
            visitArgs.visitDeeper = false;
        },
        visitRuleset: function (rulesetNode, visitArgs) {
            if (rulesetNode.root) {
                return;
            }
            var i, j, k, selector, element, allExtends = this.allExtendsStack[this.allExtendsStack.length-1], selectorsToAdd = [];

            for(k = 0; k < allExtends.length; k++) {
                for(i = 0; i < rulesetNode.selectors.length; i++) {
                    selector = rulesetNode.selectors[i];
                    var match = this.findMatch(allExtends[k], selector);
                    if (match) {
                        allExtends[k].selfSelectors.forEach(function(selfSelector) {
                            var firstElement = new tree.Element(
                                match.initialCombinator,
                                selfSelector.elements[0].value,
                                selfSelector.elements[0].index
                            );
                            selectorsToAdd.push(new tree.Selector(
                                selector.elements
                                    .slice(0, match.index)
                                    .concat([firstElement])
                                    .concat(selfSelector.elements.slice(1))
                                    .concat(selector.elements.slice(match.index + match.length))
                            ));
                        });
                    }
                }
            }
            rulesetNode.selectors = rulesetNode.selectors.concat(selectorsToAdd);
        },
        findMatch: function (extend, selector) {
            var i, j, element, hasMatch;
            for(i = 0; i <= (selector.elements.length - extend.selector.elements.length); i++) {
                hasMatch = true;
                for(j = 0; j < extend.selector.elements.length; j++) {
                    if (extend.selector.elements[j].value !== selector.elements[i+j].value) {
                        hasMatch = false;
                        break;
                    }
                }
                if (hasMatch) {
                    return {index: i, initialCombinator: selector.elements[i].combinator, length: extend.selector.elements.length};
                }
            }
            return null;
        },
        visitRulesetOut: function (rulesetNode) {
        },
        visitMedia: function (mediaNode, visitArgs) {
            this.allExtendsStack.push(mediaNode.allExtends.concat(this.allExtendsStack[this.allExtendsStack.length-1]));
        },
        visitMediaOut: function (mediaNode) {
            this.allExtendsStack.length = this.allExtendsStack.length - 1;
        },
        visitDirective: function (directiveNode, visitArgs) {
            this.allExtendsStack.push(directiveNode.allExtends.concat(this.allExtendsStack[this.allExtendsStack.length-1]));
        },
        visitDirectiveOut: function (directiveNode) {
            this.allExtendsStack.length = this.allExtendsStack.length - 1;
        }
    };

})(require('./tree'));