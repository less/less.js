package less_go

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
					if jsInterface, ok := rulesetNode.(interface{ JoinSelectors([]any, []any, []Selector) }); ok {
						// Convert to Selector slice - this is an approximation
						selectors := make([]Selector, len(filteredSelectors))
						for i, sel := range filteredSelectors {
							if selector, ok := sel.(Selector); ok {
								selectors[i] = selector
							}
						}
						jsInterface.JoinSelectors(paths, context, selectors)
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
						callJoinSelectors(ruleset, [][]any{paths}, context, filteredSelectors)
					}
				} else {
					ruleset.Selectors = nil
				}
			}
			
			if ruleset.Selectors == nil {
				ruleset.Rules = nil
			}
			ruleset.Paths = [][]any{paths}
		}
	}
	
	return rulesetNode
}

// VisitRulesetOut removes the top context when exiting a ruleset
func (jsv *JoinSelectorVisitor) VisitRulesetOut(rulesetNode any) {
	jsv.contexts = jsv.contexts[:len(jsv.contexts)-1]
}

// MediaRule interface for the first rule in media
type MediaRule interface {
	SetRoot(root bool)
}

// VisitMedia processes media nodes
func (jsv *JoinSelectorVisitor) VisitMedia(mediaNode any, visitArgs *VisitArgs) any {
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

func callJoinSelectors(ruleset *Ruleset, paths [][]any, context []any, selectors []any) {
	// This would call the JoinSelectors method if it exists
	// For now, this is a stub - the actual implementation would need to be added to Ruleset
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