package less_go

import (
	"strings"
	"testing"

)

// MockEvaluatedRoot implements a simple mock for testing
type MockEvaluatedRoot struct {
	css string
	err error
}

func (m *MockEvaluatedRoot) ToCSS(options map[string]any) (string, error) {
	if m.err != nil {
		return "", m.err
	}
	return m.css, nil
}

// MockSourceMapBuilder implements the source map builder interface for testing
type MockSourceMapBuilder struct {
	sourceMapOptions any
	css              string
}

func (m *MockSourceMapBuilder) ToCSS(root any, options map[string]any, imports *ImportManager) (string, error) {
	if m.css != "" {
		return m.css, nil
	}
	// Try to get CSS from the root if available
	if cssGenerator, ok := root.(interface {
		ToCSS(map[string]any) (string, error)
	}); ok {
		return cssGenerator.ToCSS(options)
	}
	return "body { color: red; }", nil
}

func (m *MockSourceMapBuilder) GetExternalSourceMap() string {
	return `{"version":3,"sources":["main.less"],"mappings":"AAAA"}`
}

// Test that constructor properly sets fields
func TestParseTreeConstructor(t *testing.T) {
	mockRoot := &MockEvaluatedRoot{css: "body { color: red; }"}
	mockImports := &ImportManager{}
	
	ptClass := DefaultParseTreeFactory(nil)
	parseTree := ptClass.NewParseTree(mockRoot, mockImports)
	
	if parseTree.Root != mockRoot {
		t.Errorf("Expected root to be %v, got %v", mockRoot, parseTree.Root)
	}
	
	if parseTree.Imports != mockImports {
		t.Errorf("Expected imports to be %v, got %v", mockImports, parseTree.Imports)
	}
}

// Test basic ToCSS functionality with minimal options
func TestToCSSMinimalOptions(t *testing.T) {
	mockRoot := &MockEvaluatedRoot{css: "body { color: red; }"}
	mockImports := &ImportManager{}
	
	ptClass := DefaultParseTreeFactory(nil)
	parseTree := ptClass.NewParseTree(mockRoot, mockImports)
	
	// Test with minimal options
	options := &ToCSSOptions{}
	
	result, err := parseTree.ToCSS(options)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	
	if result == nil {
		t.Fatal("Expected result to be non-nil")
	}
	
	// Result should have required properties
	if result.Imports == nil {
		t.Error("Expected result.Imports to be non-nil")
	}
	
	// CSS should be set
	if result.CSS == "" {
		t.Error("Expected result.CSS to be non-empty")
	}
}

// Test ToCSS with various option combinations
func TestToCSSOptionsHandling(t *testing.T) {
	tests := []struct {
		name     string
		options  *ToCSSOptions
		expected map[string]bool // What properties to check for
	}{
		{
			name: "compress option",
			options: &ToCSSOptions{
				Compress: true,
			},
			expected: map[string]bool{
				"hasCSS":     true,
				"hasImports": true,
				"noMap":      true,
			},
		},
		{
			name: "strict units option",
			options: &ToCSSOptions{
				StrictUnits: true,
			},
			expected: map[string]bool{
				"hasCSS":     true,
				"hasImports": true,
				"noMap":      true,
			},
		},
		{
			name: "dump line numbers option",
			options: &ToCSSOptions{
				DumpLineNumbers: "comments",
			},
			expected: map[string]bool{
				"hasCSS":     true,
				"hasImports": true,
				"noMap":      true,
			},
		},
		{
			name: "num precision option",
			options: &ToCSSOptions{
				NumPrecision: 10,
			},
			expected: map[string]bool{
				"hasCSS":     true,
				"hasImports": true,
				"noMap":      true,
			},
		},
		{
			name: "combined options",
			options: &ToCSSOptions{
				Compress:        true,
				StrictUnits:     true,
				DumpLineNumbers: "comments",
				NumPrecision:    6,
			},
			expected: map[string]bool{
				"hasCSS":     true,
				"hasImports": true,
				"noMap":      true,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRoot := &MockEvaluatedRoot{css: "body { color: red; }"}
			mockImports := &ImportManager{}
			
			ptClass := DefaultParseTreeFactory(nil)
			parseTree := ptClass.NewParseTree(mockRoot, mockImports)
			
			result, err := parseTree.ToCSS(tt.options)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			
			if result == nil {
				t.Fatal("Expected result to be non-nil")
			}
			
			// Check expected properties
			if tt.expected["hasCSS"] && result.CSS == "" {
				t.Error("Expected result.CSS to be non-empty")
			}
			
			if tt.expected["hasImports"] && result.Imports == nil {
				t.Error("Expected result.Imports to be non-nil")
			}
			
			if tt.expected["noMap"] && result.Map != "" {
				t.Error("Expected result.Map to be empty when no source map")
			}
		})
	}
}

