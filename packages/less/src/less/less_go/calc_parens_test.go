package less_go

import (
	"strings"
	"testing"
)

func TestCalcParentheses(t *testing.T) {
	testCases := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name: "simple parentheses",
			input: `.test {
				width: calc(100% - (10px + 10px));
			}`,
			expected: "calc(100% - (10px + 10px))",
		},
		{
			name: "nested parentheses",
			input: `.test {
				height: calc(100% - ((10px * 3) + (10px * 2)));
			}`,
			expected: "calc(100% - ((10px * 3) + (10px * 2)))",
		},
		{
			name: "variable with parentheses",
			input: `.test {
				@var: (10px + 20px);
				width: calc(100% - @var);
			}`,
			expected: "calc(100% - 30px)",
		},
		{
			name: "variable with division",
			input: `.test {
				@var: 50vh/2;
				width: calc(50% + (@var - 20px));
			}`,
			expected: "calc(50% + (25vh - 20px))",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Parse
			err, root := parseLess(tc.input, map[string]any{
				"compress": false,
				// Use default math mode to match JavaScript test
			}, nil)

			if err != nil {
				t.Fatalf("Parse error: %v", err)
			}

			// Transform
			ctx := map[string]any{
				"compress": false,
				// Use default math mode to match JavaScript test
			}
			transformed := TransformTree(root, ctx)

			// Generate CSS
			var css strings.Builder
			output := &CSSOutput{
				Add: func(chunk, fileInfo, index any) {
					if chunk != nil {
						css.WriteString(chunk.(string))
					}
				},
				IsEmpty: func() bool {
					return css.Len() == 0
				},
			}
			if ruleset, ok := transformed.(*Ruleset); ok {
				ruleset.GenCSS(ctx, output)
			}

			cssStr := css.String()
			
			// Check if expected string is in the output
			if !strings.Contains(cssStr, tc.expected) {
				t.Errorf("Expected to find '%s' in CSS output", tc.expected)
				t.Logf("Full CSS:\n%s", cssStr)
				
				// Extract just the calc part for easier debugging
				lines := strings.Split(cssStr, "\n")
				for _, line := range lines {
					if strings.Contains(line, "calc(") {
						t.Logf("Found calc line: %s", strings.TrimSpace(line))
					}
				}
			}
		})
	}
}