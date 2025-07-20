package less_go

import (
	"fmt"
)

// Assignment represents a key-value assignment in the Less AST
type Assignment struct {
	*Node
	Key   any
	Value any
}

// NewAssignment creates a new Assignment instance
func NewAssignment(key, value any) *Assignment {
	return &Assignment{
		Node:  NewNode(),
		Key:   key,
		Value: value,
	}
}

// Type returns the node type
func (a *Assignment) Type() string {
	return "Assignment"
}

// GetType returns the node type
func (a *Assignment) GetType() string {
	return "Assignment"
}

// Accept visits the node with a visitor
func (a *Assignment) Accept(visitor any) {
	if v, ok := visitor.(interface{ Visit(any) any }); ok {
		a.Value = v.Visit(a.Value)
	}
}

// Eval evaluates the assignment
func (a *Assignment) Eval(context any) (any, error) {
	if eval, ok := a.Value.(interface{ Eval(any) (any, error) }); ok {
		evaluated, err := eval.Eval(context)
		if err != nil {
			return nil, err
		}
		return NewAssignment(a.Key, evaluated), nil
	} else if evalNoError, ok := a.Value.(interface{ Eval(any) any }); ok {
		// Handle nodes that don't return errors
		return NewAssignment(a.Key, evalNoError.Eval(context)), nil
	}
	return a, nil
}

// GenCSS generates CSS representation
func (a *Assignment) GenCSS(context any, output *CSSOutput) {
	output.Add(fmt.Sprintf("%v=", a.Key), nil, nil)
	if genCSS, ok := a.Value.(interface{ GenCSS(any, *CSSOutput) }); ok {
		genCSS.GenCSS(context, output)
	} else {
		output.Add(a.Value, nil, nil)
	}
} 