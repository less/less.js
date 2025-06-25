package visitors

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

// Selector interface for selector filtering
type Selector interface {
	GetIsOutput() bool
}

// Ruleset interface for ruleset processing
type Ruleset interface {
	GetRoot() bool
	GetSelectors() []Selector
	SetSelectors(selectors []Selector)
	GetRules() []any
	SetRules(rules []any)
	SetPaths(paths []any)
	JoinSelectors(paths []any, context []any, selectors []Selector)
}

// VisitRuleset processes ruleset nodes
func (jsv *JoinSelectorVisitor) VisitRuleset(rulesetNode any, visitArgs *VisitArgs) any {
	context := jsv.contexts[len(jsv.contexts)-1]
	paths := make([]any, 0)
	
	jsv.contexts = append(jsv.contexts, paths)
	
	if ruleset, ok := rulesetNode.(Ruleset); ok {
		if !ruleset.GetRoot() {
			selectors := ruleset.GetSelectors()
			if selectors != nil {
				// Filter selectors by getIsOutput
				filteredSelectors := make([]Selector, 0)
				for _, selector := range selectors {
					if selector.GetIsOutput() {
						filteredSelectors = append(filteredSelectors, selector)
					}
				}
				
				if len(filteredSelectors) > 0 {
					ruleset.SetSelectors(filteredSelectors)
					ruleset.JoinSelectors(paths, context, filteredSelectors)
				} else {
					ruleset.SetSelectors(nil)
				}
			}
			
			if ruleset.GetSelectors() == nil {
				ruleset.SetRules(nil)
			}
			ruleset.SetPaths(paths)
		}
	}
	
	return rulesetNode
}

// VisitRulesetOut removes the top context when exiting a ruleset
func (jsv *JoinSelectorVisitor) VisitRulesetOut(rulesetNode any) {
	jsv.contexts = jsv.contexts[:len(jsv.contexts)-1]
}

// Media interface for media node processing
type Media interface {
	GetRules() []any
}

// MediaRule interface for the first rule in media
type MediaRule interface {
	SetRoot(root bool)
}

// VisitMedia processes media nodes
func (jsv *JoinSelectorVisitor) VisitMedia(mediaNode any, visitArgs *VisitArgs) any {
	context := jsv.contexts[len(jsv.contexts)-1]
	
	if media, ok := mediaNode.(Media); ok {
		rules := media.GetRules()
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

// AtRule interface for at-rule processing
type AtRule interface {
	GetIsRooted() bool
	GetRules() []any
}

// AtRuleRule interface for the first rule in at-rule
type AtRuleRule interface {
	SetRoot(value any)
}

// VisitAtRule processes at-rule nodes
func (jsv *JoinSelectorVisitor) VisitAtRule(atRuleNode any, visitArgs *VisitArgs) any {
	context := jsv.contexts[len(jsv.contexts)-1]
	
	if atRule, ok := atRuleNode.(AtRule); ok {
		rules := atRule.GetRules()
		if rules != nil && len(rules) > 0 {
			if atRuleRule, ok := rules[0].(AtRuleRule); ok {
				var rootValue any = nil
				if atRule.GetIsRooted() || len(context) == 0 {
					rootValue = true
				}
				atRuleRule.SetRoot(rootValue)
			}
		}
	}
	
	return atRuleNode
}