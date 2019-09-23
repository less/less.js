import {
  Node,
  INodeOptions,
  ILocationInfo,
  IProps,
  Rules,
  List,
  Selector
} from '.'

import { mergeList } from '../util/math'
import { EvalContext } from '../contexts'

export type IQualifiedRuleProps = {
  selectors: Node[]
  rules: Rules,
  condition?: Node
}
/**
 * A Qualified Rule is a rules preceded by selectors.
 * In Less, it may also have a condition node.
 */
export class QualifiedRule extends Node {
  rules: Node[]
  selectors: Node[]
  condition: Node[]

  constructor(props: IQualifiedRuleProps, options: INodeOptions, location: ILocationInfo) {
    const { selectors, rules, condition } = props
    const newProps: IProps = {
      rules: [rules]
    }
    if (selectors.length !== 1) {
      newProps.selectors = [new List(selectors)]
    }
    if (condition) {
      newProps.condition = [condition]
    }
    super(newProps, options, location)
  }

  eval(context: EvalContext) {
     /**
     * Selector eval is not like other evals that flatten arrays into the container array
     * Instead, we use the mergeList utility
     */
    const selectorList = this.children.selectors[0].clone()
    const selectors = selectorList.nodes
    const createdSelectors: Selector[] = []

    if (selectors && selectors.length > 0) {
      selectors.forEach((sel: Selector) => {
        sel.eval(context)
        const elements = sel.nodes
        const selectorList: Element[][] = mergeList(elements)
        selectorList.forEach(elementList => {
          const newSelector = sel.clone()
          newSelector.nodes = elementList
          createdSelectors.push(newSelector)
        })
      })
      this.children.selectors[0].nodes = createdSelectors
    }

     // currrent selectors
     let ctxSelectors = context.selectors
     if (!ctxSelectors) {
       context.selectors = ctxSelectors = []
     }
     ctxSelectors.unshift(this.selectors)

    let selCnt: number
    let selector: Node
    let i: number
    let hasVariable: boolean
    let hasOnePassingSelector: boolean = false;

    if (this.children.selectors && (selCnt = this.children.selectors.length)) {
      selectors = new Array(selCnt)
      defaultFunc.error({
        type: 'Syntax',
        message: 'it is currently only allowed in parametric mixin guards,'
      })

      for (i = 0; i < selCnt; i++) {
        selector = this.selectors[i].eval(context)
        for (var j = 0; j < selector.elements.length; j++) {
            if (selector.elements[j].isVariable) {
                hasVariable = true
                break;
            }
        }
        selectors[i] = selector;
        if (selector.evaldCondition) {
            hasOnePassingSelector = true;
        }
      }

      if (hasVariable) {
          const toParseSelectors = new Array(selCnt);
          for (i = 0; i < selCnt; i++) {
              selector = selectors[i];
              toParseSelectors[i] = selector.toCSS(context);
          }
      }

      defaultFunc.reset()
    } else {
        hasOnePassingSelector = true
    }
    // if (!hasOnePassingSelector) {
    //   rules.length = 0;
    // }
    const { mediaBlocks } = context
    const mediaBlockCount = (mediaBlocks && mediaBlocks.length) || 0
    /** Bubble selectors up through rules... move to qualified rules probably */
    
    if (mediaBlocks) {
        for (let i = mediaBlockCount; i < mediaBlocks.length; i++) {
        mediaBlocks[i].bubbleSelectors(selectors)
        }
    }
  }

    // lets you call a css selector with a guard
    matchCondition(args, context) {
        const lastSelector = this.selectors[this.selectors.length - 1];
        if (!lastSelector.evaldCondition) {
            return false;
        }
        if (lastSelector.condition &&
            !lastSelector.condition.eval(
                new contexts.Eval(context,
                    context.frames))) {
            return false;
        }
        return true;
    }

  joinSelectors(paths, context, selectors) {
    for (let s = 0; s < selectors.length; s++) {
        this.joinSelector(paths, context, selectors[s]);
    }
  }

