package less_go

import (
	"fmt"
	"testing"
)

func TestMediaConstructor(t *testing.T) {
	t.Run("should create a Media instance with all parameters", func(t *testing.T) {
		value := []any{
			map[string]any{"type": "Declaration", "name": "color", "value": "red"},
		}
		features := []any{map[string]any{"type": "Anonymous", "value": "screen"}}
		index := 10
		mockFileInfo := map[string]any{
			"filename":         "test.less",  
			"currentDirectory": "/test",
		}
		mockVisibilityInfo := map[string]any{
			"visibilityBlocks": 1,
			"nodeVisible":      true,
		}

		media := NewMedia(value, features, index, mockFileInfo, mockVisibilityInfo)

		if media.GetIndex() != index {
			t.Errorf("Expected index %d, got %d", index, media.GetIndex())
		}
		if media.FileInfo() == nil {
			t.Error("Expected fileInfo to be set")
		}
		if media.Features == nil {
			t.Error("Expected features to be defined")
		}
		if len(media.Rules) != 1 {
			t.Errorf("Expected 1 rule, got %d", len(media.Rules))
		}
		if ruleset, ok := media.Rules[0].(*Ruleset); ok {
			if !ruleset.AllowImports {
				t.Error("Expected allowImports to be true")
			}
		} else {
			t.Error("Expected first rule to be a Ruleset")
		}
		if !media.AllowRoot {
			t.Error("Expected allowRoot to be true")
		}
	})

	t.Run("should handle null/undefined value", func(t *testing.T) {
		features := []any{map[string]any{"type": "Anonymous", "value": "screen"}}
		mockFileInfo := map[string]any{
			"filename":         "test.less",
			"currentDirectory": "/test",
		}
		mockVisibilityInfo := map[string]any{
			"visibilityBlocks": 1,
			"nodeVisible":      true,
		}

		media1 := NewMedia(nil, features, 0, mockFileInfo, mockVisibilityInfo)
		media2 := NewMedia(nil, features, 0, mockFileInfo, mockVisibilityInfo)

		if len(media1.Rules) != 1 {
			t.Errorf("Expected 1 rule for media1, got %d", len(media1.Rules))
		}
		if len(media2.Rules) != 1 {
			t.Errorf("Expected 1 rule for media2, got %d", len(media2.Rules))
		}
	})

	t.Run("should handle empty features", func(t *testing.T) {
		value := []any{
			map[string]any{"type": "Declaration", "name": "color", "value": "red"},
		}
		mockFileInfo := map[string]any{
			"filename":         "test.less",
			"currentDirectory": "/test",
		}
		mockVisibilityInfo := map[string]any{
			"visibilityBlocks": 1,
			"nodeVisible":      true,
		}

		media := NewMedia(value, []any{}, 0, mockFileInfo, mockVisibilityInfo)

		if media.Features == nil {
			t.Error("Expected features to be defined")
		}
		if len(media.Rules) != 1 {
			t.Errorf("Expected 1 rule, got %d", len(media.Rules))
		}
	})

	t.Run("should handle missing index and fileInfo", func(t *testing.T) {
		value := []any{
			map[string]any{"type": "Declaration", "name": "color", "value": "red"},
		}
		features := []any{map[string]any{"type": "Anonymous", "value": "screen"}}

		media := NewMedia(value, features, 0, nil, nil)

		if len(media.Rules) != 1 {
			t.Errorf("Expected 1 rule, got %d", len(media.Rules))
		}
	})

	t.Run("should handle missing visibilityInfo", func(t *testing.T) {
		value := []any{
			map[string]any{"type": "Declaration", "name": "color", "value": "red"},
		}
		features := []any{map[string]any{"type": "Anonymous", "value": "screen"}}
		mockFileInfo := map[string]any{
			"filename": "test.less",
		}

		media := NewMedia(value, features, 0, mockFileInfo, nil)

		if len(media.Rules) != 1 {
			t.Errorf("Expected 1 rule, got %d", len(media.Rules))
		}
		if !media.AllowRoot {
			t.Error("Expected allowRoot to be true")
		}
	})
}

func TestMediaType(t *testing.T) {
	t.Run("should have type Media", func(t *testing.T) {
		mockFileInfo := map[string]any{"filename": "test.less"}
		media := NewMedia([]any{}, []any{}, 0, mockFileInfo, nil)
		
		if media.GetType() != "Media" {
			t.Errorf("Expected type 'Media', got '%s'", media.GetType())
		}
	})
}

