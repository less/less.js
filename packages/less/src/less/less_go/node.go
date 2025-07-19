package less_go

import (
	"fmt"
	"math"
	"strconv"
	"strings"
)

// Node represents a base node in the Less AST
type Node struct {
	Parent          *Node
	VisibilityBlocks *int
	NodeVisible     *bool
	RootNode        *Node
	Parsed          any
	Value           any
	Index           int
	fileInfo        map[string]any
	Parens          bool
	ParensInOp      bool
}

// GenCSSSourceMap implements SourceMapNode interface for Node
func (n *Node) GenCSSSourceMap(context map[string]any, output *SourceMapOutput) {
	// Default implementation for source map generation - most nodes will override this
}

// NewNode creates a new Node instance
func NewNode() *Node {
	return &Node{
		Parent:          nil,
		VisibilityBlocks: nil,
		NodeVisible:     nil,
		RootNode:        nil,
		Parsed:          nil,
		Value:           nil,
		Index:           0,
		fileInfo:        make(map[string]any),
	}
}

// SetParent sets the parent for one or more nodes
func (n *Node) SetParent(nodes any, parent *Node) {
	switch v := nodes.(type) {
	case []*Node:
		for _, node := range v {
			if node != nil {
				node.Parent = parent
			}
		}
	case *Node:
		if v != nil {
			v.Parent = parent
		}
	case []any:
		// Handle slice of any containing objects with Node fields (like *Ruleset)
		for _, item := range v {
			if item != nil {
				// Check if the item has a Node field (like *Ruleset does)
				if nodeContainer, ok := item.(interface{ GetNode() *Node }); ok {
					if node := nodeContainer.GetNode(); node != nil {
						node.Parent = parent
					}
				} else if ruleset, ok := item.(*Ruleset); ok {
					// Handle *Ruleset specifically since it embeds *Node
					if ruleset.Node != nil {
						ruleset.Node.Parent = parent
					}
				} else if node, ok := item.(*Node); ok {
					// Handle direct *Node types
					node.Parent = parent
				}
			}
		}
	case nil:
		// Handle nil case gracefully
	default:
		// Handle single item that might have a Node field
		if nodeContainer, ok := nodes.(interface{ GetNode() *Node }); ok {
			if node := nodeContainer.GetNode(); node != nil {
				node.Parent = parent
			}
		} else if ruleset, ok := nodes.(*Ruleset); ok {
			if ruleset.Node != nil {
				ruleset.Node.Parent = parent
			}
		} else if selector, ok := nodes.(*Selector); ok {
			// Handle *Selector which embeds *Node
			if selector.Node != nil {
				selector.Node.Parent = parent
			}
		} else if elemNode, ok := nodes.(*Element); ok {
			// Handle *Element which embeds *Node
			if elemNode.Node != nil {
				elemNode.Node.Parent = parent
			}
		}
		// For any other type that embeds *Node, try reflection as last resort
		// This handles future types that embed *Node without explicit cases
	}
}

// GetIndex returns the node's index
func (n *Node) GetIndex() int {
	if n.Index != 0 {
		return n.Index
	}
	if n.Parent != nil {
		return n.Parent.GetIndex()
	}
	return 0
}

// FileInfo returns the node's file information
func (n *Node) FileInfo() map[string]any {
	if len(n.fileInfo) > 0 {
		return n.fileInfo
	}
	if n.Parent != nil {
		return n.Parent.FileInfo()
	}
	return make(map[string]any)
}

// SetFileInfo sets the node's file information
func (n *Node) SetFileInfo(info map[string]any) {
	n.fileInfo = info
}

// IsRulesetLike returns false for base Node
func (n *Node) IsRulesetLike() bool {
	return false
}

// ToCSS generates CSS string representation
func (n *Node) ToCSS(context any) string {
	var strs []string
	output := &CSSOutput{
		Add: func(chunk any, fileInfo any, index any) {
			strs = append(strs, fmt.Sprintf("%v", chunk))
		},
		IsEmpty: func() bool {
			return len(strs) == 0
		},
	}
	n.GenCSS(context, output)
	return strings.Join(strs, "")
}

// CSSOutput represents the output structure for CSS generation
type CSSOutput struct {
	Add     func(any, any, any)
	IsEmpty func() bool
}

// GenCSS generates CSS representation
func (n *Node) GenCSS(context any, output *CSSOutput) {
	if n.Value != nil {
		output.Add(n.Value, nil, nil)
	}
}

// NodeVisitor interface defines the Visit method
type NodeVisitor interface {
	Visit(any) any
}

// Accept visits the node with a visitor
func (n *Node) Accept(visitor any) {
	if v, ok := visitor.(NodeVisitor); ok {
		if n.Value != nil {
			n.Value = v.Visit(n.Value)
		}
	}
}

// Eval returns the node itself
func (n *Node) Eval() *Node {
	return n
}

// Operate performs basic arithmetic operations
func (n *Node) Operate(context any, op string, a, b float64) float64 {
	switch op {
	case "+":
		return a + b
	case "-":
		return a - b
	case "*":
		return a * b
	case "/":
		return a / b
	default:
		return 0
	}
}

