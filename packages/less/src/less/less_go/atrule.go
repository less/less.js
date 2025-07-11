package less_go

import (
	"strings"
)

// AtRule represents an at-rule node in the Less AST
type AtRule struct {
	*Node
	Name        string
	Value       any
	Rules       []any
	IsRooted    bool
	AllowRoot   bool
	DebugInfo   any
}

// NewAtRule creates a new AtRule instance
func NewAtRule(name string, value any, rules any, index int, currentFileInfo map[string]any, debugInfo any, isRooted bool, visibilityInfo map[string]any) *AtRule {
	atRule := &AtRule{
		Node:      NewNode(),
		Name:      name,
		IsRooted:  isRooted,
		AllowRoot: true,
		DebugInfo: debugInfo,
	}

	// Handle value - convert to Anonymous if string/non-Node
	if value != nil {
		// Check if value is already a Node-based type (Anonymous, etc.)
		switch value.(type) {
		case *Anonymous, *Node:
			atRule.Value = value
		default:
			atRule.Value = NewAnonymous(value, index, currentFileInfo, false, false, nil)
		}
	} else {
		atRule.Value = value
	}

	// Handle rules
	if rules != nil {
		if rulesSlice, ok := rules.([]any); ok {
			atRule.Rules = rulesSlice
		} else {
			// Single rule - convert to array and add empty selectors
			atRule.Rules = []any{rules}
			if ruleset, ok := rules.(*Ruleset); ok {
				// Create empty selectors like JavaScript version - skip if errors occur
				emptySelector, err := NewSelector("", nil, nil, index, currentFileInfo, nil)
				if err == nil {
					emptySelectors, err := emptySelector.CreateEmptySelectors()
					if err == nil {
						ruleset.Selectors = make([]any, len(emptySelectors))
						for i, sel := range emptySelectors {
							ruleset.Selectors[i] = sel
						}
					}
				}
			}
		}

		// Set allowImports to true for all rules and parent relationships
		for _, rule := range atRule.Rules {
			if ruleset, ok := rule.(*Ruleset); ok {
				ruleset.AllowImports = true
			}
		}
		atRule.SetParent(atRule.Rules, atRule.Node)
	}

	// Set node properties
	atRule.Index = index
	if currentFileInfo != nil {
		atRule.SetFileInfo(currentFileInfo)
	}
	atRule.CopyVisibilityInfo(visibilityInfo)

	return atRule
}

// Type returns the node type
func (a *AtRule) Type() string {
	return "AtRule"
}

// Accept visits the node with a visitor
func (a *AtRule) Accept(visitor any) {
	if v, ok := visitor.(interface{ VisitArray([]any) []any }); ok {
		if a.Rules != nil {
			a.Rules = v.VisitArray(a.Rules)
		}
	}

	if v, ok := visitor.(interface{ Visit(any) any }); ok {
		if a.Value != nil {
			a.Value = v.Visit(a.Value)
		}
	}
}

// IsRulesetLike checks if the at-rule is ruleset-like
func (a *AtRule) IsRulesetLike() any {
	if a.Rules != nil {
		return a.Rules
	}
	return !a.IsCharset()
}

// IsCharset checks if this is a @charset rule
func (a *AtRule) IsCharset() bool {
	return a.Name == "@charset"
}

// GenCSS generates CSS representation
func (a *AtRule) GenCSS(context any, output *CSSOutput) {
	output.Add(a.Name, a.FileInfo(), a.GetIndex())
	
	if a.Value != nil {
		output.Add(" ", nil, nil)
		if gen, ok := a.Value.(interface{ GenCSS(any, *CSSOutput) }); ok {
			gen.GenCSS(context, output)
		}
	}
	
	if a.Rules != nil {
		a.OutputRuleset(context, output, a.Rules)
	} else {
		output.Add(";", nil, nil)
	}
}

