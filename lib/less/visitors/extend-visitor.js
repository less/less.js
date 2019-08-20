import Visitor from './visitor';
import Extend from '../tree/extend';
import Combinator from '../tree/combinator';
import Selector from '../tree/selector';
import Attribute from '../tree/attribute';

class ExtendFinderVisitor extends Visitor {
    constructor() {
      super();
      this.extendMap = [Object.create(null)];
      this.hasExtend = false;
    }
  
    _elementValue(elValue) {
      if (elValue instanceof Attribute) {
        const value = elValue.value && elValue.value.value || elValue.value;
        elValue = `[${elValue.key}${elValue.op ? elValue.op : ''}${value ? value : ''}]`;
      }
  
      return elValue;
    }
    /** Creates a simplified string to quickly match selector candidates */
  
  
    _joinPath(selArray) {
      let css = '';
      selArray.forEach(sel => {
        sel.elements.forEach(el => {
          css += el.combinator.value + this._elementValue(el.value) + '|';
        });
      });
      return css.trim();
    }
  
    run(root) {
      root = this.visit(root);
      root.extendMap = this.extendMap;
      root.hasExtend = this.hasExtend;
      return root;
    }
  
    _visitAtRule(node) {
      this.extendMap.unshift(Object.create(null));
      node.extendMap = this.extendMap.slice(0);
    }
  
    _visitAtRuleOut() {
      this.extendMap.shift();
    }
  
    visitMedia(node) {
      this._visitAtRule(node);
    }
  
    visitMediaOut() {
      this._visitAtRuleOut();
    }
  
    visitAtRule(node) {
      this._visitAtRule(node);
    }
  
    visitAtRuleOut() {
      this._visitAtRuleOut();
    }
  
