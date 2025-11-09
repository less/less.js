package less_go

import (
	"fmt"
	"os"
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
func (e *Expression) Accept(visitor any) {
	if visitor == nil {
		return
	}
	if arrayVisitor, ok := visitor.(interface{ VisitArray([]any) []any }); ok {
		e.Value = arrayVisitor.VisitArray(e.Value)
		return
	}
	// Fallback to individual visits if VisitArray is not available
	if nodeVisitor, ok := visitor.(interface{ Visit(any) any }); ok {
		newValues := make([]any, len(e.Value))
		for i, v := range e.Value {
			newValues[i] = nodeVisitor.Visit(v)
		}
		e.Value = newValues
	}
}

// Eval evaluates the expression
func (e *Expression) Eval(context any) (any, error) {
	if SafeNilCheck(context) {
		return e, nil
	}

	// Match JavaScript: const mathOn = context.isMathOn();
	// Just call isMathOn() without any pre-checking
	mathOn := false
	if evalCtx, ok := context.(*Eval); ok {
		mathOn = evalCtx.IsMathOn()
	} else if ctx, ok := context.(map[string]any); ok {
		if m, exists := SafeMapAccess(ctx, "isMathOn"); exists {
			if mathFunc, ok := SafeTypeAssertion[func(string) bool](m); ok {
				mathOn = mathFunc("")
			} else if mathVal, ok := SafeTypeAssertion[bool](m); ok {
				mathOn = mathVal
			}
		}
	}

	inParenthesis := e.Parens
	doubleParen := false

	debugTrace := os.Getenv("LESS_GO_TRACE") == "1"

	if inParenthesis {
		if debugTrace {
			fmt.Printf("[TRACE] Expression.Eval: Parens=true, calling InParenthesis()\n")
		}
		// Check if context is *Eval and use the method directly
		if evalCtx, ok := context.(*Eval); ok {
			evalCtx.InParenthesis()
			if debugTrace {
				fmt.Printf("[TRACE] Expression.Eval: ParensStack len=%d\n", len(evalCtx.ParensStack))
			}
		} else if ctx, ok := context.(map[string]any); ok {
			// Fallback for map-based context
			if inParenFunc, ok := SafeMapAccess(ctx, "inParenthesis"); ok {
				if parenthesisFunc, ok := SafeTypeAssertion[func()](inParenFunc); ok {
					parenthesisFunc()
				}
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
			if debugTrace {
				fmt.Printf("[TRACE] Expression.Eval: single value type=%T\n", val0)
			}

			// Check if val0 has parens and !parensInOp
			// This handles nodes with embedded Node struct
			hasParens := false
			hasParensInOp := false

			// Check various node types that embed Node
			if expr, ok := val0.(*Expression); ok && expr.Node != nil {
				hasParens = expr.Node.Parens
				hasParensInOp = expr.Node.ParensInOp
			} else if paren, ok := val0.(*Paren); ok && paren.Node != nil {
				hasParens = paren.Node.Parens
				hasParensInOp = paren.Node.ParensInOp
			} else if op, ok := val0.(*Operation); ok && op.Node != nil {
				hasParens = op.Node.Parens
				hasParensInOp = op.Node.ParensInOp
			} else if dim, ok := val0.(*Dimension); ok && dim.Node != nil {
				hasParens = dim.Node.Parens
				hasParensInOp = dim.Node.ParensInOp
			}

			if hasParens && !hasParensInOp {
				// Check if we're in calc
				if evalCtx, ok := context.(*Eval); ok {
					if !evalCtx.IsInCalc() {
						doubleParen = true
					}
				} else if ctx, ok := context.(map[string]any); ok {
					if inCalc, exists := SafeMapAccess(ctx, "inCalc"); !exists {
						doubleParen = true
					} else if inCalcVal, ok := SafeTypeAssertion[bool](inCalc); !ok || !inCalcVal {
						doubleParen = true
					}
				}
			}

			returnValue = SafeEval(val0, context)
			if debugTrace {
				fmt.Printf("[TRACE] Expression.Eval: after Eval, returnValue type=%T\n", returnValue)
			}
		}
	} else {
		returnValue = e
	}

	if inParenthesis {
		// Check if context is *Eval and use the method directly
		if evalCtx, ok := context.(*Eval); ok {
			evalCtx.OutOfParenthesis()
			if debugTrace {
				fmt.Printf("[TRACE] Expression.Eval: after OutOfParenthesis, ParensStack len=%d\n", len(evalCtx.ParensStack))
			}
		} else if ctx, ok := context.(map[string]any); ok {
			// Fallback for map-based context
			if outParenFunc, ok := SafeMapAccess(ctx, "outOfParenthesis"); ok {
				if parenthesisFunc, ok := SafeTypeAssertion[func()](outParenFunc); ok {
					parenthesisFunc()
				}
			}
		}
	}

	// Match JavaScript: if (this.parens && this.parensInOp && !mathOn && !doubleParen && (!(returnValue instanceof Dimension)))
	if e.Parens && e.ParensInOp && !mathOn && !doubleParen {
		if _, isDimension := SafeTypeAssertion[*Dimension](returnValue); !isDimension {
			returnValue = NewParen(returnValue)
		}
	} else if e.Parens && !mathOn && !doubleParen {
		// Special case for calc(): preserve parentheses even without ParensInOp
		// Check if we're in calc context
		if evalCtx, ok := context.(*Eval); ok {
			if evalCtx.IsInCalc() {
				// In calc context, wrap operations and expressions in parentheses
				if _, isOp := SafeTypeAssertion[*Operation](returnValue); isOp {
					returnValue = NewParen(returnValue)
				}
			}
		} else if ctx, ok := context.(map[string]any); ok {
			if inCalc, exists := SafeMapAccess(ctx, "inCalc"); exists {
				if inCalcVal, ok := SafeTypeAssertion[bool](inCalc); ok && inCalcVal {
					// In calc context, wrap operations and expressions in parentheses
					if _, isOp := SafeTypeAssertion[*Operation](returnValue); isOp {
						returnValue = NewParen(returnValue)
					}
				}
			}
		}
	}

	return returnValue, nil
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
			// Match JavaScript logic exactly:
			// if (i + 1 < this.value.length && !(this.value[i + 1] instanceof Anonymous) ||
			//     this.value[i + 1] instanceof Anonymous && this.value[i + 1].value !== ',')
			nextValue := e.Value[i+1]
			shouldAddSpace := false

			if nextValue != nil {
				if nextAnon, ok := nextValue.(*Anonymous); !ok {
					// Not Anonymous, add space
					shouldAddSpace = true
				} else {
					// Is Anonymous, check if value is not ',' or ':'
					// Don't add space before these delimiters
					if strVal, ok := nextAnon.Value.(string); !ok {
						shouldAddSpace = true
					} else if strVal == "," || strVal == ":" {
						shouldAddSpace = false
					} else {
						shouldAddSpace = true
					}
				}
			}

			if shouldAddSpace {
				output.Add(" ", nil, nil)
			}
		}
	}
}

// ToCSS generates CSS string representation
func (e *Expression) ToCSS(context any) string {
	var strs []string
	output := &CSSOutput{
		Add: func(chunk any, fileInfo any, index any) {
			strs = append(strs, fmt.Sprintf("%v", chunk))
		},
		IsEmpty: func() bool {
			return len(strs) == 0
		},
	}
	e.GenCSS(context, output)
	result := ""
	for _, s := range strs {
		result += s
	}
	return result
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

// GetParens returns the Parens flag
func (e *Expression) GetParens() bool {
	return e.Parens
}

// GetParensInOp returns the ParensInOp flag
func (e *Expression) GetParensInOp() bool {
	return e.ParensInOp
}

// GetType returns the type of the node for visitor pattern consistency
func (e *Expression) GetType() string {
	return "Expression"
}

 