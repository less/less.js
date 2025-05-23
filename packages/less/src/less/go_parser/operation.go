package go_parser

import (
	"reflect"
	"strings"

	"github.com/toakleaf/less.go/packages/less/src/less"
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
func (o *Operation) Eval(context any) any {
	// Get the evaluated operands
	var a, b any
	
	if aNode, ok := o.Operands[0].(interface{ Eval(any) any }); ok {
		a = aNode.Eval(context)
	} else {
		a = o.Operands[0]
	}
	
	if bNode, ok := o.Operands[1].(interface{ Eval(any) any }); ok {
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
				return aDim.Operate(context, op, bDim)
			}
		}
		
		// Handle color operations
		if aColor, aOk := a.(*Color); aOk {
			if bColor, bOk := b.(*Color); bOk {
				return aColor.OperateColor(context, op, bColor)
			}
			if bDim, bOk := b.(*Dimension); bOk {
				return aColor.OperateColor(context, op, bDim.ToColor())
			}
		}

		// Handle color operations with dimension first
		if aDim, aOk := a.(*Dimension); aOk {
			if bColor, bOk := b.(*Color); bOk {
				return aDim.ToColor().OperateColor(context, op, bColor)
			}
		}
		
		// Check for operations between operations (nested)
		aOp, aIsOp := a.(*Operation)
		_, bIsOp := b.(*Operation)
		
		if (aIsOp || bIsOp) && aIsOp && aOp.Op == "/" && IsMathParensDivision(context) {
			return NewOperation(o.Op, []any{a, b}, o.IsSpaced)
		}
			
		// For other operable types, try to use their Operate method
		if aOperable, ok := a.(interface{ Operate(any, string, any) any }); ok {
			return aOperable.Operate(context, op, b)
		}
		
		// If we get here, operation is not supported
		panic(map[string]string{
			"type":    "Operation",
			"message": "Operation on an invalid type",
		})
	}

	// If math is off, return a new operation
	return NewOperation(o.Op, []any{a, b}, o.IsSpaced)
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
		if mathType, ok := ctx["math"].(less.MathType); ok {
			return mathType == less.Math.ParensDivision
		}
	}
	return false
} 