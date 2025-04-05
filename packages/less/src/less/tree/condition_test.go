package tree

import (
	"reflect"
	"testing"
)

// MockNode is a simplified version of Node for testing Condition logic
type MockNode struct {
	*Node
	Value any
	Type  string
}

// NewMockNode creates a new MockNode for testing
func NewMockNode(value any, nodeType string) *MockNode {
	node := NewNode()
	mockNode := &MockNode{
		Node:  node,
		Value: value,
		Type:  nodeType,
	}
	// Set the mockNode as the Node's Value for proper comparison
	node.Value = mockNode
	return mockNode
}

// Eval returns the MockNode itself for comparison logic
func (m *MockNode) Eval(context any) any {
	return m.Node
}

// Compare implements comparison between MockNodes
func (m *MockNode) Compare(other *Node) int {
	if other == nil || other.Value == nil {
		return 0
	}
	
	otherMock, ok := other.Value.(*MockNode)
	if !ok {
		return 0 // Different value types
	}
	
	// Different node types should return 0 (incomparable)
	if otherMock.Type != m.Type {
		return 0
	}

	switch v := m.Value.(type) {
	case int:
		if otherVal, ok := otherMock.Value.(int); ok {
			if v < otherVal {
				return -1
			} else if v > otherVal {
				return 1
			}
			return 0
		}
	case string:
		if otherVal, ok := otherMock.Value.(string); ok {
			if v < otherVal {
				return -1
			} else if v > otherVal {
				return 1
			}
			return 0
		}
	}
	
	return 0
}

// Special method to indicate the node type - this helps the Node.Compare method
// identify different types correctly
func (m *MockNode) String() string {
	return m.Type
}

// Test helpers for logical operations
type BoolEvaluator struct {
	Value bool
}

func (b *BoolEvaluator) Eval(context any) any {
	return b.Value
}

func TestCondition_EvalLogicalOperators(t *testing.T) {
	// Create boolean evaluators
	trueNode := &BoolEvaluator{Value: true}
	falseNode := &BoolEvaluator{Value: false}

	tests := []struct {
		name     string
		op       string
		lvalue   any
		rvalue   any
		negate   bool
		expected bool
	}{
		{"true and true", "and", trueNode, trueNode, false, true},
		{"true and false", "and", trueNode, falseNode, false, false},
		{"false and true", "and", falseNode, trueNode, false, false},
		{"false and false", "and", falseNode, falseNode, false, false},
		{"negated (true and true)", "and", trueNode, trueNode, true, false},
		
		{"true or true", "or", trueNode, trueNode, false, true},
		{"true or false", "or", trueNode, falseNode, false, true},
		{"false or true", "or", falseNode, trueNode, false, true},
		{"false or false", "or", falseNode, falseNode, false, false},
		{"negated (false or false)", "or", falseNode, falseNode, true, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			condition := NewCondition(tt.op, tt.lvalue, tt.rvalue, 0, tt.negate)
			result := condition.Eval(nil)
			if result != tt.expected {
				t.Errorf("Expected %v, got %v", tt.expected, result)
			}
		})
	}
}

func TestCondition_EvalComparisonOperators(t *testing.T) {
	// Numeric test values
	one := NewMockNode(1, "Dimension")
	two := NewMockNode(2, "Dimension")
	anotherTwo := NewMockNode(2, "Dimension")
	
	// String test values
	aStr := NewMockNode("a", "Quoted")
	bStr := NewMockNode("b", "Quoted")
	anotherAStr := NewMockNode("a", "Quoted")
	
	// Different type value
	oneKeyword := NewMockNode(1, "Keyword")

	// Mock comparisons that should pass
	mockCompareTrue := []struct {
		name   string
		op     string
		lvalue *MockNode
		rvalue *MockNode
	}{
		{"1 < 2", "<", one, two},
		{"1 <= 2", "<=", one, two},
		{"2 <= 2", "<=", two, anotherTwo},
		{"1 =< 2", "=<", one, two},
		{"2 =< 2", "=<", two, anotherTwo},
		{"2 = 2", "=", two, anotherTwo},
		{"2 >= 1", ">=", two, one},
		{"2 >= 2", ">=", two, anotherTwo},
		{"2 > 1", ">", two, one},
		{"a < b", "<", aStr, bStr},
		{"a = a", "=", aStr, anotherAStr},
		{"b > a", ">", bStr, aStr},
	}

	// Mock comparisons that should fail
	mockCompareFalse := []struct {
		name   string
		op     string
		lvalue *MockNode
		rvalue *MockNode
	}{
		{"2 < 1", "<", two, one},
		{"2 < 2", "<", two, anotherTwo},
		{"2 <= 1", "<=", two, one},
		{"2 =< 1", "=<", two, one},
		{"1 = 2", "=", one, two},
		{"1 >= 2", ">=", one, two},
		{"1 > 2", ">", one, two},
		{"2 > 2", ">", two, anotherTwo},
		{"1(dimension) = 1(keyword)", "=", one, oneKeyword},
	}

	// Test successful comparisons
	for _, tt := range mockCompareTrue {
		t.Run(tt.name, func(t *testing.T) {
			condition := NewCondition(tt.op, tt.lvalue.Node, tt.rvalue.Node, 0, false)
			result := condition.Eval(nil)
			if result != true {
				t.Errorf("Expected true for %s, got %v", tt.name, result)
			}
		})
	}

	// Test failed comparisons
	for _, tt := range mockCompareFalse {
		t.Run(tt.name, func(t *testing.T) {
			condition := NewCondition(tt.op, tt.lvalue.Node, tt.rvalue.Node, 0, false)
			result := condition.Eval(nil)
			if result != false {
				t.Errorf("Expected false for %s, got %v", tt.name, result)
			}
		})
	}

	// Test negation
	t.Run("!(1 < 2)", func(t *testing.T) {
		condition := NewCondition("<", one.Node, two.Node, 0, true)
		result := condition.Eval(nil)
		if result != false {
			t.Errorf("Expected false for negated '1 < 2', got %v", result)
		}
	})
}

