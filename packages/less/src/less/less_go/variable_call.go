package less_go

import (
	"fmt"

)

// VariableCall represents a variable call node in the Less AST
type VariableCall struct {
	*Node
	variable  string
	_index    int
	_fileInfo map[string]any
	allowRoot bool
}

// NewVariableCall creates a new VariableCall instance
func NewVariableCall(variable string, index int, currentFileInfo map[string]any) *VariableCall {
	return &VariableCall{
		Node:      NewNode(),
		variable:  variable,
		_index:    index,
		_fileInfo: currentFileInfo,
		allowRoot: true,
	}
}

// GetType returns the node type
func (vc *VariableCall) GetType() string {
	return "VariableCall"
}

// GetIndex returns the node's index
func (vc *VariableCall) GetIndex() int {
	return vc._index
}

// FileInfo returns the node's file information
func (vc *VariableCall) FileInfo() map[string]any {
	return vc._fileInfo
}

// Eval evaluates the variable call
func (vc *VariableCall) Eval(context any) (any, error) {
	variable := NewVariable(vc.variable, vc.GetIndex(), vc.FileInfo())
	
	// Wrap the context to implement EvalContext interface
	wrappedContext := &contextWrapper{ctx: context}
	
	detachedRuleset, err := variable.Eval(wrappedContext)
	if err != nil {
		return nil, err
	}

	errorMsg := fmt.Sprintf("Could not evaluate variable call %s", vc.variable)
	lessError := NewLessError(ErrorDetails{Message: errorMsg}, nil, "")

	var rules any

	// Check if detachedRuleset already has a ruleset property
	if dr, ok := detachedRuleset.(interface{ GetRuleset() any }); ok {
		if ruleset := dr.GetRuleset(); ruleset != nil {
			// detachedRuleset already has a ruleset, use it directly
			if detached, ok := detachedRuleset.(interface{ CallEval(any) any }); ok {
				return detached.CallEval(context), nil
			}
		}
	}

	// Handle different return types from Variable.Eval
	switch dr := detachedRuleset.(type) {
	case map[string]any:
		if _, hasRules := dr["rules"]; hasRules {
			rules = dr
		} else if valueArray, hasValue := dr["value"].([]any); hasValue {
			rules = NewRuleset([]any{}, valueArray, false, nil)
		} else {
			return nil, lessError
		}
	case []any:
		rules = NewRuleset([]any{}, dr, false, nil)
	case interface{ GetRules() []any }:
		rules = dr
	default:
		// Check if it has a rules property using interface
		if rulesGetter, ok := detachedRuleset.(interface{ GetRules() []any }); ok {
			rules = rulesGetter
		} else {
			return nil, lessError
		}
	}

	// Create DetachedRuleset with the rules
	var detached *DetachedRuleset
	if rulesetNode, ok := rules.(*Ruleset); ok {
		detached = NewDetachedRuleset(rulesetNode.Node, nil)
	} else if node, ok := rules.(*Node); ok {
		detached = NewDetachedRuleset(node, nil)
	} else {
		// Wrap in a Node if needed
		node := NewNode()
		node.Value = rules
		detached = NewDetachedRuleset(node, nil)
	}

	if detached.ruleset != nil {
		return detached.CallEval(context), nil
	}

	return nil, lessError
} 