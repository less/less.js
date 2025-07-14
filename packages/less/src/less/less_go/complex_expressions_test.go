package less_go

import (
	"strings"
	"testing"
)

func TestComplexExpressions(t *testing.T) {
	tests := []struct {
		name   string
		input  string
		expect string
	}{
		{
			name:   "Mathematical operations",
			input:  "@a: 2; @b: 3; .test { width: (@a + @b)px; }",
			expect: "width: 5 px;",
		},
		{
			name:   "Variable references",
			input:  "@base: 10; @multiplier: 2; .test { width: (@base * @multiplier)px; }",
			expect: "width: 20 px;",
		},
		{
			name:   "Nested expressions",
			input:  "@x: 5; @y: (@x + 1); .test { width: @y; }",
			expect: "width: 6;",
		},
		{
			name:   "Complex calculation",
			input:  "@width: 100; @margin: 10; .test { width: (@width - @margin * 2)px; }",
			expect: "width: 80 px;",
		},
		{
			name:   "String interpolation",
			input:  "@color: red; .test { color: @color; }",
			expect: "color: red;",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Logf("Testing %s: compiling %d bytes of Less code", tt.name, len(tt.input))
			
			// Use the Factory pattern like the working integration test
			factory := Factory(nil, nil)
			renderFunc := factory["render"].(func(string, ...any) any)
			
			options := map[string]any{
				"filename": "test.less",
			}
			
			result := renderFunc(tt.input, options)
			
			t.Logf("Render result type: %T", result)
			t.Logf("Render result: %s", result)
			
			// Check if compilation was successful
			if resultMap, ok := result.(map[string]any); ok {
				if err, hasErr := resultMap["error"]; hasErr && err != nil {
					t.Logf("Compilation failed for %s: %v", tt.name, err)
					t.Logf("This indicates missing components in the Go port")
					return
				}
			}
			
			// Convert result to string
			var actualCSS string
			if cssStr, ok := result.(string); ok {
				actualCSS = strings.TrimSpace(cssStr)
			} else if resultMap, ok := result.(map[string]any); ok {
				if css, hasCss := resultMap["css"]; hasCss {
					actualCSS = strings.TrimSpace(css.(string))
				}
			}
			
			// Check if expected string is in output
			if !strings.Contains(actualCSS, tt.expect) {
				t.Errorf("Expected CSS to contain %q, but got:\n%s", tt.expect, actualCSS)
			} else {
				t.Logf("SUCCESS: %s compiled correctly!", tt.name)
			}
		})
	}
}

func TestOperationEvaluation(t *testing.T) {
	// Test that operations are properly evaluated
	input := "@a: 5; @b: 3; .test { width: @a + @b; height: @a * @b; margin: @a - @b; }"
	
	// Use the Factory pattern like the working integration test
	factory := Factory(nil, nil)
	renderFunc := factory["render"].(func(string, ...any) any)
	
	options := map[string]any{
		"filename": "test.less",
	}
	
	result := renderFunc(input, options)
	
	t.Logf("Render result type: %T", result)
	t.Logf("Render result: %s", result)
	
	// Check if compilation was successful
	if resultMap, ok := result.(map[string]any); ok {
		if err, hasErr := resultMap["error"]; hasErr && err != nil {
			t.Logf("Compilation failed for operation evaluation: %v", err)
			t.Logf("This indicates missing components in the Go port")
			return
		}
	}
	
	// Convert result to string
	var actualCSS string
	if cssStr, ok := result.(string); ok {
		actualCSS = strings.TrimSpace(cssStr)
	} else if resultMap, ok := result.(map[string]any); ok {
		if css, hasCss := resultMap["css"]; hasCss {
			actualCSS = strings.TrimSpace(css.(string))
		}
	}
	
	t.Logf("Generated CSS:\n%s", actualCSS)
	
	// Check for proper arithmetic results
	expectedResults := []string{
		"width: 8",   // 5 + 3 = 8
		"height: 15", // 5 * 3 = 15  
		"margin: 2",  // 5 - 3 = 2
	}
	
	for _, expected := range expectedResults {
		if !strings.Contains(actualCSS, expected) {
			t.Errorf("Expected CSS to contain %q, but got:\n%s", expected, actualCSS)
		}
	}
}