func TestDifferentTypes(t *testing.T) {
	// Test that different MockNode types are not considered equal
	dimension := NewMockNode(1, "Dimension")
	keyword := NewMockNode(1, "Keyword")

	// Verify the types are actually different in our objects
	if reflect.TypeOf(dimension) == reflect.TypeOf(keyword) {
		t.Logf("Types correctly match: both are %T", dimension)
	}
	
	if dimension.Type == keyword.Type {
		t.Errorf("Types should be different: %s vs %s", dimension.Type, keyword.Type)
	}

	// Direct comparison isn't reliable since Compare might return 0
	// even for different types - we rely on Condition to handle that
	result := Compare(dimension.Node, keyword.Node)
	t.Logf("Compare result: %d", result)

	// The important part is that Condition evaluates correctly
	condition := NewCondition("=", dimension.Node, keyword.Node, 0, false)
	condResult := condition.Eval(nil)
	if condResult {
		t.Error("Condition with different types should evaluate to false for equality")
	} else {
		t.Logf("Condition correctly evaluated to false for different types")
	}
}

func TestCondition_Accept(t *testing.T) {
	// Create a custom visitor to update the mockNode values
	visitCount := 0
	visitor := &testVisitor{
		visitFunc: func(node any) any {
			visitCount++
			if nodeVal, ok := node.(*Node); ok {
				if mockNode, ok := nodeVal.Value.(*MockNode); ok {
					if val, ok := mockNode.Value.(int); ok {
						newMock := NewMockNode(val+10, mockNode.Type)
						return newMock.Node
					}
				}
			}
			return node
		},
	}

	// Create and test the condition
	lvalue := NewMockNode(1, "Dimension")
	rvalue := NewMockNode(2, "Dimension")
	condition := NewCondition(">", lvalue.Node, rvalue.Node, 0, false)
	
	// Call Accept with the visitor
	condition.Accept(visitor)
	
	// Check visit count
	if visitCount != 2 {
		t.Errorf("Expected 2 visits, got %d", visitCount)
	}
	
	// Verify the values were updated
	lnode, ok := condition.Lvalue.(*Node)
	if !ok {
		t.Fatalf("Expected lvalue to be *Node, got %T", condition.Lvalue)
	}
	
	lmock, ok := lnode.Value.(*MockNode)
	if !ok {
		t.Fatalf("Expected lnode.Value to be *MockNode, got %T", lnode.Value)
	}
	
	if lval, ok := lmock.Value.(int); !ok || lval != 11 {
		t.Errorf("Expected lvalue to have value 11, got %v", lmock.Value)
	}
	
	rnode, ok := condition.Rvalue.(*Node)
	if !ok {
		t.Fatalf("Expected rvalue to be *Node, got %T", condition.Rvalue)
	}
	
	rmock, ok := rnode.Value.(*MockNode)
	if !ok {
		t.Fatalf("Expected rnode.Value to be *MockNode, got %T", rnode.Value)
	}
	
	if rval, ok := rmock.Value.(int); !ok || rval != 12 {
		t.Errorf("Expected rvalue to have value 12, got %v", rmock.Value)
	}
}

func TestCondition_Properties(t *testing.T) {
	// Verify constructor properties are stored correctly
	lvalue := NewMockNode(1, "Dimension")
	rvalue := NewMockNode(2, "Dimension")
	condition := NewCondition(" > ", lvalue.Node, rvalue.Node, 5, true)

	if condition.Op != ">" {
		t.Errorf("Expected trimmed op '>', got '%s'", condition.Op)
	}

	if condition.Lvalue != lvalue.Node {
		t.Errorf("Expected lvalue to be %v, got %v", lvalue.Node, condition.Lvalue)
	}

	if condition.Rvalue != rvalue.Node {
		t.Errorf("Expected rvalue to be %v, got %v", rvalue.Node, condition.Rvalue)
	}

	if condition.Index != 5 {
		t.Errorf("Expected index to be 5, got %d", condition.Index)
	}

	if !condition.Negate {
		t.Errorf("Expected negate to be true, got %v", condition.Negate)
	}
} 