package less_go

import (
	"fmt"
)

type ExtendFinderVisitor struct {
	visitor          *Visitor
	contexts         []any
	allExtendsStack  [][]any
	foundExtends     bool
}

func NewExtendFinderVisitor() *ExtendFinderVisitor {
	efv := &ExtendFinderVisitor{
		contexts:        make([]any, 0),
		allExtendsStack: make([][]any, 1),
	}
	efv.allExtendsStack[0] = make([]any, 0)
	efv.visitor = NewVisitor(efv)
	return efv
}

func (efv *ExtendFinderVisitor) Run(root any) any {
	root = efv.visitor.Visit(root)
	// Convert []any to []*Extend for type consistency
	// Safety check: ensure stack is not empty (visitor Out methods might have popped too many times)
	if len(efv.allExtendsStack) == 0 {
		return root
	}
	extends := make([]*Extend, len(efv.allExtendsStack[0]))
	for i, ext := range efv.allExtendsStack[0] {
		if extend, ok := ext.(*Extend); ok {
			extends[i] = extend
		}
	}
	if rootWithExtends, ok := root.(interface{ SetAllExtends([]*Extend) }); ok {
		rootWithExtends.SetAllExtends(extends)
	}
	return root
}

func (efv *ExtendFinderVisitor) VisitDeclaration(declNode any, visitArgs *VisitArgs) {
	visitArgs.VisitDeeper = false
}

func (efv *ExtendFinderVisitor) VisitMixinDefinition(mixinDefinitionNode any, visitArgs *VisitArgs) {
	visitArgs.VisitDeeper = false
}

func (efv *ExtendFinderVisitor) VisitRuleset(rulesetNode any, visitArgs *VisitArgs) {
	ruleset, ok := rulesetNode.(*Ruleset)
	if !ok {
		return
	}

	if ruleset.Root {
		return
	}

	var i, j int
	var extend *Extend
	allSelectorsExtendList := make([]*Extend, 0)
	var extendList []*Extend

	// get &:extend(.a); rules which apply to all selectors in this ruleset
	rules := ruleset.Rules
	ruleCnt := 0
	if rules != nil {
		ruleCnt = len(rules)
	}
	
	for i = 0; i < ruleCnt; i++ {
		if extendRule, ok := rules[i].(*Extend); ok {
			allSelectorsExtendList = append(allSelectorsExtendList, extendRule)
			ruleset.ExtendOnEveryPath = true
		}
	}

	// now find every selector and apply the extends that apply to all extends
	// and the ones which apply to an individual extend
	paths := ruleset.Paths
	for i = 0; i < len(paths); i++ {
		selectorPath := paths[i]
		if len(selectorPath) == 0 {
			continue // Skip empty selector paths
		}
		selector := selectorPath[len(selectorPath)-1]
		var selExtendList []*Extend
		
		if selectorWithExtends, ok := selector.(interface{ GetExtendList() []*Extend }); ok {
			selExtendList = selectorWithExtends.GetExtendList()
		}

		if selExtendList != nil {
			extendList = make([]*Extend, len(selExtendList))
			copy(extendList, selExtendList)
			extendList = append(extendList, allSelectorsExtendList...)
		} else {
			extendList = allSelectorsExtendList
		}

		if extendList != nil {
			clonedExtendList := make([]*Extend, len(extendList))
			for idx, ext := range extendList {
				clonedExtendList[idx] = ext.Clone(nil)
			}
			extendList = clonedExtendList
		}

		for j = 0; j < len(extendList); j++ {
			efv.foundExtends = true
			extend = extendList[j]
			extend.FindSelfSelectors(selectorPath)
			extend.Ruleset = ruleset
			if j == 0 {
				extend.FirstExtendOnThisSelectorPath = true
			}
			efv.allExtendsStack[len(efv.allExtendsStack)-1] = append(efv.allExtendsStack[len(efv.allExtendsStack)-1], extend)
		}
	}

	efv.contexts = append(efv.contexts, ruleset.Selectors)
}

func (efv *ExtendFinderVisitor) VisitRulesetOut(rulesetNode any) {
	ruleset, ok := rulesetNode.(*Ruleset)
	if !ok {
		return
	}

	if !ruleset.Root && len(efv.contexts) > 0 {
		efv.contexts = efv.contexts[:len(efv.contexts)-1]
	}
}

