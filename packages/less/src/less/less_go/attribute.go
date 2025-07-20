package less_go

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

// Type returns the node type
func (a *Attribute) Type() string {
	return "Attribute"
}

// GetType returns the node type
func (a *Attribute) GetType() string {
	return "Attribute"
}

// Eval evaluates the attribute node in the given context
func (a *Attribute) Eval(context any) (any, error) {
	var key any
	var value any

	// Evaluate key
	if a.Key != nil {
		if evaluable, ok := a.Key.(interface{ Eval(any) (any, error) }); ok {
			var err error
			key, err = evaluable.Eval(context)
			if err != nil {
				return nil, err
			}
		} else if evaluable, ok := a.Key.(ParserEvaluable); ok {
			key = evaluable.Eval(context)
		} else {
			key = a.Key
		}
	}

	// Evaluate value
	if a.Value != nil {
		if evaluable, ok := a.Value.(interface{ Eval(any) (any, error) }); ok {
			var err error
			value, err = evaluable.Eval(context)
			if err != nil {
				return nil, err
			}
		} else if evaluable, ok := a.Value.(ParserEvaluable); ok {
			value = evaluable.Eval(context)
		} else {
			value = a.Value
		}
	}

	return NewAttribute(key, a.Op, value, a.Cif), nil
}

// GenCSS generates CSS representation
func (a *Attribute) GenCSS(context any, output *CSSOutput) {
	output.Add(a.ToCSS(context), nil, nil)
}

// ToCSS generates CSS string representation
func (a *Attribute) ToCSS(context any) string {
	// Special case: when key is nil, return empty brackets regardless of other fields
	if a.Key == nil {
		return "[]"
	}

	var value string

	// Match JavaScript: this.key.toCSS ? this.key.toCSS(context) : this.key
	if cssable, ok := a.Key.(CSSable); ok {
		value = cssable.ToCSS(context)
	} else {
		value = fmt.Sprintf("%v", a.Key)
	}

	if a.Op != "" {
		value += a.Op
		// Match JavaScript: this.value.toCSS ? this.value.toCSS(context) : this.value
		// Note: JavaScript doesn't check if value is nil before accessing toCSS
		if a.Value == nil {
			value += ""
		} else if cssable, ok := a.Value.(CSSable); ok {
			value += cssable.ToCSS(context)
		} else {
			value += fmt.Sprintf("%v", a.Value)
		}
	}

	if a.Cif != "" {
		value = value + " " + a.Cif
	}

	return "[" + value + "]"
}

// ParserEvaluable interface defines the Eval method
type ParserEvaluable interface {
	Eval(any) any
}

// CSSable interface defines the ToCSS method
type CSSable interface {
	ToCSS(any) string
} 