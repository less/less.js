package tree

import (
	"fmt"
)

// Assignment represents a key-value assignment in the Less AST
type Assignment struct {
	*Node
	Key   interface{}
	Value interface{}
}

// NewAssignment creates a new Assignment instance
func NewAssignment(key, value interface{}) *Assignment {
	return &Assignment{
		Node:  NewNode(),
		Key:   key,
		Value: value,
	}
}

// Accept visits the node with a visitor
func (a *Assignment) Accept(visitor interface{}) {
	if v, ok := visitor.(Visitor); ok {
		a.Value = v.Visit(a.Value)
	}
}

// Eval evaluates the assignment
func (a *Assignment) Eval(context interface{}) interface{} {
	if eval, ok := a.Value.(interface{ Eval(interface{}) interface{} }); ok {
		return NewAssignment(a.Key, eval.Eval(context))
	}
	return a
}

// GenCSS generates CSS representation
func (a *Assignment) GenCSS(context interface{}, output *CSSOutput) {
	output.Add(fmt.Sprintf("%v=", a.Key), nil, nil)
	if genCSS, ok := a.Value.(interface{ GenCSS(interface{}, *CSSOutput) }); ok {
		genCSS.GenCSS(context, output)
	} else {
		output.Add(a.Value, nil, nil)
	}
} 