func (efv *ExtendFinderVisitor) VisitMedia(mediaNode any, visitArgs *VisitArgs) {
	if media, ok := mediaNode.(interface{ SetAllExtends([]any) }); ok {
		media.SetAllExtends(make([]any, 0))
		efv.allExtendsStack = append(efv.allExtendsStack, make([]any, 0))
	}
}

func (efv *ExtendFinderVisitor) VisitMediaOut(mediaNode any) {
	// Match JavaScript: this.allExtendsStack.length = this.allExtendsStack.length - 1;
	if len(efv.allExtendsStack) > 0 {
		efv.allExtendsStack = efv.allExtendsStack[:len(efv.allExtendsStack)-1]
	}
}

func (efv *ExtendFinderVisitor) VisitAtRule(atRuleNode any, visitArgs *VisitArgs) {
	if atRule, ok := atRuleNode.(interface{ SetAllExtends([]any) }); ok {
		atRule.SetAllExtends(make([]any, 0))
		efv.allExtendsStack = append(efv.allExtendsStack, make([]any, 0))
	}
}

func (efv *ExtendFinderVisitor) VisitAtRuleOut(atRuleNode any) {
	// Match JavaScript: this.allExtendsStack.length = this.allExtendsStack.length - 1;
	if len(efv.allExtendsStack) > 0 {
		efv.allExtendsStack = efv.allExtendsStack[:len(efv.allExtendsStack)-1]
	}
}

type ProcessExtendsVisitor struct {
	visitor           *Visitor
	extendIndices     map[string]bool
	allExtendsStack   [][]*Extend
	extendChainCount  int
}

func NewProcessExtendsVisitor() *ProcessExtendsVisitor {
	pev := &ProcessExtendsVisitor{
		extendIndices: make(map[string]bool),
	}
	pev.visitor = NewVisitor(pev)
	return pev
}

func (pev *ProcessExtendsVisitor) Run(root any) any {
	extendFinder := NewExtendFinderVisitor()
	pev.extendIndices = make(map[string]bool)
	root = extendFinder.Run(root)

	if !extendFinder.foundExtends {
		return root
	}

	// Get allExtends from root - this should now be populated by ExtendFinderVisitor
	var rootAllExtends []*Extend
	if rootWithExtends, ok := root.(interface{ GetAllExtends() []*Extend }); ok {
		rootAllExtends = rootWithExtends.GetAllExtends()
	}

	// Chain extends and concatenate with original extends
	chained := pev.doExtendChaining(rootAllExtends, rootAllExtends, 0)
	newAllExtends := append(rootAllExtends, chained...)

	// Set the new extends back on root
	if rootWithExtends, ok := root.(interface{ SetAllExtends([]*Extend) }); ok {
		rootWithExtends.SetAllExtends(newAllExtends)
	}

	pev.allExtendsStack = [][]*Extend{newAllExtends}
	newRoot := pev.visitor.Visit(root)
	pev.checkExtendsForNonMatched(newAllExtends)
	return newRoot
}

func (pev *ProcessExtendsVisitor) checkExtendsForNonMatched(extendList []*Extend) {
	indices := pev.extendIndices
	
	// Filter extends that haven't found matches and have exactly one parent_id
	for _, extend := range extendList {
		if !extend.HasFoundMatches && len(extend.ParentIds) == 1 {
			selector := "_unknown_"
			if extend.Selector != nil {
				if selectorWithCSS, ok := extend.Selector.(interface{ ToCSS(map[string]any) string }); ok {
					// Try to generate CSS, but catch any errors (equivalent to JS try/catch)
					func() {
						defer func() {
							if recover() != nil {
								// CSS generation failed, keep default "_unknown_"
							}
						}()
						selector = selectorWithCSS.ToCSS(make(map[string]any))
					}()
				}
			}

			key := fmt.Sprintf("%d %s", extend.Index, selector)
			if !indices[key] {
				indices[key] = true
				Warn(fmt.Sprintf("WARNING: extend '%s' has no matches", selector))
			}
		}
	}
}

