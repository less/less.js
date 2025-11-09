package less_go

import (
	"fmt"
	"strings"
)

// ValueError represents a Less value error
type ValueError struct {
	Message string
}

func (e *ValueError) Error() string {
	return e.Message
}

// Evaluator interface for nodes that can be evaluated
type Evaluator interface {
	Eval(context any) (any, error)
}

// CSSGenerator interface for nodes that can generate CSS
type CSSGenerator interface {
	GenCSS(context any, output *CSSOutput)
}

// Value represents a value node in the Less AST
type Value struct {
	*Node
	Value []any
}

// NewValue creates a new Value instance
func NewValue(value any) (*Value, error) {
	if value == nil {
		return nil, &ValueError{Message: "Value requires an array argument"}
	}

	v := &Value{
		Node: NewNode(),
	}

	// If value is not an array, wrap it in one
	if arr, ok := value.([]any); ok {
		// For arrays, use as is but validate elements
		v.Value = arr
	} else {
		// For non-array values, wrap in array
		v.Value = []any{value}
	}

	return v, nil
}

// Type returns the type of the node
func (v *Value) Type() string {
	return "Value"
}

// GetType returns the type of the node
func (v *Value) GetType() string {
	return "Value"
}

// Accept visits the node with a visitor
func (v *Value) Accept(visitor any) {
	if v.Value != nil {
		if arrayVisitor, ok := visitor.(interface{ VisitArray([]any) []any }); ok {
			v.Value = arrayVisitor.VisitArray(v.Value)
		}
	}
}

// Eval evaluates the value node
func (v *Value) Eval(context any) (any, error) {
	if len(v.Value) == 1 {
		// Check for Variable specifically first
		if variable, ok := v.Value[0].(*Variable); ok {
			result, err := variable.Eval(context)
			// Continue evaluating if result is still a Variable (but not the same one to avoid loops)
			// This handles the case where a Variable's value is another Variable (e.g., mixin parameters)
			seen := make(map[*Variable]bool)
			seen[variable] = true
			for {
				if resultVar, ok := result.(*Variable); ok && err == nil {
					// Avoid infinite loops - if we've seen this variable before, stop
					if seen[resultVar] {
						break
					}
					seen[resultVar] = true
					result, err = resultVar.Eval(context)
				} else {
					break
				}
			}
			return result, err
		}

		if evalValue, ok := v.Value[0].(Evaluator); ok {
			result, err := evalValue.Eval(context)
			return result, err
		}
		return v.Value[0], nil
	}

	// Evaluate each value in the array
	evaluatedValues := make([]any, len(v.Value))
	for i, val := range v.Value {
		// Check for Variable specifically first
		if variable, ok := val.(*Variable); ok {
			evaluated, err := variable.Eval(context)
			if err != nil {
				return nil, err
			}
			evaluatedValues[i] = evaluated
		} else if evalValue, ok := val.(Evaluator); ok {
			evaluated, err := evalValue.Eval(context)
			if err != nil {
				return nil, err
			}
			evaluatedValues[i] = evaluated
		} else {
			evaluatedValues[i] = val
		}
	}

	newValue, err := NewValue(evaluatedValues)
	if err != nil {
		return nil, err
	}
	return newValue, nil
}

// GenCSS generates CSS representation
func (v *Value) GenCSS(context any, output *CSSOutput) {
	if output == nil {
		return
	}

	for i, val := range v.Value {
		// Match JavaScript: directly call genCSS on each value
		if cssValue, ok := val.(CSSGenerator); ok {
			cssValue.GenCSS(context, output)
		} else {
			// For non-CSSGenerator types, output string representation
			// This is a safety fallback that JavaScript doesn't have
			output.Add(fmt.Sprintf("%v", val), nil, nil)
		}

		if i+1 < len(v.Value) {
			compressed := false
			if ctx, ok := context.(map[string]any); ok {
				if compress, ok := ctx["compress"].(bool); ok {
					compressed = compress
				}
			}
			if compressed {
				output.Add(",", nil, nil)
			} else {
				output.Add(", ", nil, nil)
			}
		}
	}
}

// ToCSS generates CSS string representation
func (v *Value) ToCSS(context any) string {
	var strs []string
	output := &CSSOutput{
		Add: func(chunk any, fileInfo any, index any) {
			strs = append(strs, fmt.Sprintf("%v", chunk))
		},
		IsEmpty: func() bool {
			return len(strs) == 0
		},
	}
	v.GenCSS(context, output)
	return strings.Join(strs, "")
} 