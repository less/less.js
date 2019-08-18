import Visitor from './visitor';
import Extend from '../tree/extend';
import Combinator from '../tree/combinator';
import Selector from '../tree/selector';

class ExtendFinderVisitor extends Visitor {
    constructor() {
        super();
        this.extendMap = {};
        this.extendKeyMap = {};
    }
  
    _joinPaths(selArray) {
        let css = '';
        selArray.forEach(sel => {
            css += sel.toCSS();
        });
        return css.trim();
    };
  
    run(root) {
        root = this.visit(root);
        root.extendMap = this.extendMap;
        root.extendKeyMap = this.extendKeyMap;
        return root;
    }
  
    visitDeclaration(declNode, visitArgs) {
        visitArgs.visitDeeper = false;
    }
  
    visitMixinDefinition(mixinDefinitionNode, visitArgs) {
        visitArgs.visitDeeper = false;
    }
  
    visitRuleset(rulesetNode) {
        if (rulesetNode.root) {
            return;
        }

        /** @todo what's the difference between `.paths` and `.selectors`? */
        if (!Array.isArray(rulesetNode.selectors)) {
            return;
        }
  
        const ext = this.extendMap;
        const extMap = this.extendKeyMap;
        const rules = rulesetNode.rules;
        const ruleCnt = rules ? rules.length : 0;
        const targets = [];
        let hasExtend = false;
        let css;
        const paths = rulesetNode.paths;
  
        const pushExtend = node => {
            hasExtend = true;
            css = node.selector.toCSS().trim();
            targets.push([css, node.option, node.selector.elements]);
        };
  
        for (let i = 0; i < ruleCnt; i++) {
            const node = rulesetNode.rules[i];
  
            if (node instanceof Extend) {
                pushExtend(node);
            }
        }
  
        rulesetNode.selectors.forEach(sel => {
            if (Array.isArray(sel.extendList)) {
                sel.extendList.forEach(pushExtend);
            }
        });
  
        if (hasExtend) {
            rulesetNode.selectors.forEach((sel, i) => {
                css = this._joinPaths(paths[i]);
                targets.forEach(target => {
                    const key = target[0];
  
                    if (!ext[key]) {
                        ext[key] = [[css, sel, target[1]]];
                        extMap[key] = target[2];
                    } else {
                        ext[key].push([css, sel, target[1]]);
                    }
                });
            });
        }
    }
  
}
  
class ProcessExtendsVisitor extends Visitor {
    constructor() {
        super();
        this.finder = new ExtendFinderVisitor();
    }
  
    run(root) {
        root = this.finder.run(root);
        this.extendMap = root.extendMap;
        this.extendKeyMap = root.extendKeyMap;
        this.keys = Object.keys(this.extendMap);
        return this.visit(root);
    }
  
    visitRuleset(rulesetNode) {
        if (rulesetNode.root) {
            return;
        }
  
        if (!Array.isArray(rulesetNode.selectors)) {
            return;
        }
  
        const insertions = [];
  
        const createDerived = (targetPath, findElements, extend) => {
            const matchArray = new Array(findElements.length);
            let needle = 0;
            let currentExtend = findElements[0];
            const outputPaths = [];
  
            const addPath = (matchArr) => {
                let n = 0;
                const pathCollection = [];
                targetPath.forEach((sel, i) => {
                    const startPos = matchArr[n];
                    if (startPos[0] === i) {
                        const startIndex = startPos[1];
                        const insertedElements = extend.elements.map((el, o) => {
                            el = el.clone();
                            if (o === 0) {
                                el.combinator = new Combinator(sel.elements[startIndex].combinator.value);
                            }
                            return el;
                        });
        
                        const elements = sel.elements.slice(0, startIndex)
                            .concat(insertedElements)
                            .concat(sel.elements.slice(startIndex + findElements.length));
                        pathCollection.push(new Selector(elements, null, sel.condition, extend.getIndex(), extend.fileInfo(), sel.visibilityInfo()));
                    } else {
                        pathCollection.push(sel);
                    }
                });
                outputPaths.push(pathCollection);
            };
  
            targetPath.forEach((sel, i) => {
                for (let o = 0; o < sel.elements.length; o++) {
                    const outerEl = sel.elements[o];
                    if (currentExtend.value === outerEl.value &&
                        (!currentExtend.combinator.value || currentExtend.combinator.value === outerEl.combinator.value)) {
                        matchArray[needle] = [i, o];
                        needle++;
                        // A full match
                        if (needle === findElements.length) {
                            addPath(matchArray.slice(0));
                            needle = 0;
                            currentExtend = findElements[0];
                        }
                    } else if (needle > 0) {
                        needle = 0;
                        currentExtend = findElements[0];
                    }
                }
            });
  
            return outputPaths;
        };
  
        const addInsertion = (selectorString, basePath, findElements, i) => {
            this.keys.forEach(key => {
                // This is a potential match
                if (selectorString.indexOf(key) > -1) {
                    const exactMatch = selectorString === key;
                    this.extendMap[key].forEach(match => {
                        if (match[2] === 'all' || exactMatch) {
                            selOffset++;
                            findElements = findElements || this.extendKeyMap[key];
                            const insertion = createDerived(basePath, findElements, match[1]);
                            insertions.push([insertion, i]);
                            addInsertion(match[0], basePath, findElements, i);
                        }
                    });
                }
            });
        };
  
        rulesetNode.paths.forEach((path, i) => {
            const selector = this.finder._joinPaths(path);
            const basePath = path;
            addInsertion(selector, basePath, null, i);
        });
  
        // rulesetNode.selectors.forEach((sel, i) => {
        //   const selector = sel.toCSS().trim();
        
        // });
        insertions.forEach(insertion => {
            const newPaths = insertion[0];
            newPaths.forEach(path => {
                rulesetNode.paths.push(path);
                rulesetNode.selectors.push(path[path.length - 1]);
            });
        });
    }
  
}

export default ProcessExtendsVisitor;