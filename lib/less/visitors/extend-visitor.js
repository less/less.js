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
  
      const joinPaths = (selArray) => {
        let css = ''
        selArray.forEach(sel => {
          css += sel.toCSS();
        });
        return css.trim();
      };
  
      if (hasExtend) {
        rulesetNode.selectors.forEach((sel, i) => {
          css = joinPaths(paths[i]);
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
  
      let selOffset = 0;
      const insertions = [];
  
      const createDerived = (targetSel, findElements, extend) => {
        let startIndex = -1;
        const startElement = findElements[0];
  
        for(let o = 0; o < targetSel.elements.length; o++) {
          const outerEl = targetSel.elements[o];
          if (
            startElement.value === outerEl.value &&
            (!startElement.combinator.value ||
              startElement.combinator.value === outerEl.combinator.value
            )
          ) {
            startIndex = o;
            break;
          }
        }
  
        const insertedElements = extend.elements.map((el, i) => {
          el = el.clone();
          if (i === 0) {
            el.combinator = new Combinator(targetSel.elements[startIndex].combinator.value);
          }
          return el;
        });
        
        const elements = targetSel.elements.slice(0, startIndex).concat(insertedElements).concat(targetSel.elements.slice(startIndex + findElements.length));
        return new Selector(
          elements,
          null,
          targetSel.condition,
          extend.getIndex(),
          extend.fileInfo(),
          targetSel.visibilityInfo()
        );
      };
  
      const addInsertion = (selectorString, baseSelector, findElements, i) => {
        this.keys.forEach(key => {
          // This is a potential match
          if (selectorString.indexOf(key) > -1) {
            const exactMatch = selectorString === key;
            this.extendMap[key].forEach(match => {
              if (match[2] === 'all' || exactMatch) {
                selOffset++;
                findElements = findElements || this.extendKeyMap[key];
                const insertion = createDerived(baseSelector, findElements, match[1]);
                insertions.push([insertion, i + selOffset]);
                addInsertion(match[0], baseSelector, findElements, i);
              }
            });
          }
        });
      };
  
      rulesetNode.selectors.forEach((sel, i) => {
        const selector = sel.toCSS().trim();
        addInsertion(selector, sel, null, i);
      });
  
      insertions.forEach(insertion => {
        // rulesetNode.selectors.splice(insertion[1], 0, insertion[0]);
        rulesetNode.selectors.push(insertion[0]);
      });
  
      const pathPrefix = rulesetNode.paths[0].slice(0, rulesetNode.paths[0].length - 1);
  
      rulesetNode.selectors.forEach((sel, i) => {
        rulesetNode.paths[i] = pathPrefix.concat([sel]);
      })
    }
  
  }

  export default ProcessExtendsVisitor;