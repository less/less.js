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
	if SafeNilCheck(context) {
		return e
	}

	ctx, ok := SafeTypeAssertion[map[string]any](context)
	if !ok {
		return e
	}

	mathOn := false
	if m, exists := SafeMapAccess(ctx, "isMathOn"); exists {
		if mathVal, ok := SafeTypeAssertion[bool](m); ok {
			mathOn = mathVal
		}
	}

	inParenthesis := e.Node.Parens
	doubleParen := false

	if inParenthesis {
		if inParenFunc, ok := SafeMapAccess(ctx, "inParenthesis"); ok {
			if parenthesisFunc, ok := SafeTypeAssertion[func()](inParenFunc); ok {
				parenthesisFunc()
			}
		}
	}

	var returnValue any

	if len(e.Value) > 1 {
		newValues := make([]any, len(e.Value))
		for i, val := range e.Value {
			if SafeNilCheck(val) {
				newValues[i] = nil
				continue
			}
			
			newValues[i] = SafeEval(val, context)
		}
		expr, _ := NewExpression(newValues, e.NoSpacing)
		returnValue = expr
	} else if len(e.Value) == 1 {
		if val0, ok := SafeSliceIndex(e.Value, 0); ok && !SafeNilCheck(val0) {
			if v0, ok := SafeTypeAssertion[interface { Parens() bool }](val0); ok && v0.Parens() {
				if v0p, ok := SafeTypeAssertion[interface { ParensInOp() bool }](val0); ok && !v0p.ParensInOp() {
					if inCalc, exists := SafeMapAccess(ctx, "inCalc"); !exists {
						doubleParen = true
					} else if inCalcVal, ok := SafeTypeAssertion[bool](inCalc); !ok || !inCalcVal {
						doubleParen = true
					}
				}
			}
			
			returnValue = SafeEval(val0, context)
		}
	} else {
		returnValue = e
	}

	if inParenthesis {
		if outParenFunc, ok := SafeMapAccess(ctx, "outOfParenthesis"); ok {
			if parenthesisFunc, ok := SafeTypeAssertion[func()](outParenFunc); ok {
				parenthesisFunc()
			}
		}
	}

	if e.Node.Parens && e.Node.ParensInOp && !mathOn && !doubleParen {
		if _, isDimension := SafeTypeAssertion[*Dimension](returnValue); !isDimension {
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