func (pev *ProcessExtendsVisitor) doExtendChaining(extendsList []*Extend, extendsListTarget []*Extend, iterationCount int) []*Extend {
	var extendIndex, targetExtendIndex int
	var matches []any
	extendsToAdd := make([]*Extend, 0)
	var newSelector []any
	var selectorPath []any
	var extend, targetExtend, newExtend *Extend

	// loop through comparing every extend with every target extend.
	for extendIndex = 0; extendIndex < len(extendsList); extendIndex++ {
		for targetExtendIndex = 0; targetExtendIndex < len(extendsListTarget); targetExtendIndex++ {
			extend = extendsList[extendIndex]
			targetExtend = extendsListTarget[targetExtendIndex]

			// look for circular references
			found := false
			for _, parentId := range extend.ParentIds {
				if parentId == targetExtend.ObjectId {
					found = true
					break
				}
			}
			if found {
				continue
			}

			// find a match in the target extends self selector (the bit before :extend)
			if len(targetExtend.SelfSelectors) > 0 {
				selectorPath = []any{targetExtend.SelfSelectors[0]}
				matches = pev.findMatch(extend, selectorPath)

				if len(matches) > 0 {
					extend.HasFoundMatches = true

					// we found a match, so for each self selector..
					for _, selfSelector := range extend.SelfSelectors {
						var info any
						info = targetExtend.VisibilityInfo()

						// process the extend as usual
						// Extended selectors should always be visible (same logic as in VisitRuleset)
						newSelector = pev.extendSelector(matches, selectorPath, selfSelector, true)

						// but now we create a new extend from it
						var infoMap map[string]any
						if infoMapTyped, ok := info.(map[string]any); ok {
							infoMap = infoMapTyped
						}
						newExtend = NewExtend(targetExtend.Selector, targetExtend.Option, 0, targetExtend.FileInfo(), infoMap)
						newExtend.SelfSelectors = newSelector

						// add the extend onto the list of extends for that selector
						if len(newSelector) > 0 {
							if selectorWithExtends, ok := newSelector[len(newSelector)-1].(interface{ SetExtendList([]*Extend) }); ok {
								selectorWithExtends.SetExtendList([]*Extend{newExtend})
							}
						}

						// record that we need to add it.
						extendsToAdd = append(extendsToAdd, newExtend)
						newExtend.Ruleset = targetExtend.Ruleset

						// remember its parents for circular references
						newExtend.ParentIds = append(newExtend.ParentIds, targetExtend.ParentIds...)
						newExtend.ParentIds = append(newExtend.ParentIds, extend.ParentIds...)

						// only process the selector once.. if we have :extend(.a,.b) then multiple
						// extends will look at the same selector path, so when extending
						// we know that any others will be duplicates in terms of what is added to the css
						if targetExtend.FirstExtendOnThisSelectorPath {
							newExtend.FirstExtendOnThisSelectorPath = true
							targetExtend.Ruleset.Paths = append(targetExtend.Ruleset.Paths, newSelector)
						}
					}
				}
			}
		}
	}

	if len(extendsToAdd) > 0 {
		// try to detect circular references to stop a stack overflow.
		pev.extendChainCount++
		if iterationCount > 100 {
			selectorOne := "{unable to calculate}"
			selectorTwo := "{unable to calculate}"
			
			// Try to get selector CSS for error message (equivalent to JS try/catch)
			if len(extendsToAdd) > 0 && len(extendsToAdd[0].SelfSelectors) > 0 {
				if selectorWithCSS, ok := extendsToAdd[0].SelfSelectors[0].(interface{ ToCSS() string }); ok {
					func() {
						defer func() {
							if recover() != nil {
								// CSS generation failed, keep default
							}
						}()
						selectorOne = selectorWithCSS.ToCSS()
					}()
				}
			}
			
			if len(extendsToAdd) > 0 && extendsToAdd[0].Selector != nil {
				if selectorWithCSS, ok := extendsToAdd[0].Selector.(interface{ ToCSS() string }); ok {
					func() {
						defer func() {
							if recover() != nil {
								// CSS generation failed, keep default
							}
						}()
						selectorTwo = selectorWithCSS.ToCSS()
					}()
				}
			}
			
			panic(fmt.Sprintf("extend circular reference detected. One of the circular extends is currently:%s:extend(%s)", selectorOne, selectorTwo))
		}

		// now process the new extends on the existing rules so that we can handle a extending b extending c extending d extending e...
		recursive := pev.doExtendChaining(extendsToAdd, extendsListTarget, iterationCount+1)
		return append(extendsToAdd, recursive...)
	} else {
		return extendsToAdd
	}
}

func (pev *ProcessExtendsVisitor) VisitDeclaration(ruleNode any, visitArgs *VisitArgs) {
	visitArgs.VisitDeeper = false
}

