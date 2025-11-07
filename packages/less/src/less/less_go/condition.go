package less_go

import (
	"fmt"
	"math"
	"os"
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

// Eval evaluates the condition and returns it following the interface{ Eval(any) any } pattern
func (c *Condition) Eval(context any) any {
	// The selector expects Eval to return any, but internally we evaluate to bool
	return c.EvalBool(context)
}

// EvalBool evaluates the condition and returns a boolean result
func (c *Condition) EvalBool(context any) bool {
	// JavaScript implementation:
	// Evaluates lvalue and rvalue, then uses Node.compare for comparison operators

	debug := os.Getenv("LESS_DEBUG_GUARDS") == "1"
	if debug {
		fmt.Printf("DEBUG:   Condition.EvalBool: op=%s, lvalue=%T, rvalue=%T\n", c.Op, c.Lvalue, c.Rvalue)
	}

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
		if debug {
			fmt.Printf("DEBUG:   Condition.EvalBool AND: a=%v (%t), b=%v (%t), result=%t\n", a, abool, b, bbool, result)
		}

	case "or":
		a := eval(c.Lvalue)
		b := eval(c.Rvalue)
		// Convert to bool - JavaScript truthy/falsy conversion
		abool := toBool(a)
		bbool := toBool(b)
		result = abool || bbool
		if debug {
			fmt.Printf("DEBUG:   Condition.EvalBool OR: a=%v (%t), b=%v (%t), result=%t\n", a, abool, b, bbool, result)
		}

	default:
		// For comparison operators, use Node.compare
		a := eval(c.Lvalue)
		b := eval(c.Rvalue)

		// For types that have their own Compare method, call it directly
		var compareResult int

		// Handle Dimension comparison
		if dim, ok := a.(*Dimension); ok {
			if otherDim, ok := b.(*Dimension); ok {
				if cmpPtr := dim.Compare(otherDim); cmpPtr != nil {
					compareResult = *cmpPtr
				} else {
					compareResult = 999 // undefined
				}
			} else {
				compareResult = 999
			}
		} else if col, ok := a.(*Color); ok {
			// Handle Color comparison
			if otherCol, ok := b.(*Color); ok {
				compareResult = col.Compare(otherCol)
			} else {
				compareResult = 999
			}
		} else if quoted, ok := a.(*Quoted); ok {
			// Handle Quoted comparison
			cmpResult := quoted.Compare(b)
			if cmpResult == nil {
				compareResult = 999 // undefined
			} else {
				compareResult = *cmpResult
			}
		} else if anon, ok := a.(*Anonymous); ok {
			// Handle Anonymous comparison
			cmpResult := anon.Compare(b)
			if cmpResult == nil {
				compareResult = 999 // undefined
			} else if cmpInt, ok := cmpResult.(int); ok {
				compareResult = cmpInt
			} else {
				compareResult = 999
			}
		} else if expr, ok := a.(*Expression); ok {
			// Handle Expression (space-separated list) comparison
			if otherExpr, ok := b.(*Expression); ok {
				// Compare expressions by comparing their value arrays
				if len(expr.Value) != len(otherExpr.Value) {
					compareResult = 999 // different lengths = not equal
				} else {
					// Compare each element - recursively handle nested expressions
					allEqual := true
					for i := range expr.Value {
						// Evaluate elements before comparing
						aElem := eval(expr.Value[i])
						bElem := eval(otherExpr.Value[i])

						if debug {
							fmt.Printf("DEBUG:   Expression element %d: aElem=%T(%v), bElem=%T(%v)\n", i, aElem, aElem, bElem, bElem)
						}

						// Recursively compare using a new condition
						elemCond := NewCondition("=", aElem, bElem, 0, false)
						if !elemCond.EvalBool(context) {
							allEqual = false
							if debug {
								fmt.Printf("DEBUG:   Expression element %d comparison failed\n", i)
							}
							break
						}
					}
					if allEqual {
						compareResult = 0
					} else {
						compareResult = 999
					}
				}
			} else {
				compareResult = 999
			}
		} else if val, ok := a.(*Value); ok {
			// Handle Value (comma-separated list) comparison
			if otherVal, ok := b.(*Value); ok {
				// Compare values by comparing their value arrays
				if len(val.Value) != len(otherVal.Value) {
					compareResult = 999 // different lengths = not equal
				} else {
					// Compare each element
					allEqual := true
					for i := range val.Value {
						// Evaluate elements before comparing
						aElem := eval(val.Value[i])
						bElem := eval(otherVal.Value[i])

						if debug {
							fmt.Printf("DEBUG:   Value element %d: aElem=%T(%v), bElem=%T(%v)\n", i, aElem, aElem, bElem, bElem)
						}

						// Recursively compare using a new condition
						elemCond := NewCondition("=", aElem, bElem, 0, false)
						if !elemCond.EvalBool(context) {
							allEqual = false
							if debug {
								fmt.Printf("DEBUG:   Value element %d comparison failed\n", i)
							}
							break
						}
					}
					if allEqual {
						compareResult = 0
					} else {
						compareResult = 999
					}
				}
			} else {
				compareResult = 999
			}
		} else {
			// Fall back to Node.Compare for other types
			// Convert to nodes if necessary for comparison
			var aNode, bNode *Node

			// Check if a has a way to get its embedded Node
			if nodeProvider, ok := a.(interface{ GetNode() *Node }); ok {
				aNode = nodeProvider.GetNode()
			} else if n, ok := a.(*Node); ok {
				aNode = n
			} else if dim, ok := a.(*Dimension); ok {
				aNode = dim.Node
			} else if col, ok := a.(*Color); ok {
				aNode = col.Node
			} else if kw, ok := a.(*Keyword); ok {
				aNode = kw.Node
			} else {
				// Wrap non-node values in a Node for comparison
				aNode = &Node{Value: a}
			}

			// Same for b
			if nodeProvider, ok := b.(interface{ GetNode() *Node }); ok {
				bNode = nodeProvider.GetNode()
			} else if n, ok := b.(*Node); ok {
				bNode = n
			} else if dim, ok := b.(*Dimension); ok {
				bNode = dim.Node
			} else if col, ok := b.(*Color); ok {
				bNode = col.Node
			} else if kw, ok := b.(*Keyword); ok {
				bNode = kw.Node
			} else {
				bNode = &Node{Value: b}
			}

			compareResult = Compare(aNode, bNode)
		}

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
	
	switch val := v.(type) {
	case bool:
		return val
	case int:
		return val != 0
	case int8:
		return val != 0
	case int16:
		return val != 0
	case int32:
		return val != 0
	case int64:
		return val != 0
	case uint:
		return val != 0
	case uint8:
		return val != 0
	case uint16:
		return val != 0
	case uint32:
		return val != 0
	case uint64:
		return val != 0
	case float32:
		return val != 0.0 && !math.IsNaN(float64(val))
	case float64:
		return val != 0.0 && !math.IsNaN(val)
	case string:
		return val != ""
	case []any:
		return len(val) > 0
	case map[string]any:
		return len(val) > 0
	default:
		// Check if it's a dimension with zero value
		if dim, ok := v.(*Dimension); ok {
			return dim.Value != 0.0
		}
		// Check if it's another type with GetValue method
		if dim, ok := v.(interface{ GetValue() float64 }); ok {
			return dim.GetValue() != 0.0
		}
		// Check if it's a Node-like object that could be evaluated
		if hasVal, ok := v.(interface{ Value() any }); ok {
			return toBool(hasVal.Value())
		}
		// For other types (like Node objects), they are truthy unless explicitly falsy
		return true
	}
} 