// Eval evaluates the at-rule
func (a *AtRule) Eval(context any) (*AtRule, error) {
	var mediaPathBackup, mediaBlocksBackup any
	var value any = a.Value
	var rules []any = a.Rules

	// Media stored inside other atrule should not bubble over it
	// Backup media bubbling information
	if ctx, ok := context.(map[string]any); ok {
		mediaPathBackup = ctx["mediaPath"]
		mediaBlocksBackup = ctx["mediaBlocks"]
		// Delete media bubbling information
		ctx["mediaPath"] = []any{}
		ctx["mediaBlocks"] = []any{}
	}

	if value != nil {
		if eval, ok := value.(interface{ Eval(any) (any, error) }); ok {
			evaluated, err := eval.Eval(context)
			if err != nil {
				return nil, err
			}
			value = evaluated
		}
	}

	if len(rules) > 0 {
		// Assuming that there is only one rule at this point - that is how parser constructs the rule
		if eval, ok := rules[0].(interface{ Eval(any) (*Ruleset, error) }); ok {
			evaluated, err := eval.Eval(context)
			if err != nil {
				return nil, err
			}
			rules = []any{evaluated}
			evaluated.Root = true
		}
	}

	// Restore media bubbling information
	if ctx, ok := context.(map[string]any); ok {
		ctx["mediaPath"] = mediaPathBackup
		ctx["mediaBlocks"] = mediaBlocksBackup
	}

	return NewAtRule(a.Name, value, rules, a.GetIndex(), a.FileInfo(), a.DebugInfo, a.IsRooted, a.VisibilityInfo()), nil
}

// Variable returns a variable from the first rule (if rules exist)
func (a *AtRule) Variable(name string) any {
	if len(a.Rules) > 0 {
		// Assuming that there is only one rule at this point - that is how parser constructs the rule
		if ruleset, ok := a.Rules[0].(*Ruleset); ok {
			return ruleset.Variable(name)
		}
	}
	return nil
}

// Find finds rules matching a selector (delegates to first rule if exists)
func (a *AtRule) Find(selector any, self any, filter func(any) bool) []any {
	if len(a.Rules) > 0 {
		// Assuming that there is only one rule at this point - that is how parser constructs the rule
		if ruleset, ok := a.Rules[0].(*Ruleset); ok {
			return ruleset.Find(selector, self, filter)
		}
	}
	return nil
}

// Rulesets returns rulesets from the first rule (if rules exist)
func (a *AtRule) Rulesets() []any {
	if len(a.Rules) > 0 {
		// Assuming that there is only one rule at this point - that is how parser constructs the rule
		if ruleset, ok := a.Rules[0].(*Ruleset); ok {
			return ruleset.Rulesets()
		}
	}
	return nil
}

// OutputRuleset outputs CSS for rules with proper formatting
func (a *AtRule) OutputRuleset(context any, output *CSSOutput, rules []any) {
	ruleCnt := len(rules)
	
	ctx, ok := context.(map[string]any)
	if !ok {
		ctx = make(map[string]any)
	}
	
	tabLevel := 0
	if tl, ok := ctx["tabLevel"].(int); ok {
		tabLevel = tl
	}
	tabLevel = tabLevel + 1
	ctx["tabLevel"] = tabLevel

	compress := false
	if c, ok := ctx["compress"].(bool); ok {
		compress = c
	}

	if compress {
		output.Add("{", nil, nil)
		for i := 0; i < ruleCnt; i++ {
			if gen, ok := rules[i].(interface{ GenCSS(any, *CSSOutput) }); ok {
				gen.GenCSS(context, output)
			}
		}
		output.Add("}", nil, nil)
		ctx["tabLevel"] = tabLevel - 1
		return
	}

	// Non-compressed
	tabSetStr := "\n" + strings.Repeat("  ", tabLevel-1)
	tabRuleStr := tabSetStr + "  "
	
	if ruleCnt == 0 {
		output.Add(" {"+tabSetStr+"}", nil, nil)
	} else {
		output.Add(" {"+tabRuleStr, nil, nil)
		if gen, ok := rules[0].(interface{ GenCSS(any, *CSSOutput) }); ok {
			gen.GenCSS(context, output)
		}
		for i := 1; i < ruleCnt; i++ {
			output.Add(tabRuleStr, nil, nil)
			if gen, ok := rules[i].(interface{ GenCSS(any, *CSSOutput) }); ok {
				gen.GenCSS(context, output)
			}
		}
		output.Add(tabSetStr+"}", nil, nil)
	}

	ctx["tabLevel"] = tabLevel - 1
} 