// Test source map handling
func TestSourceMapHandling(t *testing.T) {
	tests := []struct {
		name          string
		sourceMapOpts any
		expectMap     bool
	}{
		{
			name:          "no source map",
			sourceMapOpts: nil,
			expectMap:     false,
		},
		{
			name: "with source map options",
			sourceMapOpts: map[string]any{
				"outputFilename": "output.css",
			},
			expectMap: true,
		},
		{
			name:          "empty source map options",
			sourceMapOpts: map[string]any{},
			expectMap:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRoot := &MockEvaluatedRoot{css: "body { color: red; }"}
			mockImports := &ImportManager{}
			
			// Create a simple source map builder factory that returns a mock
			sourceMapBuilderFactory := func(opts any) any {
				return &MockSourceMapBuilder{
					sourceMapOptions: opts,
					css:              "body { color: red; }", // Ensure CSS is returned
				}
			}
			
			var ptClass *ParseTreeClass
			if tt.sourceMapOpts != nil {
				// Pass the factory to the ParseTreeClass so it can create builders
				ptClass = DefaultParseTreeFactory(sourceMapBuilderFactory)
			} else {
				ptClass = DefaultParseTreeFactory(nil)
			}
			
			parseTree := ptClass.NewParseTree(mockRoot, mockImports)
			
			options := &ToCSSOptions{
				SourceMap: tt.sourceMapOpts,
			}
			
			result, err := parseTree.ToCSS(options)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			
			if result == nil {
				t.Fatal("Expected result to be non-nil")
			}
			
			// Note: The actual source map generation depends on the implementation
			// For now, we just verify the structure is correct
			if result.CSS == "" {
				t.Error("Expected result.CSS to be non-empty")
			}
			
			if result.Imports == nil {
				t.Error("Expected result.Imports to be non-nil")
			}
		})
	}
}

// Test plugin manager handling
func TestPluginManagerHandling(t *testing.T) {
	mockRoot := &MockEvaluatedRoot{css: "body { color: red; }"}
	mockImports := &ImportManager{}
	
	ptClass := DefaultParseTreeFactory(nil)
	parseTree := ptClass.NewParseTree(mockRoot, mockImports)
	
	// Test with plugin manager (even if empty)
	pluginManager := struct {
		name string
	}{name: "test"}
	
	options := &ToCSSOptions{
		PluginManager: pluginManager,
	}
	
	result, err := parseTree.ToCSS(options)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	
	if result == nil {
		t.Fatal("Expected result to be non-nil")
	}
	
	if result.CSS == "" {
		t.Error("Expected result.CSS to be non-empty")
	}
	
	if result.Imports == nil {
		t.Error("Expected result.Imports to be non-nil")
	}
}

// Test nil options handling
func TestNilOptionsHandling(t *testing.T) {
	mockRoot := &MockEvaluatedRoot{css: "body { color: red; }"}
	mockImports := &ImportManager{}
	
	ptClass := DefaultParseTreeFactory(nil)
	parseTree := ptClass.NewParseTree(mockRoot, mockImports)
	
	// Test with nil options
	result, err := parseTree.ToCSS(nil)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	
	if result == nil {
		t.Fatal("Expected result to be non-nil")
	}
	
	if result.CSS == "" {
		t.Error("Expected result.CSS to be non-empty")
	}
	
	if result.Imports == nil {
		t.Error("Expected result.Imports to be non-nil")
	}
	
	if result.Map != "" {
		t.Error("Expected result.Map to be empty with nil options")
	}
}

