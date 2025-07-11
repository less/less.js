package less_go

import (
	"reflect"
	"testing"
)

// Mock structures for testing
type ImportMockNode struct {
	VisibilityBlocks *int
	NodeVisible     *bool
}

func (m *ImportMockNode) CopyVisibilityInfo(info map[string]any) {
	if info != nil {
		if blocks, ok := info["visibilityBlocks"].(*int); ok {
			m.VisibilityBlocks = blocks
		}
		if visible, ok := info["nodeVisible"].(*bool); ok {
			m.NodeVisible = visible
		}
	}
}

func (m *ImportMockNode) SetParent(nodes any, parent any) {
	// Mock implementation
}

func (m *ImportMockNode) VisibilityInfo() map[string]any {
	return map[string]any{
		"visibilityBlocks": m.VisibilityBlocks,
		"nodeVisible":     m.NodeVisible,
	}
}

func (m *ImportMockNode) BlocksVisibility() bool {
	if m.VisibilityBlocks == nil {
		return false
	}
	return *m.VisibilityBlocks != 0
}

func (m *ImportMockNode) AddVisibilityBlock() {
	if m.VisibilityBlocks == nil {
		zero := 0
		m.VisibilityBlocks = &zero
	}
	*m.VisibilityBlocks++
}

type MockPath struct {
	Type      string
	Value     string
	EvalFunc  func(any) (any, error)
	GenCSSFunc func(any, *CSSOutput)
	FileInfo_ map[string]any
}

func (m *MockPath) Eval(context any) (any, error) {
	if m.EvalFunc != nil {
		return m.EvalFunc(context)
	}
	return map[string]any{"value": m.Value}, nil
}

func (m *MockPath) GenCSS(context any, output *CSSOutput) {
	if m.GenCSSFunc != nil {
		m.GenCSSFunc(context, output)
	} else {
		output.Add(m.Value, nil, nil)
	}
}

func (m *MockPath) FileInfo() map[string]any {
	return m.FileInfo_
}

func (m *MockPath) GetValue() any {
	return m.Value
}

type MockFeatures struct {
	Type     string
	Value    any
	EvalFunc func(any) (any, error)
	GenCSSFunc func(any, *CSSOutput)
}

func (m *MockFeatures) Eval(context any) (any, error) {
	if m.EvalFunc != nil {
		return m.EvalFunc(context)
	}
	return map[string]any{"value": m.Value}, nil
}

func (m *MockFeatures) GenCSS(context any, output *CSSOutput) {
	if m.GenCSSFunc != nil {
		m.GenCSSFunc(context, output)
	} else {
		output.Add("screen", nil, nil)
	}
}

func (m *MockFeatures) GetValue() any {
	return m.Value
}

type ImportMockVisitor struct {
	VisitFunc func(any) any
}

func (m *ImportMockVisitor) Visit(node any) any {
	if m.VisitFunc != nil {
		return m.VisitFunc(node)
	}
	return node
}

