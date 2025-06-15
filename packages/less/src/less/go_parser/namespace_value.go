package go_parser

import (
	"fmt"
)

// NamespaceValue represents a namespace value node in the Less AST
type NamespaceValue struct {
	*Node
	value     any
	lookups   []string
	_index    int
	_fileInfo map[string]any
}

// NewNamespaceValue creates a new NamespaceValue instance
func NewNamespaceValue(ruleCall any, lookups []string, index int, fileInfo map[string]any) *NamespaceValue {
	nv := &NamespaceValue{
		Node:      NewNode(),
		value:     ruleCall,
		lookups:   lookups,
		_index:    index,
		_fileInfo: fileInfo,
	}
	
	// Set the node's index and fileInfo
	nv.Node.Index = index
	if fileInfo != nil {
		nv.Node.SetFileInfo(fileInfo)
	}
	
	return nv
}

// GetType returns the node type
func (nv *NamespaceValue) GetType() string {
	return "NamespaceValue"
}

// GetIndex returns the node's index
func (nv *NamespaceValue) GetIndex() int {
	return nv._index
}

// FileInfo returns the node's file information
func (nv *NamespaceValue) FileInfo() map[string]any {
	return nv._fileInfo
}

// Eval evaluates the namespace value
func (nv *NamespaceValue) Eval(context any) (any, error) {
	var name string
	
	// Start by evaluating the initial value - matches JavaScript: rules = this.value.eval(context)
	var rules any
	if evaluator, ok := nv.value.(interface{ Eval(any) (any, error) }); ok {
		evalResult, err := evaluator.Eval(context)
		if err != nil {
			return nil, err
		}
		rules = evalResult
	} else {
		rules = nv.value
	}
	
	// Process each lookup
	for i := 0; i < len(nv.lookups); i++ {
		name = nv.lookups[i]
		
		// CRITICAL: Array conversion must happen INSIDE the loop - matches JavaScript behavior
		// Eval'd DRs return rulesets.
		// Eval'd mixins return rules, so let's make a ruleset if we need it.
		// We need to do this because of late parsing of values
		if rulesArray, ok := rules.([]any); ok {
			// Create new Ruleset with empty selector - pass nil to get default empty selector
			emptySelector, err := NewSelector(nil, nil, nil, 0, make(map[string]any), nil)
			if err != nil {
				return nil, fmt.Errorf("failed to create empty selector: %w", err)
			}
			rules = NewRuleset([]any{emptySelector}, rulesArray, false, nil)
		}
		
		if name == "" {
			// Empty string lookup - call lastDeclaration
			if ruleset, ok := rules.(interface{ LastDeclaration() any }); ok {
				rules = ruleset.LastDeclaration()
			}
		} else if len(name) > 0 && name[0] == '@' {
			// Variable lookup
			if len(name) > 1 && name[1] == '@' {
				// Handle @@ case - evaluate the variable name
				innerVar := NewVariable(name[1:], nv.GetIndex(), nv.FileInfo())
				if evalContext, ok := context.(EvalContext); ok {
					innerResult, err := innerVar.Eval(evalContext)
					if err != nil {
						return nil, err
					}
					if resultMap, ok := innerResult.(map[string]any); ok {
						if value, ok := resultMap["value"]; ok {
							name = "@" + fmt.Sprintf("%v", value)
						}
					}
				}
			}
			
			// Match JavaScript exactly: if (rules.variables) { rules = rules.variable(name); }
			hasVariablesProperty := false
			if variableChecker, ok := rules.(interface{ HasVariables() bool }); ok {
				hasVariablesProperty = variableChecker.HasVariables()
			}
			
			if hasVariablesProperty {
				if ruleset, ok := rules.(interface{ Variable(string) any }); ok {
					rules = ruleset.Variable(name)
				}
			}
			
			// Match JavaScript: if (!rules) { throw error; } - ALWAYS check regardless of variables property
			// This check happens AFTER the variable lookup attempt
			if rules == nil {
				return nil, &LessError{
					Type:     "Name",
					Message:  fmt.Sprintf("variable %s not found", name),
					Filename: nv.getFilename(),
					Index:    nv.GetIndex(),
				}
			}
		} else {
			// Property lookup
			if len(name) >= 2 && name[:2] == "$@" {
				// Handle $@ case - evaluate the variable name
				innerVar := NewVariable(name[1:], nv.GetIndex(), nv.FileInfo())
				if evalContext, ok := context.(EvalContext); ok {
					innerResult, err := innerVar.Eval(evalContext)
					if err != nil {
						return nil, err
					}
					if resultMap, ok := innerResult.(map[string]any); ok {
						if value, ok := resultMap["value"]; ok {
							name = "$" + fmt.Sprintf("%v", value)
						}
					}
				}
			} else {
				// Add $ prefix if not present
				if len(name) == 0 || name[0] != '$' {
					name = "$" + name
				}
			}
			
			// Match JavaScript: if (rules.properties) { rules = rules.property(name); }
			hasPropertiesProperty := false
			if propertyChecker, ok := rules.(interface{ HasProperties() bool }); ok {
				hasPropertiesProperty = propertyChecker.HasProperties()
			}
			
			if hasPropertiesProperty {
				if ruleset, ok := rules.(interface{ Property(string) any }); ok {
					rules = ruleset.Property(name)
				}
			}
			
			// Match JavaScript: if (!rules) { throw error; }
			if rules == nil {
				propertyName := name
				if len(name) > 1 && name[0] == '$' {
					propertyName = name[1:]
				}
				return nil, &LessError{
					Type:     "Name",
					Message:  fmt.Sprintf("property \"%s\" not found", propertyName),
					Filename: nv.getFilename(),
					Index:    nv.GetIndex(),
				}
			}
			
			// Properties are an array of values, since a ruleset can have multiple props.
			// We pick the last one (the "cascaded" value)
			if rulesArray, ok := rules.([]any); ok && len(rulesArray) > 0 {
				rules = rulesArray[len(rulesArray)-1]
			}
		}
		
		// Match JavaScript: if (rules.value) { rules = rules.eval(context).value; }
		if rulesWithValue, ok := rules.(interface{ 
			Eval(any) (any, error)
		}); ok {
			// Check if it has a value property (matches JavaScript rules.value check)
			if valueChecker, ok := rules.(interface{ HasValue() bool }); ok && valueChecker.HasValue() {
				evalResult, err := rulesWithValue.Eval(context)
				if err != nil {
					return nil, err
				}
				if evalMap, ok := evalResult.(map[string]any); ok {
					if value, exists := evalMap["value"]; exists {
						rules = value
					}
				}
			}
		}
		
		// Match JavaScript: if (rules.ruleset) { rules = rules.ruleset.eval(context); }
		if rulesWithRuleset, ok := rules.(interface{ HasRuleset() bool }); ok && rulesWithRuleset.HasRuleset() {
			if rulesetGetter, ok := rules.(interface{ GetRuleset() interface{ Eval(any) (any, error) } }); ok {
				if ruleset := rulesetGetter.GetRuleset(); ruleset != nil {
					evalResult, err := ruleset.Eval(context)
					if err != nil {
						return nil, err
					}
					rules = evalResult
				}
			}
		}
	}
	
	return rules, nil
}

// Helper method to get filename safely
func (nv *NamespaceValue) getFilename() string {
	if nv._fileInfo != nil {
		if filename, ok := nv._fileInfo["filename"].(string); ok {
			return filename
		}
	}
	return ""
}

// LessError represents a Less compilation error
type LessError struct {
	Type     string
	Message  string
	Filename string
	Index    int
}

func (e *LessError) Error() string {
	return e.Message
} 