package tree

import (
	"testing"
)

func TestAnonymous(t *testing.T) {
	t.Run("constructor", func(t *testing.T) {
		t.Run("should create an instance with default values", func(t *testing.T) {
			anonymous := NewAnonymous("test", 0, nil, false, false, nil)
			if anonymous.Value != "test" {
				t.Errorf("Expected value to be 'test', got %v", anonymous.Value)
			}
			if anonymous.Index != 0 {
				t.Errorf("Expected index to be 0, got %v", anonymous.Index)
			}
			if anonymous.FileInfo != nil {
				t.Errorf("Expected fileInfo to be nil, got %v", anonymous.FileInfo)
			}
			if anonymous.MapLines {
				t.Error("Expected mapLines to be false")
			}
			if anonymous.RulesetLike {
				t.Error("Expected rulesetLike to be false")
			}
			if !anonymous.AllowRoot {
				t.Error("Expected allowRoot to be true")
			}
		})

		t.Run("should create an instance with all parameters", func(t *testing.T) {
			fileInfo := map[string]interface{}{"filename": "test.less"}
			visibilityInfo := map[string]interface{}{
				"visibilityBlocks": 1,
				"nodeVisible":     true,
			}
			anonymous := NewAnonymous("test", 1, fileInfo, true, true, visibilityInfo)

			if anonymous.Value != "test" {
				t.Errorf("Expected value to be 'test', got %v", anonymous.Value)
			}
			if anonymous.Index != 1 {
				t.Errorf("Expected index to be 1, got %v", anonymous.Index)
			}
			if anonymous.FileInfo["filename"] != "test.less" {
				t.Errorf("Expected fileInfo to contain 'test.less', got %v", anonymous.FileInfo)
			}
			if !anonymous.MapLines {
				t.Error("Expected mapLines to be true")
			}
			if !anonymous.RulesetLike {
				t.Error("Expected rulesetLike to be true")
			}
			if !anonymous.AllowRoot {
				t.Error("Expected allowRoot to be true")
			}
			if anonymous.VisibilityBlocks == nil || *anonymous.VisibilityBlocks != 1 {
				t.Errorf("Expected visibilityBlocks to be 1, got %v", anonymous.VisibilityBlocks)
			}
			if anonymous.NodeVisible == nil || !*anonymous.NodeVisible {
				t.Error("Expected nodeVisible to be true")
			}
		})
	})

	t.Run("eval", func(t *testing.T) {
		t.Run("should return a new Anonymous instance with same properties", func(t *testing.T) {
			original := NewAnonymous("test", 1, map[string]interface{}{"filename": "test.less"}, false, false, nil)
			evaluated := original.Eval()

			if evaluated == nil {
				t.Fatal("Expected evaluated to not be nil")
			}

			evalAnon, ok := evaluated.(*Anonymous)
			if !ok {
				t.Fatal("Expected evaluated to be of type Anonymous")
			}

			if evalAnon.Value != original.Value {
				t.Errorf("Expected value to be %v, got %v", original.Value, evalAnon.Value)
			}
			if evalAnon.Index != original.Index {
				t.Errorf("Expected index to be %v, got %v", original.Index, evalAnon.Index)
			}
			if evalAnon.FileInfo["filename"] != original.FileInfo["filename"] {
				t.Errorf("Expected fileInfo to be %v, got %v", original.FileInfo, evalAnon.FileInfo)
			}
			if evalAnon.MapLines != original.MapLines {
				t.Errorf("Expected mapLines to be %v, got %v", original.MapLines, evalAnon.MapLines)
			}
			if evalAnon.RulesetLike != original.RulesetLike {
				t.Errorf("Expected rulesetLike to be %v, got %v", original.RulesetLike, evalAnon.RulesetLike)
			}
		})
	})

	t.Run("compare", func(t *testing.T) {
		t.Run("should return 0 when comparing with identical Anonymous node", func(t *testing.T) {
			a := NewAnonymous("test", 0, nil, false, false, nil)
			b := NewAnonymous("test", 0, nil, false, false, nil)
			result := a.Compare(b)
			if result != 0 {
				t.Errorf("Expected compare to return 0, got %v", result)
			}
		})

		t.Run("should return nil when comparing with different Anonymous node", func(t *testing.T) {
			a := NewAnonymous("test1", 0, nil, false, false, nil)
			b := NewAnonymous("test2", 0, nil, false, false, nil)
			result := a.Compare(b)
			if result != nil {
				t.Errorf("Expected compare to return nil, got %v", result)
			}
		})

		t.Run("should return nil when comparing with non-Anonymous node", func(t *testing.T) {
			a := NewAnonymous("test", 0, nil, false, false, nil)
			b := NewNode()
			result := a.Compare(b)
			if result != nil {
				t.Errorf("Expected compare to return nil, got %v", result)
			}
		})

		t.Run("should compare CSS output correctly", func(t *testing.T) {
			a := NewAnonymous("test", 0, nil, false, false, nil)
			b := NewAnonymous("test", 0, nil, false, false, nil)
			result := a.Compare(b)
			if result != 0 {
				t.Errorf("Expected compare to return 0 for identical CSS output, got %v", result)
			}

			c := NewAnonymous("different", 0, nil, false, false, nil)
			result = a.Compare(c)
			if result != nil {
				t.Errorf("Expected compare to return nil for different CSS output, got %v", result)
			}
		})
	})

	t.Run("isRulesetLike", func(t *testing.T) {
		t.Run("should return true when rulesetLike is true", func(t *testing.T) {
			anonymous := NewAnonymous("test", 0, nil, false, true, nil)
			if !anonymous.IsRulesetLike() {
				t.Error("Expected isRulesetLike to return true")
			}
		})

		t.Run("should return false when rulesetLike is false", func(t *testing.T) {
			anonymous := NewAnonymous("test", 0, nil, false, false, nil)
			if anonymous.IsRulesetLike() {
				t.Error("Expected isRulesetLike to return false")
			}
		})
	})

	t.Run("genCSS", func(t *testing.T) {
		t.Run("should add value to output when node is visible", func(t *testing.T) {
			anonymous := NewAnonymous("test", 0, nil, false, false, map[string]interface{}{
				"visibilityBlocks": 0,
				"nodeVisible":     true,
			})
			output := &CSSOutput{
				Add: func(chunk interface{}, fileInfo interface{}, index interface{}) {
					if chunk != "test" {
						t.Errorf("Expected chunk to be 'test', got %v", chunk)
					}
				},
			}
			anonymous.GenCSS(nil, output)
		})

		t.Run("should not add value to output when node is not visible", func(t *testing.T) {
			anonymous := NewAnonymous("", 0, nil, false, false, map[string]interface{}{
				"visibilityBlocks": 0,
				"nodeVisible":     false,
			})
			output := &CSSOutput{
				Add: func(chunk interface{}, fileInfo interface{}, index interface{}) {
					t.Error("Expected Add not to be called")
				},
			}
			anonymous.GenCSS(nil, output)
		})

		t.Run("should always set visibility based on value", func(t *testing.T) {
			// Test with non-empty value
			anon1 := NewAnonymous("test", 0, nil, false, false, nil)
			output1 := &CSSOutput{
				Add: func(chunk interface{}, fileInfo interface{}, index interface{}) {},
			}
			anon1.GenCSS(nil, output1)
			if anon1.NodeVisible == nil || !*anon1.NodeVisible {
				t.Error("Expected nodeVisible to be true for non-empty value")
			}

			// Test with empty string value
			anon2 := NewAnonymous("", 0, nil, false, false, nil)
			output2 := &CSSOutput{
				Add: func(chunk interface{}, fileInfo interface{}, index interface{}) {},
			}
			anon2.GenCSS(nil, output2)
			if anon2.NodeVisible == nil || *anon2.NodeVisible {
				t.Error("Expected nodeVisible to be false for empty string value")
			}

			// Test with nil value
			anon3 := NewAnonymous(nil, 0, nil, false, false, nil)
			output3 := &CSSOutput{
				Add: func(chunk interface{}, fileInfo interface{}, index interface{}) {},
			}
			anon3.GenCSS(nil, output3)
			if anon3.NodeVisible != nil {
				t.Error("Expected nodeVisible to be nil for nil value")
			}
		})
	})

	t.Run("visibility handling", func(t *testing.T) {
		t.Run("should copy visibility info correctly", func(t *testing.T) {
			anonymous := NewAnonymous("test", 0, nil, false, false, nil)
			visibilityInfo := map[string]interface{}{
				"visibilityBlocks": 2,
				"nodeVisible":     true,
			}
			anonymous.CopyVisibilityInfo(visibilityInfo)
			if anonymous.VisibilityBlocks == nil || *anonymous.VisibilityBlocks != 2 {
				t.Errorf("Expected visibilityBlocks to be 2, got %v", anonymous.VisibilityBlocks)
			}
			if anonymous.NodeVisible == nil || !*anonymous.NodeVisible {
				t.Error("Expected nodeVisible to be true")
			}
		})

		t.Run("should handle nil visibility info", func(t *testing.T) {
			anonymous := NewAnonymous("test", 0, nil, false, false, nil)
			anonymous.CopyVisibilityInfo(nil)
			if anonymous.VisibilityBlocks != nil {
				t.Error("Expected visibilityBlocks to be nil")
			}
			if anonymous.NodeVisible != nil {
				t.Error("Expected nodeVisible to be nil")
			}
		})
	})

	t.Run("edge cases", func(t *testing.T) {
		t.Run("should handle nil value", func(t *testing.T) {
			anonymous := NewAnonymous(nil, 0, nil, false, false, nil)
			if anonymous.Value != nil {
				t.Error("Expected value to be nil")
			}
			if anonymous.NodeVisible != nil {
				t.Error("Expected nodeVisible to be nil")
			}
		})

		t.Run("should handle empty string value", func(t *testing.T) {
			anonymous := NewAnonymous("", 0, nil, false, false, nil)
			if anonymous.Value != "" {
				t.Error("Expected value to be empty string")
			}
			if anonymous.NodeVisible != nil {
				t.Error("Expected nodeVisible to be nil")
			}
		})
	})

	t.Run("visibility methods", func(t *testing.T) {
		t.Run("should handle blocksVisibility correctly", func(t *testing.T) {
			anonymous := NewAnonymous("test", 0, nil, false, false, nil)
			if anonymous.BlocksVisibility() {
				t.Error("Expected blocksVisibility to return false")
			}
			one := 1
			anonymous.VisibilityBlocks = &one
			if !anonymous.BlocksVisibility() {
				t.Error("Expected blocksVisibility to return true")
			}
		})

		t.Run("should handle addVisibilityBlock correctly", func(t *testing.T) {
			anonymous := NewAnonymous("test", 0, nil, false, false, nil)
			anonymous.AddVisibilityBlock()
			if anonymous.VisibilityBlocks == nil || *anonymous.VisibilityBlocks != 1 {
				t.Errorf("Expected visibilityBlocks to be 1, got %v", anonymous.VisibilityBlocks)
			}
			anonymous.AddVisibilityBlock()
			if anonymous.VisibilityBlocks == nil || *anonymous.VisibilityBlocks != 2 {
				t.Errorf("Expected visibilityBlocks to be 2, got %v", anonymous.VisibilityBlocks)
			}
		})

		t.Run("should copy visibility info in eval", func(t *testing.T) {
			visibilityInfo := map[string]interface{}{
				"visibilityBlocks": 2,
				"nodeVisible":     true,
			}
			original := NewAnonymous("test", 0, nil, false, false, visibilityInfo)
			evaluated := original.Eval()

			if evaluated == nil {
				t.Fatal("Expected evaluated to not be nil")
			}

			evalAnon, ok := evaluated.(*Anonymous)
			if !ok {
				t.Fatal("Expected evaluated to be of type Anonymous")
			}

			if evalAnon.VisibilityBlocks == nil || *evalAnon.VisibilityBlocks != 2 {
				t.Errorf("Expected visibilityBlocks to be 2, got %v", evalAnon.VisibilityBlocks)
			}
			if evalAnon.NodeVisible == nil || !*evalAnon.NodeVisible {
				t.Error("Expected nodeVisible to be true")
			}
		})
	})
} 