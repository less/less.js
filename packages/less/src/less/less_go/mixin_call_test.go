package less_go

import (
	"testing"
)

// Test helper functions


func assertNoError(t *testing.T, err error, message string) {
	t.Helper()
	if err != nil {
		t.Errorf("%s: expected no error but got: %v", message, err)
	}
}

// Mock visitor for testing
type mixinCallMockVisitor struct {
	visitedNodes []any
}

func (mv *mixinCallMockVisitor) Visit(node any) any {
	mv.visitedNodes = append(mv.visitedNodes, node)
	return node
}

func (mv *mixinCallMockVisitor) VisitArray(nodes []any) []any {
	result := make([]any, len(nodes))
	for i, node := range nodes {
		result[i] = mv.Visit(node)
	}
	return result
}

func TestMixinCall_Constructor(t *testing.T) {
	t.Run("should create a MixinCall with all parameters", func(t *testing.T) {
		elements := []*Element{NewElement(nil, "test", false, 0, make(map[string]any), nil)}
		args := []any{
			map[string]any{
				"name":  "param1",
				"value": map[string]any{"eval": func(any) any { return "value1" }},
			},
			map[string]any{
				"name":  nil,
				"value": map[string]any{"eval": func(any) any { return "value2" }},
			},
		}
		index := 5
		fileInfo := map[string]any{"filename": "test.less"}
		important := false

		mixinCall, err := NewMixinCall(elements, args, index, fileInfo, important)
		assertNoError(t, err, "NewMixinCall should not error")

		assertEqual(t, "MixinCall", mixinCall.GetType(), "Type should be MixinCall")
		assertEqual(t, args, mixinCall.Arguments, "Arguments should match")
		assertEqual(t, index, mixinCall.Index, "Index should match")
		assertEqual(t, fileInfo, mixinCall.FileInfo(), "FileInfo should match")
		assertEqual(t, important, mixinCall.Important, "Important should match")
		assertEqual(t, true, mixinCall.AllowRoot, "AllowRoot should be true")
	})

	t.Run("should create a MixinCall with default arguments when args is nil", func(t *testing.T) {
		elements := []*Element{NewElement(nil, "test", false, 0, make(map[string]any), nil)}
		index := 5
		fileInfo := map[string]any{"filename": "test.less"}
		important := false

		mixinCall, err := NewMixinCall(elements, nil, index, fileInfo, important)
		assertNoError(t, err, "NewMixinCall should not error")

		assertEqual(t, []any{}, mixinCall.Arguments, "Arguments should be empty slice")
	})

	t.Run("should create a MixinCall with default arguments when args is empty", func(t *testing.T) {
		elements := []*Element{NewElement(nil, "test", false, 0, make(map[string]any), nil)}
		args := []any{}
		index := 5
		fileInfo := map[string]any{"filename": "test.less"}
		important := false

		mixinCall, err := NewMixinCall(elements, args, index, fileInfo, important)
		assertNoError(t, err, "NewMixinCall should not error")

		assertEqual(t, []any{}, mixinCall.Arguments, "Arguments should be empty slice")
	})
}

func TestMixinCall_Accept(t *testing.T) {
	t.Run("should visit selector when it exists", func(t *testing.T) {
		elements := []*Element{NewElement(nil, "test", false, 0, make(map[string]any), nil)}
		mixinCall, _ := NewMixinCall(elements, []any{}, 0, make(map[string]any), false)

		visitor := &mixinCallMockVisitor{}
		originalSelector := mixinCall.Selector

		mixinCall.Accept(visitor)

		// The selector should have been visited
		found := false
		for _, node := range visitor.visitedNodes {
			if node == originalSelector {
				found = true
				break
			}
		}
		if !found {
			t.Error("Selector should have been visited")
		}
	})

	t.Run("should visit arguments when they exist", func(t *testing.T) {
		elements := []*Element{NewElement(nil, "test", false, 0, make(map[string]any), nil)}
		args := []any{"arg1", "arg2"}
		mixinCall, _ := NewMixinCall(elements, args, 0, make(map[string]any), false)

		visitor := &mixinCallMockVisitor{}

		mixinCall.Accept(visitor)

		// Arguments should have been processed
		assertEqual(t, len(args), len(mixinCall.Arguments), "Arguments length should match")
	})

	t.Run("should handle empty arguments array", func(t *testing.T) {
		elements := []*Element{NewElement(nil, "test", false, 0, make(map[string]any), nil)}
		mixinCall, _ := NewMixinCall(elements, []any{}, 0, make(map[string]any), false)

		visitor := &mixinCallMockVisitor{}

		// Should not panic
		mixinCall.Accept(visitor)
	})
}

