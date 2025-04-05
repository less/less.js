package tree

import (
	"fmt"
)

// Attribute represents a CSS attribute selector node
type Attribute struct {
	*Node
	Key   any
	Op    string
	Value any
	Cif   string
}

// NewAttribute creates a new Attribute node
func NewAttribute(key any, op string, value any, cif string) *Attribute {
	return &Attribute{
		Node:  NewNode(),
		Key:   key,
		Op:    op,
		Value: value,
		Cif:   cif,
	}
}

// Eval evaluates the attribute node in the given context
func (a *Attribute) Eval(context any) *Attribute {
	var key any
	var value any

	if evaluable, ok := a.Key.(Evaluable); ok {
		key = evaluable.Eval(context)
	} else {
		key = a.Key
	}

	if a.Value != nil {
		if evaluable, ok := a.Value.(Evaluable); ok {
			value = evaluable.Eval(context)
		} else {
			value = a.Value
		}
	}

	return NewAttribute(key, a.Op, value, a.Cif)
}

// GenCSS generates CSS representation
func (a *Attribute) GenCSS(context any, output *CSSOutput) {
	output.Add(a.ToCSS(context), nil, nil)
}

// ToCSS generates CSS string representation
func (a *Attribute) ToCSS(context any) string {
	var value string

	if a.Key == nil {
		panic("Cannot read properties of nil (reading 'toCSS')")
	}

	if cssable, ok := a.Key.(CSSable); ok {
		value = cssable.ToCSS(context)
	} else {
		value = fmt.Sprintf("%v", a.Key)
	}

	if a.Op != "" {
		value += a.Op
		if a.Value == nil {
			panic("Cannot read properties of nil (reading 'toCSS')")
		}
		if cssable, ok := a.Value.(CSSable); ok {
			value += cssable.ToCSS(context)
		} else {
			value += fmt.Sprintf("%v", a.Value)
		}
	}

	if a.Cif != "" {
		value += " " + a.Cif
	}

	return "[" + value + "]"
}

// Evaluable interface defines the Eval method
type Evaluable interface {
	Eval(any) any
}

// CSSable interface defines the ToCSS method
type CSSable interface {
	ToCSS(any) string
} 