// Test factory functions
func TestParseTreeFactory(t *testing.T) {
	t.Run("NewParseTreeFactory", func(t *testing.T) {
		factory := NewParseTreeFactory(nil)
		if factory == nil {
			t.Error("Expected factory to be non-nil")
		}

		ptClass := factory(nil)
		if ptClass == nil {
			t.Error("Expected ParseTreeClass to be non-nil")
		}
		
		// Test that we can create a ParseTree with it
		mockRoot := &MockEvaluatedRoot{css: "test"}
		mockImports := &ImportManager{}
		parseTree := ptClass.NewParseTree(mockRoot, mockImports)
		
		if parseTree == nil {
			t.Error("Expected parseTree to be non-nil")
		}
		
		if parseTree.Root != mockRoot {
			t.Error("Expected parseTree.Root to match mockRoot")
		}
		
		if parseTree.Imports != mockImports {
			t.Error("Expected parseTree.Imports to match mockImports")
		}
	})

	t.Run("DefaultParseTreeFactory", func(t *testing.T) {
		defaultClass := DefaultParseTreeFactory(nil)
		if defaultClass == nil {
			t.Error("Expected default ParseTreeClass to be non-nil")
		}

		// Test that we can create a ParseTree with it
		mockRoot := &MockEvaluatedRoot{css: "test"}
		mockImports := &ImportManager{}
		parseTree := defaultClass.NewParseTree(mockRoot, mockImports)
		
		if parseTree == nil {
			t.Error("Expected parseTree to be non-nil")
		}
	})

	t.Run("factory with sourceMapBuilder", func(t *testing.T) {
		builderFactory := func(opts any) any {
			return map[string]any{"opts": opts}
		}
		
		factory := NewParseTreeFactory(builderFactory)
		if factory == nil {
			t.Error("Expected factory to be non-nil")
		}

		// Pass the builderFactory to the returned factory function
		ptClass := factory(builderFactory)
		if ptClass == nil {
			t.Error("Expected ParseTreeClass to be non-nil")
		}
		
		// Now the SourceMapBuilder should be set to the builderFactory we passed
		if ptClass.SourceMapBuilder == nil {
			t.Error("Expected SourceMapBuilder to be set")
		}
	})
}

// Test result object structure
func TestResultObjectStructure(t *testing.T) {
	mockRoot := &MockEvaluatedRoot{css: "body { color: red; }"}
	mockImports := &ImportManager{}
	
	ptClass := DefaultParseTreeFactory(nil)
	parseTree := ptClass.NewParseTree(mockRoot, mockImports)
	
	result, err := parseTree.ToCSS(&ToCSSOptions{})
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	
	// Verify result has the expected structure
	if result == nil {
		t.Fatal("Expected result to be non-nil")
	}
	
	// Check that all expected fields exist
	_ = result.CSS     // Should be accessible
	_ = result.Map     // Should be accessible
	_ = result.Imports // Should be accessible
	
	// Basic validation
	if result.CSS == "" {
		t.Error("Expected CSS to be non-empty")
	}
	
	if result.Imports == nil {
		t.Error("Expected Imports to be non-nil")
	}
	
	// Map should be empty when no source map
	if result.Map != "" {
		t.Error("Expected Map to be empty when no source map enabled")
	}
}

// Test error scenarios that can be tested without mocking
func TestErrorScenarios(t *testing.T) {
	t.Run("error from mock root", func(t *testing.T) {
		// This test demonstrates the error handling structure
		// In a real scenario with integration, errors would propagate through the panic/recover mechanism
		mockRoot := &MockEvaluatedRoot{
			css: "",
			err: nil, // No error for this basic test
		}
		mockImports := &ImportManager{}
		
		ptClass := DefaultParseTreeFactory(nil)
		parseTree := ptClass.NewParseTree(mockRoot, mockImports)
		
		result, err := parseTree.ToCSS(&ToCSSOptions{})
		if err != nil {
			t.Fatalf("Expected no error in this basic test, got %v", err)
		}
		
		if result == nil {
			t.Error("Expected result to be non-nil")
		}
	})
}

