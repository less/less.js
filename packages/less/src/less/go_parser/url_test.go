package go_parser

import (
	"strings"
	"testing"
)

// urlTestVisitor implements the Visitor interface specifically for URL tests
type urlTestVisitor struct {
	visitFunc func(any) any
}

func (v *urlTestVisitor) Visit(val any) any {
	return v.visitFunc(val)
}

// TestObject is a test object implementing the GenCSS method
type TestObject struct {
	value string
}

func (t *TestObject) GenCSS(context any, output *CSSOutput) {
	output.Add(t.value, nil, nil)
}

func (t *TestObject) Eval(context any) any {
	return t
}

func TestURL(t *testing.T) {
	t.Run("construction", func(t *testing.T) {
		t.Run("should initialize with provided values", func(t *testing.T) {
			value := map[string]any{
				"type":  "Anonymous",
				"value": "test.png",
			}
			index := 1
			fileInfo := map[string]any{
				"filename": "test.less",
			}
			url := NewURL(value, index, fileInfo, false)

			if urlValue, ok := url.value.(map[string]any); ok {
				if urlValue["type"] != value["type"] || urlValue["value"] != value["value"] {
					t.Errorf("Expected value to be %v, got %v", value, url.value)
				}
			} else {
				t.Errorf("Expected value to be a map, got %T", url.value)
			}
			if url._index != index {
				t.Errorf("Expected _index to be %d, got %d", index, url._index)
			}
			if url.fileInfo["filename"] != fileInfo["filename"] {
				t.Errorf("Expected fileInfo to be %v, got %v", fileInfo, url.fileInfo)
			}
			if url.isEvald {
				t.Error("Expected isEvald to be false")
			}
		})

		t.Run("should handle empty URL values", func(t *testing.T) {
			value := map[string]any{
				"type":  "Anonymous",
				"value": "",
			}
			url := NewURL(value, 0, map[string]any{}, false)
			if urlValue, ok := url.value.(map[string]any); ok {
				if urlValue["type"] != value["type"] || urlValue["value"] != value["value"] {
					t.Errorf("Expected value to be %v, got %v", value, url.value)
				}
			} else {
				t.Errorf("Expected value to be a map, got %T", url.value)
			}
		})

		t.Run("should handle null/undefined values", func(t *testing.T) {
			url1 := NewURL(nil, 0, map[string]any{}, false)
			if url1.value != nil {
				t.Error("Expected value to be nil")
			}
		})
	})

	t.Run("genCSS", func(t *testing.T) {
		t.Run("should generate correct CSS output", func(t *testing.T) {
			value := map[string]any{
				"type":  "Anonymous",
				"value": "test.png",
				"genCSS": func(context any, output *CSSOutput) {
					output.Add("test.png", nil, nil)
				},
			}
			url := NewURL(value, 0, map[string]any{}, false)

			var chunks []string
			output := &CSSOutput{
				Add: func(chunk any, fileInfo any, index any) {
					chunks = append(chunks, chunk.(string))
				},
			}

			url.GenCSS(nil, output)
			result := strings.Join(chunks, "")
			if result != "url(test.png)" {
				t.Errorf("Expected CSS output to be 'url(test.png)', got '%s'", result)
			}
		})

		t.Run("should handle quoted URLs", func(t *testing.T) {
			value := map[string]any{
				"type":  "Anonymous",
				"value": "\"test.png\"",
				"genCSS": func(context any, output *CSSOutput) {
					output.Add("\"test.png\"", nil, nil)
				},
			}
			url := NewURL(value, 0, map[string]any{}, false)

			var chunks []string
			output := &CSSOutput{
				Add: func(chunk any, fileInfo any, index any) {
					chunks = append(chunks, chunk.(string))
				},
			}

			url.GenCSS(nil, output)
			result := strings.Join(chunks, "")
			if result != "url(\"test.png\")" {
				t.Errorf("Expected CSS output to be 'url(\"test.png\")', got '%s'", result)
			}
		})

		t.Run("should handle map without genCSS method", func(t *testing.T) {
			// In JS, if a value has no genCSS method, it won't output anything
			value := map[string]any{
				"type":  "Anonymous",
				"value": "test.png",
				// No genCSS method
			}
			url := NewURL(value, 0, map[string]any{}, false)

			var chunks []string
			output := &CSSOutput{
				Add: func(chunk any, fileInfo any, index any) {
					chunks = append(chunks, chunk.(string))
				},
			}

			url.GenCSS(nil, output)
			result := strings.Join(chunks, "")
			if result != "url()" {
				t.Errorf("Expected CSS output to be 'url()', got '%s'", result)
			}
		})

		t.Run("should handle object with GenCSS method", func(t *testing.T) {
			// Go-specific enhancement for typed objects
			testObj := &TestObject{value: "typed-test.png"}
			url := NewURL(testObj, 0, map[string]any{}, false)

			var chunks []string
			output := &CSSOutput{
				Add: func(chunk any, fileInfo any, index any) {
					chunks = append(chunks, chunk.(string))
				},
			}

			url.GenCSS(nil, output)
			result := strings.Join(chunks, "")
			if result != "url(typed-test.png)" {
				t.Errorf("Expected CSS output to be 'url(typed-test.png)', got '%s'", result)
			}
		})
	})

	t.Run("eval", func(t *testing.T) {
		t.Run("should handle path rewriting with rootpath", func(t *testing.T) {
			context := map[string]any{
				"pathRequiresRewrite": func(path string) bool { return true },
				"rewritePath": func(path, rootpath string) string { return rootpath + path },
				"normalizePath": func(path string) string { return path },
			}

			value := map[string]any{
				"type":  "Anonymous",
				"value": "test.png",
				"eval": func(context any) any {
					return map[string]any{"value": "test.png"}
				},
			}

			url := NewURL(value, 0, map[string]any{"rootpath": "/assets/"}, false)
			result := url.Eval(context)

			if result.value.(map[string]any)["value"] != "/assets/test.png" {
				t.Errorf("Expected value to be '/assets/test.png', got '%v'", result.value.(map[string]any)["value"])
			}
		})

		t.Run("should escape special characters in rootpath", func(t *testing.T) {
			testCases := []struct {
				rootpath string
				expected string
			}{
				{"path with spaces/", "path\\ with\\ spaces/test.png"},
				{"path(with)parentheses/", "path\\(with\\)parentheses/test.png"},
				{"path\"with\"quotes/", "path\\\"with\\\"quotes/test.png"},
				{"path'with'quotes/", "path\\'with\\'quotes/test.png"},
				{"path\\with\\backslashes/", "path\\with\\backslashes/test.png"},
			}

			for _, tc := range testCases {
				context := map[string]any{
					"pathRequiresRewrite": func(path string) bool { return true },
					"rewritePath": func(path, rootpath string) string { return rootpath + path },
					"normalizePath": func(path string) string { return path },
				}

				value := map[string]any{
					"type":  "Anonymous",
					"value": "test.png",
					"eval": func(context any) any {
						return map[string]any{"value": "test.png"}
					},
				}

				url := NewURL(value, 0, map[string]any{"rootpath": tc.rootpath}, false)
				result := url.Eval(context)

				if result.value.(map[string]any)["value"] != tc.expected {
					t.Errorf("Expected value to be '%s', got '%v'", tc.expected, result.value.(map[string]any)["value"])
				}
			}
		})

		t.Run("should handle URL arguments", func(t *testing.T) {
			context := map[string]any{
				"pathRequiresRewrite": func(path string) bool { return false },
				"normalizePath": func(path string) string { return path },
				"urlArgs": "v=1.0.0",
			}

			value := map[string]any{
				"type":  "Anonymous",
				"value": "test.png",
				"eval": func(context any) any {
					return map[string]any{"value": "test.png"}
				},
			}

			url := NewURL(value, 0, map[string]any{}, false)
			result := url.Eval(context)

			if result.value.(map[string]any)["value"] != "test.png?v=1.0.0" {
				t.Errorf("Expected value to be 'test.png?v=1.0.0', got '%v'", result.value.(map[string]any)["value"])
			}
		})

		t.Run("should handle URL arguments with existing query parameters", func(t *testing.T) {
			context := map[string]any{
				"pathRequiresRewrite": func(path string) bool { return false },
				"normalizePath": func(path string) string { return path },
				"urlArgs": "v=1.0.0",
			}

			value := map[string]any{
				"type":  "Anonymous",
				"value": "test.png?param=1",
				"eval": func(context any) any {
					return map[string]any{"value": "test.png?param=1"}
				},
			}

			url := NewURL(value, 0, map[string]any{}, false)
			result := url.Eval(context)

			if result.value.(map[string]any)["value"] != "test.png?param=1&v=1.0.0" {
				t.Errorf("Expected value to be 'test.png?param=1&v=1.0.0', got '%v'", result.value.(map[string]any)["value"])
			}
		})

		t.Run("should handle URL arguments with hash", func(t *testing.T) {
			context := map[string]any{
				"pathRequiresRewrite": func(path string) bool { return false },
				"normalizePath": func(path string) string { return path },
				"urlArgs": "v=1.0.0",
			}

			value := map[string]any{
				"type":  "Anonymous",
				"value": "test.png#section",
				"eval": func(context any) any {
					return map[string]any{"value": "test.png#section"}
				},
			}

			url := NewURL(value, 0, map[string]any{}, false)
			result := url.Eval(context)

			if result.value.(map[string]any)["value"] != "test.png?v=1.0.0#section" {
				t.Errorf("Expected value to be 'test.png?v=1.0.0#section', got '%v'", result.value.(map[string]any)["value"])
			}
		})

		t.Run("should not add URL arguments to data URLs", func(t *testing.T) {
			context := map[string]any{
				"pathRequiresRewrite": func(path string) bool { return false },
				"normalizePath": func(path string) string { return path },
				"urlArgs": "v=1.0.0",
			}

			value := map[string]any{
				"type":  "Anonymous",
				"value": "data:image/png;base64,test",
				"eval": func(context any) any {
					return map[string]any{"value": "data:image/png;base64,test"}
				},
			}

			url := NewURL(value, 0, map[string]any{}, false)
			result := url.Eval(context)

			if result.value.(map[string]any)["value"] != "data:image/png;base64,test" {
				t.Errorf("Expected value to be 'data:image/png;base64,test', got '%v'", result.value.(map[string]any)["value"])
			}
		})

		t.Run("should set isEvald to true after evaluation", func(t *testing.T) {
			context := map[string]any{
				"pathRequiresRewrite": func(path string) bool { return false },
				"normalizePath": func(path string) string { return path },
				"urlArgs": "v=1.0.0",
			}

			value := map[string]any{
				"type":  "Anonymous",
				"value": "test.png",
				"eval": func(context any) any {
					return map[string]any{"value": "test.png"}
				},
			}

			url := NewURL(value, 0, map[string]any{}, false)
			result := url.Eval(context)

			if !result.isEvald {
				t.Error("Expected isEval to be true after evaluation")
			}
		})

		t.Run("should handle object with Eval method", func(t *testing.T) {
			// Go-specific enhancement for typed objects
			context := map[string]any{
				"pathRequiresRewrite": func(path string) bool { return false },
				"normalizePath": func(path string) string { return path },
			}

			testObj := &TestObject{value: "eval-test.png"}
			url := NewURL(testObj, 0, map[string]any{}, false)
			result := url.Eval(context)

			if _, ok := result.value.(*TestObject); !ok {
				t.Errorf("Expected value to be a *TestObject, got %T", result.value)
			}
		})

		t.Run("should handle nil value", func(t *testing.T) {
			context := map[string]any{}
			url := NewURL(nil, 0, map[string]any{}, false)
			result := url.Eval(context)

			if result.value != nil {
				t.Errorf("Expected value to be nil, got %v", result.value)
			}
			if !result.isEvald {
				t.Error("Expected isEvald to be true")
			}
		})
	})

	t.Run("accept", func(t *testing.T) {
		t.Run("should visit the value with the visitor", func(t *testing.T) {
			visitor := &urlTestVisitor{
				visitFunc: func(value any) any {
					if m, ok := value.(map[string]any); ok {
						m["visited"] = true
						return m
					}
					return value
				},
			}

			value := map[string]any{
				"type":  "Anonymous",
				"value": "test.png",
			}
			url := NewURL(value, 0, map[string]any{}, false)
			url.Accept(visitor)

			result, ok := url.value.(map[string]any)
			if !ok {
				t.Errorf("Expected value to be a map, got %T", url.value)
				return
			}
			visited, ok := result["visited"].(bool)
			if !ok || !visited {
				t.Error("Expected value to be visited")
			}
		})

		t.Run("should handle visitor returning null", func(t *testing.T) {
			visitor := &urlTestVisitor{
				visitFunc: func(value any) any {
					return nil
				},
			}

			value := map[string]any{
				"type":  "Anonymous",
				"value": "test.png",
			}
			url := NewURL(value, 0, map[string]any{}, false)
			url.Accept(visitor)

			if url.value != nil {
				t.Error("Expected value to be nil")
			}
		})

		t.Run("should handle visitor modifying value type", func(t *testing.T) {
			visitor := &urlTestVisitor{
				visitFunc: func(value any) any {
					return map[string]any{
						"type":  "Modified",
						"value": "modified.png",
					}
				},
			}

			value := map[string]any{
				"type":  "Anonymous",
				"value": "test.png",
			}
			url := NewURL(value, 0, map[string]any{}, false)
			url.Accept(visitor)

			result := url.value.(map[string]any)
			if result["type"] != "Modified" {
				t.Errorf("Expected type to be 'Modified', got '%v'", result["type"])
			}
			if result["value"] != "modified.png" {
				t.Errorf("Expected value to be 'modified.png', got '%v'", result["value"])
			}
		})
	})
} 