func TestMediaGenCSS(t *testing.T) {
	// Create output for testing
	var outputContent []string
	output := &CSSOutput{
		Add: func(chunk any, fileInfo any, index any) {
			if chunk != nil {
				// Handle different types of chunks
				switch v := chunk.(type) {
				case string:
					outputContent = append(outputContent, v)
				default:
					// Convert other types to string representation
					outputContent = append(outputContent, fmt.Sprintf("%v", v))
				}
			}
		},
		IsEmpty: func() bool {
			return len(outputContent) == 0
		},
	}
	
	t.Run("should generate CSS with @media rule", func(t *testing.T) {
		value := []any{
			map[string]any{"type": "Declaration", "name": "color", "value": "red"},
		}
		features := []any{map[string]any{"type": "Anonymous", "value": "screen"}}
		mockFileInfo := map[string]any{
			"filename":         "test.less",
			"currentDirectory": "/test",
		}
		media := NewMedia(value, features, 5, mockFileInfo, nil)
		
		mockContext := map[string]any{}

		// The GenCSS method should not panic
		media.GenCSS(mockContext, output)
		
		// Check that some content was added to the output
		if output.IsEmpty() {
			t.Error("Expected some output to be generated")
		}
	})

	t.Run("should handle context without fileInfo", func(t *testing.T) {
		media := NewMedia([]any{}, []any{}, 0, nil, nil)

		mockContext := map[string]any{}
		
		// Should not panic
		media.GenCSS(mockContext, output)
	})

	t.Run("should handle nil context", func(t *testing.T) {
		mockFileInfo := map[string]any{
			"filename": "test.less",
		}
		media := NewMedia([]any{}, []any{}, 0, mockFileInfo, nil)

		// Should not panic
		media.GenCSS(nil, output)
	})
}

func TestMediaEval(t *testing.T) {
	t.Run("should initialize mediaBlocks and mediaPath when not present", func(t *testing.T) {
		mockFileInfo := map[string]any{
			"filename":         "test.less",
			"currentDirectory": "/test",
		}
		media := NewMedia([]any{}, []any{}, 0, mockFileInfo, nil)

		mockContext := map[string]any{
			"frames": []any{
				&Ruleset{
					FunctionRegistry: map[string]any{},
				},
			},
		}

		result, err := media.Eval(mockContext)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		if result == nil {
			t.Error("Expected result to be defined")
		}
		
		// Check that mediaBlocks and mediaPath were initialized
		if _, ok := mockContext["mediaBlocks"]; !ok {
			t.Error("Expected mediaBlocks to be defined in context")
		}
		if _, ok := mockContext["mediaPath"]; !ok {
			t.Error("Expected mediaPath to be defined in context")
		}
	})

	t.Run("should handle existing mediaBlocks and mediaPath", func(t *testing.T) {
		mockFileInfo := map[string]any{
			"filename": "test.less",
		}
		media := NewMedia([]any{}, []any{}, 0, mockFileInfo, nil)
		
		mockContext := map[string]any{
			"mediaBlocks": []any{map[string]any{"type": "Media"}},
			"mediaPath":   []any{map[string]any{"type": "Media"}},
			"frames": []any{
				&Ruleset{
					FunctionRegistry: map[string]any{},
				},
			},
		}

		result, err := media.Eval(mockContext)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		if result == nil {
			t.Error("Expected result to be defined")
		}
	})

	t.Run("should preserve debugInfo when present", func(t *testing.T) {
		mockFileInfo := map[string]any{
			"filename": "test.less",
		}
		media := NewMedia([]any{}, []any{}, 0, mockFileInfo, nil)
		media.DebugInfo = map[string]any{"lineNumber": 5, "fileName": "test.less"}

		mockContext := map[string]any{
			"frames": []any{
				&Ruleset{
					FunctionRegistry: map[string]any{},
				},
			},
		}

		result, err := media.Eval(mockContext)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		
		if resultMedia, ok := result.(*Media); ok {
			if resultMedia.DebugInfo == nil {
				t.Error("Expected debugInfo to be preserved")
			}
		}
	})

	t.Run("should handle context with frames", func(t *testing.T) {
		mockFileInfo := map[string]any{
			"filename": "test.less",
		}
		media := NewMedia([]any{map[string]any{"type": "Declaration"}}, []any{}, 0, mockFileInfo, nil)

		mockContext := map[string]any{
			"frames": []any{
				&Ruleset{
					FunctionRegistry: map[string]any{},
				},
			},
		}

		result, err := media.Eval(mockContext)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		if result == nil {
			t.Error("Expected result to be defined")
		}
		
		// Should restore frames to original length
		if frames, ok := mockContext["frames"].([]any); ok {
			if len(frames) != 1 {
				t.Errorf("Expected frames to be restored to length 1, got %d", len(frames))
			}
		}
	})

	t.Run("should return evalTop result when mediaPath is empty", func(t *testing.T) {
		mockFileInfo := map[string]any{
			"filename": "test.less",
		}
		media := NewMedia([]any{}, []any{}, 0, mockFileInfo, nil)
		
		mockContext := map[string]any{
			"mediaBlocks": []any{},
			"mediaPath":   []any{},
			"frames": []any{
				&Ruleset{
					FunctionRegistry: map[string]any{},
				},
			},
		}

		result, err := media.Eval(mockContext)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		if result == nil {
			t.Error("Expected result to be defined")
		}
	})

	t.Run("should return evalNested result when mediaPath is not empty", func(t *testing.T) {
		mockFileInfo := map[string]any{
			"filename": "test.less",
		}
		media := NewMedia([]any{}, []any{}, 0, mockFileInfo, nil)
		
		mockContext := map[string]any{
			"mediaBlocks": []any{},
			"mediaPath":   []any{map[string]any{"type": "Media"}}, // Pre-existing media in path
			"frames": []any{
				&Ruleset{
					FunctionRegistry: map[string]any{},
				},
			},
		}

		result, err := media.Eval(mockContext)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		if result == nil {
			t.Error("Expected result to be defined")
		}
	})
}

