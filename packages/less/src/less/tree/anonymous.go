package tree

import (
	"fmt"
)

// Anonymous represents an anonymous node in the Less AST
type Anonymous struct {
	*Node
	Value      interface{}
	Index      int
	FileInfo   map[string]interface{}
	MapLines   bool
	RulesetLike bool
	AllowRoot  bool
}

// NewAnonymous creates a new Anonymous instance
func NewAnonymous(value interface{}, index int, fileInfo map[string]interface{}, mapLines bool, rulesetLike bool, visibilityInfo map[string]interface{}) *Anonymous {
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

// Eval returns a new Anonymous instance with the same properties
func (a *Anonymous) Eval() interface{} {
	// Create a new instance with the same properties
	visibilityInfo := map[string]interface{}{}
	if a.VisibilityBlocks != nil {
		blocks := *a.VisibilityBlocks
		visibilityInfo["visibilityBlocks"] = blocks
	}
	if a.NodeVisible != nil {
		visible := *a.NodeVisible
		visibilityInfo["nodeVisible"] = visible
	}
	return NewAnonymous(a.Value, a.Index, a.FileInfo, a.MapLines, a.RulesetLike, visibilityInfo)
}

// Compare compares two nodes
func (a *Anonymous) Compare(other interface{}) interface{} {
	if other == nil {
		return nil
	}

	// If other is not an Anonymous node, return nil
	otherAnon, ok := other.(*Anonymous)
	if !ok {
		return nil
	}

	// Compare CSS output like the JavaScript version
	var output1, output2 string
	a.GenCSS(nil, &CSSOutput{
		Add: func(chunk interface{}, fileInfo interface{}, index interface{}) {
			if chunk != nil {
				output1 += fmt.Sprintf("%v", chunk)
			}
		},
	})
	otherAnon.GenCSS(nil, &CSSOutput{
		Add: func(chunk interface{}, fileInfo interface{}, index interface{}) {
			if chunk != nil {
				output2 += fmt.Sprintf("%v", chunk)
			}
		},
	})

	// Compare the CSS outputs
	if output1 == output2 {
		return 0
	}
	return nil
}

// IsRulesetLike returns whether the node is ruleset-like
func (a *Anonymous) IsRulesetLike() bool {
	return a.RulesetLike
}

// GenCSS generates CSS representation
func (a *Anonymous) GenCSS(context interface{}, output *CSSOutput) {
	if a.Value != nil {
		// Always set visibility based on value like JavaScript version
		visible := a.Value != nil && a.Value != ""
		a.NodeVisible = &visible
		
		if a.NodeVisible != nil && *a.NodeVisible {
			output.Add(a.Value, a.FileInfo, a.Index)
		}
	}
}

// CopyVisibilityInfo copies visibility information from another node
func (a *Anonymous) CopyVisibilityInfo(info map[string]interface{}) {
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