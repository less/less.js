import {
  Node,
  Declaration,
  Import,
  EvalReturn,
  ImportantNode
} from '.'
import { EvalContext } from '../contexts'

// import contexts from '../contexts';
// import globalFunctionRegistry from '../functions/function-registry';
// import defaultFunc from '../functions/default';
// import getDebugInfo from './debug-info';
// import * as utils from '../utils';

/**
 * @todo - rewrite
 * A Rules is a generic object in Less
 * 
 * It can have selectors, arguments, a set of rule nodes (as rules), and a guard
 * 
 * e.g.
 *      1. a plain qualified CSS rule [a {b: c}] will have selectors and rules
 *      2. a mixin will have selectors, args, rules, and possibly a guard
 *      3. A variable can be attached to a rules, which will then have no selectors, but can have args
 * 
 *  Rules also define a new scope object for variables and functions
 * 
 * @todo This should be broken up so that a rules is _just_ the parts between { ... }
 * @todo move selector logic to qualified rule
 */
export class Rules extends Node implements ImportantNode {
  scope: {
    [key: string]: any
  }

  /** Collect imports to start importing */
  evalForImports(context: EvalContext) {
    this.nodes.forEach(node => {
      node.childKeys.forEach(key => {
        const nodes = node.children[key]
        nodes.forEach(n => {
          if (n instanceof Import) {
            n.eval(context)
            
          }
        })
      })
    })
  }

  /**
   * This runs before full tree eval. We essentially
   * evaluate the tree enough to determine an import list.
   * 
   * ...wait, no, that's not what this does
   */
  evalImports(context: EvalContext) {
    // const rules = this.nodes
    // const numRules = rules.length
    // let importRules: EvalReturn
    
    // if (!numRules) {
    //   return
    // }

    // for (let i = 0; i < numRules; i++) {
    //   const rule = rules[i]
    //   if (rule instanceof Import) {
    //     importRules = rule.eval(context)
    //     if (Array.isArray(importRules)) {
    //       rules.splice(i, 1, ...importRules)
    //       i += importRules.length - 1
    //     } else {
    //       rules.splice(i, 1, importRules)
    //     }
    //   }
    // }
  }

  eval(context: EvalContext) {
    // inherit scope from context, which
    // inherits from the global scope object
    const currentScope = context.scope
    this.scope = Object.create(context.scope)
    context.scope = this.scope

    /** Shallow clone was here? */
    // const rules = this.clone(true)
    const rules = this

    // push the current rules to the frames stack
    const ctxFrames = context.frames
    ctxFrames.unshift(rules)

    /** Collect type groups */
    const ruleGroups: {
      imports: [number, Node][]
      first: [number, Node][]
      default: [number, Node][]
    } = {
      imports: [],
      first: [],
      default: []
    }

    let rule: Node
    const ruleset = rules.nodes
    const rulesLength = ruleset.length
    const newRules: EvalReturn[] = Array(rulesLength)
    for (let i = 0; i < rulesLength; i++) {
      if (rule instanceof Import) {
        ruleGroups.imports.push([i, rule])
      } else if (rule.evalFirst) {
        ruleGroups.first.push([i, rule])
      } else {
        ruleGroups.default.push([i, rule])
      }
    }

    // Evaluate imports
    if (this.fileInfo || !context.options.strictImports) {
      ruleGroups.imports.forEach(([i, node]) => {
        newRules[i] = node.eval(context)
      })
    }

    /** Evaluate early nodes (not sure if this is still needed) */
    ruleGroups.first.forEach(([i, node]) => {
      newRules[i] = node.eval(context)
    })

    ruleGroups.default.forEach(([i, node]) => {
      newRules[i] = node.eval(context)
    })

    let replaceRules: Node[] = []
    /** Flatten newRules list */
    newRules.forEach((rule: EvalReturn) => {
      if (rule) {
        if (Array.isArray(rule)) {
          replaceRules = replaceRules.concat(rule)
        } else {
          replaceRules.push(rule)
        }
      }
    })
    replaceRules.forEach(rule => {
      rule.parent = rules
      rule.root = rules.root
      rule.fileRoot = rules.fileRoot
    })

    rules.nodes = replaceRules

    // Store the frames around mixin definitions,
    // so they can be evaluated like closures when the time comes.

    /** @removed - special mixin call / variable call evals */

    // Evaluate everything else
    /** @removed - merging in & { } */

    // Pop the stack
    ctxFrames.shift()
    // ctxSelectors.shift()

    /** Restore original scope */
    context.scope = currentScope

    return rules;
  }

  makeImportant(): this {
    this.nodes.forEach(node => {
      if (node.hasOwnProperty('makeImportant')) {
        (<ImportantNode>node).makeImportant()
      }
    })

    return this
  }

  matchArgs(args) {
    return !args || args.length === 0
  }

  lastDeclaration() {
    const nodes = this.nodes
    const nodeLength = this.nodes.length
    for (let i = nodeLength; i > 0; i--) {
      const node = nodes[i - 1]
      if (node instanceof Declaration) {
        return node
      }
    }
  }