func TestMediaInheritanceAndPrototypeChain(t *testing.T) {
	t.Run("should inherit from AtRule", func(t *testing.T) {
		mockFileInfo := map[string]any{
			"filename": "test.less",
		}
		media := NewMedia([]any{}, []any{}, 0, mockFileInfo, nil)
		
		if media.GetType() != "Media" {
			t.Errorf("Expected type 'Media', got %s", media.GetType())
		}
		// Check that it has OutputRuleset method from AtRule (method exists via embedding)
		// Testing that we can access the inherited method without errors
		if media.AtRule == nil {
			t.Error("Expected AtRule to be embedded")
		}
	})

	t.Run("should include NestableAtRulePrototype methods", func(t *testing.T) {
		mockFileInfo := map[string]any{
			"filename": "test.less",
		}
		media := NewMedia([]any{}, []any{}, 0, mockFileInfo, nil)
		
		if !media.IsRulesetLike() {
			t.Error("Expected IsRulesetLike to return true")
		}
	})
}

func TestMediaEdgeCasesAndErrorHandling(t *testing.T) {
	t.Run("should handle complex features array", func(t *testing.T) {
		complexFeatures := []any{
			map[string]any{"type": "Anonymous", "value": "screen"},
			map[string]any{"type": "Anonymous", "value": "and"},
			map[string]any{"type": "Expression", "value": "(max-width: 768px)"},
		}
		mockFileInfo := map[string]any{
			"filename": "test.less",
		}

		media := NewMedia([]any{}, complexFeatures, 0, mockFileInfo, nil)

		if media.Features == nil {
			t.Error("Expected features to be defined")
		}
		if len(media.Rules) != 1 {
			t.Errorf("Expected 1 rule, got %d", len(media.Rules))
		}
	})

	t.Run("should handle complex value array", func(t *testing.T) {
		complexValue := []any{
			map[string]any{"type": "Declaration", "name": "color", "value": "red"},
			map[string]any{"type": "Declaration", "name": "background", "value": "blue"},
			map[string]any{"type": "Ruleset", "selectors": []any{}, "rules": []any{}},
		}
		mockFileInfo := map[string]any{
			"filename": "test.less",
		}

		media := NewMedia(complexValue, []any{}, 0, mockFileInfo, nil)

		if len(media.Rules) != 1 {
			t.Errorf("Expected 1 rule, got %d", len(media.Rules))
		}
		if ruleset, ok := media.Rules[0].(*Ruleset); ok {
			if !ruleset.AllowImports {
				t.Error("Expected allowImports to be true")
			}
		}
	})

	t.Run("should handle zero index", func(t *testing.T) {
		mockFileInfo := map[string]any{
			"filename": "test.less",
		}
		media := NewMedia([]any{}, []any{}, 0, mockFileInfo, nil)
		
		if media.GetIndex() != 0 {
			t.Errorf("Expected index 0, got %d", media.GetIndex())
		}
	})

	t.Run("should handle negative index", func(t *testing.T) {
		mockFileInfo := map[string]any{
			"filename": "test.less",
		}
		media := NewMedia([]any{}, []any{}, -1, mockFileInfo, nil)
		
		if media.GetIndex() != -1 {
			t.Errorf("Expected index -1, got %d", media.GetIndex())
		}
	})

	t.Run("should handle large index", func(t *testing.T) {
		mockFileInfo := map[string]any{
			"filename": "test.less",
		}
		media := NewMedia([]any{}, []any{}, 999999, mockFileInfo, nil)
		
		if media.GetIndex() != 999999 {
			t.Errorf("Expected index 999999, got %d", media.GetIndex())
		}
	})

	t.Run("should handle empty fileInfo object", func(t *testing.T) {
		emptyFileInfo := map[string]any{}
		media := NewMedia([]any{}, []any{}, 0, emptyFileInfo, nil)
		
		if media.FileInfo() == nil {
			t.Error("Expected fileInfo to be set")
		}
	})

	t.Run("should handle fileInfo with minimal properties", func(t *testing.T) {
		minimalFileInfo := map[string]any{"filename": "test.less"}
		media := NewMedia([]any{}, []any{}, 0, minimalFileInfo, nil)
		
		if media.FileInfo() == nil {
			t.Error("Expected fileInfo to be set")
		}
		if filename, ok := media.FileInfo()["filename"]; !ok || filename != "test.less" {
			t.Error("Expected filename to be 'test.less'")
		}
	})
}