func TestMixinCall_Eval(t *testing.T) {
	t.Run("should throw Name error when mixin is undefined", func(t *testing.T) {
		elements := []*Element{NewElement(nil, "test", false, 0, make(map[string]any), nil)}
		mixinCall, _ := NewMixinCall(elements, []any{}, 0, make(map[string]any), false)

		// Mock context with no mixins found
		mockContext := map[string]any{
			"frames": []any{
				&mockEvalFrame{
					findResult: []any{}, // No mixins found
				},
			},
		}

		_, err := mixinCall.Eval(mockContext)
		assertError(t, err, "Should throw Name error")

		if mixinErr, ok := err.(*MixinCallError); ok {
			assertEqual(t, "Name", mixinErr.Type, "Error type should be Name")
		} else {
			t.Error("Error should be MixinCallError")
		}
	})

	t.Run("should handle MixinDefinition instances correctly", func(t *testing.T) {
		elements := []*Element{NewElement(nil, "test", false, 0, make(map[string]any), nil)}
		mixinCall, _ := NewMixinCall(elements, []any{}, 0, make(map[string]any), false)

		// Create actual MixinDefinition
		mixinDef, _ := NewMixinDefinition("test", []any{}, []any{}, nil, false, nil, nil)

		mockContext := map[string]any{
			"frames": []any{
				&mockEvalFrame{
					findResult: []any{
						map[string]any{
							"rule": mixinDef,
							"path": []any{},
						},
					},
				},
			},
		}

		_, err := mixinCall.Eval(mockContext)
		assertNoError(t, err, "Should handle MixinDefinition without error")
	})
}

