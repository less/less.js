package less_go

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
	u.Node.Value = value // Set the Node's Value field as well for consistency
	return u
}

// Type returns the type of the node
func (u *UnicodeDescriptor) Type() string {
	return "UnicodeDescriptor"
}

// GetValue returns the value stored in the UnicodeDescriptor
func (u *UnicodeDescriptor) GetValue() any {
	return u.value
}

// SetValue sets the value in the UnicodeDescriptor
func (u *UnicodeDescriptor) SetValue(value any) {
	u.value = value
	u.Node.Value = value // Keep Node.Value in sync
}

// Accept implements the Visitor pattern
func (u *UnicodeDescriptor) Accept(visitor any) {
	if v, ok := visitor.(interface{ Visit(any) any }); ok {
		u.value = v.Visit(u.value)
		u.Node.Value = u.value // Keep Node.Value in sync
	}
}

// GenCSS generates CSS output
func (u *UnicodeDescriptor) GenCSS(context any, output *CSSOutput) {
	if u.value != nil {
		output.Add(u.value, nil, nil)
	}
}

// ToCSS generates CSS string representation
func (u *UnicodeDescriptor) ToCSS(context any) string {
	return u.Node.ToCSS(context)
}

// Eval returns the UnicodeDescriptor itself (matches JavaScript behavior)
func (u *UnicodeDescriptor) Eval() *UnicodeDescriptor {
	return u
}

// SetParent sets the parent for the UnicodeDescriptor
func (u *UnicodeDescriptor) SetParent(nodes any, parent *Node) {
	u.Node.SetParent(nodes, parent)
}

// GetIndex returns the node's index
func (u *UnicodeDescriptor) GetIndex() int {
	return u.Node.GetIndex()
}

// FileInfo returns the node's file information
func (u *UnicodeDescriptor) FileInfo() map[string]any {
	return u.Node.FileInfo()
}

// IsRulesetLike returns false for UnicodeDescriptor
func (u *UnicodeDescriptor) IsRulesetLike() bool {
	return u.Node.IsRulesetLike()
}

// Operate performs basic arithmetic operations (inherited from Node)
func (u *UnicodeDescriptor) Operate(context any, op string, a, b float64) float64 {
	return u.Node.Operate(context, op, a, b)
}

// Fround rounds numbers based on precision (inherited from Node)
func (u *UnicodeDescriptor) Fround(context any, value float64) float64 {
	return u.Node.Fround(context, value)
}

// BlocksVisibility returns true if the node blocks visibility
func (u *UnicodeDescriptor) BlocksVisibility() bool {
	return u.Node.BlocksVisibility()
}

// AddVisibilityBlock increments visibility blocks
func (u *UnicodeDescriptor) AddVisibilityBlock() {
	u.Node.AddVisibilityBlock()
}

// RemoveVisibilityBlock decrements visibility blocks
func (u *UnicodeDescriptor) RemoveVisibilityBlock() {
	u.Node.RemoveVisibilityBlock()
}

// EnsureVisibility sets node visibility to true
func (u *UnicodeDescriptor) EnsureVisibility() {
	u.Node.EnsureVisibility()
}

// EnsureInvisibility sets node visibility to false
func (u *UnicodeDescriptor) EnsureInvisibility() {
	u.Node.EnsureInvisibility()
}

// IsVisible returns the node's visibility state
func (u *UnicodeDescriptor) IsVisible() *bool {
	return u.Node.IsVisible()
}

// VisibilityInfo returns the node's visibility information
func (u *UnicodeDescriptor) VisibilityInfo() map[string]any {
	return u.Node.VisibilityInfo()
}

// CopyVisibilityInfo copies visibility information from another node
func (u *UnicodeDescriptor) CopyVisibilityInfo(info map[string]any) {
	u.Node.CopyVisibilityInfo(info)
} 