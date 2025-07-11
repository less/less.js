package less_go

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
	if ctx, ok := SafeTypeAssertion[map[string]any](context); ok {
		if mathOnFunc, ok := SafeMapAccess(ctx, "isMathOn"); ok {
			if mathFunc, ok := SafeTypeAssertion[func(string) bool](mathOnFunc); ok && mathFunc("*") {
				// Create a dimension with value -1
				dim, err := NewDimension(-1, nil)
				if err != nil {
					// Instead of panicking, return the original negative
					return n
				}
				
				// Create a multiplication operation: -1 * value
				op := NewOperation("*", []any{dim, n.Value}, false)
				
				// Evaluate the operation safely
				return SafeEval(op, context)
			}
		}
	}
	
	// If math is off...
	// Check for nil before attempting to evaluate
	if SafeNilCheck(n.Value) {
		// Instead of panicking, return a negative with zero or default value
		if zeroDim, err := NewDimension(0, nil); err == nil {
			return NewNegative(zeroDim)
		}
		// If even creating a zero dimension fails, return the original negative
		return n
	}
	
	if valueWithEval, ok := SafeTypeAssertion[interface{ Eval(any) any }](n.Value); ok {
		evalValue := SafeEval(valueWithEval, context)
		return NewNegative(evalValue)
	}
	
	// If value doesn't have Eval (e.g., Keyword), return a new Negative
	return NewNegative(n.Value)
} 