func (pev *ProcessExtendsVisitor) VisitMixinDefinition(mixinDefinitionNode any, visitArgs *VisitArgs) {
	visitArgs.VisitDeeper = false
}

func (pev *ProcessExtendsVisitor) VisitSelector(selectorNode any, visitArgs *VisitArgs) {
	visitArgs.VisitDeeper = false
}

func (pev *ProcessExtendsVisitor) VisitRuleset(rulesetNode any, visitArgs *VisitArgs) {
	ruleset, ok := rulesetNode.(*Ruleset)
	if !ok {
		return
	}

	if ruleset.Root {
		return
	}

	var matches []any
	var pathIndex, extendIndex int
	allExtends := pev.allExtendsStack[len(pev.allExtendsStack)-1]
	selectorsToAdd := make([][]any, 0)
	var selectorPath []any

	// look at each selector path in the ruleset, find any extend matches and then copy, find and replace
	for extendIndex = 0; extendIndex < len(allExtends); extendIndex++ {
		for pathIndex = 0; pathIndex < len(ruleset.Paths); pathIndex++ {
			selectorPath = ruleset.Paths[pathIndex]

			// extending extends happens initially, before the main pass
			if ruleset.ExtendOnEveryPath {
				continue
			}

			if len(selectorPath) > 0 {
				if selectorWithExtends, ok := selectorPath[len(selectorPath)-1].(interface{ GetExtendList() []*Extend }); ok {
					extendList := selectorWithExtends.GetExtendList()
					if extendList != nil && len(extendList) > 0 {
						continue
					}
				}
			}

			matches = pev.findMatch(allExtends[extendIndex], selectorPath)

			if len(matches) > 0 {
				allExtends[extendIndex].HasFoundMatches = true

				for _, selfSelector := range allExtends[extendIndex].SelfSelectors {
					// Extended selectors should always be visible since they're being added to rulesets
					// that will be output. The extend itself may be invisible (it's not CSS), but the
					// extended selectors are actual CSS selectors that should appear in the output.
					extendedSelectors := pev.extendSelector(matches, selectorPath, selfSelector, true)
					selectorsToAdd = append(selectorsToAdd, extendedSelectors)
				}
			}
		}
	}
	ruleset.Paths = append(ruleset.Paths, selectorsToAdd...)
}

func (pev *ProcessExtendsVisitor) findMatch(extend *Extend, haystackSelectorPath []any) []any {
	// This matches the JavaScript findMatch method exactly
	var haystackSelectorIndex, hackstackElementIndex int
	var hackstackSelector, haystackElement any
	var targetCombinator string
	var i int
	needleElements := extend.Selector.(*Selector).Elements
	potentialMatches := make([]any, 0)
	var potentialMatch map[string]any
	matches := make([]any, 0)

	// loop through the haystack elements
	for haystackSelectorIndex = 0; haystackSelectorIndex < len(haystackSelectorPath); haystackSelectorIndex++ {
		hackstackSelector = haystackSelectorPath[haystackSelectorIndex]
		
		var hackstackElements []*Element
		if selector, ok := hackstackSelector.(*Selector); ok {
			hackstackElements = selector.Elements
		} else {
			// Skip if not a proper selector
			continue
		}

		for hackstackElementIndex = 0; hackstackElementIndex < len(hackstackElements); hackstackElementIndex++ {
			haystackElement = hackstackElements[hackstackElementIndex]

			// if we allow elements before our match we can add a potential match every time. otherwise only at the first element.
			if extend.AllowBefore || (haystackSelectorIndex == 0 && hackstackElementIndex == 0) {
				var initialCombinator string
				if element, ok := haystackElement.(*Element); ok {
					if element.Combinator != nil {
						initialCombinator = element.Combinator.Value
					}
				}
				
				potentialMatches = append(potentialMatches, map[string]any{
					"pathIndex":         haystackSelectorIndex,
					"index":            hackstackElementIndex,
					"matched":          0,
					"initialCombinator": initialCombinator,
				})
			}

			for i = 0; i < len(potentialMatches); i++ {
				potentialMatch = potentialMatches[i].(map[string]any)

				// selectors add " " onto the first element. When we use & it joins the selectors together, but if we don't
				// then each selector in haystackSelectorPath has a space before it added in the toCSS phase. so we need to
				// work out what the resulting combinator will be
				targetCombinator = ""
				if element, ok := haystackElement.(*Element); ok && element.Combinator != nil {
					targetCombinator = element.Combinator.Value
				}
				if targetCombinator == "" && hackstackElementIndex == 0 {
					targetCombinator = " "
				}

				matched := potentialMatch["matched"].(int)
				
				// if we don't match, null our match to indicate failure
				if !pev.isElementValuesEqual(needleElements[matched].Value, haystackElement.(*Element).Value) {
					potentialMatch = nil
				} else if matched > 0 {
					var needleCombinator string
					if needleElements[matched].Combinator != nil {
						needleCombinator = needleElements[matched].Combinator.Value
					}
					if needleCombinator != targetCombinator {
						potentialMatch = nil
					}
				}
				
				if potentialMatch != nil {
					potentialMatch["matched"] = matched + 1
				}

				// if we are still valid and have finished, test whether we have elements after and whether these are allowed
				if potentialMatch != nil {
					finished := potentialMatch["matched"].(int) == len(needleElements)
					potentialMatch["finished"] = finished
					
					if finished && !extend.AllowAfter {
						if hackstackElementIndex+1 < len(hackstackElements) || haystackSelectorIndex+1 < len(haystackSelectorPath) {
							potentialMatch = nil
						}
					}
				}
				
				// if null we remove, if not, we are still valid, so either push as a valid match or continue
				if potentialMatch != nil {
					if potentialMatch["finished"].(bool) {
						potentialMatch["length"] = len(needleElements)
						potentialMatch["endPathIndex"] = haystackSelectorIndex
						potentialMatch["endPathElementIndex"] = hackstackElementIndex + 1 // index after end of match
						potentialMatches = make([]any, 0) // we don't allow matches to overlap, so start matching again
						matches = append(matches, potentialMatch)
					} else {
						potentialMatches[i] = potentialMatch
					}
				} else {
					// Remove null match - splice operation equivalent to JS
					potentialMatches = append(potentialMatches[:i], potentialMatches[i+1:]...)
					i--
				}
			}
		}
	}
	return matches
}

