package less_go

import (
	"testing"
)

// TestRenderPipeline investigates why parsed files produce no CSS output
func TestRenderPipeline(t *testing.T) {
	t.Run("trace_render_pipeline", func(t *testing.T) {
		// Create factory
		factory := Factory(nil, nil)
		
		// Simple CSS input that should parse
		input := "body { color: red; }"
		options := map[string]any{
			"filename": "test.less",
		}
		
		t.Logf("Testing input: %s", input)
		
		// Step 1: Test render function exists
		renderFunc, exists := factory["render"]
		if !exists {
			t.Fatal("render function not found in factory")
		}
		t.Logf("✓ Render function exists: %T", renderFunc)
		
		// Step 2: Call render function
		if fn, ok := renderFunc.(func(string, ...any) any); ok {
			result := fn(input, options)
			t.Logf("Render result type: %T", result)
			t.Logf("Render result value: %+v", result)
			
			// Analyze the result
			switch v := result.(type) {
			case string:
				if v == "" {
					t.Logf("❌ Result is empty string")
				} else {
					t.Logf("✓ Result is non-empty string: %s", v)
				}
			case map[string]any:
				t.Logf("Result is map with keys: %v", getMapKeys(v))
				if errorVal, hasError := v["error"]; hasError {
					t.Logf("❌ Result contains error: %v", errorVal)
				}
			case nil:
				t.Logf("❌ Result is nil")
			default:
				t.Logf("❌ Result is unexpected type: %T", v)
			}
		} else {
			t.Fatalf("render function has wrong type: %T", renderFunc)
		}
	})

	t.Run("trace_parse_function", func(t *testing.T) {
		// Test the parse function directly
		factory := Factory(nil, nil)
		
		parseFunc, exists := factory["parse"]
		if !exists {
			t.Fatal("parse function not found in factory")
		}
		t.Logf("✓ Parse function exists: %T", parseFunc)
		
		input := "body { color: red; }"
		options := map[string]any{
			"filename": "test.less",
		}
		
		if fn, ok := parseFunc.(func(string, ...any) any); ok {
			result := fn(input, options)
			t.Logf("Parse result type: %T", result)
			t.Logf("Parse result value: %+v", result)
			
			// Analyze parse result
			switch v := result.(type) {
			case map[string]any:
				t.Logf("Parse result is map with keys: %v", getMapKeys(v))
				if resultType, hasType := v["type"]; hasType {
					t.Logf("Parse result type field: %v", resultType)
				}
			case nil:
				t.Logf("❌ Parse result is nil")
			default:
				t.Logf("Parse result is type: %T", v)
			}
		}
	})

	t.Run("inspect_factory_components", func(t *testing.T) {
		factory := Factory(nil, nil)
		
		t.Logf("Factory components:")
		for key, value := range factory {
			t.Logf("  %s: %T", key, value)
		}
		
		// Check if ParseTree exists and is callable
		if parseTree, exists := factory["ParseTree"]; exists {
			t.Logf("ParseTree component: %T = %+v", parseTree, parseTree)
		}
		
		// Check render and parse function signatures
		if render, exists := factory["render"]; exists {
			t.Logf("Render function: %T", render)
		}
		
		if parse, exists := factory["parse"]; exists {
			t.Logf("Parse function: %T", parse)
		}
	})

	t.Run("trace_css_generation", func(t *testing.T) {
		// Test the CSS generation pipeline specifically
		factory := Factory(nil, nil)
		
		input := "body { color: red; }"
		options := map[string]any{"filename": "test.less"}
		
		// Get parse function and parse
		parseFunc, _ := factory["parse"].(func(string, ...any) any)
		parseResult := parseFunc(input, options)
		
		if ruleset, ok := parseResult.(*Ruleset); ok {
			t.Logf("✓ Parsed ruleset successfully")
			t.Logf("Ruleset details:")
			t.Logf("  Rules count: %d", len(ruleset.Rules))
			t.Logf("  Selectors count: %d", len(ruleset.Selectors))
			t.Logf("  Root: %v", ruleset.Root)
			t.Logf("  Paths count: %d", len(ruleset.Paths))
			
			// Inspect the rules to see what they contain
			for i, rule := range ruleset.Rules {
				if i < 3 { // Limit to first 3 rules
					if nestedRuleset, ok := rule.(*Ruleset); ok {
						t.Logf("  Rule %d is Ruleset: Root=%v, Selectors=%d, Rules=%d", i, nestedRuleset.Root, len(nestedRuleset.Selectors), len(nestedRuleset.Rules))
						if len(nestedRuleset.Selectors) > 0 {
							if selector, ok := nestedRuleset.Selectors[0].(interface{ GetIsOutput() bool }); ok {
								t.Logf("    First selector GetIsOutput: %v", selector.GetIsOutput())
							}
							t.Logf("    First selector: %+v", nestedRuleset.Selectors[0])
						}
					} else {
						t.Logf("  Rule %d type: %T = %+v", i, rule, rule)
					}
				}
			}
			
			// Test TransformTree
			optionsMap := map[string]any{
				"compress":      false,
				"strictUnits":   false,
				"numPrecision":  8,
			}
			
			t.Logf("Testing TransformTree...")
			evaldRoot := TransformTree(ruleset, optionsMap)
			t.Logf("TransformTree result type: %T", evaldRoot)
			
			// Check the transformed result structure
			if transformedRuleset, ok := evaldRoot.(*Ruleset); ok {
				t.Logf("After TransformTree:")
				t.Logf("  Root ruleset: Root=%v, Selectors=%d, Rules=%d, Paths=%d", transformedRuleset.Root, len(transformedRuleset.Selectors), len(transformedRuleset.Rules), len(transformedRuleset.Paths))
				
				// Check nested rulesets
				for i, rule := range transformedRuleset.Rules {
					if i < 3 {
						if nestedRuleset, ok := rule.(*Ruleset); ok {
							t.Logf("  Nested Rule %d: Root=%v, Selectors=%d, Rules=%d, Paths=%d", i, nestedRuleset.Root, len(nestedRuleset.Selectors), len(nestedRuleset.Rules), len(nestedRuleset.Paths))
						}
					}
				}
			}
			
			// Test ToCSS on the transformed root
			if cssGenerator, ok := evaldRoot.(interface {
				ToCSS(map[string]any) (string, error)
			}); ok {
				t.Logf("✓ evaldRoot implements ToCSS")
				css, err := cssGenerator.ToCSS(optionsMap)
				if err != nil {
					t.Logf("❌ ToCSS error: %v", err)
				} else {
					t.Logf("✓ ToCSS success: '%s'", css)
				}
			} else {
				t.Logf("❌ evaldRoot does not implement ToCSS interface")
			}
		} else {
			t.Fatalf("Parse result is not a Ruleset: %T", parseResult)
		}
	})
}

// Helper function to get map keys
func getMapKeys(m map[string]any) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}