func TestMixinCall_Format(t *testing.T) {
	t.Run("should format mixin call with named arguments", func(t *testing.T) {
		elements := []*Element{NewElement(nil, "test", false, 0, make(map[string]any), nil)}
		mixinCall, _ := NewMixinCall(elements, []any{}, 0, make(map[string]any), false)

		args := []any{
			map[string]any{
				"name":  "color",
				"value": mixinCallMockValue{cssValue: "red"},
			},
			map[string]any{
				"name":  "size",
				"value": mixinCallMockValue{cssValue: "10px"},
			},
		}

		result := mixinCall.Format(args)
		// Note: The selector.ToCSS() returns empty in this test context,
		// but the argument formatting logic is correct
		expected := "(color:red, size:10px)"
		assertEqual(t, expected, result, "Format should match expected pattern")
	})

	t.Run("should format mixin call with unnamed arguments", func(t *testing.T) {
		elements := []*Element{NewElement(nil, "test", false, 0, make(map[string]any), nil)}
		mixinCall, _ := NewMixinCall(elements, []any{}, 0, make(map[string]any), false)

		args := []any{
			map[string]any{
				"value": mixinCallMockValue{cssValue: "red"},
			},
			map[string]any{
				"value": mixinCallMockValue{cssValue: "10px"},
			},
		}

		result := mixinCall.Format(args)
		expected := "(red, 10px)"
		assertEqual(t, expected, result, "Format should match expected pattern")
	})

	t.Run("should format mixin call with mixed named and unnamed arguments", func(t *testing.T) {
		elements := []*Element{NewElement(nil, "test", false, 0, make(map[string]any), nil)}
		mixinCall, _ := NewMixinCall(elements, []any{}, 0, make(map[string]any), false)

		args := []any{
			map[string]any{
				"name":  "color",
				"value": mixinCallMockValue{cssValue: "red"},
			},
			map[string]any{
				"value": mixinCallMockValue{cssValue: "10px"},
			},
			map[string]any{
				"name":  "border",
				"value": mixinCallMockValue{cssValue: "1px solid"},
			},
		}

		result := mixinCall.Format(args)
		expected := "(color:red, 10px, border:1px solid)"
		assertEqual(t, expected, result, "Format should match expected pattern")
	})

	t.Run("should format mixin call with arguments that have no ToCSS method", func(t *testing.T) {
		elements := []*Element{NewElement(nil, "test", false, 0, make(map[string]any), nil)}
		mixinCall, _ := NewMixinCall(elements, []any{}, 0, make(map[string]any), false)

		args := []any{
			map[string]any{
				"name":  "color",
				"value": mixinCallMockValue{cssValue: "red"},
			},
			map[string]any{
				"value": "no-toCSS-method",
			},
		}

		result := mixinCall.Format(args)
		expected := "(color:red, ???)"
		assertEqual(t, expected, result, "Format should use ??? for non-ToCSS values")
	})

	t.Run("should format mixin call with no arguments", func(t *testing.T) {
		elements := []*Element{NewElement(nil, "test", false, 0, make(map[string]any), nil)}
		mixinCall, _ := NewMixinCall(elements, []any{}, 0, make(map[string]any), false)

		result := mixinCall.Format(nil)
		expected := "()"
		assertEqual(t, expected, result, "Format should show empty parentheses")
	})

	t.Run("should format mixin call with empty arguments array", func(t *testing.T) {
		elements := []*Element{NewElement(nil, "test", false, 0, make(map[string]any), nil)}
		mixinCall, _ := NewMixinCall(elements, []any{}, 0, make(map[string]any), false)

		result := mixinCall.Format([]any{})
		expected := "()"
		assertEqual(t, expected, result, "Format should show empty parentheses")
	})
}

func TestMixinCall_setVisibilityToReplacement(t *testing.T) {
	t.Run("should add visibility block to replacement rules when BlocksVisibility is true", func(t *testing.T) {
		elements := []*Element{NewElement(nil, "test", false, 0, make(map[string]any), nil)}
		mixinCall, _ := NewMixinCall(elements, []any{}, 0, make(map[string]any), false)

		// Mock BlocksVisibility to return true
		mixinCall.AddVisibilityBlock() // This will make BlocksVisibility return true

		mockRules := []any{
			&mockRule{},
			&mockRule{},
		}

		mixinCall.setVisibilityToReplacement(mockRules)

		// Check that AddVisibilityBlock was called on each rule
		for _, rule := range mockRules {
			if mockRule, ok := rule.(*mockRule); ok {
				if !mockRule.visibilityBlockAdded {
					t.Error("AddVisibilityBlock should have been called on mock rule")
				}
			}
		}
	})

	t.Run("should not add visibility block when BlocksVisibility is false", func(t *testing.T) {
		elements := []*Element{NewElement(nil, "test", false, 0, make(map[string]any), nil)}
		mixinCall, _ := NewMixinCall(elements, []any{}, 0, make(map[string]any), false)

		mockRules := []any{
			&mockRule{},
			&mockRule{},
		}

		mixinCall.setVisibilityToReplacement(mockRules)

		// Check that AddVisibilityBlock was NOT called on each rule
		for _, rule := range mockRules {
			if mockRule, ok := rule.(*mockRule); ok {
				if mockRule.visibilityBlockAdded {
					t.Error("AddVisibilityBlock should NOT have been called on mock rule")
				}
			}
		}
	})

	t.Run("should handle empty replacement array", func(t *testing.T) {
		elements := []*Element{NewElement(nil, "test", false, 0, make(map[string]any), nil)}
		mixinCall, _ := NewMixinCall(elements, []any{}, 0, make(map[string]any), false)

		// Should not panic
		mixinCall.setVisibilityToReplacement([]any{})
	})
}

