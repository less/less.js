package tree

// Negative represents a negative node in the Less AST
type Negative struct {
	*Node
	Value any
}

// NewNegative creates a new Negative instance
func NewNegative(node any) *Negative {
	return &Negative{
		Node:  NewNode(),
		Value: node,
	}
}

// Type returns the type of the node
func (n *Negative) Type() string {
	return "Negative"
}

// GenCSS generates CSS representation
func (n *Negative) GenCSS(context any, output *CSSOutput) {
	output.Add("-", nil, nil)
	if valueWithGenCSS, ok := n.Value.(interface{ GenCSS(any, *CSSOutput) }); ok {
		valueWithGenCSS.GenCSS(context, output)
	}
}

// Eval evaluates the negative node
func (n *Negative) Eval(context any) any {
	if ctx, ok := context.(map[string]any); ok {
		if mathOnFunc, ok := ctx["isMathOn"].(func(string) bool); ok && mathOnFunc("*") {
			// Create a dimension with value -1
			dim, err := NewDimension(-1, nil)
			if err != nil {
				panic(err)
			}
			
			// Create a multiplication operation: -1 * value
			op := NewOperation("*", []any{dim, n.Value}, false)
			
			// Evaluate the operation
			return op.Eval(context)
		}
	}
	
	// If math is off...
	// Check for nil before attempting to evaluate, mimicking JS error
	if n.Value == nil {
		panic("Cannot evaluate nil value")
	}
	
	if valueWithEval, ok := n.Value.(interface{ Eval(any) any }); ok {
		evalValue := valueWithEval.Eval(context)
		return NewNegative(evalValue)
	}
	
	// If value doesn't have Eval (e.g., Keyword), return a new Negative
	return NewNegative(n.Value)
} 