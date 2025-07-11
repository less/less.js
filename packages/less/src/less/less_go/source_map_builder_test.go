package less_go

import (
	"encoding/base64"
	"testing"
)

type MockBuilderEnvironment struct {
	EncodeBase64Func func(str string) string
}

func (m *MockBuilderEnvironment) EncodeBase64(str string) string {
	if m.EncodeBase64Func != nil {
		return m.EncodeBase64Func(str)
	}
	return base64.StdEncoding.EncodeToString([]byte(str))
}

// MockBuilderNode that implements Node interface for testing
type MockBuilderNode struct {
	Node
	GenCSSFunc func(context map[string]any, output *SourceMapOutput)
}

func NewMockBuilderNode() *MockBuilderNode {
	return &MockBuilderNode{
		Node: Node{},
	}
}

func (m *MockBuilderNode) GenCSSSourceMap(context map[string]any, output *SourceMapOutput) {
	if m.GenCSSFunc != nil {
		m.GenCSSFunc(context, output)
	}
}

func TestSourceMapBuilder(t *testing.T) {
	mockEnvironment := &MockBuilderEnvironment{}
	mockImports := &Imports{
		Contents:             map[string]string{"test.less": "body { color: red; }"},
		ContentsIgnoredChars: map[string]int{},
	}

	t.Run("constructor", func(t *testing.T) {
		t.Run("should initialize with options", func(t *testing.T) {
			options := SourceMapBuilderOptions{
				SourceMapFilename: "output.css.map",
				SourceMapURL:      "custom.map",
			}

			builder := NewSourceMapBuilder(options)
			if builder.options.SourceMapFilename != "output.css.map" {
				t.Errorf("SourceMapFilename = %v, want %v", builder.options.SourceMapFilename, "output.css.map")
			}
			if builder.options.SourceMapURL != "custom.map" {
				t.Errorf("SourceMapURL = %v, want %v", builder.options.SourceMapURL, "custom.map")
			}
		})

		t.Run("should handle empty options", func(t *testing.T) {
			builder := NewSourceMapBuilder(SourceMapBuilderOptions{})
			if builder.options.SourceMapFilename != "" {
				t.Errorf("Expected empty SourceMapFilename, got %v", builder.options.SourceMapFilename)
			}
		})
	})

	t.Run("ToCSS", func(t *testing.T) {
		options := SourceMapBuilderOptions{
			SourceMapFilename:              "output.css.map",
			SourceMapURL:                   "custom.map",
			SourceMapOutputFilename:        "output.css",
			SourceMapBasepath:              "/project/",
			SourceMapRootpath:              "/assets/",
			OutputSourceFiles:              true,
			SourceMapGenerator:             map[string]any{},
			SourceMapFileInline:            false,
			DisableSourcemapAnnotation:     false,
		}
		builder := NewSourceMapBuilder(options)

		t.Run("should create SourceMapOutput and return CSS", func(t *testing.T) {
			mockNode := &MockBuilderNode{
				Node: *NewNode(),
				GenCSSFunc: func(context map[string]any, output *SourceMapOutput) {
					output.Add("body { color: red; }", nil, 0, false)
				},
			}

			css := builder.ToCSS(mockNode, map[string]any{}, mockImports, mockEnvironment)

			if !contains(css, "body { color: red; }") {
				t.Errorf("CSS should contain generated content: %v", css)
			}
		})

		t.Run("should set sourceMap and sourceMapURL from output", func(t *testing.T) {
			mockNode := &MockBuilderNode{
				GenCSSFunc: func(context map[string]any, output *SourceMapOutput) {
					output.Add("body { color: red; }", nil, 0, false)
				},
			}

			builder.ToCSS(mockNode, map[string]any{}, mockImports, mockEnvironment)

			if builder.sourceMap == "" {
				t.Error("sourceMap should be set")
			}
		})

		t.Run("should normalize sourceMapInputFilename when provided", func(t *testing.T) {
			builder.options.SourceMapInputFilename = "C:\\project\\input.less"
			
			mockNode := &MockBuilderNode{
				GenCSSFunc: func(context map[string]any, output *SourceMapOutput) {
					output.Add("body { color: red; }", nil, 0, false)
				},
			}

			builder.ToCSS(mockNode, map[string]any{}, mockImports, mockEnvironment)

			expected := "/assets/C:/project/input.less"
			if builder.sourceMapInputFilename != expected {
				t.Errorf("sourceMapInputFilename = %v, want %v", builder.sourceMapInputFilename, expected)
			}
		})

		t.Run("should remove basepath from sourceMapURL when both are defined", func(t *testing.T) {
			options := SourceMapBuilderOptions{
				SourceMapBasepath: "/project/",
				SourceMapURL:      "/project/styles/output.css.map",
			}
			builder := NewSourceMapBuilder(options)
			
			mockNode := &MockBuilderNode{
				GenCSSFunc: func(context map[string]any, output *SourceMapOutput) {
					output.Add("body { color: red; }", nil, 0, false)
				},
			}

			builder.ToCSS(mockNode, map[string]any{}, mockImports, mockEnvironment)

			expected := "styles/output.css.map"
			if builder.sourceMapURL != expected {
				t.Errorf("sourceMapURL = %v, want %v", builder.sourceMapURL, expected)
			}
		})

		t.Run("should not remove basepath when sourceMapBasepath is empty", func(t *testing.T) {
			options := SourceMapBuilderOptions{
				SourceMapBasepath: "",
				SourceMapURL:      "/project/styles/output.css.map",
			}
			builder := NewSourceMapBuilder(options)
			
			mockNode := &MockBuilderNode{
				GenCSSFunc: func(context map[string]any, output *SourceMapOutput) {
					output.Add("body { color: red; }", nil, 0, false)
				},
			}

			builder.ToCSS(mockNode, map[string]any{}, mockImports, mockEnvironment)

			expected := "/project/styles/output.css.map"
			if builder.sourceMapURL != expected {
				t.Errorf("sourceMapURL = %v, want %v", builder.sourceMapURL, expected)
			}
		})

		t.Run("should append CSS appendage to result", func(t *testing.T) {
			options := SourceMapBuilderOptions{
				SourceMapURL: "test.css.map",
			}
			builder := NewSourceMapBuilder(options)
			
			mockNode := &MockBuilderNode{
				GenCSSFunc: func(context map[string]any, output *SourceMapOutput) {
					output.Add("body { color: red; }", nil, 0, false)
				},
			}

			css := builder.ToCSS(mockNode, map[string]any{}, mockImports, mockEnvironment)

			expected := "body { color: red; }/*# sourceMappingURL=test.css.map */"
			if css != expected {
				t.Errorf("CSS = %v, want %v", css, expected)
			}
		})
	})

	t.Run("getCSSAppendage", func(t *testing.T) {
		builder := NewSourceMapBuilder(SourceMapBuilderOptions{})
		builder.sourceMapURL = "test.css.map"

		t.Run("should return source map comment with URL", func(t *testing.T) {
			appendage := builder.getCSSAppendage(mockEnvironment)
			expected := "/*# sourceMappingURL=test.css.map */"
			if appendage != expected {
				t.Errorf("getCSSAppendage() = %v, want %v", appendage, expected)
			}
		})

		t.Run("should return inline source map when sourceMapFileInline is true", func(t *testing.T) {
			builder.options = SourceMapBuilderOptions{SourceMapFileInline: true}
			builder.sourceMap = `{"version":3}`
			mockEnvironment.EncodeBase64Func = func(str string) string {
				return "eyJ2ZXJzaW9uIjozfQ=="
			}
			
			appendage := builder.getCSSAppendage(mockEnvironment)
			
			expected := "/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozfQ== */"
			if appendage != expected {
				t.Errorf("getCSSAppendage() = %v, want %v", appendage, expected)
			}
		})

		t.Run("should return empty string when sourceMapFileInline is true but no sourceMap", func(t *testing.T) {
			builder.options = SourceMapBuilderOptions{SourceMapFileInline: true}
			builder.sourceMap = ""
			
			appendage := builder.getCSSAppendage(mockEnvironment)
			if appendage != "" {
				t.Errorf("getCSSAppendage() = %v, want empty string", appendage)
			}
		})

		t.Run("should return empty string when disableSourcemapAnnotation is true", func(t *testing.T) {
			builder.options = SourceMapBuilderOptions{DisableSourcemapAnnotation: true}
			
			appendage := builder.getCSSAppendage(mockEnvironment)
			if appendage != "" {
				t.Errorf("getCSSAppendage() = %v, want empty string", appendage)
			}
		})

		t.Run("should return empty string when no sourceMapURL", func(t *testing.T) {
			builder.sourceMapURL = ""
			
			appendage := builder.getCSSAppendage(mockEnvironment)
			if appendage != "" {
				t.Errorf("getCSSAppendage() = %v, want empty string", appendage)
			}
		})
	})

	t.Run("GetExternalSourceMap", func(t *testing.T) {
		t.Run("should return the sourceMap", func(t *testing.T) {
			builder := NewSourceMapBuilder(SourceMapBuilderOptions{})
			builder.sourceMap = `{"version":3}`
			
			if got := builder.GetExternalSourceMap(); got != `{"version":3}` {
				t.Errorf("GetExternalSourceMap() = %v, want %v", got, `{"version":3}`)
			}
		})

		t.Run("should return empty string when no sourceMap", func(t *testing.T) {
			builder := NewSourceMapBuilder(SourceMapBuilderOptions{})
			
			if got := builder.GetExternalSourceMap(); got != "" {
				t.Errorf("GetExternalSourceMap() = %v, want empty string", got)
			}
		})
	})

	t.Run("SetExternalSourceMap", func(t *testing.T) {
		t.Run("should set the sourceMap", func(t *testing.T) {
			builder := NewSourceMapBuilder(SourceMapBuilderOptions{})
			sourceMap := `{"version":3}`
			
			builder.SetExternalSourceMap(sourceMap)
			
			if builder.sourceMap != sourceMap {
				t.Errorf("sourceMap = %v, want %v", builder.sourceMap, sourceMap)
			}
		})
	})

	t.Run("IsInline", func(t *testing.T) {
		t.Run("should return true when sourceMapFileInline is true", func(t *testing.T) {
			builder := NewSourceMapBuilder(SourceMapBuilderOptions{SourceMapFileInline: true})
			if !builder.IsInline() {
				t.Error("IsInline() should return true")
			}
		})

		t.Run("should return false when sourceMapFileInline is false", func(t *testing.T) {
			builder := NewSourceMapBuilder(SourceMapBuilderOptions{SourceMapFileInline: false})
			if builder.IsInline() {
				t.Error("IsInline() should return false")
			}
		})

		t.Run("should return false when sourceMapFileInline is not set", func(t *testing.T) {
			builder := NewSourceMapBuilder(SourceMapBuilderOptions{})
			if builder.IsInline() {
				t.Error("IsInline() should return false when not set")
			}
		})
	})

	t.Run("GetSourceMapURL", func(t *testing.T) {
		t.Run("should return the sourceMapURL", func(t *testing.T) {
			builder := NewSourceMapBuilder(SourceMapBuilderOptions{})
			builder.sourceMapURL = "test.css.map"
			
			if got := builder.GetSourceMapURL(); got != "test.css.map" {
				t.Errorf("GetSourceMapURL() = %v, want %v", got, "test.css.map")
			}
		})

		t.Run("should return empty string when no sourceMapURL", func(t *testing.T) {
			builder := NewSourceMapBuilder(SourceMapBuilderOptions{})
			
			if got := builder.GetSourceMapURL(); got != "" {
				t.Errorf("GetSourceMapURL() = %v, want empty string", got)
			}
		})
	})

	t.Run("GetOutputFilename", func(t *testing.T) {
		t.Run("should return sourceMapOutputFilename from options", func(t *testing.T) {
			builder := NewSourceMapBuilder(SourceMapBuilderOptions{SourceMapOutputFilename: "output.css"})
			
			if got := builder.GetOutputFilename(); got != "output.css" {
				t.Errorf("GetOutputFilename() = %v, want %v", got, "output.css")
			}
		})

		t.Run("should return empty string when no sourceMapOutputFilename", func(t *testing.T) {
			builder := NewSourceMapBuilder(SourceMapBuilderOptions{})
			
			if got := builder.GetOutputFilename(); got != "" {
				t.Errorf("GetOutputFilename() = %v, want empty string", got)
			}
		})
	})

	t.Run("GetInputFilename", func(t *testing.T) {
		t.Run("should return sourceMapInputFilename", func(t *testing.T) {
			builder := NewSourceMapBuilder(SourceMapBuilderOptions{})
			builder.sourceMapInputFilename = "input.less"
			
			if got := builder.GetInputFilename(); got != "input.less" {
				t.Errorf("GetInputFilename() = %v, want %v", got, "input.less")
			}
		})

		t.Run("should return empty string when no sourceMapInputFilename", func(t *testing.T) {
			builder := NewSourceMapBuilder(SourceMapBuilderOptions{})
			
			if got := builder.GetInputFilename(); got != "" {
				t.Errorf("GetInputFilename() = %v, want empty string", got)
			}
		})
	})

	t.Run("integration scenarios", func(t *testing.T) {
		t.Run("should handle complete workflow with all options", func(t *testing.T) {
			options := SourceMapBuilderOptions{
				SourceMapFilename:              "output.css.map",
				SourceMapURL:                   "/project/assets/output.css.map",
				SourceMapOutputFilename:        "output.css",
				SourceMapInputFilename:         "input.less",
				SourceMapBasepath:              "/project/",
				SourceMapRootpath:              "/assets/",
				OutputSourceFiles:              true,
				SourceMapFileInline:            false,
				DisableSourcemapAnnotation:     false,
			}

			builder := NewSourceMapBuilder(options)
			
			mockNode := &MockBuilderNode{
				GenCSSFunc: func(context map[string]any, output *SourceMapOutput) {
					output.Add("body { color: red; }", nil, 0, false)
				},
			}

			css := builder.ToCSS(mockNode, map[string]any{}, mockImports, mockEnvironment)

			expected := "body { color: red; }/*# sourceMappingURL=assets/output.css.map */"
			if css != expected {
				t.Errorf("CSS = %v, want %v", css, expected)
			}
			if builder.sourceMap == "" {
				t.Error("sourceMap should be set")
			}
			if builder.GetInputFilename() != "/assets/input.less" {
				t.Errorf("GetInputFilename() = %v, want %v", builder.GetInputFilename(), "/assets/input.less")
			}
		})

		t.Run("should handle inline source map workflow", func(t *testing.T) {
			options := SourceMapBuilderOptions{SourceMapFileInline: true}
			builder := NewSourceMapBuilder(options)
			builder.sourceMap = `{"version":3}`
			mockEnvironment.EncodeBase64Func = func(str string) string {
				return "eyJ2ZXJzaW9uIjozfQ=="
			}
			
			mockNode := &MockBuilderNode{
				GenCSSFunc: func(context map[string]any, output *SourceMapOutput) {
					output.Add("body { color: red; }", nil, 0, false)
				},
			}

			css := builder.ToCSS(mockNode, map[string]any{}, mockImports, mockEnvironment)

			expected := "body { color: red; }/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozfQ== */"
			if css != expected {
				t.Errorf("CSS = %v, want %v", css, expected)
			}
			if !builder.IsInline() {
				t.Error("IsInline() should return true")
			}
		})

		t.Run("should handle disabled source map annotation", func(t *testing.T) {
			options := SourceMapBuilderOptions{DisableSourcemapAnnotation: true}
			builder := NewSourceMapBuilder(options)
			builder.sourceMapURL = "test.css.map"
			
			mockNode := &MockBuilderNode{
				GenCSSFunc: func(context map[string]any, output *SourceMapOutput) {
					output.Add("body { color: red; }", nil, 0, false)
				},
			}

			css := builder.ToCSS(mockNode, map[string]any{}, mockImports, mockEnvironment)

			expected := "body { color: red; }"
			if css != expected {
				t.Errorf("CSS = %v, want %v", css, expected)
			}
		})
	})
}

// Helper function to check if a string contains a substring
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || s[:len(substr)] == substr || s[len(s)-len(substr):] == substr || containsSubstring(s, substr))
}

func containsSubstring(s, substr string) bool {
	if len(substr) > len(s) {
		return false
	}
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}