func TestImportConstructor(t *testing.T) {
	mockFileInfo := map[string]any{
		"filename":         "test.less",
		"currentDirectory": "/test",
		"rootpath":         "/root/",
	}

	mockVisibilityInfo := map[string]any{
		"visibilityBlocks": func() *int { i := 1; return &i }(),
		"nodeVisible":     func() *bool { b := true; return &b }(),
	}

	mockPath := &MockPath{
		Type:  "Quoted",
		Value: "test.less",
		FileInfo_: map[string]any{"reference": nil},
	}

	mockFeatures := &MockFeatures{
		Type:  "Expression",
		Value: []any{map[string]any{"type": "Keyword", "value": "screen"}},
	}

	mockOptions := map[string]any{
		"less":      true,
		"inline":    false,
		"isPlugin":  false,
		"reference": false,
	}

	t.Run("should create an Import instance with all parameters", func(t *testing.T) {
		importNode := NewImport(mockPath, mockFeatures, mockOptions, 10, mockFileInfo, mockVisibilityInfo)

		if importNode.path != mockPath {
			t.Errorf("Expected path to be set")
		}
		if importNode.features != mockFeatures {
			t.Errorf("Expected features to be set")
		}
		if !reflect.DeepEqual(importNode.options, mockOptions) {
			t.Errorf("Expected options to be set")
		}
		if importNode._index != 10 {
			t.Errorf("Expected index to be 10, got %d", importNode._index)
		}
		if !reflect.DeepEqual(importNode._fileInfo, mockFileInfo) {
			t.Errorf("Expected fileInfo to be set")
		}
		if !importNode.allowRoot {
			t.Errorf("Expected allowRoot to be true")
		}
	})

	t.Run("should set css to false when options.less is true", func(t *testing.T) {
		options := map[string]any{"less": true, "inline": false}
		importNode := NewImport(mockPath, mockFeatures, options, 0, mockFileInfo, nil)

		if importNode.css {
			t.Errorf("Expected css to be false")
		}
	})

	t.Run("should set css to true when options.less is false", func(t *testing.T) {
		options := map[string]any{"less": false, "inline": false}
		importNode := NewImport(mockPath, mockFeatures, options, 0, mockFileInfo, nil)

		if !importNode.css {
			t.Errorf("Expected css to be true")
		}
	})

	t.Run("should set css to true when options.inline is true", func(t *testing.T) {
		options := map[string]any{"less": false, "inline": true}
		importNode := NewImport(mockPath, mockFeatures, options, 0, mockFileInfo, nil)

		if !importNode.css {
			t.Errorf("Expected css to be true")
		}
	})

	t.Run("should detect CSS files by extension", func(t *testing.T) {
		cssPath := &MockPath{
			Type:  "Quoted",
			Value: "styles.css",
		}

		importNode := NewImport(cssPath, mockFeatures, map[string]any{}, 0, mockFileInfo, nil)

		if !importNode.css {
			t.Errorf("Expected css to be true for .css file")
		}
	})

	t.Run("should detect CSS files with query parameters", func(t *testing.T) {
		cssPath := &MockPath{
			Type:  "Quoted",
			Value: "styles.css?v=1",
		}

		importNode := NewImport(cssPath, mockFeatures, map[string]any{}, 0, mockFileInfo, nil)

		if !importNode.css {
			t.Errorf("Expected css to be true for .css file with query params")
		}
	})
}

func TestImportType(t *testing.T) {
	mockPath := &MockPath{Value: "test.less"}
	importNode := NewImport(mockPath, nil, map[string]any{}, 0, nil, nil)

	if importNode.GetType() != "Import" {
		t.Errorf("Expected type to be 'Import', got %s", importNode.GetType())
	}
}

func TestImportAccept(t *testing.T) {
	mockPath := &MockPath{
		Type:  "Quoted",
		Value: "test.less",
	}
	mockFeatures := &MockFeatures{
		Type:  "Expression",
		Value: "screen",
	}

	visited := false
	visitor := &ImportMockVisitor{
		VisitFunc: func(node any) any {
			visited = true
			if m, ok := node.(*MockPath); ok {
				return &MockPath{Type: m.Type, Value: m.Value + "_visited"}
			}
			if m, ok := node.(*MockFeatures); ok {
				return &MockFeatures{Type: m.Type, Value: m.Value}
			}
			return node
		},
	}

	importNode := NewImport(mockPath, mockFeatures, map[string]any{}, 0, nil, nil)
	importNode.Accept(visitor)

	if !visited {
		t.Errorf("Expected visitor to be called")
	}
}

