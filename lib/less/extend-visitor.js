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
            for(i = 0; i < rulesetNode.paths.length; i++) {
                var selectorPath = rulesetNode.paths[i],
                    selector = selectorPath[selectorPath.length-1];
                extendList = selector.extendList.slice(0).concat(allSelectorsExtendList).map(function(allSelectorsExtend) {
                    return allSelectorsExtend.clone();
                });
                for(j = 0; j < extendList.length; j++) {
                    extend = extendList[j];
                    extend.findSelfSelectors(selectorPath);
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
                for(i = 0; i < rulesetNode.paths.length; i++) {
                    selectorPath = rulesetNode.paths[i];
                    var matches = this.findMatch(allExtends[k], selectorPath);
                    if (matches.length) {
                        allExtends[k].selfSelectors.forEach(function(selfSelector) {
                            var currentSelectorPathIndex = 0,
                                currentSelectorPathElementIndex = 0,
                                path = [];
                            for(j = 0; j < matches.length; j++) {
                                match = matches[j];
                                var selector = selectorPath[match.pathIndex],
                                    firstElement = new tree.Element(
                                        match.initialCombinator,
                                        selfSelector.elements[0].value,
                                        selfSelector.elements[0].index
                                    );

                                if (match.pathIndex > currentSelectorPathIndex && currentSelectorPathElementIndex > 0) {
                                    path[path.length-1].elements = path[path.length-1].elements.concat(selectorPath[currentSelectorPathIndex].elements.slice(currentSelectorPathElementIndex));
                                    currentSelectorPathElementIndex = 0;
                                    currentSelectorPathIndex++;
                                }

                                path = path.concat(selectorPath.slice(currentSelectorPathIndex, match.pathIndex));

                                path.push(new tree.Selector(
                                    selector.elements
                                        .slice(currentSelectorPathElementIndex, match.index)
                                        .concat([firstElement])
                                        .concat(selfSelector.elements.slice(1))
                                ));
                                currentSelectorPathIndex = match.endPathIndex;
                                currentSelectorPathElementIndex = match.endPathElementIndex;
                                if (currentSelectorPathElementIndex >= selector.elements.length) {
                                    currentSelectorPathElementIndex = 0;
                                    currentSelectorPathIndex++;
                                }
                            }

                            if (currentSelectorPathIndex < selectorPath.length && currentSelectorPathElementIndex > 0) {
                                path[path.length-1].elements = path[path.length-1].elements.concat(selectorPath[currentSelectorPathIndex].elements.slice(currentSelectorPathElementIndex));
                                currentSelectorPathElementIndex = 0;
                                currentSelectorPathIndex++;
                            }

                            path = path.concat(selectorPath.slice(currentSelectorPathIndex, selectorPath.length));

                            selectorsToAdd.push(path);
                        });
                    }
                }
            }
            rulesetNode.paths = rulesetNode.paths.concat(selectorsToAdd);
        },
        findMatch: function (extend, selectorPath) {
            var i, j, k, l, targetElementIndex, element, hasMatch, potentialMatches = [], potentialMatch, matches = [];
            for(k = 0; k < selectorPath.length; k++) {
                selector = selectorPath[k];
                for(i = 0; i < selector.elements.length; i++) {
                    potentialMatches.push({pathIndex: k, index: i, matched: 0});

                    for(l = 0; l < potentialMatches.length; l++) {
                        potentialMatch = potentialMatches[l];
                        targetElementIndex = i;
                        for(j = potentialMatch.matched; j < extend.selector.elements.length && targetElementIndex < selector.elements.length; j++, targetElementIndex++) {
                            potentialMatch.matched = j + 1;
                            if (extend.selector.elements[j].value !== selector.elements[targetElementIndex].value ||
                                (j > 0 && extend.selector.elements[j].combinator.value !== selector.elements[targetElementIndex].combinator.value)) {
                                potentialMatch = null;
                                break;
                            }
                        }
                        if (potentialMatch) {
                            if (potentialMatch.matched === extend.selector.elements.length) {
                                potentialMatch.initialCombinator = selector.elements[i].combinator;
                                potentialMatch.length = extend.selector.elements.length;
                                potentialMatch.endPathIndex = k;
                                potentialMatch.endPathElementIndex = targetElementIndex; // index after end of match
                                potentialMatches.length = 0;
                                matches.push(potentialMatch);
                                break;
                            }
                        } else {
                            potentialMatches.splice(l, 1);
                            l--;
                        }
                    }
                }
            }
            return matches;
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