  getRules() {
    return this.nodes.filter((node: Node) => {
      return node instanceof Rules
    })
  }

  prependRule(rule: Node) {
    this.prependNode(this.nodes, rule)
  }

  // find(selector, self = this, filter) {
  //     const rules = [];
  //     let match;
  //     let foundMixins;
  //     const key = selector.toCSS();

  //     if (key in this._lookups) { return this._lookups[key]; }

  //     this.getRules().forEach(rule => {
  //         if (rule !== self) {
  //             for (let j = 0; j < rule.selectors.length; j++) {
  //                 match = selector.match(rule.selectors[j]);
  //                 if (match) {
  //                     if (selector.elements.length > match) {
  //                         if (!filter || filter(rule)) {
  //                             foundMixins = rule.find(new Selector(selector.elements.slice(match)), self, filter);
  //                             for (let i = 0; i < foundMixins.length; ++i) {
  //                                 foundMixins[i].path.push(rule);
  //                             }
  //                             Array.prototype.push.apply(rules, foundMixins);
  //                         }
  //                     } else {
  //                         rules.push({ rule, path: []});
  //                     }
  //                     break;
  //                 }
  //             }
  //         }
  //     });
  //     this._lookups[key] = rules;
  //     return rules;
  // }

  // genCSS(context, output) {
  //     let i;
  //     let j;
  //     const charsetRuleNodes = [];
  //     let ruleNodes = [];

  //     let // Line number debugging
  //         debugInfo;

  //     let rule;
  //     let path;

  //     context.tabLevel = (context.tabLevel || 0);

  //     if (!this.root) {
  //         context.tabLevel++;
  //     }

  //     const tabRuleStr = context.compress ? '' : Array(context.tabLevel + 1).join('  ');
  //     const tabSetStr = context.compress ? '' : Array(context.tabLevel).join('  ');
  //     let sep;

  //     let charsetNodeIndex = 0;
  //     let importNodeIndex = 0;
  //     for (i = 0; (rule = this.rules[i]); i++) {
  //         if (rule instanceof Comment) {
  //             if (importNodeIndex === i) {
  //                 importNodeIndex++;
  //             }
  //             ruleNodes.push(rule);
  //         } else if (rule.isCharset && rule.isCharset()) {
  //             ruleNodes.splice(charsetNodeIndex, 0, rule);
  //             charsetNodeIndex++;
  //             importNodeIndex++;
  //         } else if (rule.type === 'Import') {
  //             ruleNodes.splice(importNodeIndex, 0, rule);
  //             importNodeIndex++;
  //         } else {
  //             ruleNodes.push(rule);
  //         }
  //     }
  //     ruleNodes = charsetRuleNodes.concat(ruleNodes);

  //     // If this is the root node, we don't render
  //     // a selector, or {}.
  //     if (!this.root) {
  //         debugInfo = getDebugInfo(context, this, tabSetStr);

  //         if (debugInfo) {
  //             output.add(debugInfo);
  //             output.add(tabSetStr);
  //         }

  //         const paths = this.paths;
  //         const pathCnt = paths.length;
  //         let pathSubCnt;

  //         sep = context.compress ? ',' : (`,\n${tabSetStr}`);

  //         for (i = 0; i < pathCnt; i++) {
  //             path = paths[i];
  //             if (!(pathSubCnt = path.length)) { continue; }
  //             if (i > 0) { output.add(sep); }

  //             context.firstSelector = true;
  //             path[0].genCSS(context, output);

  //             context.firstSelector = false;
  //             for (j = 1; j < pathSubCnt; j++) {
  //                 path[j].genCSS(context, output);
  //             }
  //         }

  //         output.add((context.compress ? '{' : ' {\n') + tabRuleStr);
  //     }

  //     // Compile rules
  //     for (i = 0; (rule = ruleNodes[i]); i++) {

  //         if (i + 1 === ruleNodes.length) {
  //             context.lastRule = true;
  //         }

  //         const currentLastRule = context.lastRule;
  //         if (rule.isRulesLike(rule)) {
  //             context.lastRule = false;
  //         }

  //         if (rule.genCSS) {
  //             rule.genCSS(context, output);
  //         } else if (rule.value) {
  //             output.add(rule.value.toString());
  //         }

  //         context.lastRule = currentLastRule;

  //         if (!context.lastRule && rule.isVisible()) {
  //             output.add(context.compress ? '' : (`\n${tabRuleStr}`));
  //         } else {
  //             context.lastRule = false;
  //         }
  //     }

  //     if (!this.root) {
  //         output.add((context.compress ? '}' : `\n${tabSetStr}}`));
  //         context.tabLevel--;
  //     }

  //     if (!output.isEmpty() && !context.compress && this.firstRoot) {
  //         output.add('\n');
  //     }
  // }
}

Rules.prototype.type = 'Rules'
export default Rules
