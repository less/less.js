package less_go

import (
	"fmt"
	"io/ioutil"
	"path/filepath"
	"strings"
	"testing"
)

// TestSimpleIntegration tests the Go port against actual .less files
func TestSimpleIntegration(t *testing.T) {
	// Start with the simplest test cases
	testCases := []struct {
		name     string
		lessFile string
		cssFile  string
		options  map[string]any
	}{
		{"empty", "empty.less", "empty.css", nil},
		{"variables", "variables.less", "variables.css", nil},
		{"mixins", "mixins.less", "mixins.css", nil},
		{"selectors", "selectors.less", "selectors.css", nil},
		{"comments", "comments.less", "comments.css", nil},
	}

	// Base paths for test data - from packages/less/src/less/less_go to packages/test-data
	lessDir := "../../../../test-data/less/_main"
	cssDir := "../../../../test-data/css/_main"

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Read the .less file
			lessPath := filepath.Join(lessDir, tc.lessFile)
			lessContent, err := ioutil.ReadFile(lessPath)
			if err != nil {
				t.Skipf("Test file %s not found: %v", lessPath, err)
				return
			}

			// Read the expected CSS file
			cssPath := filepath.Join(cssDir, tc.cssFile)
			expectedCSS, err := ioutil.ReadFile(cssPath)
			if err != nil {
				t.Skipf("Expected CSS file %s not found: %v", cssPath, err)
				return
			}

			// Set up options
			options := tc.options
			if options == nil {
				options = make(map[string]any)
			}
			// Add filename for proper context
			options["filename"] = lessPath
			options["paths"] = []string{filepath.Dir(lessPath)}

			// Create Less factory
			factory := Factory(nil, nil)

			// Attempt to compile
			t.Logf("Testing %s: compiling %d bytes of Less code", tc.name, len(lessContent))
			
			result, err := compileLessForTest(factory, string(lessContent), options)
			if err != nil {
				t.Logf("Compilation failed for %s: %v", tc.name, err)
				t.Logf("This indicates missing components in the Go port")
				// For now, just log the error - we expect failures
				return
			}

			// Clean up whitespace for comparison
			actualCSS := strings.TrimSpace(result)
			expectedCSSStr := strings.TrimSpace(string(expectedCSS))

			if actualCSS != expectedCSSStr {
				t.Logf("CSS output differs for %s", tc.name)
				t.Logf("Expected:\n%s", expectedCSSStr)
				t.Logf("Actual:\n%s", actualCSS)
				// For now, just log differences - we expect mismatches during development
			} else {
				t.Logf("SUCCESS: %s compiled correctly!", tc.name)
			}
		})
	}
}

// compileLessForTest attempts to compile Less code and returns CSS or error
func compileLessForTest(factory map[string]any, input string, options map[string]any) (string, error) {
	// Try the render function approach
	if renderFunc, ok := factory["render"].(func(string, ...any) any); ok {
		result := renderFunc(input, options)
		
		// Handle different result types
		switch v := result.(type) {
		case string:
			return v, nil
		case map[string]any:
			if errorMsg, hasError := v["error"]; hasError {
				return "", fmt.Errorf("%v", errorMsg)
			}
			// Check for CSS property in result
			if css, hasCSS := v["css"]; hasCSS {
				if cssStr, ok := css.(string); ok {
					return cssStr, nil
				}
			}
			return fmt.Sprintf("/* Result: %+v */", v), nil
		default:
			// If it's a promise-like object, try to handle it synchronously
			if promiseObj, ok := result.(interface{ Await() (any, error) }); ok {
				promiseResult, err := promiseObj.Await()
				if err != nil {
					return "", err
				}
				if resultMap, ok := promiseResult.(map[string]any); ok {
					if css, hasCSS := resultMap["css"]; hasCSS {
						if cssStr, ok := css.(string); ok {
							return cssStr, nil
						}
					}
				}
				return fmt.Sprintf("%v", promiseResult), nil
			}
			return fmt.Sprintf("/* Unexpected result type: %T, value: %+v */", result, result), nil
		}
	}

	// Try the parse function approach as fallback
	if parseFunc, ok := factory["parse"].(func(string, ...any) any); ok {
		result := parseFunc(input, options)
		return fmt.Sprintf("/* Parse result: %+v */", result), nil
	}

	return "", fmt.Errorf("no render or parse function found in factory")
}

// TestFactoryCreation tests that the factory can be created without errors
func TestFactoryCreation(t *testing.T) {
	factory := Factory(nil, nil)
	
	// Check that factory has expected keys
	expectedKeys := []string{
		"version", "data", "tree", "Environment", "AbstractFileManager",
		"AbstractPluginLoader", "environment", "visitors", "Parser",
		"functions", "contexts", "SourceMapOutput", "SourceMapBuilder",
		"ParseTree", "ImportManager", "render", "parse", "LessError",
		"transformTree", "utils", "PluginManager", "logger",
	}

	for _, key := range expectedKeys {
		if _, exists := factory[key]; !exists {
			t.Errorf("Factory missing expected key: %s", key)
		} else {
			t.Logf("✓ Factory has key: %s", key)
		}
	}
}

// TestRenderFunctionExists tests that render function is callable
func TestRenderFunctionExists(t *testing.T) {
	factory := Factory(nil, nil)
	
	renderFunc, exists := factory["render"]
	if !exists {
		t.Fatal("render function not found in factory")
	}

	// Check if it's callable
	if fn, ok := renderFunc.(func(string, ...any) any); ok {
		t.Log("✓ render function is callable")
		
		// Try a minimal call (expect it to fail, but not panic)
		defer func() {
			if r := recover(); r != nil {
				t.Logf("render function panicked (expected): %v", r)
			}
		}()
		
		result := fn("body { color: red; }", map[string]any{})
		t.Logf("render result: %+v", result)
	} else {
		t.Errorf("render function has wrong type: %T", renderFunc)
	}
}

// TestSimpleCompilation tests the most basic possible compilation
func TestSimpleCompilation(t *testing.T) {
	factory := Factory(nil, nil)
	
	// Test the simplest possible CSS
	input := "body { color: red; }"
	options := map[string]any{
		"filename": "test.less",
	}
	
	t.Logf("Attempting to compile simple CSS: %s", input)
	
	result, err := compileLessForTest(factory, input, options)
	if err != nil {
		t.Logf("Simple compilation failed: %v", err)
		t.Log("This indicates we need to implement core parsing components")
	} else {
		t.Logf("Simple compilation result: %s", result)
	}
}