func TestImportGenCSS(t *testing.T) {
	t.Run("should generate CSS for CSS imports", func(t *testing.T) {
		var output []string
		mockOutput := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				output = append(output, chunk.(string))
			},
		}

		mockPath := &MockPath{
			Value: "test.css",
			GenCSSFunc: func(context any, output *CSSOutput) {
				output.Add("\"test.css\"", nil, nil)
			},
			FileInfo_: map[string]any{"reference": nil},
		}
		mockFeatures := &MockFeatures{
			Value: "screen",
			GenCSSFunc: func(context any, output *CSSOutput) {
				output.Add("screen", nil, nil)
			},
		}

		options := map[string]any{"less": false}
		fileInfo := map[string]any{"filename": "test.less"}
		importNode := NewImport(mockPath, mockFeatures, options, 5, fileInfo, nil)

		importNode.GenCSS(nil, mockOutput)

		expected := []string{"@import ", "\"test.css\"", " ", "screen", ";"}
		if !reflect.DeepEqual(output, expected) {
			t.Errorf("Expected output %v, got %v", expected, output)
		}
	})

	t.Run("should generate CSS without features when features is null", func(t *testing.T) {
		var output []string
		mockOutput := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				output = append(output, chunk.(string))
			},
		}

		mockPath := &MockPath{
			Value: "test.css",
			GenCSSFunc: func(context any, output *CSSOutput) {
				output.Add("\"test.css\"", nil, nil)
			},
			FileInfo_: map[string]any{"reference": nil},
		}

		options := map[string]any{"less": false}
		fileInfo := map[string]any{"filename": "test.less"}
		importNode := NewImport(mockPath, nil, options, 5, fileInfo, nil)

		importNode.GenCSS(nil, mockOutput)

		expected := []string{"@import ", "\"test.css\"", ";"}
		if !reflect.DeepEqual(output, expected) {
			t.Errorf("Expected output %v, got %v", expected, output)
		}
	})

	t.Run("should not generate CSS for non-CSS imports", func(t *testing.T) {
		var output []string
		mockOutput := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				output = append(output, chunk.(string))
			},
		}

		mockPath := &MockPath{Value: "test.less"}
		options := map[string]any{"less": true}
		importNode := NewImport(mockPath, nil, options, 5, nil, nil)

		importNode.GenCSS(nil, mockOutput)

		if len(output) > 0 {
			t.Errorf("Expected no output for non-CSS imports, got %v", output)
		}
	})
}

func TestImportGetPath(t *testing.T) {
	t.Run("should return path value for regular paths", func(t *testing.T) {
		path := map[string]any{"value": "test.less"}
		importNode := NewImport(path, nil, map[string]any{}, 0, nil, nil)

		result := importNode.GetPath()
		if result != "test.less" {
			t.Errorf("Expected 'test.less', got %v", result)
		}
	})

	t.Run("should return nested value for URL paths", func(t *testing.T) {
		urlPath := &URL{value: map[string]any{"value": "test.less"}}
		importNode := NewImport(urlPath, nil, map[string]any{}, 0, nil, nil)

		result := importNode.GetPath()
		if result != "test.less" {
			t.Errorf("Expected 'test.less', got %v", result)
		}
	})
}

func TestImportIsVariableImport(t *testing.T) {
	t.Run("should return true for variable imports in quoted strings", func(t *testing.T) {
		quotedPath := &Quoted{
			value: "@{var}/test.less",
		}
		importNode := NewImport(quotedPath, nil, map[string]any{}, 0, nil, nil)

		result := importNode.IsVariableImport()
		if !result {
			t.Errorf("Expected true for variable imports")
		}
	})

	t.Run("should return false for non-variable imports in quoted strings", func(t *testing.T) {
		quotedPath := &Quoted{
			value: "test.less",
		}
		importNode := NewImport(quotedPath, nil, map[string]any{}, 0, nil, nil)

		result := importNode.IsVariableImport()
		if result {
			t.Errorf("Expected false for non-variable imports")
		}
	})

	t.Run("should return true for non-quoted paths", func(t *testing.T) {
		path := map[string]any{
			"type":  "Anonymous",
			"value": "test.less",
		}
		importNode := NewImport(path, nil, map[string]any{}, 0, nil, nil)

		result := importNode.IsVariableImport()
		if !result {
			t.Errorf("Expected true for non-quoted paths")
		}
	})
}