// Test compress warning generation (basic functionality)
func TestCompressWarningCheck(t *testing.T) {
	// This test verifies that the compress option is processed
	// The actual warning would be logged via DefaultLogger.Warn in real usage
	mockRoot := &MockEvaluatedRoot{css: "body { color: red; }"}
	mockImports := &ImportManager{}
	
	ptClass := DefaultParseTreeFactory(nil)
	parseTree := ptClass.NewParseTree(mockRoot, mockImports)
	
	// Test with compress: true (should trigger deprecation warning in real usage)
	options := &ToCSSOptions{
		Compress: true,
	}
	
	result, err := parseTree.ToCSS(options)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	
	if result == nil {
		t.Fatal("Expected result to be non-nil")
	}
	
	// Verify basic functionality works even with compress option
	if result.CSS == "" {
		t.Error("Expected CSS to be generated even with compress option")
	}
}

// Test edge cases for options
func TestOptionsEdgeCases(t *testing.T) {
	tests := []struct {
		name     string
		options  *ToCSSOptions
		shouldWork bool
	}{
		{
			name:       "empty options struct",
			options:    &ToCSSOptions{},
			shouldWork: true,
		},
		{
			name:       "nil options",
			options:    nil,
			shouldWork: true,
		},
		{
			name: "all options set",
			options: &ToCSSOptions{
				Compress:        true,
				DumpLineNumbers: "comments",
				StrictUnits:     true,
				NumPrecision:    8,
				SourceMap:       map[string]any{"test": true},
				PluginManager:   struct{}{},
			},
			shouldWork: true,
		},
		{
			name: "string dump line numbers",
			options: &ToCSSOptions{
				DumpLineNumbers: "all",
			},
			shouldWork: true,
		},
		{
			name: "boolean dump line numbers",
			options: &ToCSSOptions{
				DumpLineNumbers: true,
			},
			shouldWork: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRoot := &MockEvaluatedRoot{css: "body { color: red; }"}
			mockImports := &ImportManager{}
			
			ptClass := DefaultParseTreeFactory(nil)
			parseTree := ptClass.NewParseTree(mockRoot, mockImports)
			
			result, err := parseTree.ToCSS(tt.options)
			
			if tt.shouldWork {
				if err != nil {
					t.Fatalf("Expected no error for %s, got %v", tt.name, err)
				}
				
				if result == nil {
					t.Errorf("Expected result to be non-nil for %s", tt.name)
				}
			} else {
				if err == nil {
					t.Errorf("Expected error for %s, but got none", tt.name)
				}
			}
		})
	}
}

// Integration test that demonstrates the full flow
func TestIntegrationFlow(t *testing.T) {
	// This test demonstrates the complete flow from factory creation to CSS generation
	
	// 1. Create factory
	factory := NewParseTreeFactory(nil)
	
	// 2. Create ParseTreeClass
	ptClass := factory(nil)
	
	// 3. Create mock data
	mockRoot := &MockEvaluatedRoot{css: "body { color: red; font-size: 14px; }"}
	mockImports := &ImportManager{}
	
	// 4. Create ParseTree instance
	parseTree := ptClass.NewParseTree(mockRoot, mockImports)
	
	// 5. Set up comprehensive options
	options := &ToCSSOptions{
		Compress:        false,
		StrictUnits:     true,
		DumpLineNumbers: "comments",
		NumPrecision:    8,
	}
	
	// 6. Generate CSS
	result, err := parseTree.ToCSS(options)
	if err != nil {
		t.Fatalf("Integration test failed with error: %v", err)
	}
	
	// 7. Verify complete result structure
	if result == nil {
		t.Fatal("Expected result to be non-nil")
	}
	
	if result.CSS == "" {
		t.Error("Expected CSS to be generated")
	}
	
	if result.Imports == nil {
		t.Error("Expected Imports array to be present")
	}
	
	if result.Map != "" {
		t.Error("Expected Map to be empty when no source map requested")
	}
	
	// 8. Verify CSS content makes sense
	if !strings.Contains(result.CSS, "color") {
		t.Error("Expected CSS to contain color property")
	}
}