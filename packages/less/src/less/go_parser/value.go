package go_parser

// Error represents a Less error
type Error struct {
	Message string
}

func (e *Error) Error() string {
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
	value []any
}

// NewValue creates a new Value instance
func NewValue(value any) (*Value, error) {
	if value == nil {
		return nil, &Error{Message: "Value requires an array argument"}
	}

	v := &Value{
		Node: NewNode(),
	}

	// If value is not an array, wrap it in one
	if arr, ok := value.([]any); ok {
		// For arrays, use as is but validate elements
		v.value = arr
	} else {
		// For non-array values, wrap in array
		v.value = []any{value}
	}

	return v, nil
}

// GetType returns the type of the node
func (v *Value) GetType() string {
	return "Value"
}

// Accept visits the node with a visitor
func (v *Value) Accept(visitor any) {
	if v.value != nil {
		if arrayVisitor, ok := visitor.(interface{ VisitArray([]any) []any }); ok {
			v.value = arrayVisitor.VisitArray(v.value)
		}
	}
}

// Eval evaluates the value node
func (v *Value) Eval(context any) (any, error) {
	if len(v.value) == 1 {
		if evalValue, ok := v.value[0].(Evaluator); ok {
			return evalValue.Eval(context)
		}
		return v.value[0], nil
	}

	// Evaluate each value in the array
	evaluatedValues := make([]any, len(v.value))
	for i, val := range v.value {
		if evalValue, ok := val.(Evaluator); ok {
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

	for i, val := range v.value {
		if cssValue, ok := val.(CSSGenerator); ok {
			cssValue.GenCSS(context, output)
		} else if str, ok := val.(string); ok {
			output.Add(str, nil, nil)
		} else {
			// Handle non-string, non-CSSGenerator values
			output.Add(val, nil, nil)
		}

		if i+1 < len(v.value) {
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