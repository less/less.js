package less_go

import (
	"fmt"
	"strings"
)

// Anonymous represents an anonymous node in the Less AST
type Anonymous struct {
	*Node
	Value      any
	Index      int
	FileInfo   map[string]any
	MapLines   bool
	RulesetLike bool
	AllowRoot  bool
}

// NewAnonymous creates a new Anonymous instance
func NewAnonymous(value any, index int, fileInfo map[string]any, mapLines bool, rulesetLike bool, visibilityInfo map[string]any) *Anonymous {
	anon := &Anonymous{
		Node:       NewNode(),
		Value:      value,
		Index:      index,
		FileInfo:   fileInfo,
		MapLines:   mapLines,
		RulesetLike: rulesetLike,
		AllowRoot:  true,
	}
	if visibilityInfo != nil {
		if blocks, ok := visibilityInfo["visibilityBlocks"].(int); ok {
			anon.VisibilityBlocks = &blocks
		}
		if visible, ok := visibilityInfo["nodeVisible"].(bool); ok {
			anon.NodeVisible = &visible
		}
	}
	return anon
}

// Eval evaluates the anonymous value
func (a *Anonymous) Eval(context any) (any, error) {
	// Match JavaScript: just returns a new Anonymous with the same value (no evaluation)
	// Create a new Anonymous instance like JavaScript version
	visibilityInfo := map[string]any{}
	if a.VisibilityBlocks != nil {
		visibilityInfo["visibilityBlocks"] = *a.VisibilityBlocks
	}
	if a.NodeVisible != nil {
		visibilityInfo["nodeVisible"] = *a.NodeVisible
	}
	return NewAnonymous(a.Value, a.Index, a.FileInfo, a.MapLines, a.RulesetLike, visibilityInfo), nil
}

// Compare compares two nodes
func (a *Anonymous) Compare(other any) any {
	if other == nil {
		return nil
	}

	// Check if other has a ToCSS method (like JavaScript version checks other.toCSS)
	// JavaScript: return other.toCSS && this.toCSS() === other.toCSS() ? 0 : undefined;
	if cssable, ok := other.(interface{ ToCSS(any) string }); ok {
		if a.ToCSS(nil) == cssable.ToCSS(nil) {
			return 0
		}
	}
	
	return nil
}

// IsRulesetLike returns whether the node is ruleset-like
func (a *Anonymous) IsRulesetLike() bool {
	return a.RulesetLike
}

// Operate performs mathematical operations on Anonymous values
// This allows variables like @z: 11; to participate in mathematical expressions
func (a *Anonymous) Operate(context any, op string, other any) any {
	// Try to convert this Anonymous to a Dimension for mathematical operations
	if a.Value != nil {
		if str, ok := a.Value.(string); ok {
			// Try to parse as a number
			if dim, err := NewDimension(str, ""); err == nil {
				// Successfully parsed as dimension, delegate to dimension's operate method
				if otherDim, ok := other.(*Dimension); ok {
					return dim.Operate(context, op, otherDim)
				}
				// If other is also Anonymous, try to convert it too
				if otherAnon, ok := other.(*Anonymous); ok {
					if otherStr, ok := otherAnon.Value.(string); ok {
						if otherDimension, err := NewDimension(otherStr, ""); err == nil {
							return dim.Operate(context, op, otherDimension)
						}
					}
				}
			}
		}
		// If this anonymous represents a number value
		if num, ok := a.Value.(float64); ok {
			dim, _ := NewDimension(num, "")
			if otherDim, ok := other.(*Dimension); ok {
				return dim.Operate(context, op, otherDim)
			}
		}
		if num, ok := a.Value.(int); ok {
			dim, _ := NewDimension(float64(num), "")
			if otherDim, ok := other.(*Dimension); ok {
				return dim.Operate(context, op, otherDim)
			}
		}
	}
	
	// If we can't convert to dimension, return a new operation node
	return NewOperation(op, []any{a, other}, false)
}

// GenCSS generates CSS representation
func (a *Anonymous) GenCSS(context any, output *CSSOutput) {
	// Set visibility based on value's truthiness like JavaScript version
	// In JS: this.nodeVisible = Boolean(this.value);
	visible := false
	if a.Value != nil {
		switch v := a.Value.(type) {
		case string:
			visible = v != ""
		case bool:
			visible = v
		case int, int64, float64:
			visible = true
		default:
			visible = true
		}
	}
	a.NodeVisible = &visible
	
	if *a.NodeVisible {
		// Check if the value implements CSSGenerator
		if generator, ok := a.Value.(CSSGenerator); ok {
			generator.GenCSS(context, output)
		} else if a.Value != nil {
			// For simple values like strings, add directly
			// JavaScript passes mapLines as 4th param, but Go's Add only takes 3 params
			output.Add(a.Value, a.FileInfo, a.Index)
		}
	}
}

// ToCSS generates CSS string representation
func (a *Anonymous) ToCSS(context any) string {
	// Use GenCSS internally
	var chunks []string
	output := &CSSOutput{
		Add: func(chunk any, fileInfo any, index any) {
			if chunk != nil {
				chunks = append(chunks, fmt.Sprintf("%v", chunk))
			}
		},
		IsEmpty: func() bool {
			return len(chunks) == 0
		},
	}
	a.GenCSS(context, output)
	result := strings.Join(chunks, "")
	return result
}

// CopyVisibilityInfo copies visibility information from another node
func (a *Anonymous) CopyVisibilityInfo(info map[string]any) {
	if info == nil {
		return
	}
	if blocks, ok := info["visibilityBlocks"].(int); ok {
		a.VisibilityBlocks = &blocks
	}
	if visible, ok := info["nodeVisible"].(bool); ok {
		a.NodeVisible = &visible
	}
} 