func TestImportEvalForImport(t *testing.T) {
	mockPath := &MockPath{
		Value: "test.less",
		EvalFunc: func(context any) (any, error) {
			return map[string]any{"value": "evaluated.less"}, nil
		},
	}
	mockFeatures := &MockFeatures{Value: "screen"}
	mockOptions := map[string]any{"less": true}
	fileInfo := map[string]any{"filename": "test.less"}
	visibilityInfo := map[string]any{"visibilityBlocks": 1}

	importNode := NewImport(mockPath, mockFeatures, mockOptions, 5, fileInfo, visibilityInfo)
	context := map[string]any{}

	result := importNode.EvalForImport(context)

	if result == nil {
		t.Errorf("Expected result to be non-nil")
		return
	}
	if result.features != mockFeatures {
		t.Errorf("Expected features to be preserved")
	}
	if !reflect.DeepEqual(result.options, mockOptions) {
		t.Errorf("Expected options to be preserved")
	}
	if result._index != 5 {
		t.Errorf("Expected index to be preserved")
	}
}

func TestImportEvalPath(t *testing.T) {
	t.Run("should evaluate path and rewrite if required", func(t *testing.T) {
		mockPath := &MockPath{
			Value: "test.less",
			EvalFunc: func(context any) (any, error) {
				return map[string]any{"value": "test.less"}, nil
			},
		}

		context := map[string]any{
			"pathRequiresRewrite": func(path string) bool { return true },
			"rewritePath": func(path, rootpath string) string {
				return rootpath + path
			},
		}

		fileInfo := map[string]any{"rootpath": "/root/"}
		importNode := NewImport(mockPath, nil, map[string]any{}, 0, fileInfo, nil)

		result := importNode.EvalPath(context)

		if resultMap, ok := result.(map[string]any); ok {
			if resultMap["value"] != "/root/test.less" {
				t.Errorf("Expected '/root/test.less', got %v", resultMap["value"])
			}
		} else {
			t.Errorf("Expected result to be a map with rewritten path")
		}
	})

	t.Run("should evaluate path and normalize if rewrite not required", func(t *testing.T) {
		mockPath := &MockPath{
			Value: "test.less",
			EvalFunc: func(context any) (any, error) {
				return map[string]any{"value": "test.less"}, nil
			},
		}

		context := map[string]any{
			"pathRequiresRewrite": func(path string) bool { return false },
			"normalizePath": func(path string) string {
				return "normalized/" + path
			},
		}

		fileInfo := map[string]any{"rootpath": "/root/"}
		importNode := NewImport(mockPath, nil, map[string]any{}, 0, fileInfo, nil)

		result := importNode.EvalPath(context)

		if resultMap, ok := result.(map[string]any); ok {
			if resultMap["value"] != "normalized/test.less" {
				t.Errorf("Expected 'normalized/test.less', got %v", resultMap["value"])
			}
		} else {
			t.Errorf("Expected result to be a map with normalized path")
		}
	})
}

func TestImportEval(t *testing.T) {
	t.Run("should call doEval and add visibility blocks for reference imports", func(t *testing.T) {
		options := map[string]any{"reference": true}
		importNode := NewImport(&MockPath{Value: "test.less"}, nil, options, 0, nil, nil)

		// Mock the DoEval method by creating a simple result
		result, err := importNode.Eval(map[string]any{})

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		if result == nil {
			t.Errorf("Expected result to be non-nil")
		}
	})
}

