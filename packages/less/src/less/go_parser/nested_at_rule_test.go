package go_parser

import (
	"reflect"
	"testing"
)

// Mock visitor for testing nested at-rule
type nestableAtRuleVisitor struct {
	visitFunc      func(any) any
	visitArrayFunc func([]any) []any
}

func (m *nestableAtRuleVisitor) Visit(node any) any {
	if m.visitFunc != nil {
		return m.visitFunc(node)
	}
	return node
}

func (m *nestableAtRuleVisitor) VisitArray(nodes []any) []any {
	if m.visitArrayFunc != nil {
		return m.visitArrayFunc(nodes)
	}
	return nodes
}

func TestNestableAtRulePrototype(t *testing.T) {
	var atRule *NestableAtRulePrototype
	var mockContext map[string]any
	var visitor *nestableAtRuleVisitor

	setup := func() {
		atRule = NewNestableAtRulePrototype()
		atRule.Type = "Media"
		atRule.Features = nil
		atRule.Rules = nil
		atRule.Index = 0
		atRule.SetFileInfo(map[string]any{"filename": "test.less"})

		mockContext = map[string]any{
			"mediaBlocks": []any{},
			"mediaPath":   []any{},
		}

		visitor = &nestableAtRuleVisitor{}
	}

	t.Run("IsRulesetLike", func(t *testing.T) {
		setup()
		if !atRule.IsRulesetLike() {
			t.Error("Expected IsRulesetLike to return true")
		}
	})

	t.Run("Accept", func(t *testing.T) {
		t.Run("should visit features if they exist", func(t *testing.T) {
			setup()
			mockFeatures := map[string]any{"type": "Value"}
			visitedFeatures := map[string]any{"type": "Value", "visited": true}

			atRule.Features = mockFeatures
			visitor.visitFunc = func(node any) any {
				if reflect.DeepEqual(node, mockFeatures) {
					return visitedFeatures
				}
				return node
			}

			atRule.Accept(visitor)

			if !reflect.DeepEqual(atRule.Features, visitedFeatures) {
				t.Errorf("Expected features to be visited. Got %v", atRule.Features)
			}
		})

		t.Run("should visit rules if they exist", func(t *testing.T) {
			setup()
			mockRules := []any{map[string]any{"type": "Rule"}}
			visitedRules := []any{map[string]any{"type": "Rule", "visited": true}}

			atRule.Rules = mockRules
			visitor.visitArrayFunc = func(nodes []any) []any {
				if reflect.DeepEqual(nodes, mockRules) {
					return visitedRules
				}
				return nodes
			}

			atRule.Accept(visitor)

			if !reflect.DeepEqual(atRule.Rules, visitedRules) {
				t.Errorf("Expected rules to be visited. Got %v", atRule.Rules)
			}
		})

		t.Run("should handle null features and rules", func(t *testing.T) {
			setup()
			atRule.Features = nil
			atRule.Rules = nil

			// Should not panic
			atRule.Accept(visitor)
		})

		t.Run("should visit both features and rules when both exist", func(t *testing.T) {
			setup()
			mockFeatures := map[string]any{"type": "Value"}
			mockRules := []any{map[string]any{"type": "Rule"}}
			visitedFeatures := map[string]any{"type": "Value", "visited": true}
			visitedRules := []any{map[string]any{"type": "Rule", "visited": true}}

			atRule.Features = mockFeatures
			atRule.Rules = mockRules

			visitor.visitFunc = func(node any) any {
				if reflect.DeepEqual(node, mockFeatures) {
					return visitedFeatures
				}
				return node
			}
			visitor.visitArrayFunc = func(nodes []any) []any {
				if reflect.DeepEqual(nodes, mockRules) {
					return visitedRules
				}
				return nodes
			}

			atRule.Accept(visitor)

			if !reflect.DeepEqual(atRule.Features, visitedFeatures) {
				t.Errorf("Expected features to be visited")
			}
			if !reflect.DeepEqual(atRule.Rules, visitedRules) {
				t.Errorf("Expected rules to be visited")
			}
		})
	})

	t.Run("EvalTop", func(t *testing.T) {
		t.Run("should return itself when mediaBlocks length is 1 or less", func(t *testing.T) {
			setup()
			mockContext["mediaBlocks"] = []any{}
			result := atRule.EvalTop(mockContext)
			if result != atRule {
				t.Error("Expected result to be atRule itself")
			}
		})

		t.Run("should return itself when mediaBlocks length is exactly 1", func(t *testing.T) {
			setup()
			mockContext["mediaBlocks"] = []any{map[string]any{"type": "Media"}}
			result := atRule.EvalTop(mockContext)
			if result != atRule {
				t.Error("Expected result to be atRule itself")
			}
		})

		t.Run("should create new Ruleset when mediaBlocks length > 1", func(t *testing.T) {
			setup()
			mockMediaBlocks := []any{
				map[string]any{"type": "Media", "name": "block1"},
				map[string]any{"type": "Media", "name": "block2"},
			}
			mockContext["mediaBlocks"] = mockMediaBlocks

			result := atRule.EvalTop(mockContext)

			if ruleset, ok := result.(*Ruleset); ok {
				if !ruleset.MultiMedia {
					t.Error("Expected MultiMedia to be true")
				}
			} else {
				t.Error("Expected result to be a Ruleset")
			}
		})

		t.Run("should delete mediaBlocks and mediaPath from context", func(t *testing.T) {
			setup()
			mockContext["mediaBlocks"] = []any{}
			mockContext["mediaPath"] = []any{}

			atRule.EvalTop(mockContext)

			if _, exists := mockContext["mediaBlocks"]; exists {
				t.Error("Expected mediaBlocks to be deleted from context")
			}
			if _, exists := mockContext["mediaPath"]; exists {
				t.Error("Expected mediaPath to be deleted from context")
			}
		})

		t.Run("should handle context with non-array mediaBlocks", func(t *testing.T) {
			setup()
			mockContext["mediaBlocks"] = "not-an-array"
			result := atRule.EvalTop(mockContext)
			// Should not panic and return original atRule
			if result != atRule {
				t.Error("Expected result to be atRule itself for non-array mediaBlocks")
			}
		})
	})

	t.Run("EvalNested", func(t *testing.T) {
		t.Run("should return this when path contains different type", func(t *testing.T) {
			setup()
			otherTypeNode := &NestableAtRulePrototype{
				Node: NewNode(),
				Type: "Import",
			}
			mockContext["mediaPath"] = []any{otherTypeNode}
			mockContext["mediaBlocks"] = []any{map[string]any{"type": "Media"}}

			result := atRule.EvalNested(mockContext)

			if result != atRule {
				t.Error("Expected result to be atRule itself")
			}
		})

		t.Run("should handle single media path item", func(t *testing.T) {
			setup()
			mediaNode := &NestableAtRulePrototype{
				Node:     NewNode(),
				Type:     "Media",
				Features: "screen",
			}
			mockContext["mediaPath"] = []any{mediaNode}

			result := atRule.EvalNested(mockContext)

			if _, ok := result.(*Ruleset); !ok {
				t.Error("Expected result to be a Ruleset")
			}
		})

		t.Run("should handle multiple media path items", func(t *testing.T) {
			setup()
			mediaNode1 := &NestableAtRulePrototype{
				Node:     NewNode(),
				Type:     "Media",
				Features: "screen",
			}
			mediaNode2 := &NestableAtRulePrototype{
				Node:     NewNode(),
				Type:     "Media",
				Features: "print",
			}
			mockContext["mediaPath"] = []any{mediaNode1, mediaNode2}

			result := atRule.EvalNested(mockContext)

			if _, ok := result.(*Ruleset); !ok {
				t.Error("Expected result to be a Ruleset")
			}
		})

		t.Run("should handle array features", func(t *testing.T) {
			setup()
			mediaNode := &NestableAtRulePrototype{
				Node:     NewNode(),
				Type:     "Media",
				Features: []any{"screen", "print"},
			}
			mockContext["mediaPath"] = []any{mediaNode}

			result := atRule.EvalNested(mockContext)

			if _, ok := result.(*Ruleset); !ok {
				t.Error("Expected result to be a Ruleset")
			}
		})

		t.Run("should handle empty mediaPath", func(t *testing.T) {
			setup()
			mockContext["mediaPath"] = []any{}
			result := atRule.EvalNested(mockContext)

			if result != atRule {
				t.Error("Expected result to be atRule itself for empty mediaPath")
			}
		})

		t.Run("should handle features with null/undefined values", func(t *testing.T) {
			setup()
			mediaNode := &NestableAtRulePrototype{
				Node:     NewNode(),
				Type:     "Media",
				Features: nil,
			}
			mockContext["mediaPath"] = []any{mediaNode}

			result := atRule.EvalNested(mockContext)

			if _, ok := result.(*Ruleset); !ok {
				t.Error("Expected result to be a Ruleset")
			}
		})
	})

	t.Run("Permute", func(t *testing.T) {
		t.Run("should return empty array for empty input", func(t *testing.T) {
			setup()
			result := atRule.Permute([]any{})
			if !reflect.DeepEqual(result, []any{}) {
				t.Errorf("Expected empty array, got %v", result)
			}
		})

		t.Run("should return single item for single element array", func(t *testing.T) {
			setup()
			input := []any{[]any{"a", "b"}}
			result := atRule.Permute(input)
			expected := []any{"a", "b"}
			if !reflect.DeepEqual(result, expected) {
				t.Errorf("Expected %v, got %v", expected, result)
			}
		})

		t.Run("should permute two arrays correctly", func(t *testing.T) {
			setup()
			input := []any{
				[]any{"a", "b"},
				[]any{"1", "2"},
			}
			result := atRule.Permute(input)
			expected := []any{
				[]any{"a", "1"},
				[]any{"b", "1"},
				[]any{"a", "2"},
				[]any{"b", "2"},
			}
			if !reflect.DeepEqual(result, expected) {
				t.Errorf("Expected %v, got %v", expected, result)
			}
		})

		t.Run("should permute three arrays correctly", func(t *testing.T) {
			setup()
			input := []any{[]any{"a"}, []any{"1", "2"}, []any{"x", "y"}}
			result := atRule.Permute(input)
			expected := []any{
				[]any{"a", "1", "x"},
				[]any{"a", "2", "x"},
				[]any{"a", "1", "y"},
				[]any{"a", "2", "y"},
			}
			if !reflect.DeepEqual(result, expected) {
				t.Errorf("Expected %v, got %v", expected, result)
			}
		})

		t.Run("should handle null input", func(t *testing.T) {
			setup()
			result := atRule.Permute(nil)
			if !reflect.DeepEqual(result, []any{}) {
				t.Errorf("Expected empty array for nil input, got %v", result)
			}
		})

		t.Run("should handle array with empty sub-arrays", func(t *testing.T) {
			setup()
			input := []any{[]any{}, []any{"a", "b"}}
			result := atRule.Permute(input)
			if !reflect.DeepEqual(result, []any{}) {
				t.Errorf("Expected empty array for input with empty sub-arrays, got %v", result)
			}
		})
	})

	t.Run("BubbleSelectors", func(t *testing.T) {
		t.Run("should do nothing when selectors is nil", func(t *testing.T) {
			setup()
			atRule.Rules = []any{map[string]any{"type": "Rule"}}
			originalRules := atRule.Rules

			atRule.BubbleSelectors(nil)

			if !reflect.DeepEqual(atRule.Rules, originalRules) {
				t.Error("Expected rules to remain unchanged for nil selectors")
			}
		})

		t.Run("should do nothing when rules is empty", func(t *testing.T) {
			setup()
			selectors := []*Selector{} // empty but not nil
			atRule.Rules = []any{}

			atRule.BubbleSelectors(selectors)

			if len(atRule.Rules) != 0 {
				t.Error("Expected rules to remain empty")
			}
		})

		t.Run("should create new ruleset with selectors and rules", func(t *testing.T) {
			setup()
			// Create a mock selector
			selector, err := NewSelector(nil, nil, nil, 0, map[string]any{}, nil)
			if err != nil {
				t.Fatal(err)
			}
			selectors := []*Selector{selector}
			rules := []any{map[string]any{"type": "Rule"}}
			atRule.Rules = rules

			atRule.BubbleSelectors(selectors)

			if len(atRule.Rules) != 1 {
				t.Errorf("Expected 1 rule after bubbling, got %d", len(atRule.Rules))
			}

			if _, ok := atRule.Rules[0].(*Ruleset); !ok {
				t.Error("Expected first rule to be a Ruleset")
			}
		})
	})

	t.Run("Integration Tests", func(t *testing.T) {
		t.Run("should work with complete media query evaluation", func(t *testing.T) {
			setup()
			mediaNode1 := &NestableAtRulePrototype{
				Node:     NewNode(),
				Type:     "Media",
				Features: "screen",
			}
			mediaNode2 := &NestableAtRulePrototype{
				Node:     NewNode(),
				Type:     "Media",
				Features: "print",
			}
			mockContext["mediaPath"] = []any{mediaNode1, mediaNode2}

			result := atRule.EvalNested(mockContext)

			if _, ok := result.(*Ruleset); !ok {
				t.Error("Expected result to be a Ruleset")
			}
		})

		t.Run("should handle complex permutation scenarios", func(t *testing.T) {
			setup()
			arrays := []any{
				[]any{"a", "b"},
				[]any{"1", "2"},
				[]any{"x", "y", "z"},
			}

			result := atRule.Permute(arrays)

			resultArray, ok := result.([]any)
			if !ok {
				t.Fatal("Expected result to be an array")
			}

			// Should have 2 * 2 * 3 = 12 permutations
			if len(resultArray) != 12 {
				t.Errorf("Expected 12 permutations, got %d", len(resultArray))
			}

			first := resultArray[0].([]any)
			last := resultArray[11].([]any)
			expectedFirst := []any{"a", "1", "x"}
			expectedLast := []any{"b", "2", "z"}

			if !reflect.DeepEqual(first, expectedFirst) {
				t.Errorf("Expected first permutation %v, got %v", expectedFirst, first)
			}
			if !reflect.DeepEqual(last, expectedLast) {
				t.Errorf("Expected last permutation %v, got %v", expectedLast, last)
			}
		})
	})

	t.Run("Error Handling", func(t *testing.T) {
		t.Run("should handle EvalTop with missing context properties", func(t *testing.T) {
			setup()
			incompleteContext := map[string]any{}
			result := atRule.EvalTop(incompleteContext)
			if result != atRule {
				t.Error("Expected result to be atRule itself for incomplete context")
			}
		})

		t.Run("should handle EvalNested with missing context properties", func(t *testing.T) {
			setup()
			incompleteContext := map[string]any{}
			result := atRule.EvalNested(incompleteContext)
			if result != atRule {
				t.Error("Expected result to be atRule itself for incomplete context")
			}
		})

		t.Run("should handle permute with non-array inputs", func(t *testing.T) {
			setup()
			// Should handle gracefully even with unexpected input types
			defer func() {
				if r := recover(); r != nil {
					t.Errorf("Permute should not panic with nil input: %v", r)
				}
			}()
			atRule.Permute(nil)
		})

		t.Run("should handle BubbleSelectors with invalid rules", func(t *testing.T) {
			setup()
			atRule.Rules = nil
			selector, err := NewSelector(nil, nil, nil, 0, map[string]any{}, nil)
			if err != nil {
				t.Fatal(err)
			}
			defer func() {
				if r := recover(); r != nil {
					t.Errorf("BubbleSelectors should not panic with nil rules: %v", r)
				}
			}()
			atRule.BubbleSelectors([]*Selector{selector})
		})

		t.Run("should handle Accept with invalid visitor", func(t *testing.T) {
			setup()
			defer func() {
				if r := recover(); r != nil {
					t.Errorf("Accept should not panic with nil visitor: %v", r)
				}
			}()
			atRule.Accept(nil)
		})
	})
} 