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
	
	// Check for nil operands
	if len(o.Operands) < 2 || o.Operands[0] == nil || o.Operands[1] == nil {
		return nil, &LessError{
			Type:    "Operation",
			Message: "Operation requires two operands",
		}
	}
	
	// Evaluate operand A
	if aNode, ok := o.Operands[0].(interface{ Eval(any) (any, error) }); ok {
		var err error
		a, err = aNode.Eval(context)
		if err != nil {
			return nil, err
		}
	} else if aNode, ok := o.Operands[0].(interface{ Eval(any) any }); ok {
		a = aNode.Eval(context)
	} else {
		a = o.Operands[0]
	}
	
	// Evaluate operand B  
	if bNode, ok := o.Operands[1].(interface{ Eval(any) (any, error) }); ok {
		var err error
		b, err = bNode.Eval(context)
		if err != nil {
			return nil, err
		}
	} else if bNode, ok := o.Operands[1].(interface{ Eval(any) any }); ok {
		b = bNode.Eval(context)
	} else {
		b = o.Operands[1]
	}
	
	// Match JavaScript: if (context.isMathOn(this.op))
	mathOn := false
	// First try the proper Eval context
	if evalCtx, ok := context.(*Eval); ok {
		mathOn = evalCtx.IsMathOnWithOp(o.Op)
	} else if ctx, ok := context.(map[string]any); ok {
		// Fallback to map-based context for compatibility
		if mathOnFunc, ok := ctx["isMathOn"].(func(string) bool); ok {
			mathOn = mathOnFunc(o.Op)
		}
	}

	if mathOn {
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
		// Check if both operands have operate capability
		aHasOperate := false
		bHasOperate := false
		
		// Check if a can operate
		if _, ok := a.(*Dimension); ok {
			aHasOperate = true
		} else if _, ok := a.(*Color); ok {
			aHasOperate = true
		}
		
		// Check if b can operate
		if _, ok := b.(*Dimension); ok {
			bHasOperate = true
		} else if _, ok := b.(*Color); ok {
			bHasOperate = true
		}
		
		if !aHasOperate || !bHasOperate {
			// Check for special case before throwing error
			aOp, aIsOp := a.(*Operation)
			_, bIsOp := b.(*Operation)
			
			if (aIsOp || bIsOp) && aIsOp && aOp.Op == "/" && IsMathParensDivision(context) {
				return NewOperation(o.Op, []any{a, b}, o.IsSpaced), nil
			}
			
			return nil, &LessError{
				Type:    "Operation",
				Message: "Operation on an invalid type",
			}
		}
		
		// Handle Dimension operations
		if aDim, aOk := a.(*Dimension); aOk {
			if bDim, bOk := b.(*Dimension); bOk {
				// Check for division by zero
				if (op == "/" || op == "./") && bDim.Value == 0 {
					return nil, &LessError{
						Type:    "Operation",
						Message: "Division by zero",
					}
				}
				// Match JavaScript: return a.operate(context, op, b);
				return aDim.Operate(context, op, bDim), nil
			}
		}
		
		// Handle Color operations  
		if aColor, aOk := a.(*Color); aOk {
			if bColor, bOk := b.(*Color); bOk {
				// Match JavaScript: return a.operate(context, op, b);
				result := aColor.OperateColor(context, op, bColor)
				return result, nil
			}
		}
		
		// Try a generic Operate interface for other types
		if aOperable, aOk := a.(interface{ Operate(any, string, any) any }); aOk {
			return aOperable.Operate(context, op, b), nil
		}
		
		// Should never reach here after operate check above
		// Match JavaScript: throw { type: 'Operation', message: 'Operation on an invalid type' };
		return nil, &LessError{
			Type:    "Operation",
			Message: "Operation on an invalid type",
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
	// First try the proper Eval context
	if evalCtx, ok := context.(*Eval); ok {
		return evalCtx.Math == MathParensDivision
	}
	// Fallback to map-based context for compatibility
	if ctx, ok := context.(map[string]any); ok {
		if mathType, ok := ctx["math"].(MathType); ok {
			return mathType == Math.ParensDivision
		}
	}
	return false
} 