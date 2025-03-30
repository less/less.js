package tree

import (
	"testing"
)

// MockNode represents a mock node for testing
type MockNode struct {
	*Node
	value interface{}
}

// NewMockNode creates a new MockNode instance
func NewMockNode(value interface{}, nodeType string) *MockNode {
	return &MockNode{
		Node:  NewNode(),
		value: value,
	}
}

// Eval returns the mock node's value
func (m *MockNode) Eval() interface{} {
	return m
}

// Compare implements comparison for MockNode
func (m *MockNode) Compare(other *Node) int {
	if other == nil {
		return 0
	}

	otherValue, ok := other.Value.(*MockNode)
	if !ok {
		return 0
	}

	if m.value == nil || otherValue.value == nil {
		return 0
	}

	// Handle numeric comparison
	if mNum, ok := m.value.(float64); ok {
		if otherNum, ok := otherValue.value.(float64); ok {
			if mNum < otherNum {
				return -1
			} else if mNum > otherNum {
				return 1
			}
			return 0
		}
	}

	// Handle string comparison
	if mStr, ok := m.value.(string); ok {
		if otherStr, ok := otherValue.value.(string); ok {
			if mStr < otherStr {
				return -1
			} else if mStr > otherStr {
				return 1
			}
			return 0
		}
	}

	return 0
}

// ConditionMockVisitor represents a mock visitor for testing conditions
type ConditionMockVisitor struct {
	VisitCount int
}

func (v *ConditionMockVisitor) Visit(node interface{}) interface{} {
	v.VisitCount++
	if m, ok := node.(*MockNode); ok {
		return NewMockNode(m.value, "Mock")
	}
	return node
}