  joinSelector(paths, context, selector) {
    function createParenthesis(elementsToPak, originalElement) {
        let replacementParen;
        let j;
        if (elementsToPak.length === 0) {
            replacementParen = new Paren(elementsToPak[0]);
        } else {
            const insideParent = new Array(elementsToPak.length);
            for (j = 0; j < elementsToPak.length; j++) {
                insideParent[j] = new Element(
                    null,
                    elementsToPak[j],
                    originalElement.isVariable,
                    originalElement._index,
                    originalElement._fileInfo
                );
            }
            replacementParen = new Paren(new Selector(insideParent));
        }
        return replacementParen;
    }

    function createSelector(containedElement, originalElement) {
        let element;
        let selector;
        element = new Element(null, containedElement, originalElement.isVariable, originalElement._index, originalElement._fileInfo);
        selector = new Selector([element]);
        return selector;
    }

    // joins selector path from `beginningPath` with selector path in `addPath`
    // `replacedElement` contains element that is being replaced by `addPath`
    // returns concatenated path
    function addReplacementIntoPath(beginningPath, addPath, replacedElement, originalSelector) {
        let newSelectorPath;
        let lastSelector;
        let newJoinedSelector;
        // our new selector path
        newSelectorPath = [];

        // construct the joined selector - if & is the first thing this will be empty,
        // if not newJoinedSelector will be the last set of elements in the selector
        if (beginningPath.length > 0) {
            newSelectorPath = utils.copyArray(beginningPath);
            lastSelector = newSelectorPath.pop();
            newJoinedSelector = originalSelector.createDerived(utils.copyArray(lastSelector.elements));
        }
        else {
            newJoinedSelector = originalSelector.createDerived([]);
        }

        if (addPath.length > 0) {
            // /deep/ is a CSS4 selector - (removed, so should deprecate)
            // that is valid without anything in front of it
            // so if the & does not have a combinator that is "" or " " then
            // and there is a combinator on the parent, then grab that.
            // this also allows + a { & .b { .a & { ... though not sure why you would want to do that
            let combinator = replacedElement.combinator;

            const parentEl = addPath[0].elements[0];
            if (combinator.emptyOrWhitespace && !parentEl.combinator.emptyOrWhitespace) {
                combinator = parentEl.combinator;
            }
            // join the elements so far with the first part of the parent
            newJoinedSelector.elements.push(new Element(
                combinator,
                parentEl.value,
                replacedElement.isVariable,
                replacedElement._index,
                replacedElement._fileInfo
            ));
            newJoinedSelector.elements = newJoinedSelector.elements.concat(addPath[0].elements.slice(1));
        }

        // now add the joined selector - but only if it is not empty
        if (newJoinedSelector.elements.length !== 0) {
            newSelectorPath.push(newJoinedSelector);
        }

        // put together the parent selectors after the join (e.g. the rest of the parent)
        if (addPath.length > 1) {
            let restOfPath = addPath.slice(1);
            restOfPath = restOfPath.map(selector => selector.createDerived(selector.elements, []));
            newSelectorPath = newSelectorPath.concat(restOfPath);
        }
        return newSelectorPath;
    }

    // joins selector path from `beginningPath` with every selector path in `addPaths` array
    // `replacedElement` contains element that is being replaced by `addPath`
    // returns array with all concatenated paths
    function addAllReplacementsIntoPath( beginningPath, addPaths, replacedElement, originalSelector, result) {
        let j;
        for (j = 0; j < beginningPath.length; j++) {
            const newSelectorPath = addReplacementIntoPath(beginningPath[j], addPaths, replacedElement, originalSelector);
            result.push(newSelectorPath);
        }
        return result;
    }

    function mergeElementsOnToSelectors(elements, selectors) {
        let i;
        let sel;

        if (elements.length === 0) {
            return ;
        }
        if (selectors.length === 0) {
            selectors.push([ new Selector(elements) ]);
            return;
        }

        for (i = 0; (sel = selectors[i]); i++) {
            // if the previous thing in sel is a parent this needs to join on to it
            if (sel.length > 0) {
                sel[sel.length - 1] = sel[sel.length - 1].createDerived(sel[sel.length - 1].elements.concat(elements));
            }
            else {
                sel.push(new Selector(elements));
            }
        }
    }

    // replace all parent selectors inside `inSelector` by content of `context` array
    // resulting selectors are returned inside `paths` array
    // returns true if `inSelector` contained at least one parent selector
    function replaceParentSelector(paths, context, inSelector) {
        // The paths are [[Selector]]
        // The first list is a list of comma separated selectors
        // The inner list is a list of inheritance separated selectors
        // e.g.
        // .a, .b {
        //   .c {
        //   }
        // }
        // == [[.a] [.c]] [[.b] [.c]]
        //
        let i;

        let j;
        let k;
        let currentElements;
        let newSelectors;
        let selectorsMultiplied;
        let sel;
        let el;
        let hadParentSelector = false;
        let length;
        let lastSelector;
        function findNestedSelector(element) {
            let maybeSelector;
            if (!(element.value instanceof Paren)) {
                return null;
            }

            maybeSelector = element.value.value;
            if (!(maybeSelector instanceof Selector)) {
                return null;
            }

            return maybeSelector;
        }

        // the elements from the current selector so far
        currentElements = [];
        // the current list of new selectors to add to the path.
        // We will build it up. We initiate it with one empty selector as we "multiply" the new selectors
        // by the parents
        newSelectors = [
            []
        ];

        for (i = 0; (el = inSelector.elements[i]); i++) {
            // non parent reference elements just get added
            if (el.value !== '&') {
                const nestedSelector = findNestedSelector(el);
                if (nestedSelector != null) {
                    // merge the current list of non parent selector elements
                    // on to the current list of selectors to add
                    mergeElementsOnToSelectors(currentElements, newSelectors);

                    const nestedPaths = [];
                    let replaced;
                    const replacedNewSelectors = [];
                    replaced = replaceParentSelector(nestedPaths, context, nestedSelector);
                    hadParentSelector = hadParentSelector || replaced;
                    // the nestedPaths array should have only one member - replaceParentSelector does not multiply selectors
                    for (k = 0; k < nestedPaths.length; k++) {
                        const replacementSelector = createSelector(createParenthesis(nestedPaths[k], el), el);
                        addAllReplacementsIntoPath(newSelectors, [replacementSelector], el, inSelector, replacedNewSelectors);
                    }
                    newSelectors = replacedNewSelectors;
                    currentElements = [];
                } else {
                    currentElements.push(el);
                }

            } else {
                hadParentSelector = true;
                // the new list of selectors to add
                selectorsMultiplied = [];

                // merge the current list of non parent selector elements
                // on to the current list of selectors to add
                mergeElementsOnToSelectors(currentElements, newSelectors);

                // loop through our current selectors
                for (j = 0; j < newSelectors.length; j++) {
                    sel = newSelectors[j];
                    // if we don't have any parent paths, the & might be in a mixin so that it can be used
                    // whether there are parents or not
                    if (context.length === 0) {
                        // the combinator used on el should now be applied to the next element instead so that
                        // it is not lost
                        if (sel.length > 0) {
                            sel[0].elements.push(new Element(el.combinator, '', el.isVariable, el._index, el._fileInfo));
                        }
                        selectorsMultiplied.push(sel);
                    }
                    else {
                        // and the parent selectors
                        for (k = 0; k < context.length; k++) {
                            // We need to put the current selectors
                            // then join the last selector's elements on to the parents selectors
                            const newSelectorPath = addReplacementIntoPath(sel, context[k], el, inSelector);
                            // add that to our new set of selectors
                            selectorsMultiplied.push(newSelectorPath);
                        }
                    }
                }

                // our new selectors has been multiplied, so reset the state
                newSelectors = selectorsMultiplied;
                currentElements = [];
            }
        }

        // if we have any elements left over (e.g. .a& .b == .b)
        // add them on to all the current selectors
        mergeElementsOnToSelectors(currentElements, newSelectors);

        for (i = 0; i < newSelectors.length; i++) {
            length = newSelectors[i].length;
            if (length > 0) {
                paths.push(newSelectors[i]);
                lastSelector = newSelectors[i][length - 1];
                newSelectors[i][length - 1] = lastSelector.createDerived(lastSelector.elements, inSelector.extendList);
            }
        }

        return hadParentSelector;
    }

    function deriveSelector(visibilityInfo, deriveFrom) {
        const newSelector = deriveFrom.createDerived(deriveFrom.elements, deriveFrom.extendList, deriveFrom.evaldCondition);
        newSelector.copyVisibilityInfo(visibilityInfo);
        return newSelector;
    }

    // joinSelector code follows
    let i;

    let newPaths;
    let hadParentSelector;

    newPaths = [];
    hadParentSelector = replaceParentSelector(newPaths, context, selector);

    if (!hadParentSelector) {
        if (context.length > 0) {
            newPaths = [];
            for (i = 0; i < context.length; i++) {

                const concatenated = context[i].map(deriveSelector.bind(this, selector.visibilityInfo()));

                concatenated.push(selector);
                newPaths.push(concatenated);
            }
        }
        else {
            newPaths = [[selector]];
        }
    }

    for (i = 0; i < newPaths.length; i++) {
        paths.push(newPaths[i]);
    }
  }
}

QualifiedRule.prototype.type = 'QualifiedRule'
