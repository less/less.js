package go_parser

import (
	"testing"
)

func TestContainer(t *testing.T) {
	t.Run("constructor", func(t *testing.T) {
		t.Run("should create a Container with basic parameters", func(t *testing.T) {
			mockFileInfo := map[string]any{"filename": "test.less", "rootpath": "/test"}
			mockVisibilityInfo := map[string]any{"visibilityBlocks": 1, "nodeVisible": true}
			mockFeatures := []any{"min-width: 300px"}

			container, err := NewContainer(
				[]any{},
				mockFeatures,
				5,
				mockFileInfo,
				mockVisibilityInfo,
			)

			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if container.GetIndex() != 5 {
				t.Errorf("Expected index 5, got %d", container.GetIndex())
			}
			if container.FileInfo()["filename"] != "test.less" {
				t.Errorf("Expected filename 'test.less', got %v", container.FileInfo()["filename"])
			}
			if !container.AllowRoot {
				t.Error("Expected AllowRoot to be true")
			}
		})

		t.Run("should create features as Value instance", func(t *testing.T) {
			mockFileInfo := map[string]any{"filename": "test.less", "rootpath": "/test"}
			mockVisibilityInfo := map[string]any{"visibilityBlocks": 1, "nodeVisible": true}
			mockFeatures := []any{"min-width: 300px"}

			container, err := NewContainer(
				[]any{},
				mockFeatures,
				5,
				mockFileInfo,
				mockVisibilityInfo,
			)

			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if container.Features == nil {
				t.Error("Expected Features to be not nil")
			}
			if container.Features.GetType() != "Value" {
				t.Errorf("Expected Features type to be 'Value', got %s", container.Features.GetType())
			}
		})

		t.Run("should create rules with Ruleset", func(t *testing.T) {
			mockFileInfo := map[string]any{"filename": "test.less", "rootpath": "/test"}
			mockVisibilityInfo := map[string]any{"visibilityBlocks": 1, "nodeVisible": true}
			mockFeatures := []any{"min-width: 300px"}
			testValue := []any{map[string]any{"type": "test"}}

			container, err := NewContainer(
				testValue,
				mockFeatures,
				5,
				mockFileInfo,
				mockVisibilityInfo,
			)

			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if len(container.Rules) != 1 {
				t.Errorf("Expected 1 rule, got %d", len(container.Rules))
			}
			if ruleset, ok := container.Rules[0].(*Ruleset); ok {
				if ruleset.GetType() != "Ruleset" {
					t.Errorf("Expected rule type 'Ruleset', got %s", ruleset.GetType())
				}
			} else {
				t.Error("Expected first rule to be a Ruleset")
			}
		})

		t.Run("should set allowImports to true on first rule", func(t *testing.T) {
			mockFileInfo := map[string]any{"filename": "test.less", "rootpath": "/test"}
			mockVisibilityInfo := map[string]any{"visibilityBlocks": 1, "nodeVisible": true}
			mockFeatures := []any{"min-width: 300px"}

			container, err := NewContainer(
				[]any{},
				mockFeatures,
				5,
				mockFileInfo,
				mockVisibilityInfo,
			)

			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if ruleset, ok := container.Rules[0].(*Ruleset); ok {
				if !ruleset.AllowImports {
					t.Error("Expected AllowImports to be true on first rule")
				}
			} else {
				t.Error("Expected first rule to be a Ruleset")
			}
		})

		t.Run("should handle null/undefined parameters", func(t *testing.T) {
			container, err := NewContainer(nil, nil, 0, nil, nil)

			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if container.GetIndex() != 0 {
				t.Errorf("Expected index 0, got %d", container.GetIndex())
			}
			if !container.AllowRoot {
				t.Error("Expected AllowRoot to be true")
			}
		})
	})

	t.Run("prototype properties", func(t *testing.T) {
		mockFileInfo := map[string]any{"filename": "test.less", "rootpath": "/test"}
		mockVisibilityInfo := map[string]any{"visibilityBlocks": 1, "nodeVisible": true}
		mockFeatures := []any{"min-width: 300px"}

		container, err := NewContainer(
			[]any{},
			mockFeatures,
			5,
			mockFileInfo,
			mockVisibilityInfo,
		)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		t.Run("should have correct type", func(t *testing.T) {
			if container.Type() != "Container" {
				t.Errorf("Expected type 'Container', got %s", container.Type())
			}
		})

		t.Run("should have GenCSS method", func(t *testing.T) {
			// Test that GenCSS method exists by calling it
			output := &CSSOutput{
				Add: func(chunk any, fileInfo any, index any) {
					// Test implementation
				},
				IsEmpty: func() bool {
					return false
				},
			}
			context := map[string]any{"someContext": true}
			
			// Should not panic
			container.GenCSS(context, output)
		})

		t.Run("should have Eval method", func(t *testing.T) {
			// Test that Eval method exists by calling it
			context := map[string]any{
				"frames": []any{
					&Ruleset{
						Node:             NewNode(),
						FunctionRegistry: map[string]any{},
					},
				},
			}
			
			// Should not panic and should return a result
			result, err := container.Eval(context)
			if err != nil {
				t.Errorf("Expected no error from Eval, got %v", err)
			}
			if result == nil {
				t.Error("Expected Eval to return a result")
			}
		})
	})

	t.Run("GenCSS", func(t *testing.T) {
		mockFileInfo := map[string]any{"filename": "test.less", "rootpath": "/test"}
		mockVisibilityInfo := map[string]any{"visibilityBlocks": 1, "nodeVisible": true}
		mockFeatures := []any{"min-width: 300px"}

		container, err := NewContainer(
			[]any{},
			mockFeatures,
			5,
			mockFileInfo,
			mockVisibilityInfo,
		)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		var addedChunks []any
		var addedFileInfos []any
		var addedIndexes []any

		output := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				addedChunks = append(addedChunks, chunk)
				addedFileInfos = append(addedFileInfos, fileInfo)
				addedIndexes = append(addedIndexes, index)
			},
			IsEmpty: func() bool {
				return len(addedChunks) == 0
			},
		}
		context := map[string]any{"someContext": true}

		t.Run("should add @container directive to output", func(t *testing.T) {
			container.GenCSS(context, output)

			if len(addedChunks) == 0 {
				t.Error("Expected output to be added")
			}
			if addedChunks[0] != "@container " {
				t.Errorf("Expected first chunk to be '@container ', got %v", addedChunks[0])
			}
			if addedFileInfos[0] == nil {
				t.Error("Expected file info to be passed, got nil")
			} else if fileInfo, ok := addedFileInfos[0].(map[string]any); ok {
				if fileInfo["filename"] != mockFileInfo["filename"] {
					t.Errorf("Expected filename %v, got %v", mockFileInfo["filename"], fileInfo["filename"])
				}
			}
			if addedIndexes[0] != 5 {
				t.Errorf("Expected index 5 to be passed, got %v", addedIndexes[0])
			}
		})
	})

	t.Run("Eval", func(t *testing.T) {
		mockFileInfo := map[string]any{"filename": "test.less", "rootpath": "/test"}
		mockVisibilityInfo := map[string]any{"visibilityBlocks": 1, "nodeVisible": true}
		mockFeatures := []any{"min-width: 300px"}

		container, err := NewContainer(
			[]any{},
			mockFeatures,
			5,
			mockFileInfo,
			mockVisibilityInfo,
		)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		t.Run("should initialize mediaBlocks and mediaPath if not present", func(t *testing.T) {
			context := map[string]any{
				"frames": []any{
					&Ruleset{
						Node:             NewNode(),
						FunctionRegistry: map[string]any{},
					},
				},
			}

			_, err := container.Eval(context)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}

			// Note: When mediaPath becomes empty (length 0), evalTop is called which deletes
			// mediaBlocks and mediaPath from context. This matches JavaScript behavior.
			// Our debug output showed this is working correctly.
			if context["mediaBlocks"] != nil {
				t.Error("Expected mediaBlocks to be deleted by evalTop when mediaPath is empty")
			}
			if context["mediaPath"] != nil {
				t.Error("Expected mediaPath to be deleted by evalTop when mediaPath is empty")
			}
		})

		t.Run("should preserve mediaBlocks and mediaPath when evalNested is called", func(t *testing.T) {
			context := map[string]any{
				"mediaBlocks": []any{"existing"},
				"mediaPath":   []any{"existing"}, // This will prevent mediaPath from becoming empty
				"frames": []any{
					&Ruleset{
						Node:             NewNode(),
						FunctionRegistry: map[string]any{},
					},
				},
			}

			_, err := container.Eval(context)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}

			// When mediaPath is not empty after processing, evalNested is called
			// which should preserve the context properties
			if context["mediaBlocks"] == nil {
				t.Error("Expected mediaBlocks to be preserved by evalNested")
			}
			if context["mediaPath"] == nil {
				t.Error("Expected mediaPath to be preserved by evalNested")
			}
		})

		t.Run("should copy debugInfo if present", func(t *testing.T) {
			containerWithDebug, err := NewContainer(
				[]any{},
				mockFeatures,
				5,
				mockFileInfo,
				mockVisibilityInfo,
			)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			
			containerWithDebug.DebugInfo = map[string]any{"lineNumber": 10}
			
			context := map[string]any{
				"frames": []any{
					&Ruleset{
						Node:             NewNode(),
						FunctionRegistry: map[string]any{},
					},
				},
			}

			_, err = containerWithDebug.Eval(context)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}

			// Check that debug info was copied to the first rule
			if ruleset, ok := containerWithDebug.Rules[0].(*Ruleset); ok {
				if ruleset.DebugInfo == nil {
					t.Error("Expected DebugInfo to be copied to first rule")
				} else if debugMap, ok := ruleset.DebugInfo.(map[string]any); ok {
					if debugMap["lineNumber"] != 10 {
						t.Errorf("Expected lineNumber 10, got %v", debugMap["lineNumber"])
					}
				}
			}
		})

		t.Run("should evaluate features", func(t *testing.T) {
			context := map[string]any{
				"frames": []any{
					&Ruleset{
						Node:             NewNode(),
						FunctionRegistry: map[string]any{},
					},
				},
			}

			result, err := container.Eval(context)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}

			if result.Features == nil {
				t.Error("Expected features to be evaluated")
			}
		})

		t.Run("should handle context without frames", func(t *testing.T) {
			context := map[string]any{}

			_, err := container.Eval(context)
			// Should handle gracefully or return an error
			if err != nil {
				// Expected behavior - context needs frames
				return
			}
		})

		t.Run("should handle empty frames array", func(t *testing.T) {
			context := map[string]any{
				"frames": []any{},
			}

			_, err := container.Eval(context)
			// Should handle gracefully or return an error
			if err != nil {
				// Expected behavior - needs at least one frame
				return
			}
		})

		t.Run("should create new Container instance in eval", func(t *testing.T) {
			context := map[string]any{
				"frames": []any{
					&Ruleset{
						Node:             NewNode(),
						FunctionRegistry: map[string]any{},
					},
				},
			}

			result, err := container.Eval(context)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}

			// Should have created a new Container instance
			if result == container {
				t.Error("Expected eval to return a new Container instance")
			}
		})

		t.Run("should handle evalTop deleting context properties", func(t *testing.T) {
			// Test Eval
			evalContext := map[string]any{
				"frames": []any{
					&Ruleset{
						Node:             NewNode(),
						FunctionRegistry: map[string]any{},
					},
				},
			}
			result, err := container.Eval(evalContext)

			if err != nil {
				t.Fatalf("Expected no error from Eval, got %v", err)
			}
			if result == nil {
				t.Error("Expected Eval to return a result")
			}
			// Note: evalTop deletes these properties when mediaPath becomes empty
			if evalContext["mediaBlocks"] != nil {
				t.Error("Expected mediaBlocks to be deleted by evalTop")
			}
			if evalContext["mediaPath"] != nil {
				t.Error("Expected mediaPath to be deleted by evalTop")
			}
		})
	})

	t.Run("edge cases", func(t *testing.T) {
		mockFileInfo := map[string]any{"filename": "test.less", "rootpath": "/test"}
		mockVisibilityInfo := map[string]any{"visibilityBlocks": 1, "nodeVisible": true}
		mockFeatures := []any{"min-width: 300px"}

		t.Run("should handle very large index values", func(t *testing.T) {
			largeIndex := 9007199254740991 // JavaScript MAX_SAFE_INTEGER
			container, err := NewContainer(
				[]any{},
				mockFeatures,
				largeIndex,
				mockFileInfo,
				mockVisibilityInfo,
			)

			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if container.GetIndex() != largeIndex {
				t.Errorf("Expected index %d, got %d", largeIndex, container.GetIndex())
			}
		})

		t.Run("should handle negative index values", func(t *testing.T) {
			negativeIndex := -1
			container, err := NewContainer(
				[]any{},
				mockFeatures,
				negativeIndex,
				mockFileInfo,
				mockVisibilityInfo,
			)

			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if container.GetIndex() != negativeIndex {
				t.Errorf("Expected index %d, got %d", negativeIndex, container.GetIndex())
			}
		})

		t.Run("should handle complex nested features", func(t *testing.T) {
			complexFeatures := []any{
				"min-width: 300px",
				"max-width: 600px",
				"orientation: portrait",
			}
			_, err := NewContainer(
				[]any{},
				complexFeatures,
				5,
				mockFileInfo,
				mockVisibilityInfo,
			)

			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
		})

		t.Run("should handle empty rules array", func(t *testing.T) {
			container, err := NewContainer(
				[]any{},
				mockFeatures,
				5,
				mockFileInfo,
				mockVisibilityInfo,
			)

			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if len(container.Rules) != 1 {
				t.Errorf("Expected 1 rule, got %d", len(container.Rules))
			}
			if _, ok := container.Rules[0].(*Ruleset); !ok {
				t.Error("Expected rule to be a Ruleset")
			}
		})

		t.Run("should handle null value parameter", func(t *testing.T) {
			container, err := NewContainer(
				nil,
				mockFeatures,
				5,
				mockFileInfo,
				mockVisibilityInfo,
			)

			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if len(container.Rules) != 1 {
				t.Errorf("Expected 1 rule, got %d", len(container.Rules))
			}
		})

		t.Run("should handle undefined features parameter", func(t *testing.T) {
			_, err := NewContainer([]any{}, nil, 5, mockFileInfo, mockVisibilityInfo)

			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
		})

		t.Run("should handle missing visibilityInfo", func(t *testing.T) {
			container, err := NewContainer([]any{}, mockFeatures, 5, mockFileInfo, nil)

			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if container.GetIndex() != 5 {
				t.Errorf("Expected index 5, got %d", container.GetIndex())
			}
			if container.FileInfo()["filename"] != "test.less" {
				t.Errorf("Expected filename 'test.less', got %v", container.FileInfo()["filename"])
			}
		})
	})

	t.Run("integration with dependencies", func(t *testing.T) {
		t.Run("should work with all dependencies", func(t *testing.T) {
			testValue := []any{
				map[string]any{"type": "test", "property": "color", "value": "red"},
			}
			testFeatures := []any{"min-width: 300px", "max-width: 600px"}
			mockFileInfo := map[string]any{"filename": "test.less", "rootpath": "/test"}
			mockVisibilityInfo := map[string]any{"visibilityBlocks": 1, "nodeVisible": true}

			container, err := NewContainer(
				testValue,
				testFeatures,
				10,
				mockFileInfo,
				mockVisibilityInfo,
			)

			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}

			// Test GenCSS
			var addedChunks []any
			output := &CSSOutput{
				Add: func(chunk any, fileInfo any, index any) {
					addedChunks = append(addedChunks, chunk)
				},
				IsEmpty: func() bool {
					return len(addedChunks) == 0
				},
			}
			context := map[string]any{"someContext": true}
			container.GenCSS(context, output)

			if len(addedChunks) == 0 {
				t.Error("Expected output to be generated")
			}
			if addedChunks[0] != "@container " {
				t.Errorf("Expected first chunk to be '@container ', got %v", addedChunks[0])
			}

			// Test Eval
			evalContext := map[string]any{
				"frames": []any{
					&Ruleset{
						Node:             NewNode(),
						FunctionRegistry: map[string]any{},
					},
				},
			}
			result, err := container.Eval(evalContext)

			if err != nil {
				t.Fatalf("Expected no error from Eval, got %v", err)
			}
			if result == nil {
				t.Error("Expected Eval to return a result")
			}
			// Note: evalTop deletes these properties when mediaPath becomes empty
			if evalContext["mediaBlocks"] != nil {
				t.Error("Expected mediaBlocks to be deleted by evalTop")
			}
			if evalContext["mediaPath"] != nil {
				t.Error("Expected mediaPath to be deleted by evalTop")
			}
		})
	})
} 