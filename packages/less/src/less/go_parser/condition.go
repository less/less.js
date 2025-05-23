package go_parser

import (
	"fmt"
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

// Accept implements the Node Accept method
func (c *Condition) Accept(visitor any) {
	if v, ok := visitor.(Visitor); ok {
		c.Lvalue = v.Visit(c.Lvalue)
		c.Rvalue = v.Visit(c.Rvalue)
	}
}

// Eval evaluates the condition
func (c *Condition) Eval(context any) bool {
	// Define a safe evaluation function
	safeEval := func(node any) any {
		if node == nil {
			return nil
		}
		
		// Try to find an Eval method
		if evaluator, ok := node.(interface{ Eval(any) any }); ok {
			return evaluator.Eval(context)
		}
		
		// If no Eval method, return the node itself
		return node
	}

	lresult := safeEval(c.Lvalue)
	rresult := safeEval(c.Rvalue)
	
	// Handle nil cases
	if lresult == nil || rresult == nil {
		return c.Negate // negate false for error case
	}

	var result bool

	switch c.Op {
	case "and":
		// For logical operators, we expect boolean results
		lbool, lok := lresult.(bool)
		rbool, rok := rresult.(bool)
		if lok && rok {
			result = lbool && rbool
		} else {
			result = false
		}
	case "or":
		lbool, lok := lresult.(bool)
		rbool, rok := rresult.(bool)
		if lok && rok {
			result = lbool || rbool
		} else {
			result = false
		}
	default:
		// For comparison operators
		lnode, lok := lresult.(*Node)
		rnode, rok := rresult.(*Node)
		
		if !lok || !rok {
			return c.Negate // negate false for error case
		}

		// Compare types if both nodes have String() methods that identify type
		areTypesEqual := true
		if lStringer, lok := lnode.Value.(fmt.Stringer); lok {
			if rStringer, rok := rnode.Value.(fmt.Stringer); rok {
				areTypesEqual = lStringer.String() == rStringer.String()
			}
		}
		
		// If types are different and we're testing for equality,
		// return false (or negated false)
		if !areTypesEqual && c.Op == "=" {
			return c.Negate
		}

		// Now do the actual comparison
		compareResult := Compare(lnode, rnode)
		
		// If compareResult is 0 but we know types are different, 
		// consider them not equal
		if compareResult == 0 && !areTypesEqual && c.Op == "=" {
			return c.Negate
		}
		
		switch compareResult {
		case -1:
			result = c.Op == "<" || c.Op == "=<" || c.Op == "<="
		case 0:
			result = c.Op == "=" || c.Op == ">=" || c.Op == "=<" || c.Op == "<="
		case 1:
			result = c.Op == ">" || c.Op == ">="
		default:
			result = false
		}
	}

	if c.Negate {
		return !result
	}
	return result
} 