func TestMediaContextHandlingInEval(t *testing.T) {
	t.Run("should handle context without frames", func(t *testing.T) {
		contextWithoutFrames := map[string]any{
			"mediaBlocks": nil,
			"mediaPath":   nil,
		}
		mockFileInfo := map[string]any{
			"filename": "test.less",
		}

		media := NewMedia([]any{}, []any{}, 0, mockFileInfo, nil)

		// Should return error due to missing frames
		_, err := media.Eval(contextWithoutFrames)
		if err == nil {
			t.Error("Expected error due to missing frames")
		}
	})

	t.Run("should handle context with empty frames array", func(t *testing.T) {
		contextWithEmptyFrames := map[string]any{
			"mediaBlocks": nil,
			"mediaPath":   nil,
			"frames":      []any{},
		}
		mockFileInfo := map[string]any{
			"filename": "test.less",
		}

		media := NewMedia([]any{}, []any{}, 0, mockFileInfo, nil)

		// Should handle empty frames gracefully
		result, err := media.Eval(contextWithEmptyFrames)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		if result == nil {
			t.Error("Expected result to be defined")
		}
	})

	t.Run("should handle context with multiple frames", func(t *testing.T) {
		contextWithMultipleFrames := map[string]any{
			"mediaBlocks": nil,
			"mediaPath":   nil,
			"frames": []any{
				&Ruleset{FunctionRegistry: map[string]any{}},
				&Ruleset{FunctionRegistry: map[string]any{}},
				&Ruleset{FunctionRegistry: map[string]any{}},
			},
		}
		mockFileInfo := map[string]any{
			"filename": "test.less",
		}

		media := NewMedia([]any{}, []any{}, 0, mockFileInfo, nil)
		result, err := media.Eval(contextWithMultipleFrames)
		
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		if result == nil {
			t.Error("Expected result to be defined")
		}
		
		// Should be restored to original length
		if frames, ok := contextWithMultipleFrames["frames"].([]any); ok {
			if len(frames) != 3 {
				t.Errorf("Expected frames to be restored to length 3, got %d", len(frames))
			}
		}
	})
}

func TestMediaVisibilityAndParentHandling(t *testing.T) {
	t.Run("should copy visibility info correctly", func(t *testing.T) {
		visibilityInfo := map[string]any{
			"visibilityBlocks": 2,
			"nodeVisible":      false,
		}
		mockFileInfo := map[string]any{
			"filename": "test.less",
		}

		media := NewMedia([]any{}, []any{}, 0, mockFileInfo, visibilityInfo)

		// The visibility info should be available through VisibilityInfo()
		if media.VisibilityInfo() == nil {
			t.Error("Expected visibility info to be copied")
		}
	})

	t.Run("should handle nil visibility info", func(t *testing.T) {
		mockFileInfo := map[string]any{
			"filename": "test.less",
		}
		media := NewMedia([]any{}, []any{}, 0, mockFileInfo, nil)

		if len(media.Rules) != 1 {
			t.Errorf("Expected 1 rule, got %d", len(media.Rules))
		}
	})
} 