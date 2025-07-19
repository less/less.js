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

// GetType returns the type of the node for visitor pattern consistency
func (o *Operation) GetType() string {
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

// Eval evaluates the operation - match JavaScript implementation closely
func (o *Operation) Eval(context any) (any, error) {
	// Match JavaScript: let a = this.operands[0].eval(context), b = this.operands[1].eval(context), op;
	var a, b any
	
	// Evaluate operand A
	if aNode, ok := o.Operands[0].(interface{ Eval(any) any }); ok {
		a = aNode.Eval(context)
	} else {
		a = o.Operands[0]
	}
	
	// Evaluate operand B  
	if bNode, ok := o.Operands[1].(interface{ Eval(any) any }); ok {
		b = bNode.Eval(context)
	} else {
		b = o.Operands[1]
	}
	
	// Match JavaScript: if (context.isMathOn(this.op))
	if ctx, ok := context.(map[string]any); ok {
		if mathOnFunc, ok := ctx["isMathOn"].(func(string) bool); ok && mathOnFunc(o.Op) {
			// Match JavaScript: op = this.op === './' ? '/' : this.op;
			op := o.Op
			if op == "./" {
				op = "/"
			}
			
			// Match JavaScript: if (a instanceof Dimension && b instanceof Color) { a = a.toColor(); }
			if aDim, aOk := a.(*Dimension); aOk {
				if _, bOk := b.(*Color); bOk {
					a = aDim.ToColor()
				}
			}
			// Match JavaScript: if (b instanceof Dimension && a instanceof Color) { b = b.toColor(); }
			if bDim, bOk := b.(*Dimension); bOk {
				if _, aOk := a.(*Color); aOk {
					b = bDim.ToColor()
				}
			}
			
			// Match JavaScript: if (!a.operate || !b.operate)
			// Check if both operands can operate with each other
			
			// Handle Dimension operations
			if aDim, aOk := a.(*Dimension); aOk {
				if bDim, bOk := b.(*Dimension); bOk {
					// Match JavaScript: return a.operate(context, op, b);
					return aDim.Operate(context, op, bDim), nil
				}
			}
			
			// Handle Color operations  
			if aColor, aOk := a.(*Color); aOk {
				if bColor, bOk := b.(*Color); bOk {
					// Match JavaScript: return a.operate(context, op, b);
					if result := aColor.OperateColor(context, op, bColor); result != nil {
						return result, nil
					}
				}
			}
			
			// If we get here, check for the special cases before throwing error
			// Match JavaScript special case for operations and PARENS_DIVISION
			aOp, aIsOp := a.(*Operation)
			bIsOp := false
			if _, ok := b.(*Operation); ok {
				bIsOp = true
			}
			
			if (aIsOp || bIsOp) && aIsOp && aOp.Op == "/" && IsMathParensDivision(context) {
				return NewOperation(o.Op, []any{a, b}, o.IsSpaced), nil
			}
			
			// Try a generic Operate interface for other types
			if aOperable, aOk := a.(interface{ Operate(any, string, any) any }); aOk {
				return aOperable.Operate(context, op, b), nil
			}
			
			// Match JavaScript: throw { type: 'Operation', message: 'Operation on an invalid type' };
			panic(map[string]string{
				"type":    "Operation",
				"message": "Operation on an invalid type",
			})
		}
	}
	
	// Match JavaScript: return new Operation(this.op, [a, b], this.isSpaced);
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