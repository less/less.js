package less_go

import "fmt"

// ParserFrame represents a scope frame that can look up variables and properties
type ParserFrame interface {
	Variable(name string) map[string]any
	Property(name string) []any
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
func (v *Variable) Eval(context any) (any, error) {
	
	name := v.name
	

	if len(name) >= 2 && name[:2] == "@@" {
		innerVar := NewVariable(name[1:], v.GetIndex(), v.FileInfo())
		innerResult, err := innerVar.Eval(context)
		if err != nil {
			return nil, err
		}
		
		// Extract the value string from the result
		var valueStr string
		switch res := innerResult.(type) {
		case map[string]any:
			if value, exists := res["value"]; exists {
				valueStr = fmt.Sprintf("%v", value)
			}
		case *Quoted:
			valueStr = res.value
		case *Anonymous:
			// Handle Anonymous objects - extract the underlying value
			if quoted, ok := res.Value.(*Quoted); ok {
				valueStr = quoted.value
			} else {
				valueStr = fmt.Sprintf("%v", res.Value)
			}
		case interface{ GetValue() any }:
			valueStr = fmt.Sprintf("%v", res.GetValue())
		default:
			valueStr = fmt.Sprintf("%v", innerResult)
		}
		
		if valueStr != "" {
			name = "@" + valueStr
		}
	}

	if v.evaluating {
		filename := ""
		if v._fileInfo != nil {
			if fn, ok := v._fileInfo["filename"].(string); ok {
				filename = fn
			}
		}
		return nil, &LessError{
			Type:     "Name",
			Message:  fmt.Sprintf("Recursive variable definition for %s", name),
			Filename: filename,
			Index:    v.GetIndex(),
		}
	}

	v.evaluating = true
	defer func() { v.evaluating = false }()

	// Handle different context types - interface-based (tests) or map-based (runtime)
	if interfaceContext, ok := context.(interface{ GetFrames() []ParserFrame }); ok {
		// Interface-based context (for tests)
		frames := interfaceContext.GetFrames()
		
		for _, frame := range frames {
			if varResult := frame.Variable(name); varResult != nil {
				
				// Handle important flag if present
				if importantVal, ok := varResult["important"].(bool); ok && importantVal {
					if importantScopes, ok := context.(interface{ GetImportantScope() []map[string]bool }); ok {
						scope := importantScopes.GetImportantScope()
						if len(scope) > 0 {
							scope[len(scope)-1]["important"] = true
						}
					}
				}

				// Get value from result
				val, ok := varResult["value"]
				if !ok {
					continue
				}

				// If in calc context, wrap vars in a function call to cascade evaluate args first
				if isInCalc, ok := context.(interface{ IsInCalc() bool }); ok && isInCalc.IsInCalc() {
					selfCall := NewCall("_SELF", []any{val}, v.GetIndex(), v.FileInfo())
					// Evaluate the _SELF call like JavaScript does
					return selfCall.Eval(context)
				}

				// Evaluate value - check both interface types
				if evalable, ok := val.(interface{ Eval(any) (any, error) }); ok {
					result, err := evalable.Eval(context)
					return result, err
				} else if evalCtx, ok := val.(interface{ Eval(EvalContext) (any, error) }); ok {
					if ctx, ok := context.(EvalContext); ok {
						result, err := evalCtx.Eval(ctx)
						return result, err
					} else {
						return val, nil
					}
				} else {
					return val, nil
				}
			}
		}
	} else if ctx, ok := context.(map[string]any); ok {
		// Map-based context (for runtime)
		framesAny, exists := ctx["frames"]
		if !exists {
			return nil, fmt.Errorf("no frames in evaluation context")
		}
		
		frames, ok := framesAny.([]any)
		if !ok {
			return nil, fmt.Errorf("frames is not []any")
		}

		// Find variable in frames
		for _, frameAny := range frames {
			// Frames can be Rulesets that have Variable lookup methods
			if frame, ok := frameAny.(interface{ Variable(string) map[string]any }); ok {
				if varResult := frame.Variable(name); varResult != nil {
					
					// Handle important flag if present
					if importantVal, ok := varResult["important"].(bool); ok && importantVal {
						if importantScopeAny, exists := ctx["importantScope"]; exists {
							if importantScope, ok := importantScopeAny.([]map[string]bool); ok && len(importantScope) > 0 {
								lastScope := importantScope[len(importantScope)-1]
								lastScope["important"] = true
							}
						}
					}

					// Get value from result
					val, ok := varResult["value"]
					if !ok {
						continue
					}

					// If in calc context, wrap vars in a function call to cascade evaluate args first
					if isInCalc, exists := ctx["inCalc"]; exists && isInCalc == true {
						selfCall := NewCall("_SELF", []any{val}, v.GetIndex(), v.FileInfo())
						// Evaluate the _SELF call like JavaScript does
						return selfCall.Eval(context)
					}

					// Evaluate value - check both interface types
					if evalable, ok := val.(interface{ Eval(any) (any, error) }); ok {
						result, err := evalable.Eval(context)
						return result, err
					} else if _, ok := val.(interface{ Eval(EvalContext) (any, error) }); ok {
						// For map context, we can't pass EvalContext, so return value as-is
						return val, nil
					} else {
						return val, nil
					}
				}
			}
		}
	} else {
		return nil, fmt.Errorf("context is neither map[string]any nor interface context")
	}

	filename := ""
	if v._fileInfo != nil {
		if fn, ok := v._fileInfo["filename"].(string); ok {
			filename = fn
		}
	}
	return nil, &LessError{
		Type:     "Name",
		Message:  fmt.Sprintf("variable %s is undefined", name),
		Filename: filename,
		Index:    v.GetIndex(),
	}
}

// ToCSS converts the variable to CSS by evaluating it first
func (v *Variable) ToCSS(context any) string {
	result, err := v.Eval(context)
	if err != nil {
		// Return the variable name as fallback, similar to how failed evaluation might be handled
		return v.name
	}
	
	// Convert result to CSS string
	if cssObj, ok := result.(interface{ ToCSS(any) string }); ok {
		return cssObj.ToCSS(context)
	} else if str, ok := result.(string); ok {
		return str
	} else {
		return fmt.Sprintf("%v", result)
	}
}

 