package go_parser

import (
	"fmt"
)

// Expression represents a list of values with optional spacing in the Less AST
type Expression struct {
	*Node
	Value      []any
	NoSpacing  bool
	Parens     bool
	ParensInOp bool
}

// NewExpression creates a new Expression instance
func NewExpression(value []any, noSpacing bool) (*Expression, error) {
	if value == nil {
		return nil, fmt.Errorf("Expression requires an array parameter")
	}
	return &Expression{
		Node:      NewNode(),
		Value:     value,
		NoSpacing: noSpacing,
	}, nil
}

// Accept visits the array of values with a visitor
func (e *Expression) Accept(visitor Visitor) {
	if visitor == nil {
		return
	}
	if arrayVisitor, ok := visitor.(interface{ VisitArray([]any) []any }); ok {
		e.Value = arrayVisitor.VisitArray(e.Value)
		return
	}
	// Fallback to individual visits if VisitArray is not available
	newValues := make([]any, len(e.Value))
	for i, v := range e.Value {
		newValues[i] = visitor.Visit(v)
	}
	e.Value = newValues
}

// Eval evaluates the expression
func (e *Expression) Eval(context any) any {
	if context == nil {
		return e
	}

	ctx, ok := context.(map[string]any)
	if !ok {
		return e
	}

	mathOn := false
	if m, exists := ctx["isMathOn"].(bool); exists {
		mathOn = m
	}

	inParenthesis := e.Node.Parens
	doubleParen := false

	if inParenthesis {
		if inParenFunc, ok := ctx["inParenthesis"].(func()); ok {
			inParenFunc()
		}
	}

	var returnValue any

	if len(e.Value) > 1 {
		newValues := make([]any, len(e.Value))
		for i, val := range e.Value {
			if val == nil {
				newValues[i] = nil
				continue
			}
			
			if evaluatable, ok := val.(interface{ Eval(any) any }); ok {
				newValues[i] = evaluatable.Eval(context)
			} else {
				newValues[i] = val
			}
		}
		expr, _ := NewExpression(newValues, e.NoSpacing)
		returnValue = expr
	} else if len(e.Value) == 1 {
		if e.Value[0] != nil {
			val0 := e.Value[0]
			if v0, ok := val0.(interface { Parens() bool }); ok && v0.Parens() {
				if v0p, ok := val0.(interface { ParensInOp() bool }); ok && !v0p.ParensInOp() {
					if inCalc, exists := ctx["inCalc"].(bool); !exists || !inCalc {
						doubleParen = true
					}
				}
			}
			
			if evaluatable, ok := val0.(interface{ Eval(any) any }); ok {
				returnValue = evaluatable.Eval(context)
			} else {
				returnValue = val0
			}
		}
	} else {
		returnValue = e
	}

	if inParenthesis {
		if outParenFunc, ok := ctx["outOfParenthesis"].(func()); ok {
			outParenFunc()
		}
	}

	if e.Node.Parens && e.Node.ParensInOp && !mathOn && !doubleParen {
		if _, isDimension := returnValue.(*Dimension); !isDimension {
			returnValue = NewParen(returnValue)
		}
	}

	return returnValue
}

// GenCSS generates CSS representation
func (e *Expression) GenCSS(context any, output *CSSOutput) {
	for i, value := range e.Value {
		if value == nil {
			continue
		}

		if generator, ok := value.(interface{ GenCSS(any, *CSSOutput) }); ok {
			generator.GenCSS(context, output)
		} else if nodeVal, ok := value.(*Node); ok {
			if nodeVal.Value != nil {
				output.Add(nodeVal.Value, nil, nil)
			}
		}

		if !e.NoSpacing && i+1 < len(e.Value) {
			if i+1 < len(e.Value) {
				nextValue := e.Value[i+1]
				if nextValue == nil {
					continue
				}

				isNextAnonymous := false
				nextAnon, ok := nextValue.(*Anonymous)
				if ok {
					isNextAnonymous = true
					if strVal, ok := nextAnon.Value.(string); ok && strVal == "," {
						continue
					}
				}

				// Corrected spacing logic:
				// Add space unless the next item is an Anonymous node with the value ","
				shouldAddSpace := true
				if isNextAnonymous {
					if strVal, ok := nextAnon.Value.(string); ok && strVal == "," {
						shouldAddSpace = false
					}
				}

				if shouldAddSpace {
					output.Add(" ", nil, nil)
				}
			}
		}
	}
}

// ThrowAwayComments removes Comment nodes from the value array
func (e *Expression) ThrowAwayComments() {
	var filtered []any
	for _, v := range e.Value {
		if v == nil {
			continue
		}
		if _, isComment := v.(*Comment); !isComment {
			filtered = append(filtered, v)
		}
	}
	e.Value = filtered
}

// GetParens returns the Parens flag from the embedded Node
func (e *Expression) GetParens() bool {
	return e.Node.Parens
}

// GetParensInOp returns the ParensInOp flag from the embedded Node
func (e *Expression) GetParensInOp() bool {
	return e.Node.ParensInOp
} 