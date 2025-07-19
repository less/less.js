package less_go

import (
	"strings"
)

// Condition represents a condition node in the Less AST
type Condition struct {
	*Node
	Op     string
	Lvalue any
	Rvalue any
	Index  int
	Negate bool
}

// NewCondition creates a new Condition
func NewCondition(op string, l, r any, i int, negate bool) *Condition {
	return &Condition{
		Node:   NewNode(),
		Op:     strings.TrimSpace(op),
		Lvalue: l,
		Rvalue: r,
		Index:  i,
		Negate: negate,
	}
}

// GetType returns the node type
func (c *Condition) GetType() string {
	return "Condition"
}

// Accept implements the Node Accept method
func (c *Condition) Accept(visitor any) {
	if v, ok := visitor.(interface{ Visit(any) any }); ok {
		c.Lvalue = v.Visit(c.Lvalue)
		c.Rvalue = v.Visit(c.Rvalue)
	}
}

// Eval evaluates the condition
func (c *Condition) Eval(context any) bool {
	// JavaScript implementation:
	// Evaluates lvalue and rvalue, then uses Node.compare for comparison operators
	
	// Helper to evaluate a node
	eval := func(node any) any {
		if evaluator, ok := node.(interface{ Eval(any) (any, error) }); ok {
			result, _ := evaluator.Eval(context)
			return result
		} else if evaluator, ok := node.(interface{ Eval(any) any }); ok {
			return evaluator.Eval(context)
		}
		return node
	}

	var result bool

	switch c.Op {
	case "and":
		a := eval(c.Lvalue)
		b := eval(c.Rvalue)
		// Convert to bool - JavaScript truthy/falsy conversion
		abool := toBool(a)
		bbool := toBool(b)
		result = abool && bbool
		
	case "or":
		a := eval(c.Lvalue)
		b := eval(c.Rvalue)
		// Convert to bool - JavaScript truthy/falsy conversion
		abool := toBool(a)
		bbool := toBool(b)
		result = abool || bbool
		
	default:
		// For comparison operators, use Node.compare
		a := eval(c.Lvalue)
		b := eval(c.Rvalue)
		
		// Convert to nodes if necessary for comparison
		var aNode, bNode *Node
		if n, ok := a.(*Node); ok {
			aNode = n
		} else {
			// Wrap non-node values in a Node for comparison
			aNode = &Node{Value: a}
		}
		if n, ok := b.(*Node); ok {
			bNode = n
		} else {
			// Wrap non-node values in a Node for comparison
			bNode = &Node{Value: b}
		}
		
		compareResult := Compare(aNode, bNode)
		
		switch compareResult {
		case -1:
			result = c.Op == "<" || c.Op == "=<" || c.Op == "<="
		case 0:
			result = c.Op == "=" || c.Op == ">=" || c.Op == "=<" || c.Op == "<="
		case 1:
			result = c.Op == ">" || c.Op == ">="
		default:
			// JavaScript returns false for undefined comparison results
			result = false
		}
	}

	if c.Negate {
		return !result
	}
	return result
}

// toBool converts a value to boolean following JavaScript truthy/falsy rules
func toBool(v any) bool {
	if v == nil {
		return false
	}
	if b, ok := v.(bool); ok {
		return b
	}
	// In JavaScript, most non-null values are truthy
	// We'll keep it simple for now
	return true
} 