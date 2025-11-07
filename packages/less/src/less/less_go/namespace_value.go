package less_go

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

// Type returns the node type (for compatibility)
func (nv *NamespaceValue) Type() string {
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
	// Handle MixinCall which has Eval(any) ([]any, error) signature
	if mixinCall, ok := nv.value.(*MixinCall); ok {
		evalResult, err := mixinCall.Eval(context)
		if err != nil {
			return nil, err
		}
		rules = evalResult
	} else if evaluator, ok := nv.value.(interface{ Eval(any) (any, error) }); ok {
		evalResult, err := evaluator.Eval(context)
		if err != nil {
			return nil, err
		}
		rules = evalResult
	} else {
		rules = nv.value
	}

	// Unwrap map structure returned by VariableCall.Eval()
	// VariableCall returns map[string]any{"rules": [...]} for detached rulesets
	if rulesMap, ok := rules.(map[string]any); ok {
		if rulesArray, hasRules := rulesMap["rules"]; hasRules {
			if arr, ok := rulesArray.([]any); ok {
				// Create new Ruleset with empty selector
				emptySelector, err := NewSelector(nil, nil, nil, 0, make(map[string]any), nil)
				if err != nil {
					return nil, fmt.Errorf("failed to create empty selector: %w", err)
				}
				rules = NewRuleset([]any{emptySelector}, arr, false, nil)
			}
		}
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
				innerResult, err := innerVar.Eval(context)
				if err != nil {
					return nil, err
				}
				if resultMap, ok := innerResult.(map[string]any); ok {
					if value, ok := resultMap["value"]; ok {
						name = "@" + fmt.Sprintf("%v", value)
					}
				} else {
					// Handle direct value returns - extract value from various node types
					switch v := innerResult.(type) {
					case *Quoted:
						name = "@" + v.value
					case *Anonymous:
						if str, ok := v.Value.(string); ok {
							name = "@" + str
						} else {
							name = "@" + fmt.Sprintf("%v", v.Value)
						}
					case *Keyword:
						name = "@" + v.value
					case string:
						name = "@" + v
					default:
						// Try to convert to string
						name = "@" + fmt.Sprintf("%v", innerResult)
					}
				}
			}

			// Match JavaScript exactly: if (rules.variables) { rules = rules.variable(name); }
			hasVariablesProperty := false
			if variableChecker, ok := rules.(interface{ HasVariables() bool }); ok {
				hasVariablesProperty = variableChecker.HasVariables()
			}

			if hasVariablesProperty {
				if ruleset, ok := rules.(interface{ Variable(string) map[string]any }); ok {
					rules = ruleset.Variable(name)
				}
			}

			// Match JavaScript: if (!rules) { throw error; } - ALWAYS check regardless of variables property
			// This check happens AFTER the variable lookup attempt
			// Note: In Go, when a nil map is stored in an interface, the interface != nil
			// So we need to check both the interface and the map value
			if rules == nil {
				return nil, &LessError{
					Type:     "Name",
					Message:  fmt.Sprintf("variable %s not found", name),
					Filename: nv.getFilename(),
					Index:    nv.GetIndex(),
				}
			}
			// Also check if rules is a nil map wrapped in an interface
			if rulesMap, ok := rules.(map[string]any); ok && rulesMap == nil {
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
				innerResult, err := innerVar.Eval(context)
				if err != nil {
					return nil, err
				}
				if resultMap, ok := innerResult.(map[string]any); ok {
					if value, ok := resultMap["value"]; ok {
						name = "$" + fmt.Sprintf("%v", value)
					}
				} else {
					// Handle direct value returns - extract value from various node types
					switch v := innerResult.(type) {
					case *Quoted:
						name = "$" + v.value
					case *Anonymous:
						if str, ok := v.Value.(string); ok {
							name = "$" + str
						} else {
							name = "$" + fmt.Sprintf("%v", v.Value)
						}
					case *Keyword:
						name = "$" + v.value
					case string:
						name = "$" + v
					default:
						// Try to convert to string
						name = "$" + fmt.Sprintf("%v", innerResult)
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
				if ruleset, ok := rules.(interface{ Property(string) []any }); ok {
					rules = ruleset.Property(name)
				}
			}

			// Match JavaScript: if (!rules) { throw error; }
			// Note: In Go, a nil slice in an interface{} is not == nil, so we need to check both
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
			// Also check if rules is a nil slice (Go gotcha: nil slice in interface{} is not == nil)
			if rulesSlice, ok := rules.([]any); ok && rulesSlice == nil {
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

		// First, extract value from map if present (Variable() returns {"value": ...})
		if rulesMap, ok := rules.(map[string]any); ok {
			if value, exists := rulesMap["value"]; exists {
				rules = value
			}
		}

		// Match JavaScript: if (rules.value) { rules = rules.eval(context).value; }
		// Check for value first - this may transform rules
		if rulesWithValue, ok := rules.(interface{ HasValue() bool }); ok {
			// Has HasValue method
			if rulesWithValue.HasValue() {
				// Value property is true, evaluate it
				if evaluator, ok := rules.(interface{ Eval(any) (any, error) }); ok {
					evalResult, err := evaluator.Eval(context)
					if err != nil {
						return nil, err
					}
					// Extract value from the eval result
					if evalMap, ok := evalResult.(map[string]any); ok {
						if value, exists := evalMap["value"]; exists {
							rules = value
						}
					} else {
						rules = evalResult
					}
				}
			}
			// If HasValue() returns false, skip evaluation entirely
		} else {
			// No HasValue method - handle special types like Declaration
			if decl, ok := rules.(*Declaration); ok {
				evalResult, err := decl.Eval(context)
				if err != nil {
					return nil, err
				}
				if evalDecl, ok := evalResult.(*Declaration); ok {
					rules = evalDecl.Value
					// Now evaluate the Value to get the actual value node (e.g., *Dimension)
					if valueEvaluator, ok := rules.(interface{ Eval(any) (any, error) }); ok {
						valueResult, err := valueEvaluator.Eval(context)
						if err != nil {
							return nil, err
						}
						rules = valueResult

						// If the result is still an Anonymous with a string value, try to parse it
						// This handles cases where ValueParseFunc is not available on the ruleset
						if anon, ok := rules.(*Anonymous); ok {
							if str, ok := anon.Value.(string); ok {
								// Try to parse dimension strings like "10px" into *Dimension
								// Use a simple regex-like check for dimension patterns
								if parsed := TryParseDimensionString(str); parsed != nil {
									rules = parsed
								}
							}
						}
					}
				}
			} else if evaluator, ok := rules.(interface{ Eval(any) (any, error) }); ok {
				// Evaluate the value if it's evaluable
				evalResult, err := evaluator.Eval(context)
				if err != nil {
					return nil, err
				}
				rules = evalResult
				// If eval result is a map with "value", extract it
				if resultMap, ok := evalResult.(map[string]any); ok {
					if resultValue, exists := resultMap["value"]; exists {
						rules = resultValue
					}
				}
			}
		}

		// Match JavaScript: if (rules.ruleset) { rules = rules.ruleset.eval(context); }
		// Check for ruleset AFTER value processing - applies to the transformed result
		if rulesWithRuleset, ok := rules.(interface{ HasRuleset() bool }); ok && rulesWithRuleset.HasRuleset() {
			if rulesetGetter, ok := rules.(interface{ GetRuleset() any }); ok {
				ruleset := rulesetGetter.GetRuleset()
				if ruleset != nil {
					// Try to unwrap if it's a Node containing a Ruleset
					if node, ok := ruleset.(*Node); ok && node.Value != nil {
						if rs, ok := node.Value.(*Ruleset); ok {
							ruleset = rs
						}
					}

					// Now try to evaluate the ruleset
					if evaluator, ok := ruleset.(interface{ Eval(any) (any, error) }); ok {
						evalResult, err := evaluator.Eval(context)
						if err != nil {
							return nil, err
						}
						rules = evalResult
					} else {
						// If it doesn't have an Eval method, use it directly
						rules = ruleset
					}
				}
			}
		}
	}

	// CRITICAL FIX: If the final result is a Value object, evaluate it to unwrap the actual value
	// This is needed for guard conditions like `when (#ns.options[option])` where the lookup
	// returns a Value containing a Keyword, but we need the Keyword itself for comparison
	if value, ok := rules.(*Value); ok {
		unwrapped, err := value.Eval(context)
		if err != nil {
			return nil, err
		}
		rules = unwrapped
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

// TryParseDimensionString attempts to parse a string like "10px" into a *Dimension
// Returns nil if parsing fails
func TryParseDimensionString(str string) any {
	// Try to parse as a dimension (number + unit)
	// Simple implementation: extract number and unit parts
	if len(str) == 0 {
		return nil
	}

	// Find where the unit starts (first non-digit, non-dot, non-minus character)
	numEnd := 0
	hasDigit := false
	hasDot := false
	for i, ch := range str {
		if ch >= '0' && ch <= '9' {
			hasDigit = true
			numEnd = i + 1
		} else if ch == '.' && !hasDot {
			hasDot = true
			numEnd = i + 1
		} else if ch == '-' && i == 0 {
			numEnd = 1
		} else {
			break
		}
	}

	// Must have at least one digit
	if !hasDigit {
		return nil
	}

	numStr := str[:numEnd]
	unit := str[numEnd:]

	// Try to parse the number
	var value float64
	_, err := fmt.Sscanf(numStr, "%f", &value)
	if err != nil {
		return nil
	}

	// Create a Dimension node
	dim, err := NewDimension(value, unit)
	if err != nil {
		return nil
	}
	return dim
}

// Note: LessError is now defined in less_error.go with full implementation