    visitRuleset(rulesetNode) {
      if (rulesetNode.root) {
        return;
      }
      /** @todo document difference between `.paths` and `.selectors` */
  
  
      if (!Array.isArray(rulesetNode.paths)) {
        return;
      }
  
      const ext = this.extendMap[0];
      const rules = rulesetNode.rules;
      const ruleCnt = rules ? rules.length : 0;
      const targets = [];
      const selectorTargets = [];
      const paths = rulesetNode.paths;
      let css;
  
      const pushExtend = (node, ruleset, path) => {
        this.hasExtend = true;
        css = this._joinPath([node.selector]);
        const target = [css, node.option, node.selector.elements, ruleset];
  
        if (path) {
          selectorTargets.push([path, target]);
        } else {
          targets.push(target);
        }
      };
  
      for (let i = 0; i < ruleCnt; i++) {
        const node = rulesetNode.rules[i];
  
        if (node instanceof Extend) {
          pushExtend(node, rulesetNode);
        }
      }
  
      paths.forEach(path => {
        const sel = path[path.length - 1];
  
        if (Array.isArray(sel.extendList)) {
          sel.extendList.forEach(extend => {
            pushExtend(extend, rulesetNode, path);
          });
        }
      });
  
      const addPath = (path, targets) => {
        css = this._joinPath(path);
        targets.forEach(target => {
          const key = target[0];
          const coll = [css, path, target[1], target[2], target[3]];
  
          if (!ext[key]) {
            ext[key] = [coll];
          } else {
            ext[key].push(coll);
          }
        });
      };
  
      if (this.hasExtend) {
        paths.forEach(path => {
          addPath(path, targets);
        });
        selectorTargets.forEach(pathExtend => {
          addPath(pathExtend[0], [pathExtend[1]]);
        });
      }
    }
  
  }
  
  class ProcessExtendsVisitor extends Visitor {
    constructor() {
      super();
      this.finder = new ExtendFinderVisitor();
      this.ruleMap = {};
    }
  
    run(root) {
      root = this.finder.run(root);
  
      if (!root.hasExtend) {
        return root;
      }
  
      this.extendMap = root.extendMap;
      return this.visit(root);
    }
  
    /**
     * Create new paths given an existing selector path
     */
    _createDerived(targetPath, findElements, extend, ruleVisibility, extendVisibility) {
      const valueMap = new Map();
      const extendElements = [];
      const firstSelector = extend[0];
      extend.forEach(sel => {
        Array.prototype.push.apply(extendElements, sel.elements);
      });
      const findLength = findElements.length;
      const matches = [];
      const allMatches = [];
      let index;
      let nextMatch;
  
      const setIndex = num => {
        index = num;
        nextMatch = findElements[num];
  
        if (num === 0) {
          matches.length = 0;
        }
      };
  
      setIndex(0);
  
      const createPaths = matchArr => {
        const outputPaths = [];
        let mapCollection;
        /** We search for all combinatorial possibilities of matches */
  
        if (matchArr.length === 1) {
          mapCollection = [new Map(matchArr[0])];
        } else if (matchArr.length === 2) {
          mapCollection = [new Map(matchArr[0]), new Map(matchArr[1]), new Map(matchArr[0].concat(matchArr[1]))];
        } else {
          /** To prevent combinatorial explosion, just replace globally */
          mapCollection = [new Map(matchArr.reduce((coll, matches) => coll.concat(matches), []))];
        }
  
        mapCollection.forEach(map => {
          const paths = [];
          targetPath.forEach(sel => {
            let selectorModified = false;
            const els = [];
            let startingElement;
            sel.elements.forEach(currentEl => {
              let el = map.get(currentEl);
  
              if (el) {
                selectorModified = true;
                Array.prototype.push.apply(els, extendElements.map((newEl, i) => {
                  newEl = newEl.clone();
                  const start = startingElement || currentEl;
  
                  if (i === 0) {
                    newEl.combinator = new Combinator(start.combinator.value);
                  }
  
                  return newEl;
                }));
                startingElement = null;
              } else if (el !== false) {
                els.push(currentEl);
              } else {
                selectorModified = true;
                startingElement = currentEl;
              }
            });
  
            if (selectorModified) {
              if (els.length !== 0) {
                paths.push(new Selector(els, null, sel.condition, firstSelector.getIndex(), firstSelector.fileInfo(), sel.visibilityInfo()));
              }
            } else {
              paths.push(sel);
            }
          });
  
          if (paths.length !== 0) {
            outputPaths.push(paths);
          }
        });
        return outputPaths;
      };
  
      const getValue = value => {
        if (value instanceof Attribute) {
          let lookup = valueMap.get(value);
  
          if (!lookup) {
            lookup = this.finder._elementValue(value);
            valueMap.set(value, lookup);
          }
  
          return lookup;
        }
  
        return value;
      };
  
      targetPath.forEach(sel => {
        for (let o = 0; o < sel.elements.length; o++) {
          const currentEl = sel.elements[o];
          const nextValue = getValue(nextMatch.value);
          const currentValue = getValue(currentEl.value); // A full match
  
          if (nextValue === currentValue && (!nextMatch.combinator.value || nextMatch.combinator.value === currentEl.combinator.value)) {
            matches.push([currentEl, index === findLength - 1]);
            setIndex(index + 1);
  
            // Store as a match, and reset the finder to find more matches
            if (index === findLength) {
              allMatches.push(matches.slice(0));
              setIndex(0);
            }
          } else if (index > 0) {
            setIndex(0);
          }
        }
      });
      return createPaths(allMatches);
    }
  
    _visitAtRule(node) {
      this.extendMap = node.extendMap;
    }
  
    _visitAtRuleOut() {
      this.extendMap.shift();
    }
  
    visitMedia(node) {
      this._visitAtRule(node);
    }
  
    visitMediaOut() {
      this._visitAtRuleOut();
    }
  
    visitAtRule(node) {
      this._visitAtRule(node);
    }
  
    visitAtRuleOut() {
      this._visitAtRuleOut();
    }
  
    visitRuleset(rulesetNode) {
      if (rulesetNode.root) {
        return;
      }
  
      if (!Array.isArray(rulesetNode.paths)) {
        return;
      }
  
      const insertions = [];
      let visitedKeys;
  
      const addInsertion = (selString, basePath, ruleset) => {
        this.extendMap.forEach((map, mapIndex) => {
          const vKeys = visitedKeys[mapIndex];
  
          for (let key in map) {
            // This is a potential match
            if (selString.indexOf(key) > -1) {
              const exactMatch = selString === key;
              map[key].forEach((match, i) => {
                if (match[2] === 'all' || exactMatch) {
                  const extendRuleset = match[4];
                  const extendVisible = !extendRuleset.blocksVisibility();
                  const ruleVisible = !ruleset.blocksVisibility();
  
                  if (i === 0) {
                    if (vKeys.indexOf(key) !== -1) {
                      vKeys.push(key);
                      const sel = basePath[basePath.length - 1];
                      throw {
                        type: 'Runtime',
                        message: `Extend circular reference detected. Extend selector chain is ` + `[ ${vKeys.join(' -> ').replace(/\|/g, '')} ]`,
                        index: sel.getIndex(),
                        filename: sel.fileInfo().filename
                      };
                    }
  
                    vKeys.push(key);
                  }
  
                  const newFind = match[3];
                  const nextMatch = match[0];
                  if (extendVisible) {
                    const insertion = this._createDerived(basePath, newFind, match[1], ruleVisible, extendVisible);
                    insertions.push(insertion);
                    
                    /** Chain if next match doesn't currently match (self-referencing) */
                    if (nextMatch.indexOf(key) === -1) {
                      insertion.forEach(path => {
                        addInsertion(nextMatch, path, ruleset);
                      });
                    }
                  } else {
                    ruleset.rules = ruleset.rules.concat(extendRuleset.rules);
                    addInsertion(nextMatch, basePath, ruleset);
                  }
                }
              });
            }
          }
        });
      };
  
      rulesetNode.paths.forEach(basePath => {
        const selector = this.finder._joinPath(basePath);
  
        visitedKeys = this.extendMap.map(() => []);
        addInsertion(selector, basePath, rulesetNode);
      });
  
      /**
      *  At this point, ruleset selectors will not match paths,
      *  but this is necessary without re-writing the tree.
      */
      insertions.forEach(newPaths => {
        newPaths.forEach(path => {
          rulesetNode.paths.push(path);
        });
      });
    }
  
  }
  
  class JoinSelectorVisitor extends Visitor {
    constructor() {
      super();
      this.contexts = [[]];
    }
  
    run(root) {
      return this.visit(root);
    }
  
    visitDeclaration(declNode, visitArgs) {
      visitArgs.visitDeeper = false;
    }
  
    visitMixinDefinition(mixinDefinitionNode, visitArgs) {
      visitArgs.visitDeeper = false;
    }
  
    visitRuleset(rulesetNode, visitArgs) {
      const context = this.contexts[this.contexts.length - 1];
      const paths = [];
      let selectors;
      this.contexts.push(paths);
  
      if (!rulesetNode.root) {
        selectors = rulesetNode.selectors;
  
        if (selectors) {
          selectors = selectors.filter(selector => selector.getIsOutput());
          rulesetNode.selectors = selectors.length ? selectors : selectors = null;
  
          if (selectors) {
            rulesetNode.joinSelectors(paths, context, selectors);
          }
        }
  
        if (!selectors) {
          rulesetNode.rules = null;
        }
  
        rulesetNode.paths = paths;
      }
    }
  
    visitRulesetOut(rulesetNode) {
      this.contexts.length = this.contexts.length - 1;
    }
  
    visitMedia(mediaNode, visitArgs) {
      const context = this.contexts[this.contexts.length - 1];
      mediaNode.rules[0].root = context.length === 0 || context[0].multiMedia;
    }
  
    visitAtRule(atRuleNode, visitArgs) {
      const context = this.contexts[this.contexts.length - 1];
  
      if (atRuleNode.rules && atRuleNode.rules.length) {
        atRuleNode.rules[0].root = atRuleNode.isRooted || context.length === 0 || null;
      }
    }
  
  }

export default ProcessExtendsVisitor;