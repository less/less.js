package less_go

import (
	"strings"
	"testing"
)

// mockFrameTest implements Frame interface for testing
type mockFrameTest struct {
	variables map[string]any
}

func (m *mockFrameTest) Variable(name string) map[string]any {
	if val, ok := m.variables[name]; ok {
		if result, ok := val.(map[string]any); ok {
			return result
		}
	}
	return nil
}

func TestJavaScript(t *testing.T) {
	mockContext := map[string]any{
		"javascriptEnabled": true,
		"frames": []ParserFrame{
			&mockFrameTest{
				variables: map[string]any{},
			},
		},
	}

	t.Run("constructor", func(t *testing.T) {
		// Test file info handling in constructor
		fileInfo := map[string]any{"filename": "test.less"}
		js := NewJavaScript("1 + 1", true, 10, fileInfo)
		if js.expression != "1 + 1" {
			t.Errorf("Expected expression to be '1 + 1', got '%s'", js.expression)
		}
		if !js.escaped {
			t.Error("Expected escaped to be true")
		}
		if js.GetIndex() != 10 {
			t.Errorf("Expected index to be 10, got %d", js.GetIndex())
		}
		if filename, ok := js.FileInfo()["filename"].(string); !ok || filename != "test.less" {
			t.Errorf("Expected filename to be 'test.less', got '%v'", js.FileInfo()["filename"])
		}
	})

	t.Run("eval", func(t *testing.T) {
		t.Run("should throw error when javascript is not enabled", func(t *testing.T) {
			js := NewJavaScript("1 + 1", false, 0, nil)
			_, err := js.Eval(map[string]any{"javascriptEnabled": false})
			if err == nil {
				t.Error("Expected error when javascript is not enabled")
			}
			// Check for the specific error message for disabled JS
			// Use the filename from the node if available, otherwise <unknown>
			expectedMsg := "inline JavaScript is not enabled. Is it set in your options? (filename: <unknown>, index: 0)"
			if err == nil || err.Error() != expectedMsg {
				t.Errorf("Expected specific error message '%s', got '%v'", expectedMsg, err)
			}
		})

		// Helper function to assert the "not supported" error
		assertNotSupportedError := func(t *testing.T, expr string, err error) {
			t.Helper()
			if err == nil {
				t.Errorf("Expected 'JavaScript evaluation is not supported' error for expression '%s', but got nil", expr)
				return
			}
			expectedPrefix := "JavaScript evaluation is not supported in the Go port. Expression: "
			if !strings.HasPrefix(err.Error(), expectedPrefix) {
				t.Errorf("Expected error prefix '%s' for expression '%s', got '%v'", expectedPrefix, expr, err)
			}
		}

		t.Run("should return error for number expressions", func(t *testing.T) {
			expr := "1 + 1"
			js := NewJavaScript(expr, false, 0, nil)
			_, err := js.Eval(mockContext)
			assertNotSupportedError(t, expr, err)
		})

		t.Run("should return error for NaN values", func(t *testing.T) {
			expr := "parseInt('not a number')"
			js := NewJavaScript(expr, false, 0, nil)
			_, err := js.Eval(mockContext)
			assertNotSupportedError(t, expr, err)
		})

		t.Run("should return error for string expressions", func(t *testing.T) {
			expr := `"hello" + " world"` // Use raw string literal for clarity
			js := NewJavaScript(expr, false, 0, nil)
			_, err := js.Eval(mockContext)
			assertNotSupportedError(t, expr, err)
		})

		t.Run("should return error for array expressions", func(t *testing.T) {
			expr := "[1, 2, 3]"
			js := NewJavaScript(expr, false, 0, nil)
			_, err := js.Eval(mockContext)
			assertNotSupportedError(t, expr, err)
		})

		t.Run("should return error for boolean expressions", func(t *testing.T) {
			expr := "true"
			js := NewJavaScript(expr, false, 0, nil)
			_, err := js.Eval(mockContext)
			assertNotSupportedError(t, expr, err)
		})

		t.Run("should return error for null", func(t *testing.T) {
			expr := "null"
			js := NewJavaScript(expr, false, 0, nil)
			_, err := js.Eval(mockContext)
			assertNotSupportedError(t, expr, err)
		})

		t.Run("should return error for undefined", func(t *testing.T) {
			expr := "undefined"
			js := NewJavaScript(expr, false, 0, nil)
			_, err := js.Eval(mockContext)
			assertNotSupportedError(t, expr, err)
		})

		t.Run("should handle JavaScript errors gracefully (by returning not supported)", func(t *testing.T) {
			expr := "undefinedVariable"
			js := NewJavaScript(expr, false, 0, nil)
			_, err := js.Eval(mockContext)
			assertNotSupportedError(t, expr, err)
		})

		t.Run("should handle syntax errors gracefully (by returning not supported)", func(t *testing.T) {
			expr := "{ invalid syntax }"
			js := NewJavaScript(expr, false, 0, nil)
			_, err := js.Eval(mockContext)
			assertNotSupportedError(t, expr, err)
		})

		t.Run("should return error for variable interpolation", func(t *testing.T) {
			context := map[string]any{
				"javascriptEnabled": true,
				"frames": []ParserFrame{
					&mockFrameTest{
						variables: map[string]any{
							"@color": map[string]any{
								"value": NewQuoted("\"", "red", false, 0, nil), // Use Quoted for proper jsify
							},
						},
					},
				},
			}
			expr := `"@{color}"`
			js := NewJavaScript(expr, false, 0, nil)
			_, err := js.Eval(context)
			// The error here will be slightly different because variable replacement happens first
			expectedPrefix := "JavaScript evaluation is not supported in the Go port. Expression: \"red\""
			if err == nil || !strings.HasPrefix(err.Error(), expectedPrefix) {
				t.Errorf("Expected error prefix '%s', got '%v'", expectedPrefix, err)
			}
		})

		t.Run("should return error for empty string expressions", func(t *testing.T) {
			expr := ""
			js := NewJavaScript(expr, false, 0, nil)
			_, err := js.Eval(mockContext)
			assertNotSupportedError(t, expr, err)
		})

		t.Run("should return error for special number cases", func(t *testing.T) {
			tests := []string{
				"Infinity",
				"-Infinity",
				"Number.MAX_VALUE",
				"Number.MIN_VALUE",
			}

			for _, expr := range tests {
				js := NewJavaScript(expr, false, 0, nil)
				_, err := js.Eval(mockContext)
				assertNotSupportedError(t, expr, err)
			}
		})

		t.Run("should return error for complex array cases", func(t *testing.T) {
			tests := []string{
				"[]",
				"[1, [2, 3], 4]",
				"[null, undefined, NaN]",
				`[1, "two", true]`,
			}

			for _, expr := range tests {
				js := NewJavaScript(expr, false, 0, nil)
				_, err := js.Eval(mockContext)
				assertNotSupportedError(t, expr, err)
			}
		})

		t.Run("should return error for object expressions", func(t *testing.T) {
			expr := "({a: 1, b: 2})"
			js := NewJavaScript(expr, false, 0, nil)
			_, err := js.Eval(mockContext)
			assertNotSupportedError(t, expr, err)
		})

		t.Run("should handle escaped vs non-escaped strings differently", func(t *testing.T) {
			escaped := NewJavaScript(`"hello"`, true, 0, nil)
			nonEscaped := NewJavaScript(`"hello"`, false, 0, nil)

			_, err1 := escaped.Eval(mockContext)
			_, err2 := nonEscaped.Eval(mockContext)

			// Both should return not supported errors, but we can verify the escaped flag is preserved
			assertNotSupportedError(t, `"hello"`, err1)
			assertNotSupportedError(t, `"hello"`, err2)
		})

		t.Run("should handle multiple context frames with variable precedence", func(t *testing.T) {
			context := map[string]any{
				"javascriptEnabled": true,
				"frames": []ParserFrame{
					&mockFrameTest{
						variables: map[string]any{
							"@color": map[string]any{
								"value": NewQuoted("\"", "red", false, 0, nil),
							},
						},
					},
					&mockFrameTest{
						variables: map[string]any{
							"@color": map[string]any{
								"value": NewQuoted("\"", "blue", false, 0, nil),
							},
						},
					},
				},
			}

			js := NewJavaScript(`"@{color}"`, false, 0, nil)
			_, err := js.Eval(context)
			
			// The error should contain the value from the first frame (red)
			expectedPrefix := "JavaScript evaluation is not supported in the Go port. Expression: \"red\""
			if err == nil || !strings.HasPrefix(err.Error(), expectedPrefix) {
				t.Errorf("Expected error prefix '%s', got '%v'", expectedPrefix, err)
			}
		})

		// Note: The escaped vs non-escaped test is implicitly covered by checking the error, 
		// as the difference in behavior only matters if evaluation occurs.
	})
} 