func (pev *ProcessExtendsVisitor) isElementValuesEqual(elementValue1, elementValue2 any) bool {
	// Handle string comparison
	if str1, ok1 := elementValue1.(string); ok1 {
		if str2, ok2 := elementValue2.(string); ok2 {
			return str1 == str2
		}
		return false
	}
	if _, ok2 := elementValue2.(string); ok2 {
		return false
	}

	// Handle Attribute comparison
	if attr1, ok1 := elementValue1.(*Attribute); ok1 {
		if attr2, ok2 := elementValue2.(*Attribute); ok2 {
			if attr1.Op != attr2.Op || attr1.Key != attr2.Key {
				return false
			}
			if attr1.Value == nil || attr2.Value == nil {
				return attr1.Value == attr2.Value
			}
			
			// Get the actual values
			var val1, val2 any
			if valueProvider1, ok := attr1.Value.(interface{ GetValue() any }); ok {
				val1 = valueProvider1.GetValue()
			} else {
				val1 = attr1.Value
			}
			if valueProvider2, ok := attr2.Value.(interface{ GetValue() any }); ok {
				val2 = valueProvider2.GetValue()
			} else {
				val2 = attr2.Value
			}
			
			if val1Str, ok := val1.(string); ok {
				if val2Str, ok := val2.(string); ok {
					return val1Str == val2Str
				}
			}
			return val1 == val2
		}
		return false
	}

	// Get values for comparison
	var val1, val2 any
	if valueProvider1, ok := elementValue1.(interface{ GetValue() any }); ok {
		val1 = valueProvider1.GetValue()
	} else {
		val1 = elementValue1
	}
	if valueProvider2, ok := elementValue2.(interface{ GetValue() any }); ok {
		val2 = valueProvider2.GetValue()
	} else {
		val2 = elementValue2
	}

	// Handle Selector comparison
	if selector1, ok1 := val1.(*Selector); ok1 {
		if selector2, ok2 := val2.(*Selector); ok2 {
			if len(selector1.Elements) != len(selector2.Elements) {
				return false
			}
			for i := 0; i < len(selector1.Elements); i++ {
				var comb1, comb2 string
				if selector1.Elements[i].Combinator != nil {
					comb1 = selector1.Elements[i].Combinator.Value
				}
				if selector2.Elements[i].Combinator != nil {
					comb2 = selector2.Elements[i].Combinator.Value
				}
				
				if comb1 != comb2 {
					if i != 0 {
						return false
					}
					// Handle first element special case
					defaultComb1 := comb1
					if defaultComb1 == "" {
						defaultComb1 = " "
					}
					defaultComb2 := comb2
					if defaultComb2 == "" {
						defaultComb2 = " "
					}
					if defaultComb1 != defaultComb2 {
						return false
					}
				}
				if !pev.isElementValuesEqual(selector1.Elements[i].Value, selector2.Elements[i].Value) {
					return false
				}
			}
			return true
		}
		return false
	}
	
	return false
}