func TestImportDoEval(t *testing.T) {
	t.Run("should handle plugin imports with successful evaluation", func(t *testing.T) {
		options := map[string]any{"isPlugin": true}
		mockRoot := &struct {
			evalCalled bool
		}{}

		importNode := NewImport(&MockPath{Value: "test.less"}, nil, options, 0, nil, nil)
		importNode.root = mockRoot

		context := map[string]any{
			"frames": []any{&Ruleset{FunctionRegistry: map[string]any{}}},
		}

		result, err := importNode.DoEval(context)

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		if resultSlice, ok := result.([]any); !ok || len(resultSlice) != 0 {
			t.Errorf("Expected empty slice for plugin imports, got %v", result)
		}
	})

	t.Run("should skip import when skip is true", func(t *testing.T) {
		importNode := NewImport(&MockPath{Value: "test.less"}, nil, map[string]any{}, 0, nil, nil)
		importNode.skip = true

		result, err := importNode.DoEval(map[string]any{})

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		if resultSlice, ok := result.([]any); !ok || len(resultSlice) != 0 {
			t.Errorf("Expected empty slice for skipped imports, got %v", result)
		}
	})

	t.Run("should handle inline imports", func(t *testing.T) {
		options := map[string]any{"inline": true}
		importNode := NewImport(&MockPath{Value: "test.less"}, nil, options, 0, nil, nil)
		importNode.root = map[string]any{"rules": []any{}}
		importNode.importedFilename = "imported.less"

		result, err := importNode.DoEval(map[string]any{})

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		if resultSlice, ok := result.([]any); !ok || len(resultSlice) == 0 {
			t.Errorf("Expected non-empty result for inline imports, got %v", result)
		}
	})

	t.Run("should handle CSS imports", func(t *testing.T) {
		options := map[string]any{"less": false}
		mockPath := &MockPath{
			Value: "test.css",
			EvalFunc: func(context any) (any, error) {
				return map[string]any{"value": "evaluated.css"}, nil
			},
		}
		importNode := NewImport(mockPath, nil, options, 0, nil, nil)

		result, err := importNode.DoEval(map[string]any{})

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		if resultImport, ok := result.(*Import); !ok || !resultImport.css {
			t.Errorf("Expected CSS import result, got %v", result)
		}
	})

	t.Run("should return empty array when no root", func(t *testing.T) {
		importNode := NewImport(&MockPath{Value: "test.less"}, nil, map[string]any{}, 0, nil, nil)

		result, err := importNode.DoEval(map[string]any{})

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		if resultSlice, ok := result.([]any); !ok || len(resultSlice) != 0 {
			t.Errorf("Expected empty slice when no root, got %v", result)
		}
	})
}

func TestImportEdgeCases(t *testing.T) {
	t.Run("should handle non-CSS file patterns", func(t *testing.T) {
		testCases := []string{
			"styles.less",
			"styles.scss",
			"styles.sass",
			"variables",
			"mixins.less",
			"../parent.less",
		}

		for _, pathValue := range testCases {
			path := &MockPath{Value: pathValue}
			importNode := NewImport(path, nil, map[string]any{}, 0, nil, nil)
			if importNode.css {
				t.Errorf("Expected css to be false for %s", pathValue)
			}
		}
	})

	t.Run("should handle complex visibility scenarios", func(t *testing.T) {
		complexVisibilityInfo := map[string]any{
			"visibilityBlocks": func() *int { i := 3; return &i }(),
			"nodeVisible":     func() *bool { b := false; return &b }(),
		}

		importNode := NewImport(&MockPath{Value: "test.less"}, nil, map[string]any{}, 0, nil, complexVisibilityInfo)

		// Test that visibility info was copied
		visInfo := importNode.VisibilityInfo()
		if blocks, ok := visInfo["visibilityBlocks"].(*int); !ok || *blocks != 3 {
			t.Errorf("Expected visibilityBlocks to be 3")
		}
		if visible, ok := visInfo["nodeVisible"].(*bool); !ok || *visible {
			t.Errorf("Expected nodeVisible to be false")
		}
	})
}

// Test helper to check if a string contains CSS pattern
func TestCSSPatternRegex(t *testing.T) {
	testCases := []struct {
		input    string
		expected bool
	}{
		{"styles.css", true},
		{"styles.css?v=1", true},
		{"styles.css;charset=utf-8", true},
		{"styles#main.css", true},
		{"styles&theme=dark.css", true},
		{"styles.less", false},
		{"styles.scss", false},
		{"variables", false},
	}

	for _, tc := range testCases {
		result := cssPatternRegex.MatchString(tc.input)
		if result != tc.expected {
			t.Errorf("For input %s, expected %t, got %t", tc.input, tc.expected, result)
		}
	}
} 