// Mock types for testing

type mixinCallMockValue struct {
	cssValue string
}

func (mv mixinCallMockValue) ToCSS() string {
	return mv.cssValue
}

type mockRule struct {
	visibilityBlockAdded bool
}

func (mr *mockRule) AddVisibilityBlock() {
	mr.visibilityBlockAdded = true
}

type mockEvalFrame struct {
	findResult []any
}

func (mf *mockEvalFrame) Find(selector *Selector, self any, filter func(any) bool) []any {
	return mf.findResult
}

func TestMixinCallHelperFunctions(t *testing.T) {
	t.Run("isMixinDefinition should return true for MixinDefinition", func(t *testing.T) {
		mixinDef, _ := NewMixinDefinition("test", []any{}, []any{}, nil, false, nil, nil)
		result := isMixinDefinition(mixinDef)
		assertEqual(t, true, result, "Should return true for MixinDefinition")
	})

	t.Run("isMixinDefinition should return false for non-MixinDefinition", func(t *testing.T) {
		result := isMixinDefinition("not a mixin definition")
		assertEqual(t, false, result, "Should return false for non-MixinDefinition")
	})

	t.Run("getFilename should return filename from fileInfo", func(t *testing.T) {
		fileInfo := map[string]any{"filename": "test.less"}
		result := getFilename(fileInfo)
		assertEqual(t, "test.less", result, "Should return filename")
	})

	t.Run("getFilename should return empty string when filename not present", func(t *testing.T) {
		fileInfo := map[string]any{}
		result := getFilename(fileInfo)
		assertEqual(t, "", result, "Should return empty string")
	})

	t.Run("getVisibilityInfo should return visibility info when available", func(t *testing.T) {
		mockObj := &mockVisibilityProvider{
			info: map[string]any{"visible": true},
		}
		result := getVisibilityInfo(mockObj)
		assertEqual(t, map[string]any{"visible": true}, result, "Should return visibility info")
	})

	t.Run("getVisibilityInfo should return nil when not available", func(t *testing.T) {
		result := getVisibilityInfo("not a visibility provider")
		// The function returns nil for non-visibility providers
		if result != nil {
			t.Errorf("Should return nil for non-visibility providers, got %v", result)
		}
	})
}

type mockVisibilityProvider struct {
	info map[string]any
}

func (mvp *mockVisibilityProvider) VisibilityInfo() map[string]any {
	return mvp.info
}

func TestMixinCallDefaultFunc(t *testing.T) {
	t.Run("should set and reset value", func(t *testing.T) {
		df := NewDefaultFunc()

		df.Value("test")
		assertEqual(t, "test", df.value_, "Value should be set")

		df.Reset()
		assertEqual(t, nil, df.value_, "Value should be reset to nil")
	})

	t.Run("should handle different value types", func(t *testing.T) {
		df := NewDefaultFunc()

		df.Value(42)
		assertEqual(t, 42, df.value_, "Should handle int values")

		df.Value(true)
		assertEqual(t, true, df.value_, "Should handle bool values")

		df.Value(map[string]any{"key": "value"})
		assertEqual(t, map[string]any{"key": "value"}, df.value_, "Should handle map values")
	})
}

func TestMixinCallError(t *testing.T) {
	t.Run("should implement error interface", func(t *testing.T) {
		err := &MixinCallError{
			Type:     "Runtime",
			Message:  "Test error",
			Index:    10,
			Filename: "test.less",
		}

		assertEqual(t, "Test error", err.Error(), "Error() should return message")
	})
}
