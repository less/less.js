package tree

import (
	"fmt"
	"strings"
)

// Condition represents a condition node in the Less AST
type Condition struct {
	*Node
	Op      string
	LValue  interface{}
	RValue  interface{}
	Index   int
	Negate  bool
}

// NewCondition creates a new Condition instance
func NewCondition(op string, l, r interface{}, i int, negate bool) *Condition {
	return &Condition{
		Node:    NewNode(),
		Op:      strings.TrimSpace(op),
		LValue:  l,
		RValue:  r,
		Index:   i,
		Negate:  negate,
	}
}

// Type returns the node type
func (c *Condition) Type() string {
	return "Condition"
}

// Accept visits the node with a visitor
func (c *Condition) Accept(visitor interface{}) {
	if v, ok := visitor.(Visitor); ok {
		c.LValue = v.Visit(c.LValue)
		c.RValue = v.Visit(c.RValue)
	}
}

// Eval evaluates the condition
func (c *Condition) Eval(context interface{}) interface{} {
	// Helper function to evaluate the condition
	evalCondition := func(op string, a, b interface{}) bool {
		switch op {
		case "and":
			// Handle MockNode values
			if aNode, ok := a.(*MockNode); ok {
				a = aNode.value
			}
			if bNode, ok := b.(*MockNode); ok {
				b = bNode.value
			}
			aBool, ok1 := a.(bool)
			bBool, ok2 := b.(bool)
			if !ok1 || !ok2 {
				return false
			}
			return aBool && bBool
		case "or":
			// Handle MockNode values
			if aNode, ok := a.(*MockNode); ok {
				a = aNode.value
			}
			if bNode, ok := b.(*MockNode); ok {
				b = bNode.value
			}
			aBool, ok1 := a.(bool)
			bBool, ok2 := b.(bool)
			if !ok1 || !ok2 {
				return false
			}
			return aBool || bBool
		default:
			// For comparison operators, use Node.Compare
			// Create nodes with the actual values, not the MockNodes
			var aVal, bVal interface{}
			if aNode, ok := a.(*MockNode); ok {
				aVal = aNode.value
			} else {
				aVal = a
			}
			if bNode, ok := b.(*MockNode); ok {
				bVal = bNode.value
			} else {
				bVal = b
			}

			// For equality comparison, check types first
			if op == "=" {
				if fmt.Sprintf("%T", aVal) != fmt.Sprintf("%T", bVal) {
					return false
				}
			}

			result := Compare(&Node{Value: aVal}, &Node{Value: bVal})
			switch result {
			case -1:
				return op == "<" || op == "=<" || op == "<="
			case 0:
				return op == "=" || op == ">=" || op == "=<" || op == "<="
			case 1:
				return op == ">" || op == ">="
			default:
				return false
			}
		}
	}

	// Evaluate the left and right values
	var lVal, rVal interface{}
	if lNode, ok := c.LValue.(Node); ok {
		lVal = lNode.Eval()
	} else {
		lVal = c.LValue
	}

	if rNode, ok := c.RValue.(Node); ok {
		rVal = rNode.Eval()
	} else {
		rVal = c.RValue
	}

	result := evalCondition(c.Op, lVal, rVal)
	if c.Negate {
		return !result
	}
	return result
} 