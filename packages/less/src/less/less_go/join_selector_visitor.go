package less_go

// flattenPath flattens nested arrays in selector paths to ensure correct CSS generation
func flattenPath(path []any) []any {
	result := make([]any, 0, len(path))
	for _, item := range path {
		if arr, ok := item.([]any); ok {
			// If this item is an array, flatten it
			result = append(result, arr...)
		} else {
			// If this item is a selector, keep it as-is
			result = append(result, item)
		}
	}
	return result
}

// JoinSelectorVisitor implements a visitor that joins selectors in rulesets
type JoinSelectorVisitor struct {
	contexts [][]any
	visitor  *Visitor
}

// NewJoinSelectorVisitor creates a new JoinSelectorVisitor
func NewJoinSelectorVisitor() *JoinSelectorVisitor {
	jsv := &JoinSelectorVisitor{
		contexts: [][]any{{}},
	}
	jsv.visitor = NewVisitor(jsv)
	return jsv
}

// Run executes the visitor on the root node
func (jsv *JoinSelectorVisitor) Run(root any) any {
	return jsv.visitor.Visit(root)
}

// IsReplacing returns false as this visitor doesn't replace nodes
func (jsv *JoinSelectorVisitor) IsReplacing() bool {
	return false
}

// VisitDeclaration prevents deeper visiting of declaration nodes
func (jsv *JoinSelectorVisitor) VisitDeclaration(declNode any, visitArgs *VisitArgs) any {
	visitArgs.VisitDeeper = false
	return declNode
}

// VisitMixinDefinition prevents deeper visiting of mixin definition nodes
func (jsv *JoinSelectorVisitor) VisitMixinDefinition(mixinDefinitionNode any, visitArgs *VisitArgs) any {
	visitArgs.VisitDeeper = false
	return mixinDefinitionNode
}

// VisitRuleset processes ruleset nodes
func (jsv *JoinSelectorVisitor) VisitRuleset(rulesetNode any, visitArgs *VisitArgs) any {
	context := jsv.contexts[len(jsv.contexts)-1]
	paths := make([]any, 0)
	
	// Push paths to context stack BEFORE JoinSelectors (matches JavaScript)
	jsv.contexts = append(jsv.contexts, paths)
	
	// Try interface-based approach first
	if rulesetInterface, ok := rulesetNode.(interface {
		GetRoot() bool
		GetSelectors() []any
		SetSelectors([]any)
		SetRules([]any)
		SetPaths([]any)
	}); ok {
		if !rulesetInterface.GetRoot() {
			selectors := rulesetInterface.GetSelectors()
			if selectors != nil {
				// Filter selectors by GetIsOutput
				filteredSelectors := make([]any, 0)
				for _, selector := range selectors {
					if selectorWithOutput, ok := selector.(interface{ GetIsOutput() bool }); ok {
						if selectorWithOutput.GetIsOutput() {
							filteredSelectors = append(filteredSelectors, selector)
						}
					}
				}
				
				if len(filteredSelectors) > 0 {
					rulesetInterface.SetSelectors(filteredSelectors)
					// Call JoinSelectors if it exists on the ruleset
					if jsInterface, ok := rulesetNode.(interface{ JoinSelectors(*[][]any, [][]any, []any) }); ok {
						// Convert paths and context to the expected types
						pathsSlice := make([][]any, 0)
						
						// The context is already a []any containing paths.
						// JoinSelectors expects [][]any where each element is a path.
						// If context is empty, pass empty [][]any
						// Otherwise, convert context elements to [][]any
						var contextSlice [][]any
						if len(context) == 0 {
							contextSlice = [][]any{}
						} else {
							// Each element in context should be a path ([]any)
							contextSlice = make([][]any, len(context))
							for i, path := range context {
								if pathArray, ok := path.([]any); ok {
									contextSlice[i] = pathArray
								} else {
									// If it's a single selector, wrap it
									contextSlice[i] = []any{path}
								}
							}
						}
						
						jsInterface.JoinSelectors(&pathsSlice, contextSlice, filteredSelectors)
						
						// Convert [][]any to []any and update the existing paths slice in place
						// This ensures the paths array on the context stack gets populated
						for _, path := range pathsSlice {
							// Flatten any nested arrays in the path to match expected structure
							flatPath := flattenPath(path)
							paths = append(paths, flatPath)
						}
						
						// Update the context stack with the populated paths
						jsv.contexts[len(jsv.contexts)-1] = paths
					}
				} else {
					rulesetInterface.SetSelectors(nil)
				}
			}
			
			if len(rulesetInterface.GetSelectors()) == 0 {
				rulesetInterface.SetRules(nil)
			}
			rulesetInterface.SetPaths(paths)
		}
	} else if ruleset, ok := rulesetNode.(*Ruleset); ok {
		// Fallback to concrete type for backward compatibility
		if !ruleset.Root {
			selectors := ruleset.Selectors
			if selectors != nil {
				// Filter selectors by GetIsOutput
				filteredSelectors := make([]any, 0)
				for _, selector := range selectors {
					if selectorWithOutput, ok := selector.(interface{ GetIsOutput() bool }); ok {
						if selectorWithOutput.GetIsOutput() {
							filteredSelectors = append(filteredSelectors, selector)
						}
					}
				}
				
				if len(filteredSelectors) > 0 {
					ruleset.Selectors = filteredSelectors
					// Call JoinSelectors if it exists on the ruleset
					if hasJoinSelectors(ruleset) {
						pathsSlice := make([][]any, 0)
						pathsPtr := &pathsSlice
						
						// The context is already a []any containing paths.
						// JoinSelectors expects [][]any where each element is a path.
						// If context is empty, pass empty [][]any
						// Otherwise, convert context elements to [][]any
						var contextSlice [][]any
						if len(context) == 0 {
							contextSlice = [][]any{}
						} else {
							// Each element in context should be a path ([]any)
							contextSlice = make([][]any, len(context))
							for i, path := range context {
								if pathArray, ok := path.([]any); ok {
									contextSlice[i] = pathArray
								} else {
									// If it's a single selector, wrap it
									contextSlice[i] = []any{path}
								}
							}
						}
						
						ruleset.JoinSelectors(pathsPtr, contextSlice, filteredSelectors)
						
						// Convert the result to []any and update the existing paths slice in place
						// This ensures the paths array on the context stack gets populated
						for _, path := range *pathsPtr {
							// Flatten any nested arrays in the path to match expected structure
							flatPath := flattenPath(path)
							paths = append(paths, flatPath)
						}
						
						// Update the context stack with the populated paths
						jsv.contexts[len(jsv.contexts)-1] = paths
						ruleset.SetPaths(paths)
					}
				} else {
					ruleset.Selectors = nil
				}
			}
			
			if ruleset.Selectors == nil {
				ruleset.Rules = nil
			}
		}
	}
	
	return rulesetNode
}