// Fround rounds numbers based on precision
func (n *Node) Fround(context any, value float64) float64 {
	if context == nil {
		return value
	}
	
	// Add "epsilon" to ensure numbers like 1.000000005 are properly rounded
	epsilon := 2e-16
	if ctx, ok := context.(map[string]any); ok {
		if precision, ok := ctx["numPrecision"].(int); ok {
			// Use math.Round to match JavaScript's toFixed behavior
			rounded := math.Round((value+epsilon)*math.Pow10(precision)) / math.Pow10(precision)
			return rounded
		}
	}
	return value
}

// Compareable interface defines the Compare method
type Compareable interface {
	Compare(*Node) int
}

// Compare compares two nodes
func Compare(a, b *Node) int {
	if a == nil || b == nil {
		return 0
	}

	// Handle nodes with Compare method
	if aCompare, ok := a.Value.(Compareable); ok {
		// For "symmetric results" force toCSS-based comparison
		// of Quoted or Anonymous if either value is one of those
		if bType, ok := b.Value.(string); ok {
			if bType == "Quoted" || bType == "Anonymous" {
				return strings.Compare(fmt.Sprintf("%v", a.Value), fmt.Sprintf("%v", b.Value))
			}
		}
		return aCompare.Compare(b)
	}
	if bCompare, ok := b.Value.(Compareable); ok {
		return -bCompare.Compare(a)
	}

	// Check type equality
	if fmt.Sprintf("%T", a.Value) != fmt.Sprintf("%T", b.Value) {
		// If types don't match, they are generally considered incomparable
		// unless a specific comparison method handles it (checked above).
		// Return 999 to indicate incomparable types (like JavaScript's undefined)
		return 999
	}

	// Handle array comparison
	if aArr, ok := a.Value.([]any); ok {
		if bArr, ok := b.Value.([]any); ok {
			if len(aArr) != len(bArr) {
				return 999 // Equivalent to JavaScript's undefined
			}
			for i := range aArr {
				if Compare(&Node{Value: aArr[i]}, &Node{Value: bArr[i]}) != 0 {
					return 999 // Equivalent to JavaScript's undefined
				}
			}
			return 0
		}
	}

	// Handle simple value comparison
	if a.Value == b.Value {
		return 0
	}

	// Handle numeric comparison
	if aNum, ok := a.Value.(float64); ok {
		if bNum, ok := b.Value.(float64); ok {
			return NumericCompare(aNum, bNum)
		}
	}

	// Handle string comparison
	if aStr, ok := a.Value.(string); ok {
		if bStr, ok := b.Value.(string); ok {
			// Special handling for Quoted and Anonymous types
			if aStr == "Quoted" || aStr == "Anonymous" || bStr == "Quoted" || bStr == "Anonymous" {
				return strings.Compare(aStr, bStr)
			}
			return strings.Compare(aStr, bStr)
		}
	}

	return 999 // Equivalent to JavaScript's undefined
}

// NumericCompare compares two numbers
func NumericCompare(a, b float64) int {
	if a < b {
		return -1
	}
	if a == b {
		return 0
	}
	if a > b {
		return 1
	}
	return 0
}

// NumericCompareStrings compares two string values numerically if possible, otherwise lexically
func NumericCompareStrings(a, b string) int {
	// Try to parse as numbers first
	aNum, aErr := strconv.ParseFloat(a, 64)
	bNum, bErr := strconv.ParseFloat(b, 64)
	
	if aErr == nil && bErr == nil {
		// Both are numbers
		return NumericCompare(aNum, bNum)
	}
	
	// Fall back to string comparison
	if a < b {
		return -1
	} else if a > b {
		return 1
	}
	return 0
}

// BlocksVisibility returns true if the node blocks visibility
func (n *Node) BlocksVisibility() bool {
	if n.VisibilityBlocks == nil {
		return false
	}
	return *n.VisibilityBlocks != 0
}

// AddVisibilityBlock increments visibility blocks
func (n *Node) AddVisibilityBlock() {
	if n.VisibilityBlocks == nil {
		zero := 0
		n.VisibilityBlocks = &zero
	}
	*n.VisibilityBlocks++
}

// RemoveVisibilityBlock decrements visibility blocks
func (n *Node) RemoveVisibilityBlock() {
	if n.VisibilityBlocks != nil && *n.VisibilityBlocks > 0 {
		*n.VisibilityBlocks--
	}
}

// EnsureVisibility sets node visibility to true
func (n *Node) EnsureVisibility() {
	trueVal := true
	n.NodeVisible = &trueVal
}

// EnsureInvisibility sets node visibility to false
func (n *Node) EnsureInvisibility() {
	falseVal := false
	n.NodeVisible = &falseVal
}

// IsVisible returns the node's visibility state
func (n *Node) IsVisible() *bool {
	return n.NodeVisible
}

// VisibilityInfo returns the node's visibility information
func (n *Node) VisibilityInfo() map[string]any {
	return map[string]any{
		"visibilityBlocks": n.VisibilityBlocks,
		"nodeVisible":     n.NodeVisible,
	}
}

// CopyVisibilityInfo copies visibility information from another node
func (n *Node) CopyVisibilityInfo(info map[string]any) {
	if info == nil {
		return
	}
	if blocks, ok := info["visibilityBlocks"].(*int); ok {
		n.VisibilityBlocks = blocks
	}
	if visible, ok := info["nodeVisible"].(*bool); ok {
		n.NodeVisible = visible
	}
} 