func (pev *ProcessExtendsVisitor) extendSelector(matches []any, selectorPath []any, replacementSelector any, isVisible bool) []any {
	// This matches the JavaScript extendSelector method exactly (lines 417-482)
	currentSelectorPathIndex := 0
	currentSelectorPathElementIndex := 0
	path := make([]any, 0)
	var matchIndex int
	var selector *Selector
	var firstElement *Element
	var match map[string]any
	var newElements []*Element

	for matchIndex = 0; matchIndex < len(matches); matchIndex++ {
		match = matches[matchIndex].(map[string]any)
		selector = selectorPath[match["pathIndex"].(int)].(*Selector)
		
		// Get replacement selector elements
		replacementSel := replacementSelector.(*Selector)
		
		firstElement = NewElement(
			match["initialCombinator"].(string),
			replacementSel.Elements[0].Value,
			replacementSel.Elements[0].IsVariable,
			replacementSel.Elements[0].GetIndex(),
			replacementSel.Elements[0].FileInfo(),
			replacementSel.Elements[0].VisibilityInfo(),
		)

		if match["pathIndex"].(int) > currentSelectorPathIndex && currentSelectorPathElementIndex > 0 {
			// Equivalent to JS: path[path.length - 1].elements = path[path.length - 1].elements.concat(...)
			if len(path) > 0 {
				if pathSel, ok := path[len(path)-1].(*Selector); ok {
					currentSelector := selectorPath[currentSelectorPathIndex].(*Selector)
					sliceStart := currentSelectorPathElementIndex
					if sliceStart < len(currentSelector.Elements) {
						pathSel.Elements = append(pathSel.Elements, currentSelector.Elements[sliceStart:]...)
					}
				}
			}
			currentSelectorPathElementIndex = 0
			currentSelectorPathIndex++
		}

		// Build newElements exactly like JavaScript
		newElements = make([]*Element, 0)
		
		// Add elements before the match (equivalent to selector.elements.slice(currentSelectorPathElementIndex, match.index))
		sliceEnd := match["index"].(int)
		if sliceEnd > currentSelectorPathElementIndex && currentSelectorPathElementIndex < len(selector.Elements) {
			if sliceEnd > len(selector.Elements) {
				sliceEnd = len(selector.Elements)
			}
			newElements = append(newElements, selector.Elements[currentSelectorPathElementIndex:sliceEnd]...)
		}
		
		// Add the first replacement element
		newElements = append(newElements, firstElement)
		
		// Add remaining replacement elements (equivalent to .concat(replacementSelector.elements.slice(1)))
		if len(replacementSel.Elements) > 1 {
			newElements = append(newElements, replacementSel.Elements[1:]...)
		}

		if currentSelectorPathIndex == match["pathIndex"].(int) && matchIndex > 0 {
			// Equivalent to JS: path[path.length - 1].elements = path[path.length - 1].elements.concat(newElements)
			if len(path) > 0 {
				if pathSel, ok := path[len(path)-1].(*Selector); ok {
					pathSel.Elements = append(pathSel.Elements, newElements...)
				}
			}
		} else {
			// Equivalent to JS: path = path.concat(selectorPath.slice(currentSelectorPathIndex, match.pathIndex))
			if match["pathIndex"].(int) > currentSelectorPathIndex {
				path = append(path, selectorPath[currentSelectorPathIndex:match["pathIndex"].(int)]...)
			}
			
			// Equivalent to JS: path.push(new tree.Selector(newElements))
			newSelector, err := NewSelector(newElements, nil, nil, 0, nil, nil)
			if err == nil {
				path = append(path, newSelector)
			}
		}
		
		currentSelectorPathIndex = match["endPathIndex"].(int)
		currentSelectorPathElementIndex = match["endPathElementIndex"].(int)
		
		// Handle element index overflow (equivalent to JS lines 458-462)
		if currentSelectorPathIndex < len(selectorPath) {
			currentSelector := selectorPath[currentSelectorPathIndex].(*Selector)
			if currentSelectorPathElementIndex >= len(currentSelector.Elements) {
				currentSelectorPathElementIndex = 0
				currentSelectorPathIndex++
			}
		}
	}

	// Handle remaining elements (equivalent to JS lines 464-468)
	if currentSelectorPathIndex < len(selectorPath) && currentSelectorPathElementIndex > 0 {
		if len(path) > 0 {
			if pathSel, ok := path[len(path)-1].(*Selector); ok {
				currentSelector := selectorPath[currentSelectorPathIndex].(*Selector)
				if currentSelectorPathElementIndex < len(currentSelector.Elements) {
					pathSel.Elements = append(pathSel.Elements, currentSelector.Elements[currentSelectorPathElementIndex:]...)
				}
			}
		}
		currentSelectorPathIndex++
	}

	// Equivalent to JS: path = path.concat(selectorPath.slice(currentSelectorPathIndex, selectorPath.length))
	path = append(path, selectorPath[currentSelectorPathIndex:]...)
	
	// Apply visibility (equivalent to JS lines 471-481)
	for i, currentValue := range path {
		if selector, ok := currentValue.(*Selector); ok {
			// Equivalent to JS: currentValue.createDerived(currentValue.elements)
			derived, err := selector.CreateDerived(selector.Elements, nil, nil)
			if err == nil {
				if isVisible {
					derived.EnsureVisibility()
				} else {
					derived.EnsureInvisibility()
				}
				path[i] = derived
			}
		}
	}
	
	return path
}

