package tree

import (
	"fmt"
)

// Attribute represents a CSS attribute selector node
type Attribute struct {
	*Node
	Key   interface{}
	Op    string
	Value interface{}
	Cif   string
}

// NewAttribute creates a new Attribute node
func NewAttribute(key interface{}, op string, value interface{}, cif string) *Attribute {
	return &Attribute{
		Node:  NewNode(),
		Key:   key,
		Op:    op,
		Value: value,
		Cif:   cif,
	}
}

// Eval evaluates the attribute node in the given context
func (a *Attribute) Eval(context interface{}) *Attribute {
	var key interface{}
	var value interface{}

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
func (a *Attribute) GenCSS(context interface{}, output *CSSOutput) {
	output.Add(a.ToCSS(context), nil, nil)
}

// ToCSS generates CSS string representation
func (a *Attribute) ToCSS(context interface{}) string {
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
	Eval(interface{}) interface{}
}

// CSSable interface defines the ToCSS method
type CSSable interface {
	ToCSS(interface{}) string
} 