package less

import (
	"testing"
)

// MockSourceMapBuilder implements a mock source map builder for testing
type MockSourceMapBuilder struct {
	SourceMapOptions any
	MockToCSS        func(any, map[string]any, *ImportManager) (string, error)
	MockGetExternalSourceMap func() string
}

func NewMockSourceMapBuilder(sourceMapOptions any) *MockSourceMapBuilder {
	return &MockSourceMapBuilder{
		SourceMapOptions: sourceMapOptions,
	}
}

func (m *MockSourceMapBuilder) ToCSS(evaldRoot any, options map[string]any, imports *ImportManager) (string, error) {
	if m.MockToCSS != nil {
		return m.MockToCSS(evaldRoot, options, imports)
	}
	return "body { color: red; }", nil
}

func (m *MockSourceMapBuilder) GetExternalSourceMap() string {
	if m.MockGetExternalSourceMap != nil {
		return m.MockGetExternalSourceMap()
	}
	return "{\"version\":3,\"sources\":[\"main.less\"],\"mappings\":\"AAAA\"}"
}

// MockEvaluatedRoot implements a mock evaluated root for testing
type MockEvaluatedRoot struct {
	MockToCSS func(map[string]any) (string, error)
}

func (m *MockEvaluatedRoot) ToCSS(options map[string]any) (string, error) {
	if m.MockToCSS != nil {
		return m.MockToCSS(options)
	}
	return "body { color: red; }", nil
}

// MockPostProcessor implements a mock post-processor for testing
type MockPostProcessor struct {
	MockProcess func(string, map[string]any) (string, error)
}

func (m *MockPostProcessor) Process(css string, options map[string]any) (string, error) {
	if m.MockProcess != nil {
		return m.MockProcess(css, options)
	}
	return css, nil
}

// MockPluginManager implements a mock plugin manager for testing
type MockPluginManager struct {
	MockGetPostProcessors func() []any
}

func (m *MockPluginManager) GetPostProcessors() []any {
	if m.MockGetPostProcessors != nil {
		return m.MockGetPostProcessors()
	}
	return []any{}
}

// setupTestData creates common test data for ParseTree tests
func setupTestData() (any, *ImportManager) {
	mockRoot := &MockEvaluatedRoot{}
	mockImports := &ImportManager{
		files: map[string]*FileCache{
			"main.less":    {Root: nil, Options: map[string]any{}},
			"import1.less": {Root: nil, Options: map[string]any{}}, 
			"import2.less": {Root: nil, Options: map[string]any{}},
		},
		rootFilename: "main.less",
		contents: map[string]string{
			"main.less": "body { color: red; }",
		},
	}
	return mockRoot, mockImports
}

func TestParseTreeConstructor(t *testing.T) {
	mockRoot, mockImports := setupTestData()
	
	// Create ParseTree class
	ptClass := DefaultParseTreeFactory(nil)
	parseTree := ptClass.NewParseTree(mockRoot, mockImports)
	
	if parseTree.Root != mockRoot {
		t.Errorf("Expected root to be %v, got %v", mockRoot, parseTree.Root)
	}
	
	if parseTree.Imports != mockImports {
		t.Errorf("Expected imports to be %v, got %v", mockImports, parseTree.Imports)
	}
}

