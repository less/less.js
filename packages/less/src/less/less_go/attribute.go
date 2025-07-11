package less_go

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

	if evaluable, ok := a.Key.(ParserEvaluable); ok {
		key = evaluable.Eval(context)
	} else {
		key = a.Key
	}

	if a.Value != nil {
		if evaluable, ok := a.Value.(ParserEvaluable); ok {
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

	if SafeNilCheck(a.Key) {
		// Instead of panicking, return empty attribute or error indication
		return "[]"
	}

	value = SafeToCSS(a.Key, context)

	if a.Op != "" {
		value += a.Op
		if SafeNilCheck(a.Value) {
			// Instead of panicking, just append the operator without value
			// This maintains CSS validity while avoiding panics
		} else {
			value += SafeToCSS(a.Value, context)
		}
	}

	if a.Cif != "" {
		value += " " + a.Cif
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