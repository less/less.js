package tree

// UnicodeDescriptor represents a unicode descriptor node in the Less AST
type UnicodeDescriptor struct {
	*Node
	value any
}

// NewUnicodeDescriptor creates a new UnicodeDescriptor instance
func NewUnicodeDescriptor(value any) *UnicodeDescriptor {
	u := &UnicodeDescriptor{
		Node:  NewNode(),
		value: value,
	}
	return u
}

// Type returns the type of the node
func (u *UnicodeDescriptor) Type() string {
	return "UnicodeDescriptor"
}

// Accept implements the Visitor pattern
func (u *UnicodeDescriptor) Accept(visitor any) {
	if v, ok := visitor.(Visitor); ok {
		u.value = v.Visit(u.value)
	}
}

// GenCSS generates CSS output
func (u *UnicodeDescriptor) GenCSS(context any, output *CSSOutput) {
	output.Add(u.value, nil, nil)
} 