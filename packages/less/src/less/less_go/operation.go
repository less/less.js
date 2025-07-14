package less_go

import (
	"reflect"
	"strings"

)

// Operation represents an operation node in the Less AST
type Operation struct {
	*Node
	Op       string
	Operands []any
	IsSpaced bool
}

// NewOperation creates a new Operation instance
func NewOperation(op string, operands []any, isSpaced bool) *Operation {
	operation := &Operation{
		Node:     NewNode(),
		Op:       strings.TrimSpace(op),
		Operands: operands,
		IsSpaced: isSpaced,
	}
	
	return operation
}

// Type returns the type of the node
func (o *Operation) Type() string {
	return "Operation"
}

// Accept visits the operation's operands with the visitor
func (o *Operation) Accept(visitor any) {
	// Try as interface implementation
	if visitorWithArray, ok := visitor.(interface{ VisitArray([]any) []any }); ok {
		o.Operands = visitorWithArray.VisitArray(o.Operands)
		return
	}
	
	// Try as struct with VisitArray field
	visitorType := reflect.ValueOf(visitor)
	if visitorType.Kind() == reflect.Struct {
		visitArrayField := visitorType.FieldByName("VisitArray")
		if visitArrayField.IsValid() && visitArrayField.CanInterface() {
			if visitArrayFunc, ok := visitArrayField.Interface().(func([]any) []any); ok {
				o.Operands = visitArrayFunc(o.Operands)
				return
			}
		}
	}
}

// Eval evaluates the operation
func (o *Operation) Eval(context any) (any, error) {
	// Get the evaluated operands
	var a, b any
	
	// Try to evaluate operand A - handle both (any, error) and (any) return signatures
	if aNode, ok := o.Operands[0].(interface{ Eval(any) (any, error) }); ok {
		var err error
		a, err = aNode.Eval(context)
		if err != nil {
			a = o.Operands[0] // Fall back to original
		}
	} else if aNode, ok := o.Operands[0].(interface{ Eval(any) any }); ok {
		a = aNode.Eval(context)
	} else {
		a = o.Operands[0]
	}
	
	// Try to evaluate operand B - handle both (any, error) and (any) return signatures
	if bNode, ok := o.Operands[1].(interface{ Eval(any) (any, error) }); ok {
		var err error
		b, err = bNode.Eval(context)
		if err != nil {
			b = o.Operands[1] // Fall back to original
		}
	} else if bNode, ok := o.Operands[1].(interface{ Eval(any) any }); ok {
		b = bNode.Eval(context)
	} else {
		b = o.Operands[1]
	}
	
	// Check if math is on for this operator
	isMathOn := false
	if ctx, ok := context.(map[string]any); ok {
		if mathOnFunc, ok := ctx["isMathOn"].(func(string) bool); ok {
			isMathOn = mathOnFunc(o.Op)
		}
	}

	if isMathOn {
		op := o.Op
		if op == "./" {
			op = "/"
		}

		// Type conversion between dimensions and colors
		if aDim, aOk := a.(*Dimension); aOk {
			if _, bOk := b.(*Color); bOk {
				a = aDim.ToColor()
			}
		}
		
		if bDim, bOk := b.(*Dimension); bOk {
			if _, aOk := a.(*Color); aOk {
				b = bDim.ToColor()
			}
		}

		// Handle dimension operations
		if aDim, aOk := a.(*Dimension); aOk {
			if bDim, bOk := b.(*Dimension); bOk {
				return aDim.Operate(context, op, bDim), nil
			}
		}
		
		// Handle color operations
		if aColor, aOk := a.(*Color); aOk {
			if bColor, bOk := b.(*Color); bOk {
				return aColor.OperateColor(context, op, bColor), nil
			}
			if bDim, bOk := b.(*Dimension); bOk {
				return aColor.OperateColor(context, op, bDim.ToColor()), nil
			}
		}

		// Handle color operations with dimension first
		if aDim, aOk := a.(*Dimension); aOk {
			if bColor, bOk := b.(*Color); bOk {
				return aDim.ToColor().OperateColor(context, op, bColor), nil
			}
		}
		
		// Check for operations between operations (nested)
		aOp, aIsOp := a.(*Operation)
		_, bIsOp := b.(*Operation)
		
		if (aIsOp || bIsOp) && aIsOp && aOp.Op == "/" && IsMathParensDivision(context) {
			return NewOperation(o.Op, []any{a, b}, o.IsSpaced), nil
		}
			
		// For other operable types, try to use their Operate method
		if aOperable, ok := a.(interface{ Operate(any, string, any) any }); ok {
			return aOperable.Operate(context, op, b), nil
		}
		
		// If we get here, operation is not supported
		panic(map[string]string{
			"type":    "Operation",
			"message": "Operation on an invalid type",
		})
	}

	// If math is off, return a new operation
	return NewOperation(o.Op, []any{a, b}, o.IsSpaced), nil
}

// GenCSS generates CSS representation
func (o *Operation) GenCSS(context any, output *CSSOutput) {
	if operand0, ok := o.Operands[0].(interface{ GenCSS(any, *CSSOutput) }); ok {
		operand0.GenCSS(context, output)
	}
	
	if o.IsSpaced {
		output.Add(" ", nil, nil)
	}
	output.Add(o.Op, nil, nil)
	if o.IsSpaced {
		output.Add(" ", nil, nil)
	}
	
	if operand1, ok := o.Operands[1].(interface{ GenCSS(any, *CSSOutput) }); ok {
		operand1.GenCSS(context, output)
	}
}

// IsMathParensDivision checks if the math mode is PARENS_DIVISION
func IsMathParensDivision(context any) bool {
	if ctx, ok := context.(map[string]any); ok {
		if mathType, ok := ctx["math"].(MathType); ok {
			return mathType == Math.ParensDivision
		}
	}
	return false
} 