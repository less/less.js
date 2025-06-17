package go_parser

import "fmt"

// Frame represents a scope frame that can look up variables
type Frame interface {
	Variable(name string) map[string]any
}

// Variable represents a variable node in the Less AST
type Variable struct {
	*Node
	name      string
	_index    int
	_fileInfo map[string]any
	evaluating bool
}

// NewVariable creates a new Variable instance
func NewVariable(name string, index int, currentFileInfo map[string]any) *Variable {
	return &Variable{
		Node:      NewNode(),
		name:      name,
		_index:    index,
		_fileInfo: currentFileInfo,
	}
}

// GetType returns the node type
func (v *Variable) GetType() string {
	return "Variable"
}

// GetIndex returns the node's index
func (v *Variable) GetIndex() int {
	return v._index
}

// FileInfo returns the node's file information
func (v *Variable) FileInfo() map[string]any {
	return v._fileInfo
}

// GetName returns the variable name
func (v *Variable) GetName() string {
	return v.name
}

// Eval evaluates the variable
func (v *Variable) Eval(context EvalContext) (any, error) {
	name := v.name

	if len(name) >= 2 && name[:2] == "@@" {
		innerVar := NewVariable(name[1:], v.GetIndex(), v.FileInfo())
		innerResult, err := innerVar.Eval(context)
		if err != nil {
			return nil, err
		}
		
		// Convert innerResult to string and prepend "@"
		name = "@" + fmt.Sprintf("%v", innerResult.(map[string]any)["value"])
	}

	if v.evaluating {
		return nil, fmt.Errorf("name: recursive variable definition for %s (index: %d, filename: %s)", 
			name, v.GetIndex(), v.FileInfo()["filename"])
	}

	v.evaluating = true

	// Get frames from context
	frames, ok := context.(interface{ GetFrames() []Frame })
	if !ok {
		return nil, fmt.Errorf("context does not implement GetFrames")
	}

	// Find variable in frames
	for _, frame := range frames.GetFrames() {
		if varResult := frame.Variable(name); varResult != nil {
			// Handle important flag if present
			if importantVal, ok := varResult["important"].(bool); ok && importantVal {
				importantScopes, ok := context.(interface{ GetImportantScope() []map[string]bool })
				if ok && len(importantScopes.GetImportantScope()) > 0 {
					lastScope := importantScopes.GetImportantScope()[len(importantScopes.GetImportantScope())-1]
					lastScope["important"] = true
				}
			}

			// Get value from result
			val, ok := varResult["value"]
			if !ok {
				continue
			}

			// If in calc, wrap vars in a function call to cascade evaluate args first
			if isInCalc, ok := context.(interface{ IsInCalc() bool }); ok && isInCalc.IsInCalc() {
				selfCall := NewCall("_SELF", []any{val}, v.GetIndex(), v.FileInfo())
				v.evaluating = false
				return selfCall, nil
			}

			// Evaluate value
			if evalable, ok := val.(interface{ Eval(EvalContext) (any, error) }); ok {
				v.evaluating = false
				return evalable.Eval(context)
			}
		}
	}

	v.evaluating = false
	return nil, fmt.Errorf("name: variable %s is undefined (index: %d, filename: %s)", 
		name, v.GetIndex(), v.FileInfo()["filename"])
} 