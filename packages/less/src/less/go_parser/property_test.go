package go_parser

import (
	"testing"
)

func TestProperty(t *testing.T) {
	t.Run("constructor", func(t *testing.T) {
		t.Run("should initialize with name, index and fileInfo", func(t *testing.T) {
			name := "test-property"
			index := 42
			fileInfo := map[string]any{"filename": "test.less"}
			property := NewProperty(name, index, fileInfo)

			if property.name != name {
				t.Errorf("Expected name %s, got %s", name, property.name)
			}
			if property.GetIndex() != index {
				t.Errorf("Expected index %d, got %d", index, property.GetIndex())
			}
			if property.FileInfo()["filename"] != fileInfo["filename"] {
				t.Errorf("Expected fileInfo %v, got %v", fileInfo, property.FileInfo())
			}
		})

		t.Run("should handle empty name", func(t *testing.T) {
			property := NewProperty("", 0, map[string]any{"filename": "test.less"})
			if property.name != "" {
				t.Errorf("Expected empty name, got %s", property.name)
			}
		})

		t.Run("should handle negative index", func(t *testing.T) {
			property := NewProperty("test", -1, map[string]any{"filename": "test.less"})
			if property.GetIndex() != -1 {
				t.Errorf("Expected index -1, got %d", property.GetIndex())
			}
		})
	})

	t.Run("eval", func(t *testing.T) {
		createContext := func(frames []any) map[string]any {
			return map[string]any{
				"frames": frames,
				"importantScope": []any{map[string]any{}},
				"mergeRules": func(arr []any) {},
			}
		}

		t.Run("should throw error for recursive property reference", func(t *testing.T) {
			property := NewProperty("test", 0, map[string]any{"filename": "test.less"})
			property.evaluating = true

			_, err := property.Eval(createContext(nil))
			if err == nil {
				t.Error("Expected error for recursive property reference")
			}
		})

		t.Run("should throw error for undefined property", func(t *testing.T) {
			property := NewProperty("undefined-property", 0, map[string]any{"filename": "test.less"})
			context := createContext(nil)

			_, err := property.Eval(context)
			if err == nil {
				t.Error("Expected error for undefined property")
			}
		})

		t.Run("should evaluate property from frames", func(t *testing.T) {
			property := NewProperty("test", 0, map[string]any{"filename": "test.less"})
			value, err := NewValue([]any{NewAnonymous("value", 0, nil, false, false, nil)})
			if err != nil {
				t.Fatalf("Failed to create value: %v", err)
			}
			declaration, err := NewDeclaration(
				"test",
				value,
				false,
				false,
				0,
				map[string]any{"filename": "test.less"},
				false,
				false,
			)
			if err != nil {
				t.Fatalf("Failed to create declaration: %v", err)
			}

			frame := map[string]any{
				"property": func(name string) []any {
					if name == "test" {
						return []any{declaration}
					}
					return nil
				},
			}

			context := createContext([]any{frame})
			result, err := property.Eval(context)
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if result == nil {
				t.Error("Expected non-nil result")
			}
		})

		t.Run("should handle property with null value", func(t *testing.T) {
			property := NewProperty("test", 0, map[string]any{"filename": "test.less"})
			value, err := NewValue([]any{NewAnonymous(nil, 0, nil, false, false, nil)})
			if err != nil {
				t.Fatalf("Failed to create value: %v", err)
			}
			declaration, err := NewDeclaration(
				"test",
				value,
				false,
				false,
				0,
				map[string]any{"filename": "test.less"},
				false,
				false,
			)
			if err != nil {
				t.Fatalf("Failed to create declaration: %v", err)
			}

			frame := map[string]any{
				"property": func(name string) []any {
					if name == "test" {
						return []any{declaration}
					}
					return nil
				},
			}

			context := createContext([]any{frame})
			result, err := property.Eval(context)
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if result == nil {
				t.Error("Expected non-nil result")
			}
		})

		t.Run("should handle property with empty string value", func(t *testing.T) {
			property := NewProperty("test", 0, map[string]any{"filename": "test.less"})
			value, err := NewValue([]any{NewAnonymous("", 0, nil, false, false, nil)})
			if err != nil {
				t.Fatalf("Failed to create value: %v", err)
			}
			declaration, err := NewDeclaration(
				"test",
				value,
				false,
				false,
				0,
				map[string]any{"filename": "test.less"},
				false,
				false,
			)
			if err != nil {
				t.Fatalf("Failed to create declaration: %v", err)
			}

			frame := map[string]any{
				"property": func(name string) []any {
					if name == "test" {
						return []any{declaration}
					}
					return nil
				},
			}

			context := createContext([]any{frame})
			result, err := property.Eval(context)
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if result == nil {
				t.Error("Expected non-nil result")
			}
		})

		t.Run("should handle properties with mixed merge flags", func(t *testing.T) {
			property := NewProperty("test", 0, map[string]any{"filename": "test.less"})
			value1, err := NewValue([]any{NewAnonymous("value1", 0, nil, false, false, nil)})
			if err != nil {
				t.Fatalf("Failed to create value1: %v", err)
			}
			value2, err := NewValue([]any{NewAnonymous("value2", 0, nil, false, false, nil)})
			if err != nil {
				t.Fatalf("Failed to create value2: %v", err)
			}
			declaration1, err := NewDeclaration(
				"test",
				value1,
				false,
				true,
				0,
				map[string]any{"filename": "test.less"},
				false,
				false,
			)
			if err != nil {
				t.Fatalf("Failed to create declaration1: %v", err)
			}
			declaration2, err := NewDeclaration(
				"test",
				value2,
				false,
				false,
				0,
				map[string]any{"filename": "test.less"},
				false,
				false,
			)
			if err != nil {
				t.Fatalf("Failed to create declaration2: %v", err)
			}

			frame := map[string]any{
				"property": func(name string) []any {
					if name == "test" {
						return []any{declaration1, declaration2}
					}
					return nil
				},
			}

			context := createContext([]any{frame})
			result, err := property.Eval(context)
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if result == nil {
				t.Error("Expected non-nil result")
			}
		})

		t.Run("should handle property with undefined value", func(t *testing.T) {
			property := NewProperty("test", 0, map[string]any{"filename": "test.less"})
			value, err := NewValue([]any{NewAnonymous(nil, 0, nil, false, false, nil)})
			if err != nil {
				t.Fatalf("Failed to create value: %v", err)
			}
			declaration, err := NewDeclaration(
				"test",
				value,
				false,
				false,
				0,
				map[string]any{"filename": "test.less"},
				false,
				false,
			)
			if err != nil {
				t.Fatalf("Failed to create declaration: %v", err)
			}

			frame := map[string]any{
				"property": func(name string) []any {
					if name == "test" {
						return []any{declaration}
					}
					return nil
				},
			}

			context := createContext([]any{frame})
			result, err := property.Eval(context)
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if result == nil {
				t.Error("Expected non-nil result")
			}
		})

		t.Run("should handle multiple important flags", func(t *testing.T) {
			property := NewProperty("test", 0, map[string]any{"filename": "test.less"})
			value1, err := NewValue([]any{NewAnonymous("value1", 0, nil, false, false, nil)})
			if err != nil {
				t.Fatalf("Failed to create value1: %v", err)
			}
			value2, err := NewValue([]any{NewAnonymous("value2", 0, nil, false, false, nil)})
			if err != nil {
				t.Fatalf("Failed to create value2: %v", err)
			}
			declaration1, err := NewDeclaration(
				"test",
				value1,
				"!important",
				false,
				0,
				map[string]any{"filename": "test.less"},
				false,
				false,
			)
			if err != nil {
				t.Fatalf("Failed to create declaration1: %v", err)
			}
			declaration2, err := NewDeclaration(
				"test",
				value2,
				"!important",
				false,
				0,
				map[string]any{"filename": "test.less"},
				false,
				false,
			)
			if err != nil {
				t.Fatalf("Failed to create declaration2: %v", err)
			}

			frame := map[string]any{
				"property": func(name string) []any {
					if name == "test" {
						return []any{declaration1, declaration2}
					}
					return nil
				},
			}

			importantScope := map[string]any{"important": false}
			context := createContext([]any{frame})
			context["importantScope"] = []any{importantScope}

			_, err = property.Eval(context)
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if importantScope["important"] != " !important" {
				t.Errorf("Expected important flag to be set, got %v", importantScope["important"])
			}
		})

		t.Run("should handle empty frames array", func(t *testing.T) {
			property := NewProperty("test", 0, map[string]any{"filename": "test.less"})
			context := createContext([]any{})

			_, err := property.Eval(context)
			if err == nil {
				t.Error("Expected error for undefined property")
			}
		})

		t.Run("should handle multiple frames with same property", func(t *testing.T) {
			property := NewProperty("test", 0, map[string]any{"filename": "test.less"})
			value1, err := NewValue([]any{NewAnonymous("value1", 0, nil, false, false, nil)})
			if err != nil {
				t.Fatalf("Failed to create value1: %v", err)
			}
			value2, err := NewValue([]any{NewAnonymous("value2", 0, nil, false, false, nil)})
			if err != nil {
				t.Fatalf("Failed to create value2: %v", err)
			}
			declaration1, err := NewDeclaration(
				"test",
				value1,
				false,
				false,
				0,
				map[string]any{"filename": "test.less"},
				false,
				false,
			)
			if err != nil {
				t.Fatalf("Failed to create declaration1: %v", err)
			}
			declaration2, err := NewDeclaration(
				"test",
				value2,
				false,
				false,
				0,
				map[string]any{"filename": "test.less"},
				false,
				false,
			)
			if err != nil {
				t.Fatalf("Failed to create declaration2: %v", err)
			}

			frame1 := map[string]any{
				"property": func(name string) []any {
					if name == "test" {
						return []any{declaration1}
					}
					return nil
				},
			}
			frame2 := map[string]any{
				"property": func(name string) []any {
					if name == "test" {
						return []any{declaration2}
					}
					return nil
				},
			}

			context := createContext([]any{frame1, frame2})
			result, err := property.Eval(context)
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if result == nil {
				t.Error("Expected non-nil result")
			}
		})

		t.Run("should handle multiple frames with different properties", func(t *testing.T) {
			property := NewProperty("test2", 0, map[string]any{"filename": "test.less"})
			value1, err := NewValue([]any{NewAnonymous("value1", 0, nil, false, false, nil)})
			if err != nil {
				t.Fatalf("Failed to create value1: %v", err)
			}
			value2, err := NewValue([]any{NewAnonymous("value2", 0, nil, false, false, nil)})
			if err != nil {
				t.Fatalf("Failed to create value2: %v", err)
			}
			declaration1, err := NewDeclaration(
				"test1",
				value1,
				false,
				false,
				0,
				map[string]any{"filename": "test.less"},
				false,
				false,
			)
			if err != nil {
				t.Fatalf("Failed to create declaration1: %v", err)
			}
			declaration2, err := NewDeclaration(
				"test2",
				value2,
				false,
				false,
				0,
				map[string]any{"filename": "test.less"},
				false,
				false,
			)
			if err != nil {
				t.Fatalf("Failed to create declaration2: %v", err)
			}

			frame1 := map[string]any{
				"property": func(name string) []any {
					if name == "test1" {
						return []any{declaration1}
					}
					return nil
				},
			}
			frame2 := map[string]any{
				"property": func(name string) []any {
					if name == "test2" {
						return []any{declaration2}
					}
					return nil
				},
			}

			context := createContext([]any{frame1, frame2})
			result, err := property.Eval(context)
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if result == nil {
				t.Error("Expected non-nil result")
			}
		})
	})

	t.Run("find", func(t *testing.T) {
		t.Run("should find first matching item in array", func(t *testing.T) {
			property := NewProperty("test", 0, map[string]any{"filename": "test.less"})
			arr := []any{1, 2, 3, 4}
			found := false
			result := property.Find(arr, func(item any) any {
				if item == 3 {
					found = true
					return item
				}
				return nil
			})
			if !found {
				t.Error("Expected to find item")
			}
			if result != 3 {
				t.Errorf("Expected result 3, got %v", result)
			}
		})

		t.Run("should return nil if no match found", func(t *testing.T) {
			property := NewProperty("test", 0, map[string]any{"filename": "test.less"})
			arr := []any{1, 2, 3, 4}
			result := property.Find(arr, func(item any) any {
				if item.(int) > 5 {
					return item
				}
				return nil
			})
			if result != nil {
				t.Errorf("Expected nil result, got %v", result)
			}
		})

		t.Run("should handle array with null values", func(t *testing.T) {
			property := NewProperty("test", 0, map[string]any{"filename": "test.less"})
			arr := []any{nil, 2, nil}
			result := property.Find(arr, func(item any) any {
				if item == 2 {
					return item
				}
				return nil
			})
			if result != 2 {
				t.Errorf("Expected result 2, got %v", result)
			}
		})

		t.Run("should handle array with mixed types", func(t *testing.T) {
			property := NewProperty("test", 0, map[string]any{"filename": "test.less"})
			arr := []any{1, "string", true, nil}
			result := property.Find(arr, func(item any) any {
				if str, ok := item.(string); ok {
					return str
				}
				return nil
			})
			if result != "string" {
				t.Errorf("Expected result 'string', got %v", result)
			}
		})

		t.Run("should handle array with objects", func(t *testing.T) {
			property := NewProperty("test", 0, map[string]any{"filename": "test.less"})
			obj := map[string]any{"key": "value"}
			arr := []any{1, obj, 3}
			result := property.Find(arr, func(item any) any {
				if m, ok := item.(map[string]any); ok {
					return m
				}
				return nil
			})
			if result == nil {
				t.Error("Expected non-nil result")
			}
			if resultMap, ok := result.(map[string]any); !ok {
				t.Error("Expected result to be a map")
			} else if resultMap["key"] != obj["key"] {
				t.Errorf("Expected result map to have key 'value', got %v", resultMap["key"])
			}
		})
	})
} 