// VisitRulesetOut removes the top context when exiting a ruleset
func (jsv *JoinSelectorVisitor) VisitRulesetOut(rulesetNode any) {
	if len(jsv.contexts) > 0 {
		jsv.contexts = jsv.contexts[:len(jsv.contexts)-1]
	}
}

// MediaRule interface for the first rule in media
type MediaRule interface {
	SetRoot(root bool)
}

// VisitMedia processes media nodes
func (jsv *JoinSelectorVisitor) VisitMedia(mediaNode any, visitArgs *VisitArgs) any {
	// Guard against empty contexts
	if len(jsv.contexts) == 0 {
		return nil
	}
	context := jsv.contexts[len(jsv.contexts)-1]
	
	// Try interface-based approach first
	if mediaInterface, ok := mediaNode.(interface{ GetRules() []any }); ok {
		rules := mediaInterface.GetRules()
		if len(rules) > 0 {
			if mediaRule, ok := rules[0].(interface{ SetRoot(bool) }); ok {
				rootValue := len(context) == 0
				if len(context) > 0 {
					// Check if first context item has multiMedia property
					if contextItem, ok := context[0].(map[string]any); ok {
						if multiMedia, exists := contextItem["multiMedia"]; exists {
							if multiMediaBool, ok := multiMedia.(bool); ok {
								rootValue = multiMediaBool
							}
						}
					}
				}
				mediaRule.SetRoot(rootValue)
			}
		}
	} else if media, ok := mediaNode.(*Media); ok {
		// Fallback to concrete type for backward compatibility
		rules := media.Rules
		if len(rules) > 0 {
			if mediaRule, ok := rules[0].(MediaRule); ok {
				rootValue := len(context) == 0
				if len(context) > 0 {
					// Check if first context item has multiMedia property
					if contextItem, ok := context[0].(map[string]any); ok {
						if multiMedia, exists := contextItem["multiMedia"]; exists {
							if multiMediaBool, ok := multiMedia.(bool); ok {
								rootValue = multiMediaBool
							}
						}
					}
				}
				mediaRule.SetRoot(rootValue)
			}
		}
	}
	
	return mediaNode
}

// AtRuleRule interface for the first rule in at-rule
type AtRuleRule interface {
	SetRoot(value any)
}

// VisitAtRule processes at-rule nodes
func (jsv *JoinSelectorVisitor) VisitAtRule(atRuleNode any, visitArgs *VisitArgs) any {
	// Guard against empty contexts
	if len(jsv.contexts) == 0 {
		return nil
	}
	context := jsv.contexts[len(jsv.contexts)-1]
	
	// Try interface-based approach first
	if atRuleInterface, ok := atRuleNode.(interface{ GetRules() []any }); ok {
		rules := atRuleInterface.GetRules()
		if rules != nil && len(rules) > 0 {
			if atRuleRule, ok := rules[0].(interface{ SetRoot(any) }); ok {
				var rootValue any = nil
				
				// Check if atRule has GetIsRooted method
				if isRootedInterface, ok := atRuleNode.(interface{ GetIsRooted() bool }); ok {
					if isRootedInterface.GetIsRooted() || len(context) == 0 {
						rootValue = true
					}
				} else if len(context) == 0 {
					rootValue = true
				}
				atRuleRule.SetRoot(rootValue)
			}
		}
	} else if atRule, ok := atRuleNode.(*AtRule); ok {
		// Fallback to concrete type for backward compatibility
		rules := atRule.Rules
		if rules != nil && len(rules) > 0 {
			if atRuleRule, ok := rules[0].(AtRuleRule); ok {
				var rootValue any = nil
				if hasIsRooted(atRule) {
					if getIsRooted(atRule) || len(context) == 0 {
						rootValue = true
					}
				} else if len(context) == 0 {
					rootValue = true
				}
				atRuleRule.SetRoot(rootValue)
			}
		}
	}
	
	return atRuleNode
}

// Helper functions to safely check and call methods
func hasJoinSelectors(ruleset *Ruleset) bool {
	// Check if the ruleset has a JoinSelectors method
	// For now, assume all rulesets have this capability
	return true
}


func hasIsRooted(atRule *AtRule) bool {
	// Check if atRule has IsRooted method
	// For now, return false as a safe default
	return false
}

func getIsRooted(atRule *AtRule) bool {
	// Get the IsRooted value
	// For now, return false as a safe default
	return false
}