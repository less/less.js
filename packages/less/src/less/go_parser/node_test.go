package go_parser

import (
	"testing"
)

func TestNode(t *testing.T) {
	t.Run("Constructor and Basic Properties", func(t *testing.T) {
		node := NewNode()
		if node.Parent != nil {
			t.Error("Parent should be nil")
		}
		if node.NodeVisible != nil {
			t.Error("NodeVisible should be nil")
		}
		if node.RootNode != nil {
			t.Error("RootNode should be nil")
		}
		if node.Parsed != nil {
			t.Error("Parsed should be nil")
		}
		if node.VisibilityBlocks != nil {
			t.Error("VisibilityBlocks should be nil")
		}
	})

	t.Run("Parent-Child Relationships", func(t *testing.T) {
		parentNode := NewNode()
		childNode := NewNode()
		childNode.SetParent(childNode, parentNode)
		if childNode.Parent != parentNode {
			t.Error("Child parent should be set to parentNode")
		}

		parentNode2 := NewNode()
		childNodes := []*Node{NewNode(), NewNode()}
		parentNode2.SetParent(childNodes, parentNode2)
		for _, child := range childNodes {
			if child.Parent != parentNode2 {
				t.Error("Child parent should be set to parentNode2")
			}
		}

		// Test non-Node object handling
		parentNode3 := NewNode()
		parentNode3.SetParent(struct{}{}, parentNode3)
		// Should not panic

		// Test nil handling
		parentNode4 := NewNode()
		parentNode4.SetParent(nil, parentNode4)
		// Should not panic
	})

	t.Run("Index and FileInfo", func(t *testing.T) {
		node := NewNode()
		if node.GetIndex() != 0 {
			t.Error("GetIndex should return 0 when no parent exists")
		}

		parentNode := NewNode()
		parentNode.Index = 5
		node.Parent = parentNode
		if node.GetIndex() != 5 {
			t.Error("GetIndex should return parent index when available")
		}

		if len(node.FileInfo()) != 0 {
			t.Error("FileInfo should return empty map when no parent exists")
		}

		parentNode2 := NewNode()
		fileInfoData := map[string]any{"filename": "test.less"}
		parentNode2.SetFileInfo(fileInfoData)
		node.Parent = parentNode2
		if node.FileInfo()["filename"] != "test.less" {
			t.Error("FileInfo should return parent fileInfo when available")
		}
	})

	t.Run("CSS Generation", func(t *testing.T) {
		node := NewNode()
		node.Value = "test-value"
		if node.ToCSS(nil) != "test-value" {
			t.Error("ToCSS should generate correct CSS string")
		}

		// Test empty output
		emptyNode := NewNode()
		if emptyNode.ToCSS(nil) != "" {
			t.Error("ToCSS should handle empty value correctly")
		}
	})

	t.Run("Operations", func(t *testing.T) {
		node := NewNode()
		if node.Operate(nil, "+", 5, 3) != 8 {
			t.Error("Operate should perform addition correctly")
		}
		if node.Operate(nil, "-", 5, 3) != 2 {
			t.Error("Operate should perform subtraction correctly")
		}
		if node.Operate(nil, "*", 5, 3) != 15 {
			t.Error("Operate should perform multiplication correctly")
		}
		if node.Operate(nil, "/", 6, 3) != 2 {
			t.Error("Operate should perform division correctly")
		}

		// Test fround with precision
		context := map[string]any{"numPrecision": 2}
		if node.Fround(context, 1.2345) != 1.23 {
			t.Error("Fround should round numbers based on precision")
		}
		if node.Fround(context, 1.000000005) != 1.00 {
			t.Error("Fround should handle floating point precision correctly")
		}
		if node.Fround(nil, 1.2345) != 1.2345 {
			t.Error("Fround should return original value when no context")
		}

		// Test fround with different precisions
		context3 := map[string]any{"numPrecision": 3}
		if node.Fround(context3, 1.2345) != 1.235 {
			t.Error("Fround should handle different precisions correctly")
		}
	})

	t.Run("Static Compare Methods", func(t *testing.T) {
		node1 := NewNode()
		node2 := NewNode()
		node1.Value = "a"
		node2.Value = "a"
		if Compare(node1, node2) != 0 {
			t.Error("Compare should handle simple value comparisons")
		}

		// Test Quoted and Anonymous type comparison
		quotedNode := NewNode()
		quotedNode.Value = "Quoted"
		anonymousNode := NewNode()
		anonymousNode.Value = "Anonymous"
		if Compare(quotedNode, anonymousNode) == 0 {
			t.Error("Compare should return non-zero for different Quoted/Anonymous types")
		}

		// Test same type comparison
		quotedNode2 := NewNode()
		quotedNode2.Value = "Quoted"
		if Compare(quotedNode, quotedNode2) != 0 {
			t.Error("Compare should return 0 for same Quoted types")
		}

		anonymousNode2 := NewNode()
		anonymousNode2.Value = "Anonymous"
		if Compare(anonymousNode, anonymousNode2) != 0 {
			t.Error("Compare should return 0 for same Anonymous types")
		}

		// Test array comparison
		arrNode1 := NewNode()
		arrNode1.Value = []any{1, 2, 3}
		arrNode2 := NewNode()
		arrNode2.Value = []any{1, 2, 3}
		if Compare(arrNode1, arrNode2) != 0 {
			t.Error("Compare should handle array comparison")
		}

		// Test array comparison with different lengths
		arrNode3 := NewNode()
		arrNode3.Value = []any{1, 2}
		if Compare(arrNode1, arrNode3) != 0 {
			t.Error("Compare should return 0 for arrays of different lengths")
		}

		// Test type mismatch
		numNode := NewNode()
		numNode.Value = 42
		strNode := NewNode()
		strNode.Value = "42"
		if Compare(numNode, strNode) != 0 {
			t.Error("Compare should return 0 for different types")
		}

		// Test Compareable interface
		compareableNode := NewNode()
		compareableNode.Value = &testCompareable{value: 42}
		otherNode := NewNode()
		otherNode.Value = 42
		if Compare(compareableNode, otherNode) != 0 {
			t.Error("Compare should handle Compareable interface")
		}

		if NumericCompare(1, 2) != -1 {
			t.Error("NumericCompare should compare numbers correctly")
		}
		if NumericCompare(2, 2) != 0 {
			t.Error("NumericCompare should compare numbers correctly")
		}
		if NumericCompare(3, 2) != 1 {
			t.Error("NumericCompare should compare numbers correctly")
		}
	})

	t.Run("Visibility Management", func(t *testing.T) {
		node := NewNode()
		if node.BlocksVisibility() {
			t.Error("BlocksVisibility should initialize as false")
		}

		node.AddVisibilityBlock()
		if !node.BlocksVisibility() {
			t.Error("BlocksVisibility should be true after adding block")
		}

		node.AddVisibilityBlock()
		if *node.VisibilityBlocks != 2 {
			t.Error("AddVisibilityBlock should increment visibility blocks")
		}

		node.RemoveVisibilityBlock()
		if *node.VisibilityBlocks != 1 {
			t.Error("RemoveVisibilityBlock should decrement visibility blocks")
		}

		node.EnsureVisibility()
		if *node.NodeVisible != true {
			t.Error("EnsureVisibility should set nodeVisible to true")
		}

		node.EnsureInvisibility()
		if *node.NodeVisible != false {
			t.Error("EnsureInvisibility should set nodeVisible to false")
		}

		info := node.VisibilityInfo()
		if *info["visibilityBlocks"].(*int) != 1 {
			t.Error("VisibilityInfo should return correct visibility blocks")
		}
		if *info["nodeVisible"].(*bool) != false {
			t.Error("VisibilityInfo should return correct node visibility")
		}

		newNode := NewNode()
		newNode.CopyVisibilityInfo(info)
		if *newNode.VisibilityBlocks != 1 {
			t.Error("CopyVisibilityInfo should copy visibility blocks")
		}
		if *newNode.NodeVisible != false {
			t.Error("CopyVisibilityInfo should copy node visibility")
		}

		// Test copying nil visibility info
		nilNode := NewNode()
		nilNode.CopyVisibilityInfo(nil)
		if nilNode.VisibilityBlocks != nil {
			t.Error("CopyVisibilityInfo should handle nil info")
		}
		if nilNode.NodeVisible != nil {
			t.Error("CopyVisibilityInfo should handle nil info")
		}
	})

	t.Run("Other Methods", func(t *testing.T) {
		node := NewNode()
		if node.IsRulesetLike() {
			t.Error("IsRulesetLike should return false")
		}

		if node.Eval() != node {
			t.Error("Eval should return self")
		}

		node.Value = "original"
		visitor := &testVisitor{
			visitFunc: func(val any) any {
				if str, ok := val.(string); ok {
					return str + "-visited"
				}
				return val
			},
		}
		node.Accept(visitor)
		if node.Value != "original-visited" {
			t.Error("Accept should visit value with visitor")
		}

		// Test Accept with nil value
		nilNode := NewNode()
		nilNode.Accept(visitor)
		if nilNode.Value != nil {
			t.Error("Accept should handle nil value")
		}
	})
}

// testVisitor implements the Visitor interface for testing
type testVisitor struct {
	visitFunc func(any) any
}

func (v *testVisitor) Visit(val any) any {
	return v.visitFunc(val)
}

// testCompareable implements the Compareable interface for testing
type testCompareable struct {
	value int
}

func (c *testCompareable) Compare(other *Node) int {
	if otherNum, ok := other.Value.(int); ok {
		return NumericCompare(float64(c.value), float64(otherNum))
	}
	return 0
} 