package less_go

import (
	"fmt"
	"strings"
	"testing"
)

func TestParentSelectorExpansion(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
		debug    bool
	}{
		{
			name: "basic parent selector",
			input: `.parent {
  &.modifier {
    color: red;
  }
}`,
			expected: `.parent.modifier {
  color: red;
}`,
		},
		{
			name: "parent selector with space",
			input: `.parent {
  & .child {
    color: blue;
  }
}`,
			expected: `.parent .child {
  color: blue;
}`,
			debug: true,
		},
		{
			name: "nested parent selectors",
			input: `.grandparent {
  .parent {
    &.modifier {
      color: green;
    }
  }
}`,
			expected: `.grandparent .parent.modifier {
  color: green;
}`,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			context := make(map[string]any)
			evalEnv := make(map[string]any)
			importManager := make(map[string]any)
			
			// Parse the input
			parser := NewParser(context, evalEnv, importManager, 0)
			
			var tree *Ruleset
			var parseErr *LessError
			parser.Parse(test.input, func(err *LessError, root *Ruleset) {
				parseErr = err
				tree = root
			}, nil)
			
			if parseErr != nil {
				t.Fatalf("Parse error: %v", parseErr)
			}
			if tree == nil {
				t.Fatalf("Parse error: tree is nil")
			}
			
			if test.debug {
				// Debug the parsed structure
				if parent, ok := tree.Rules[0].(*Ruleset); ok {
					if child, ok := parent.Rules[0].(*Ruleset); ok {
						if sel, ok := child.Selectors[0].(*Selector); ok {
							t.Logf("DEBUG: Parsed selector has %d elements", len(sel.Elements))
							for i, el := range sel.Elements {
								t.Logf("  Element[%d]: value='%v', combinator='%v', emptyOrWhitespace=%v", 
									i, el.Value, el.Combinator.Value, el.Combinator.EmptyOrWhitespace)
							}
						}
					}
				}
			}
			
			// Transform the tree
			transformed := TransformTree(tree, map[string]any{})
			
			// Generate CSS
			options := map[string]any{
				"compress": false,
			}
			
			// Assume transformed is a *Ruleset
			ruleset, ok := transformed.(*Ruleset)
			if !ok {
				t.Fatalf("Transform did not return a *Ruleset")
			}
			
			css, err := ruleset.ToCSS(options)
			if err != nil {
				t.Fatalf("ToCSS error: %v", err)
			}
			
			// Trim whitespace for comparison
			actualTrimmed := strings.TrimSpace(css)
			expectedTrimmed := strings.TrimSpace(test.expected)
			
			if actualTrimmed != expectedTrimmed {
				t.Errorf("CSS output mismatch\nInput:\n%s\n\nExpected:\n%s\n\nActual:\n%s", test.input, expectedTrimmed, actualTrimmed)
			}
		})
	}
}

func TestCombinatorParsing(t *testing.T) {
	inputs := []struct {
		name   string
		input  string
		expect string // Expected elements representation
	}{
		{"no space", "&.modifier", "& .modifier"},
		{"with space", "& .child", "& SPACE .child"},  
		{"direct child", "& > .child", "& > .child"},
	}
	
	for _, test := range inputs {
		t.Run(test.name, func(t *testing.T) {
			context := make(map[string]any)
			evalEnv := make(map[string]any)
			importManager := make(map[string]any)
			
			parser := NewParser(context, evalEnv, importManager, 0)
			
			// Parse the input wrapped in a parent selector
			lessInput := fmt.Sprintf(".test { %s { } }", test.input)
			
			var tree *Ruleset
			parser.Parse(lessInput, func(err *LessError, root *Ruleset) {
				tree = root
			}, nil)
			
			// Get the nested ruleset
			if len(tree.Rules) > 0 {
				if outerRuleset, ok := tree.Rules[0].(*Ruleset); ok {
					if len(outerRuleset.Rules) > 0 {
						if innerRuleset, ok := outerRuleset.Rules[0].(*Ruleset); ok {
							if len(innerRuleset.Selectors) > 0 {
								if sel, ok := innerRuleset.Selectors[0].(*Selector); ok {
									for i, el := range sel.Elements {
										t.Logf("  Element[%d]: value='%v', combinator='%v', emptyOrWhitespace=%v", 
											i, el.Value, el.Combinator.Value, el.Combinator.EmptyOrWhitespace)
									}
								}
							}
						}
					}
				}
			}
		})
	}
}