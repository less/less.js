package less_go

import (
	"fmt"
	"strings"
	"testing"
)

// TestMergeRulesTruthiness tests that mergeRules correctly handles JavaScript truthiness
func TestMergeRulesTruthiness(t *testing.T) {
	tests := []struct {
		name        string
		merge       any
		shouldMerge bool
	}{
		{"nil merge", nil, false},
		{"false merge", false, false},
		{"true merge", true, true},
		{"empty string merge", "", false},
		{"plus merge", "+", true},
		{"comma merge", ",", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create two declarations with the same property name
			// First declaration without merge
			decl1, _ := NewDeclaration("color", "red", nil, false, 0, nil, false, false)
			// Second declaration with the merge value we're testing
			decl2, _ := NewDeclaration("color", "blue", nil, tt.merge, 0, nil, false, false)
			rules := []any{decl1, decl2}
			
			// Create visitor
			ctx := map[string]any{"compress": false}
			visitor := NewToCSSVisitor(ctx)
			
			// Run mergeRules
			result := visitor.mergeRules(rules)
			
			// Check if the rules were merged
			if tt.shouldMerge {
				// When merge is truthy, the second rule should be removed and merged into first
				if len(result) != 1 {
					t.Errorf("Expected 1 merged rule, but got %d rules", len(result))
				}
				// The remaining rule should have a merged value
				if len(result) > 0 {
					if decl, ok := result[0].(*Declaration); ok {
						if decl.Value == nil || len(decl.Value.Value) == 0 {
							t.Errorf("Expected merged declaration to have a value")
						}
					}
				}
			} else {
				// When merge is falsy, both rules should remain
				if len(result) != 2 {
					t.Errorf("Expected 2 unmerged rules, but got %d rules", len(result))
				}
			}
		})
	}
}

// TestDeclarationToCSS tests that Declaration.ToCSS method works correctly
func TestDeclarationToCSS(t *testing.T) {
	tests := []struct {
		name     string
		property string
		value    any
		expected string
		compress bool
	}{
		{
			name:     "simple color declaration",
			property: "color",
			value:    NewColor([]float64{255, 0, 0}, 1, ""),
			expected: "color: #ff0000;",
			compress: false,
		},
		{
			name:     "compressed color declaration",
			property: "background",
			value:    NewColor([]float64{0, 128, 255}, 1, ""),
			expected: "background:#0080ff;",
			compress: true,
		},
		{
			name:     "dimension declaration",
			property: "width",
			value:    &Dimension{Node: NewNode(), Value: 100, Unit: &Unit{Node: NewNode(), Numerator: []string{"px"}}},
			expected: "width: 100px;",
			compress: false,
		},
		{
			name:     "string value declaration",
			property: "content",
			value:    NewQuoted("\"", "hello world", false, 0, nil),
			expected: "content: \"hello world\";",
			compress: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create value
			val, _ := NewValue([]any{tt.value})
			
			// Create declaration
			decl, _ := NewDeclaration(tt.property, val, nil, false, 0, nil, false, false)
			
			// Create context
			ctx := map[string]any{"compress": tt.compress}
			
			// Get CSS
			css := decl.ToCSS(ctx)
			
			if css != tt.expected {
				t.Errorf("Expected CSS %q, got %q", tt.expected, css)
			}
		})
	}
}