func TestCondition(t *testing.T) {
	// Test data setup
	trueNode := &MockNode{Node: NewNode(), value: true}
	falseNode := &MockNode{Node: NewNode(), value: false}
	one := NewMockNode(1.0, "Dimension")
	two := NewMockNode(2.0, "Dimension")
	anotherTwo := NewMockNode(2.0, "Dimension")
	aStr := NewMockNode("a", "Quoted")
	bStr := NewMockNode("b", "Quoted")
	anotherAStr := NewMockNode("a", "Quoted")

	t.Run("Logical Operators", func(t *testing.T) {
		t.Run("and", func(t *testing.T) {
			tests := []struct {
				name     string
				condition *Condition
				expected bool
			}{
				{"true and true", NewCondition("and", trueNode, trueNode, 0, false), true},
				{"true and false", NewCondition("and", trueNode, falseNode, 0, false), false},
				{"false and true", NewCondition("and", falseNode, trueNode, 0, false), false},
				{"false and false", NewCondition("and", falseNode, falseNode, 0, false), false},
				{"negated true and true", NewCondition("and", trueNode, trueNode, 0, true), false},
			}

			for _, tt := range tests {
				t.Run(tt.name, func(t *testing.T) {
					result := tt.condition.Eval(nil)
					if result != tt.expected {
						t.Errorf("expected %v, got %v", tt.expected, result)
					}
				})
			}
		})

		t.Run("or", func(t *testing.T) {
			tests := []struct {
				name     string
				condition *Condition
				expected bool
			}{
				{"true or true", NewCondition("or", trueNode, trueNode, 0, false), true},
				{"true or false", NewCondition("or", trueNode, falseNode, 0, false), true},
				{"false or true", NewCondition("or", falseNode, trueNode, 0, false), true},
				{"false or false", NewCondition("or", falseNode, falseNode, 0, false), false},
				{"negated false or false", NewCondition("or", falseNode, falseNode, 0, true), true},
			}

			for _, tt := range tests {
				t.Run(tt.name, func(t *testing.T) {
					result := tt.condition.Eval(nil)
					if result != tt.expected {
						t.Errorf("expected %v, got %v", tt.expected, result)
					}
				})
			}
		})
	})

	t.Run("Comparison Operators", func(t *testing.T) {
		t.Run("Numbers", func(t *testing.T) {
			tests := []struct {
				name     string
				condition *Condition
				expected bool
			}{
				{"1 < 2", NewCondition("<", one, two, 0, false), true},
				{"2 < 1", NewCondition("<", two, one, 0, false), false},
				{"2 < 2", NewCondition("<", two, anotherTwo, 0, false), false},
				{"1 <= 2", NewCondition("<=", one, two, 0, false), true},
				{"2 <= 1", NewCondition("<=", two, one, 0, false), false},
				{"2 <= 2", NewCondition("<=", two, anotherTwo, 0, false), true},
				{"1 =< 2", NewCondition("=<", one, two, 0, false), true},
				{"2 =< 1", NewCondition("=<", two, one, 0, false), false},
				{"2 =< 2", NewCondition("=<", two, anotherTwo, 0, false), true},
				{"1 = 2", NewCondition("=", one, two, 0, false), false},
				{"2 = 2", NewCondition("=", two, anotherTwo, 0, false), true},
				{"1 >= 2", NewCondition(">=", one, two, 0, false), false},
				{"2 >= 1", NewCondition(">=", two, one, 0, false), true},
				{"2 >= 2", NewCondition(">=", two, anotherTwo, 0, false), true},
				{"1 > 2", NewCondition(">", one, two, 0, false), false},
				{"2 > 1", NewCondition(">", two, one, 0, false), true},
				{"2 > 2", NewCondition(">", two, anotherTwo, 0, false), false},
			}

			for _, tt := range tests {
				t.Run(tt.name, func(t *testing.T) {
					result := tt.condition.Eval(nil)
					if result != tt.expected {
						t.Errorf("expected %v, got %v", tt.expected, result)
					}
				})
			}
		})

		t.Run("Comparison Operators (Strings)", func(t *testing.T) {
			tests := []struct {
				name     string
				condition *Condition
				expected bool
			}{
				{"a < b", NewCondition("<", aStr, bStr, 0, false), true},
				{"a = a", NewCondition("=", aStr, anotherAStr, 0, false), true},
				{"b > a", NewCondition(">", bStr, aStr, 0, false), true},
				{"a >= a", NewCondition(">=", aStr, anotherAStr, 0, false), true},
				{"a <= a", NewCondition("<=", aStr, anotherAStr, 0, false), true},
			}

			for _, tt := range tests {
				t.Run(tt.name, func(t *testing.T) {
					result := tt.condition.Eval(nil)
					if result != tt.expected {
						t.Errorf("expected %v, got %v", tt.expected, result)
					}
				})
			}

			t.Run("String Edge Cases", func(t *testing.T) {
				empty1 := NewMockNode("", "Quoted")
				empty2 := NewMockNode("", "Quoted")
				nonEmpty := NewMockNode("a", "Quoted")

				tests := []struct {
					name     string
					condition *Condition
					expected bool
				}{
					{"empty = empty", NewCondition("=", empty1, empty2, 0, false), true},
					{"empty = non-empty", NewCondition("=", empty1, nonEmpty, 0, false), false},
				}

				for _, tt := range tests {
					t.Run(tt.name, func(t *testing.T) {
						result := tt.condition.Eval(nil)
						if result != tt.expected {
							t.Errorf("expected %v, got %v", tt.expected, result)
						}
					})
				}
			})

			t.Run("Special Characters", func(t *testing.T) {
				special1 := NewMockNode("a@#$%", "Quoted")
				special2 := NewMockNode("a@#$%", "Quoted")
				different := NewMockNode("b@#$%", "Quoted")

				tests := []struct {
					name     string
					condition *Condition
					expected bool
				}{
					{"special = special", NewCondition("=", special1, special2, 0, false), true},
					{"special = different", NewCondition("=", special1, different, 0, false), false},
				}

				for _, tt := range tests {
					t.Run(tt.name, func(t *testing.T) {
						result := tt.condition.Eval(nil)
						if result != tt.expected {
							t.Errorf("expected %v, got %v", tt.expected, result)
						}
					})
				}
			})
		})
	})

	t.Run("Edge Cases and Special Values", func(t *testing.T) {
		nullNode := NewMockNode(nil, "Null")
		undefinedNode := NewMockNode(nil, "Undefined")
		largeNumber := NewMockNode(float64(1<<53-1), "Dimension")
		negativeNumber := NewMockNode(-1.0, "Dimension")
		zero := NewMockNode(0.0, "Dimension")

		tests := []struct {
			name     string
			condition *Condition
			expected bool
		}{
			{"null = null", NewCondition("=", nullNode, nullNode, 0, false), true},
			{"undefined = undefined", NewCondition("=", undefinedNode, undefinedNode, 0, false), true},
			{"large number > zero", NewCondition(">", largeNumber, zero, 0, false), true},
			{"negative number < zero", NewCondition("<", negativeNumber, zero, 0, false), true},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				result := tt.condition.Eval(nil)
				if result != tt.expected {
					t.Errorf("expected %v, got %v", tt.expected, result)
				}
			})
		}
	})

	t.Run("Type Coercion and Compatibility", func(t *testing.T) {
		numberNode := NewMockNode(1.0, "Dimension")
		stringNumber := NewMockNode("1", "Quoted")
		keywordNode := NewMockNode("test", "Keyword")
		colorNode := NewMockNode("#000000", "Color")

		tests := []struct {
			name     string
			condition *Condition
			expected bool
		}{
			{"number = string", NewCondition("=", numberNode, stringNumber, 0, false), false},
			{"keyword = keyword", NewCondition("=", keywordNode, keywordNode, 0, false), true},
			{"color = color", NewCondition("=", colorNode, colorNode, 0, false), true},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				result := tt.condition.Eval(nil)
				if result != tt.expected {
					t.Errorf("expected %v, got %v", tt.expected, result)
				}
			})
		}
	})

	t.Run("Error Cases", func(t *testing.T) {
		tests := []struct {
			name     string
			condition *Condition
			expected bool
		}{
			{"invalid operator", NewCondition("invalid", one, two, 0, false), false},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				result := tt.condition.Eval(nil)
				if result != tt.expected {
					t.Errorf("expected %v, got %v", tt.expected, result)
				}
			})
		}
	})

	t.Run("Accept", func(t *testing.T) {
		lvalue := NewMockNode(1.0, "Mock")
		rvalue := NewMockNode(2.0, "Mock")
		condition := NewCondition(">", lvalue, rvalue, 0, false)

		visitor := &ConditionMockVisitor{}
		condition.Accept(visitor)

		if visitor.VisitCount != 2 {
			t.Errorf("expected visit count 2, got %d", visitor.VisitCount)
		}
	})

	t.Run("Properties", func(t *testing.T) {
		lvalue := NewMockNode(1.0, "Mock")
		rvalue := NewMockNode(2.0, "Mock")
		condition := NewCondition(" > ", lvalue, rvalue, 5, true)

		if condition.Op != ">" {
			t.Errorf("expected op '>', got '%s'", condition.Op)
		}
		if condition.LValue != lvalue {
			t.Error("LValue not set correctly")
		}
		if condition.RValue != rvalue {
			t.Error("RValue not set correctly")
		}
		if condition.Index != 5 {
			t.Errorf("expected index 5, got %d", condition.Index)
		}
		if !condition.Negate {
			t.Error("Negate not set correctly")
		}
		if condition.Type() != "Condition" {
			t.Errorf("expected type 'Condition', got '%s'", condition.Type())
		}
	})
} 