func TestToCSSBasicFunctionality(t *testing.T) {
	mockRoot, mockImports := setupTestData()
	
	// Create ParseTree
	ptClass := DefaultParseTreeFactory(nil)
	parseTree := ptClass.NewParseTree(mockRoot, mockImports)
	
	// Basic options
	options := &ToCSSOptions{
		Compress:        false,
		StrictUnits:     true,
		DumpLineNumbers: "comments",
	}
	
	result, err := parseTree.ToCSS(options)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	
	if result.CSS != "body { color: red; }" {
		t.Errorf("Expected CSS to be 'body { color: red; }', got '%s'", result.CSS)
	}
	
	expectedImports := []string{"import1.less", "import2.less"}
	if len(result.Imports) != len(expectedImports) {
		t.Errorf("Expected %d imports, got %d", len(expectedImports), len(result.Imports))
	}
	
	for _, imp := range expectedImports {
		found := false
		for _, resultImp := range result.Imports {
			if resultImp == imp {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("Expected import '%s' not found in result", imp)
		}
	}
}

func TestToCSSMinimalOptions(t *testing.T) {
	mockRoot, mockImports := setupTestData()
	
	ptClass := DefaultParseTreeFactory(nil)
	parseTree := ptClass.NewParseTree(mockRoot, mockImports)
	
	// Minimal options (empty)
	options := &ToCSSOptions{}
	
	result, err := parseTree.ToCSS(options)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	
	if result.CSS != "body { color: red; }" {
		t.Errorf("Expected CSS to be 'body { color: red; }', got '%s'", result.CSS)
	}
}

func TestToCSSCompressOption(t *testing.T) {
	mockRoot, mockImports := setupTestData()
	
	ptClass := DefaultParseTreeFactory(nil)
	parseTree := ptClass.NewParseTree(mockRoot, mockImports)
	
	// Test compress option triggers warning
	options := &ToCSSOptions{
		Compress:    true,
		StrictUnits: true,
		DumpLineNumbers: "comments",
	}
	
	// For this test, we'll just ensure it doesn't error
	// The warning should be logged but we can't easily test that without more complex mock setup
	result, err := parseTree.ToCSS(options)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	
	if result.CSS != "body { color: red; }" {
		t.Errorf("Expected CSS to be 'body { color: red; }', got '%s'", result.CSS)
	}
}

func TestToCSSSourceMapGeneration(t *testing.T) {
	mockRoot, mockImports := setupTestData()
	
	// Create mock source map builder factory
	sourceMapBuilderFactory := func(sourceMapOptions any) any {
		builder := NewMockSourceMapBuilder(sourceMapOptions)
		builder.MockToCSS = func(evaldRoot any, options map[string]any, imports *ImportManager) (string, error) {
			return "body { color: red; }\n/*# sourceMappingURL=output.css.map */", nil
		}
		builder.MockGetExternalSourceMap = func() string {
			return "{\"version\":3,\"sources\":[\"main.less\"],\"mappings\":\"AAAA\"}"
		}
		return builder
	}
	
	ptClass := DefaultParseTreeFactory(sourceMapBuilderFactory)
	parseTree := ptClass.NewParseTree(mockRoot, mockImports)
	
	options := &ToCSSOptions{
		Compress:        false,
		StrictUnits:     true,
		DumpLineNumbers: "comments",
		SourceMap: map[string]any{
			"outputFilename":    "output.css",
			"sourceMapFilename": "output.css.map",
		},
	}
	
	result, err := parseTree.ToCSS(options)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	
	if result.CSS != "body { color: red; }\n/*# sourceMappingURL=output.css.map */" {
		t.Errorf("Expected CSS with source map comment, got '%s'", result.CSS)
	}
	
	if result.Map != "{\"version\":3,\"sources\":[\"main.less\"],\"mappings\":\"AAAA\"}" {
		t.Errorf("Expected source map data, got '%s'", result.Map)
	}
}

func TestToCSSPluginPostProcessors(t *testing.T) {
	mockRoot, mockImports := setupTestData()
	
	ptClass := DefaultParseTreeFactory(nil)
	parseTree := ptClass.NewParseTree(mockRoot, mockImports)
	
	// Create mock post-processors
	processor1 := &MockPostProcessor{
		MockProcess: func(css string, options map[string]any) (string, error) {
			return css + "\n/* Processed by 1 */", nil
		},
	}
	processor2 := &MockPostProcessor{
		MockProcess: func(css string, options map[string]any) (string, error) {
			return css + "\n/* Processed by 2 */", nil
		},
	}
	
	pluginManager := &MockPluginManager{
		MockGetPostProcessors: func() []any {
			return []any{processor1, processor2}
		},
	}
	
	options := &ToCSSOptions{
		Compress:      false,
		StrictUnits:   true,
		PluginManager: pluginManager,
	}
	
	result, err := parseTree.ToCSS(options)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	
	expectedCSS := "body { color: red; }\n/* Processed by 1 */\n/* Processed by 2 */"
	if result.CSS != expectedCSS {
		t.Errorf("Expected CSS '%s', got '%s'", expectedCSS, result.CSS)
	}
}

func TestToCSSImportsHandling(t *testing.T) {
	mockRoot := &MockEvaluatedRoot{}
	
	// Test with no imports
	mockImportsNoImports := &ImportManager{
		files: map[string]*FileCache{
			"main.less": {Root: nil, Options: map[string]any{}},
		},
		rootFilename: "main.less",
		contents: map[string]string{
			"main.less": "body { color: red; }",
		},
	}
	
	ptClass := DefaultParseTreeFactory(nil)
	parseTree := ptClass.NewParseTree(mockRoot, mockImportsNoImports)
	
	options := &ToCSSOptions{}
	
	result, err := parseTree.ToCSS(options)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	
	if len(result.Imports) != 0 {
		t.Errorf("Expected 0 imports, got %d", len(result.Imports))
	}
}

func TestToCSSEmptyImportsObject(t *testing.T) {
	mockRoot := &MockEvaluatedRoot{}
	
	mockImportsEmpty := &ImportManager{
		files:        map[string]*FileCache{},
		rootFilename: "main.less",
		contents:     map[string]string{},
	}
	
	ptClass := DefaultParseTreeFactory(nil)
	parseTree := ptClass.NewParseTree(mockRoot, mockImportsEmpty)
	
	options := &ToCSSOptions{}
	
	result, err := parseTree.ToCSS(options)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	
	if len(result.Imports) != 0 {
		t.Errorf("Expected 0 imports, got %d", len(result.Imports))
	}
}

func TestToCSSRootFilenameNotInFiles(t *testing.T) {
	mockRoot := &MockEvaluatedRoot{}
	
	mockImports := &ImportManager{
		files: map[string]*FileCache{
			"import1.less": {Root: nil, Options: map[string]any{}},
			"import2.less": {Root: nil, Options: map[string]any{}},
		},
		rootFilename: "nonexistent.less",
		contents: map[string]string{
			"import1.less": "body { color: blue; }",
			"import2.less": "body { color: green; }",
		},
	}
	
	ptClass := DefaultParseTreeFactory(nil)
	parseTree := ptClass.NewParseTree(mockRoot, mockImports)
	
	options := &ToCSSOptions{}
	
	result, err := parseTree.ToCSS(options)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	
	expectedImports := []string{"import1.less", "import2.less"}
	if len(result.Imports) != len(expectedImports) {
		t.Errorf("Expected %d imports, got %d", len(expectedImports), len(result.Imports))
	}
	
	for _, expectedImp := range expectedImports {
		found := false
		for _, resultImp := range result.Imports {
			if resultImp == expectedImp {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("Expected import '%s' not found in result", expectedImp)
		}
	}
}

func TestToCSSResultObjectStructure(t *testing.T) {
	mockRoot, mockImports := setupTestData()
	
	ptClass := DefaultParseTreeFactory(nil)
	parseTree := ptClass.NewParseTree(mockRoot, mockImports)
	
	options := &ToCSSOptions{}
	
	result, err := parseTree.ToCSS(options)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	
	// Test that result has required properties
	if result.CSS == "" {
		t.Error("Expected result.CSS to be non-empty")
	}
	
	if result.Imports == nil {
		t.Error("Expected result.Imports to be non-nil")
	}
	
	// Map should be empty when no source map is requested
	if result.Map != "" {
		t.Error("Expected result.Map to be empty when no source map requested")
	}
}

func TestToCSSResultObjectStructureWithSourceMap(t *testing.T) {
	mockRoot, mockImports := setupTestData()
	
	sourceMapBuilderFactory := func(sourceMapOptions any) any {
		builder := NewMockSourceMapBuilder(sourceMapOptions)
		builder.MockToCSS = func(evaldRoot any, options map[string]any, imports *ImportManager) (string, error) {
			return "css with map", nil
		}
		builder.MockGetExternalSourceMap = func() string {
			return "map data"
		}
		return builder
	}
	
	ptClass := DefaultParseTreeFactory(sourceMapBuilderFactory)
	parseTree := ptClass.NewParseTree(mockRoot, mockImports)
	
	options := &ToCSSOptions{
		SourceMap: map[string]any{},
	}
	
	result, err := parseTree.ToCSS(options)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	
	if result.CSS != "css with map" {
		t.Errorf("Expected CSS 'css with map', got '%s'", result.CSS)
	}
	
	if result.Imports == nil {
		t.Error("Expected result.Imports to be non-nil")
	}
	
	if result.Map != "map data" {
		t.Errorf("Expected result.Map 'map data', got '%s'", result.Map)
	}
}