func (pev *ProcessExtendsVisitor) VisitMedia(mediaNode any, visitArgs *VisitArgs) {
	var mediaAllExtends []*Extend
	if media, ok := mediaNode.(interface{ GetAllExtends() []*Extend }); ok {
		mediaAllExtends = media.GetAllExtends()
	}

	// Guard against empty stack - initialize with empty slice
	if len(pev.allExtendsStack) == 0 {
		pev.allExtendsStack = [][]*Extend{make([]*Extend, 0)}
	}

	currentAllExtends := pev.allExtendsStack[len(pev.allExtendsStack)-1]
	newAllExtends := append(mediaAllExtends, currentAllExtends...)
	chained := pev.doExtendChaining(newAllExtends, mediaAllExtends, 0)
	newAllExtends = append(newAllExtends, chained...)
	pev.allExtendsStack = append(pev.allExtendsStack, newAllExtends)
}

func (pev *ProcessExtendsVisitor) VisitMediaOut(mediaNode any) {
	// Match JavaScript: this.allExtendsStack.length = lastIndex;
	if len(pev.allExtendsStack) > 0 {
		lastIndex := len(pev.allExtendsStack) - 1
		pev.allExtendsStack = pev.allExtendsStack[:lastIndex]
	}
}

func (pev *ProcessExtendsVisitor) VisitAtRule(atRuleNode any, visitArgs *VisitArgs) {
	var atRuleAllExtends []*Extend
	if atRule, ok := atRuleNode.(interface{ GetAllExtends() []*Extend }); ok {
		atRuleAllExtends = atRule.GetAllExtends()
	}

	// Guard against empty stack - initialize with empty slice
	if len(pev.allExtendsStack) == 0 {
		pev.allExtendsStack = [][]*Extend{make([]*Extend, 0)}
	}

	currentAllExtends := pev.allExtendsStack[len(pev.allExtendsStack)-1]
	newAllExtends := append(atRuleAllExtends, currentAllExtends...)
	chained := pev.doExtendChaining(newAllExtends, atRuleAllExtends, 0)
	newAllExtends = append(newAllExtends, chained...)
	pev.allExtendsStack = append(pev.allExtendsStack, newAllExtends)
}

func (pev *ProcessExtendsVisitor) VisitAtRuleOut(atRuleNode any) {
	// Match JavaScript: this.allExtendsStack.length = lastIndex;
	if len(pev.allExtendsStack) > 0 {
		lastIndex := len(pev.allExtendsStack) - 1
		pev.allExtendsStack = pev.allExtendsStack[:lastIndex]
	}
}

// NewExtendVisitor creates a new extend visitor (alias for NewProcessExtendsVisitor)
func NewExtendVisitor() *ProcessExtendsVisitor {
	return NewProcessExtendsVisitor()
}

// Default export equivalent
var Default = NewProcessExtendsVisitor