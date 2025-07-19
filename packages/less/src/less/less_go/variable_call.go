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

// Type returns the node type
func (vc *VariableCall) Type() string {
	return "VariableCall"
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

// Eval evaluates the variable call - match JavaScript implementation
func (vc *VariableCall) Eval(context any) (result any, err error) {
	// Use defer/recover to catch panics and convert them to errors
	defer func() {
		if r := recover(); r != nil {
			// Convert panic to error
			if lessErr, ok := r.(*LessError); ok {
				err = lessErr
			} else if lessErr, ok := r.(LessError); ok {
				err = &lessErr
			} else {
				err = fmt.Errorf("%v", r)
			}
		}
	}()
	// Match JavaScript: let detachedRuleset = new Variable(this.variable, this.getIndex(), this.fileInfo()).eval(context);
	variable := NewVariable(vc.variable, vc.GetIndex(), vc.FileInfo())
	// Variable.Eval returns (any, error) but JavaScript ignores the error
	detachedRuleset, _ := variable.Eval(context)
	
	errorMsg := fmt.Sprintf("Could not evaluate variable call %s", vc.variable)
	
	// Match JavaScript: if (!detachedRuleset.ruleset)
	var hasRuleset bool
	if dr, ok := detachedRuleset.(*DetachedRuleset); ok && dr.ruleset != nil {
		hasRuleset = true
	} else if dr, ok := detachedRuleset.(interface{ GetRuleset() any }); ok && dr.GetRuleset() != nil {
		// Also check for objects with GetRuleset method
		hasRuleset = true
	}
	
	if !hasRuleset {
		var rules any
		
		// Match JavaScript conditions in order
		if rulesObj, ok := detachedRuleset.(interface{ GetRules() []any }); ok && rulesObj.GetRules() != nil {
			// if (detachedRuleset.rules) - with GetRules() method
			rules = detachedRuleset
		} else if mapObj, ok := detachedRuleset.(map[string]any); ok {
			// if (detachedRuleset.rules) - plain map with "rules" key
			if rulesVal, hasRules := mapObj["rules"]; hasRules && rulesVal != nil {
				rules = detachedRuleset
			} else if valArr, hasValue := mapObj["value"].([]any); hasValue {
				// else if (Array.isArray(detachedRuleset.value))
				rules = NewRuleset([]any{}, valArr, false, nil)
			}
		} else if arr, ok := detachedRuleset.([]any); ok {
			// else if (Array.isArray(detachedRuleset))
			rules = NewRuleset([]any{}, arr, false, nil)
		} else if valObj, ok := detachedRuleset.(interface{ GetValue() any }); ok {
			if arr, ok := valObj.GetValue().([]any); ok {
				// else if (Array.isArray(detachedRuleset.value))
				rules = NewRuleset([]any{}, arr, false, nil)
			}
		}
		
		if rules == nil {
			// Match JavaScript: throw error;
			return nil, NewLessError(ErrorDetails{Message: errorMsg}, nil, "")
		}
		
		// Match JavaScript: detachedRuleset = new DetachedRuleset(rules);
		if rulesetNode, ok := rules.(*Ruleset); ok {
			// Wrap Ruleset in a Node
			node := NewNode()
			node.Value = rulesetNode
			detachedRuleset = NewDetachedRuleset(node, nil)
		} else if node, ok := rules.(*Node); ok {
			detachedRuleset = NewDetachedRuleset(node, nil)
		} else {
			// Wrap in a Node if needed
			node := NewNode()
			node.Value = rules
			detachedRuleset = NewDetachedRuleset(node, nil)
		}
	}
	
	// Match JavaScript: if (detachedRuleset.ruleset) { return detachedRuleset.callEval(context); }
	if dr, ok := detachedRuleset.(*DetachedRuleset); ok && dr.ruleset != nil {
		// For VariableCall, we need to return the evaluated result in the format expected by ruleset.go
		evalResult := dr.CallEval(context)
		// The ruleset.go expects a map with "rules" key for VariableCall
		if rs, ok := evalResult.(*Ruleset); ok {
			return map[string]any{"rules": rs.Rules}, nil
		}
		return evalResult, nil
	} else if dr, ok := detachedRuleset.(interface{ CallEval(any) any }); ok {
		// Also check for objects with CallEval method (like mocks)
		evalResult := dr.CallEval(context)
		// The ruleset.go expects a map with "rules" key for VariableCall
		if rs, ok := evalResult.(*Ruleset); ok {
			return map[string]any{"rules": rs.Rules}, nil
		}
		return evalResult, nil
	}
	
	// Match JavaScript: throw error;
	return nil, NewLessError(ErrorDetails{Message: errorMsg}, nil, "")
} 