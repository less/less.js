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

// GetType returns the type of the node for visitor pattern consistency
func (n *Negative) GetType() string {
	return "Negative"
}

// GenCSS generates CSS representation
func (n *Negative) GenCSS(context any, output *CSSOutput) {
	output.Add("-", nil, nil)
	if valueWithGenCSS, ok := n.Value.(interface{ GenCSS(any, *CSSOutput) }); ok {
		valueWithGenCSS.GenCSS(context, output)
	}
}

// Eval evaluates the negative node - matching JavaScript implementation closely
func (n *Negative) Eval(context any) any {
	ctx, ok := context.(map[string]any)
	if !ok {
		// Fall back to simple evaluation if context is not a map
		return n.evalValue(context)
	}

	// Match JavaScript: if (context.isMathOn()) 
	// Check if math is on - try different signatures
	mathOn := false
	if mathOnFunc, ok := ctx["isMathOn"].(func() bool); ok {
		mathOn = mathOnFunc()
	} else if mathOnFunc, ok := ctx["isMathOn"].(func(string) bool); ok {
		mathOn = mathOnFunc("*") // For multiplication which is what negative uses
	}
	
	if mathOn {
		// Match JavaScript: return (new Operation('*', [new Dimension(-1), this.value])).eval(context);
		dim, _ := NewDimension(-1, nil)
		
		// The value needs to be evaluated first if it's an operation
		var evaluatedValue any = n.Value
		if valOp, ok := n.Value.(*Operation); ok {
			evaluatedValue, _ = valOp.Eval(context)
		}
		
		op := NewOperation("*", []any{dim, evaluatedValue}, false)
		
		// Operation.Eval returns (any, error) but JavaScript just returns the result
		result, _ := op.Eval(context)
		return result
	}
	
	// Match JavaScript: return new Negative(this.value.eval(context));
	return n.evalValue(context)
}

// evalValue handles the value evaluation
func (n *Negative) evalValue(context any) any {
	if n.Value == nil {
		// Return a negative with zero dimension as expected by tests
		if zeroDim, err := NewDimension(0, nil); err == nil {
			return NewNegative(zeroDim)
		}
		return NewNegative(nil)
	}
	
	// Try the single-return Eval first (used by Operation)
	if eval, ok := n.Value.(interface{ Eval(any) any }); ok {
		evaluated := eval.Eval(context)
		return NewNegative(evaluated)
	} else if eval, ok := n.Value.(interface{ Eval(any) (any, error) }); ok {
		evaluated, err := eval.Eval(context)
		if err != nil {
			return NewNegative(n.Value) // Return original on error
		}
		return NewNegative(evaluated)
	}
	
	// If value doesn't have Eval method, return new Negative with same value
	return NewNegative(n.Value)
} 