// TestRemoveDuplicateRules tests that removeDuplicateRules correctly handles duplicates
func TestRemoveDuplicateRules(t *testing.T) {
	// Create context
	ctx := map[string]any{"compress": false}
	visitor := NewToCSSVisitor(ctx)
	
	// Create declarations with different values
	col1 := NewColor([]float64{255, 0, 0}, 1, "")
	val1, _ := NewValue([]any{col1})
	decl1, _ := NewDeclaration("color", val1, nil, false, 0, nil, false, false)
	
	col2 := NewColor([]float64{0, 128, 255}, 1, "")
	val2, _ := NewValue([]any{col2})
	decl2, _ := NewDeclaration("color", val2, nil, false, 0, nil, false, false)
	
	col3 := NewColor([]float64{100, 100, 100}, 1, "")
	val3, _ := NewValue([]any{col3})
	decl3, _ := NewDeclaration("color", val3, nil, false, 0, nil, false, false)
	
	// Test 1: No duplicates - all should remain
	t.Run("no duplicates", func(t *testing.T) {
		rules := []any{decl1, decl2, decl3}
		result := visitor.removeDuplicateRules(rules)
		
		if len(result) != 3 {
			t.Errorf("Expected 3 rules, got %d", len(result))
		}
		
		// Check CSS output order
		css1 := result[0].(*Declaration).ToCSS(ctx)
		css2 := result[1].(*Declaration).ToCSS(ctx)
		css3 := result[2].(*Declaration).ToCSS(ctx)
		
		if !strings.Contains(css1, "#ff0000") {
			t.Errorf("First declaration should have red color")
		}
		if !strings.Contains(css2, "#0080ff") {
			t.Errorf("Second declaration should have blue color")
		}
		if !strings.Contains(css3, "#646464") {
			t.Errorf("Third declaration should have gray color")
		}
	})
	
	// Test 2: Duplicate values - duplicates should be removed
	t.Run("with duplicates", func(t *testing.T) {
		// Create duplicate of decl2
		col2Dup := NewColor([]float64{0, 128, 255}, 1, "")
		val2Dup, _ := NewValue([]any{col2Dup})
		decl2Dup, _ := NewDeclaration("color", val2Dup, nil, false, 0, nil, false, false)
		
		rules := []any{decl1, decl2, decl2Dup, decl3}
		result := visitor.removeDuplicateRules(rules)
		
		if len(result) != 3 {
			t.Errorf("Expected 3 rules after removing duplicate, got %d", len(result))
		}
		
		// The duplicate should be removed, keeping first occurrence
		if len(result) >= 2 {
			css2 := result[1].(*Declaration).ToCSS(ctx)
			if !strings.Contains(css2, "#0080ff") {
				t.Errorf("Second declaration should still have blue color")
			}
		}
	})
	
	// Test 3: Different properties - all should remain
	t.Run("different properties", func(t *testing.T) {
		declBg, _ := NewDeclaration("background", val2, nil, false, 0, nil, false, false)
		declBorder, _ := NewDeclaration("border", val3, nil, false, 0, nil, false, false)
		
		rules := []any{decl1, declBg, declBorder}
		result := visitor.removeDuplicateRules(rules)
		
		if len(result) != 3 {
			t.Errorf("Expected 3 rules with different properties, got %d", len(result))
		}
	})
}

// TestMultipleSamePropertyDeclarations tests the full CSS generation for multiple declarations with same property
func TestMultipleSamePropertyDeclarations(t *testing.T) {
	// Create a ruleset with multiple color declarations
	col1 := NewColor([]float64{255, 0, 0}, 1, "")
	val1, _ := NewValue([]any{col1})
	decl1, _ := NewDeclaration("color", val1, nil, false, 0, nil, false, false)
	
	col2 := NewColor([]float64{0, 128, 255}, 1, "")
	val2, _ := NewValue([]any{col2})
	decl2, _ := NewDeclaration("color", val2, nil, false, 0, nil, false, false)
	
	col3 := NewColor([]float64{100, 100, 100}, 1, "")
	val3, _ := NewValue([]any{col3})
	decl3, _ := NewDeclaration("color", val3, nil, false, 0, nil, false, false)
	
	// Create selector
	elem := NewElement(nil, "foo", false, 0, nil, nil)
	sel, _ := NewSelector([]*Element{elem}, nil, nil, 0, nil, nil)

	// Create ruleset
	ruleset := NewRuleset([]any{sel}, []any{decl1, decl2, decl3}, false, nil)

	// Set Paths to match what JoinSelectorVisitor would create
	// This is required for GenCSS to work (matching JavaScript behavior)
	ruleset.Paths = [][]any{{sel}}

	// Create context
	ctx := map[string]any{"compress": false}
	
	// Generate CSS
	chunks := []string{}
	output := &CSSOutput{
		Add: func(chunk any, fileInfo any, index any) {
			chunks = append(chunks, fmt.Sprintf("%v", chunk))
		},
		IsEmpty: func() bool {
			return len(chunks) == 0
		},
	}
	
	ruleset.GenCSS(ctx, output)
	css := strings.Join(chunks, "")
	
	// Check that all three color declarations are present
	if !strings.Contains(css, "#ff0000") {
		t.Errorf("Expected CSS to contain #ff0000 (red)")
	}
	if !strings.Contains(css, "#0080ff") {
		t.Errorf("Expected CSS to contain #0080ff (blue)")  
	}
	if !strings.Contains(css, "#646464") {
		t.Errorf("Expected CSS to contain #646464 (gray)")
	}
	
	// Check the order is preserved
	redIndex := strings.Index(css, "#ff0000")
	blueIndex := strings.Index(css, "#0080ff")
	grayIndex := strings.Index(css, "#646464")
	
	if redIndex > blueIndex || blueIndex > grayIndex {
		t.Errorf("Expected colors to appear in order: red, blue, gray")
	}
}