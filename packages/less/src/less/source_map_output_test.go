package less

import (
	"testing"
)

type MockSourceMapGenerator struct {
	Mappings       []SourceMapMapping
	SourceContents map[string]string
}

func (m *MockSourceMapGenerator) AddMapping(mapping SourceMapMapping) {
	m.Mappings = append(m.Mappings, mapping)
}

func (m *MockSourceMapGenerator) SetSourceContent(source, content string) {
	if m.SourceContents == nil {
		m.SourceContents = make(map[string]string)
	}
	m.SourceContents[source] = content
}

func (m *MockSourceMapGenerator) ToJSON() map[string]any {
	return map[string]any{
		"version":  3,
		"sources":  []string{"test.less"},
		"mappings": "AAAA",
	}
}

type MockNode struct {
	GenCSSFunc func(context map[string]any, output *SourceMapOutput)
}

func (m *MockNode) GenCSS(context map[string]any, output *SourceMapOutput) {
	if m.GenCSSFunc != nil {
		m.GenCSSFunc(context, output)
	}
}

func createMockSourceMapGenerator() SourceMapGenerator {
	return &MockSourceMapGenerator{}
}

func TestSourceMapOutput(t *testing.T) {
	t.Run("constructor", func(t *testing.T) {
		t.Run("should initialize with basic options", func(t *testing.T) {
			mockRootNode := &MockNode{}
			options := SourceMapOutputOptions{
				RootNode:                mockRootNode,
				ContentsMap:            map[string]string{"test.less": "body { color: red; }"},
				ContentsIgnoredCharsMap: map[string]int{},
				OutputFilename:         "output.css",
			}

			sourceMapOutput := NewSourceMapOutput(options)

			if len(sourceMapOutput.css) != 0 {
				t.Errorf("css should be empty initially, got %v", sourceMapOutput.css)
			}
			if sourceMapOutput.rootNode != mockRootNode {
				t.Errorf("rootNode should be set")
			}
			if sourceMapOutput.outputFilename != "output.css" {
				t.Errorf("outputFilename = %v, want %v", sourceMapOutput.outputFilename, "output.css")
			}
			if sourceMapOutput.lineNumber != 0 {
				t.Errorf("lineNumber = %v, want %v", sourceMapOutput.lineNumber, 0)
			}
			if sourceMapOutput.column != 0 {
				t.Errorf("column = %v, want %v", sourceMapOutput.column, 0)
			}
		})

		t.Run("should normalize Windows paths in sourceMapFilename", func(t *testing.T) {
			options := SourceMapOutputOptions{
				RootNode:               &MockNode{},
				ContentsMap:            map[string]string{},
				ContentsIgnoredCharsMap: map[string]int{},
				SourceMapFilename:      "C:\\path\\to\\map.css.map",
			}

			sourceMapOutput := NewSourceMapOutput(options)
			if sourceMapOutput.sourceMapFilename != "C:/path/to/map.css.map" {
				t.Errorf("sourceMapFilename = %v, want %v", sourceMapOutput.sourceMapFilename, "C:/path/to/map.css.map")
			}
		})

		t.Run("should normalize and add trailing slash to sourceMapRootpath", func(t *testing.T) {
			options := SourceMapOutputOptions{
				RootNode:               &MockNode{},
				ContentsMap:            map[string]string{},
				ContentsIgnoredCharsMap: map[string]int{},
				SourceMapRootpath:      "C:\\src\\styles",
			}

			sourceMapOutput := NewSourceMapOutput(options)
			if sourceMapOutput.sourceMapRootpath != "C:/src/styles/" {
				t.Errorf("sourceMapRootpath = %v, want %v", sourceMapOutput.sourceMapRootpath, "C:/src/styles/")
			}
		})

		t.Run("should handle sourceMapRootpath that already has trailing slash", func(t *testing.T) {
			options := SourceMapOutputOptions{
				RootNode:               &MockNode{},
				ContentsMap:            map[string]string{},
				ContentsIgnoredCharsMap: map[string]int{},
				SourceMapRootpath:      "/src/styles/",
			}

			sourceMapOutput := NewSourceMapOutput(options)
			if sourceMapOutput.sourceMapRootpath != "/src/styles/" {
				t.Errorf("sourceMapRootpath = %v, want %v", sourceMapOutput.sourceMapRootpath, "/src/styles/")
			}
		})

		t.Run("should set empty sourceMapRootpath when not provided", func(t *testing.T) {
			options := SourceMapOutputOptions{
				RootNode:               &MockNode{},
				ContentsMap:            map[string]string{},
				ContentsIgnoredCharsMap: map[string]int{},
			}

			sourceMapOutput := NewSourceMapOutput(options)
			if sourceMapOutput.sourceMapRootpath != "" {
				t.Errorf("sourceMapRootpath = %v, want %v", sourceMapOutput.sourceMapRootpath, "")
			}
		})

		t.Run("should normalize Windows paths in sourceMapBasepath", func(t *testing.T) {
			options := SourceMapOutputOptions{
				RootNode:               &MockNode{},
				ContentsMap:            map[string]string{},
				ContentsIgnoredCharsMap: map[string]int{},
				SourceMapBasepath:      "C:\\project\\src",
			}

			sourceMapOutput := NewSourceMapOutput(options)
			if sourceMapOutput.sourceMapBasepath != "C:/project/src" {
				t.Errorf("sourceMapBasepath = %v, want %v", sourceMapOutput.sourceMapBasepath, "C:/project/src")
			}
		})
	})

	t.Run("RemoveBasepath", func(t *testing.T) {
		options := SourceMapOutputOptions{
			RootNode:               &MockNode{},
			ContentsMap:            map[string]string{},
			ContentsIgnoredCharsMap: map[string]int{},
			SourceMapBasepath:      "/project/src",
		}
		sourceMapOutput := NewSourceMapOutput(options)

		t.Run("should remove basepath when path starts with basepath", func(t *testing.T) {
			result := sourceMapOutput.RemoveBasepath("/project/src/styles/main.less")
			if result != "styles/main.less" {
				t.Errorf("RemoveBasepath() = %v, want %v", result, "styles/main.less")
			}
		})

		t.Run("should remove basepath and leading slash/backslash", func(t *testing.T) {
			sourceMapOutput.sourceMapBasepath = "/project/src"
			if got := sourceMapOutput.RemoveBasepath("/project/src/main.less"); got != "main.less" {
				t.Errorf("RemoveBasepath() = %v, want %v", got, "main.less")
			}
			if got := sourceMapOutput.RemoveBasepath("/project/src\\main.less"); got != "main.less" {
				t.Errorf("RemoveBasepath() = %v, want %v", got, "main.less")
			}
		})

		t.Run("should return original path when basepath does not match", func(t *testing.T) {
			result := sourceMapOutput.RemoveBasepath("/other/path/main.less")
			if result != "/other/path/main.less" {
				t.Errorf("RemoveBasepath() = %v, want %v", result, "/other/path/main.less")
			}
		})

		t.Run("should handle empty basepath", func(t *testing.T) {
			sourceMapOutput.sourceMapBasepath = ""
			result := sourceMapOutput.RemoveBasepath("/path/to/file.less")
			if result != "/path/to/file.less" {
				t.Errorf("RemoveBasepath() = %v, want %v", result, "/path/to/file.less")
			}
		})
	})

	t.Run("NormalizeFilename", func(t *testing.T) {
		options := SourceMapOutputOptions{
			RootNode:               &MockNode{},
			ContentsMap:            map[string]string{},
			ContentsIgnoredCharsMap: map[string]int{},
			SourceMapBasepath:      "/project/src",
			SourceMapRootpath:      "/assets/",
		}
		sourceMapOutput := NewSourceMapOutput(options)

		t.Run("should normalize Windows paths to forward slashes", func(t *testing.T) {
			result := sourceMapOutput.NormalizeFilename("C:\\project\\src\\styles\\main.less")
			if result != "/assets/C:/project/src/styles/main.less" {
				t.Errorf("NormalizeFilename() = %v, want %v", result, "/assets/C:/project/src/styles/main.less")
			}
		})

		t.Run("should combine rootpath with filename after removing basepath", func(t *testing.T) {
			result := sourceMapOutput.NormalizeFilename("/project/src/main.less")
			if result != "/assets/main.less" {
				t.Errorf("NormalizeFilename() = %v, want %v", result, "/assets/main.less")
			}
		})

		t.Run("should handle empty rootpath", func(t *testing.T) {
			sourceMapOutput.sourceMapRootpath = ""
			result := sourceMapOutput.NormalizeFilename("/project/src/main.less")
			if result != "main.less" {
				t.Errorf("NormalizeFilename() = %v, want %v", result, "main.less")
			}
		})
	})

	t.Run("Add", func(t *testing.T) {
		options := SourceMapOutputOptions{
			RootNode: &MockNode{},
			ContentsMap: map[string]string{
				"test.less": "body {\n  color: red;\n}",
			},
			ContentsIgnoredCharsMap: map[string]int{},
		}
		sourceMapOutput := NewSourceMapOutput(options)

		t.Run("should ignore empty chunks", func(t *testing.T) {
			sourceMapOutput.Add("", nil, 0, false)
			
			if len(sourceMapOutput.css) != 0 {
				t.Errorf("css should be empty, got %v", sourceMapOutput.css)
			}
		})

		t.Run("should add chunk without file info", func(t *testing.T) {
			sourceMapOutput.Add("body { color: blue; }", nil, 0, false)
			
			expected := []string{"body { color: blue; }"}
			if len(sourceMapOutput.css) != 1 || sourceMapOutput.css[0] != expected[0] {
				t.Errorf("css = %v, want %v", sourceMapOutput.css, expected)
			}
			if sourceMapOutput.column != 21 {
				t.Errorf("column = %v, want %v", sourceMapOutput.column, 21)
			}
			if sourceMapOutput.lineNumber != 0 {
				t.Errorf("lineNumber = %v, want %v", sourceMapOutput.lineNumber, 0)
			}
		})

		t.Run("should handle multi-line chunks", func(t *testing.T) {
			sourceMapOutput := NewSourceMapOutput(options) // fresh instance
			sourceMapOutput.Add("body {\n  color: blue;\n}", nil, 0, false)
			
			if sourceMapOutput.lineNumber != 2 {
				t.Errorf("lineNumber = %v, want %v", sourceMapOutput.lineNumber, 2)
			}
			if sourceMapOutput.column != 1 {
				t.Errorf("column = %v, want %v", sourceMapOutput.column, 1)
			}
		})

		t.Run("should add chunk with file info and create mapping", func(t *testing.T) {
			sourceMapOutput := NewSourceMapOutput(options) // fresh instance
			mockGen := &MockSourceMapGenerator{}
			sourceMapOutput.sourceMapGenerator = mockGen
			fileInfo := &FileInfo{Filename: "test.less"}
			
			sourceMapOutput.Add("body { color: blue; }", fileInfo, 5, false)
			
			if len(mockGen.Mappings) != 1 {
				t.Errorf("Expected 1 mapping, got %d", len(mockGen.Mappings))
			}
			if len(mockGen.Mappings) > 0 {
				mapping := mockGen.Mappings[0]
				if mapping.Generated.Line != 1 || mapping.Generated.Column != 0 {
					t.Errorf("Generated position = %v, want {1, 0}", mapping.Generated)
				}
				if mapping.Original.Line != 1 || mapping.Original.Column != 5 {
					t.Errorf("Original position = %v, want {1, 5}", mapping.Original)
				}
				if mapping.Source != "test.less" {
					t.Errorf("Source = %v, want %v", mapping.Source, "test.less")
				}
			}
		})

		t.Run("should handle mapLines option", func(t *testing.T) {
			sourceMapOutput := NewSourceMapOutput(options) // fresh instance
			mockGen := &MockSourceMapGenerator{}
			sourceMapOutput.sourceMapGenerator = mockGen
			fileInfo := &FileInfo{Filename: "test.less"}
			
			sourceMapOutput.Add("line1\nline2\nline3", fileInfo, 0, true)
			
			if len(mockGen.Mappings) != 3 {
				t.Errorf("Expected 3 mappings, got %d", len(mockGen.Mappings))
			}
			if len(mockGen.Mappings) > 0 {
				mapping := mockGen.Mappings[0]
				if mapping.Generated.Line != 1 || mapping.Generated.Column != 0 {
					t.Errorf("First mapping generated position = %v, want {1, 0}", mapping.Generated)
				}
				if mapping.Original.Line != 1 || mapping.Original.Column != 0 {
					t.Errorf("First mapping original position = %v, want {1, 0}", mapping.Original)
				}
			}
			if len(mockGen.Mappings) > 1 {
				mapping := mockGen.Mappings[1]
				if mapping.Generated.Line != 2 || mapping.Generated.Column != 0 {
					t.Errorf("Second mapping generated position = %v, want {2, 0}", mapping.Generated)
				}
			}
		})

		t.Run("should handle ignored characters", func(t *testing.T) {
			options := SourceMapOutputOptions{
				RootNode: &MockNode{},
				ContentsMap: map[string]string{
					"test.less": "body {\n  color: red;\n}",
				},
				ContentsIgnoredCharsMap: map[string]int{"test.less": 5},
			}
			sourceMapOutput := NewSourceMapOutput(options)
			mockGen := &MockSourceMapGenerator{}
			sourceMapOutput.sourceMapGenerator = mockGen
			fileInfo := &FileInfo{Filename: "test.less"}
			
			sourceMapOutput.Add("color: blue;", fileInfo, 10, false)
			
			if len(mockGen.Mappings) != 1 {
				t.Errorf("Expected 1 mapping, got %d", len(mockGen.Mappings))
			}
			if len(mockGen.Mappings) > 0 {
				mapping := mockGen.Mappings[0]
				if mapping.Generated.Line != 1 || mapping.Generated.Column != 0 {
					t.Errorf("Generated position = %v, want {1, 0}", mapping.Generated)
				}
				if mapping.Original.Line != 2 || mapping.Original.Column != 3 {
					t.Errorf("Original position = %v, want {2, 3}", mapping.Original)
				}
				if mapping.Source != "test.less" {
					t.Errorf("Source = %v, want %v", mapping.Source, "test.less")
				}
			}
		})

		t.Run("should handle negative index after ignored chars adjustment", func(t *testing.T) {
			options := SourceMapOutputOptions{
				RootNode: &MockNode{},
				ContentsMap: map[string]string{
					"test.less": "body {\n  color: red;\n}",
				},
				ContentsIgnoredCharsMap: map[string]int{"test.less": 10},
			}
			sourceMapOutput := NewSourceMapOutput(options)
			mockGen := &MockSourceMapGenerator{}
			sourceMapOutput.sourceMapGenerator = mockGen
			fileInfo := &FileInfo{Filename: "test.less"}
			
			sourceMapOutput.Add("color: blue;", fileInfo, 5, false)
			
			if len(mockGen.Mappings) != 1 {
				t.Errorf("Expected 1 mapping, got %d", len(mockGen.Mappings))
			}
			if len(mockGen.Mappings) > 0 {
				mapping := mockGen.Mappings[0]
				if mapping.Original.Line != 1 || mapping.Original.Column != 0 {
					t.Errorf("Original position = %v, want {1, 0}", mapping.Original)
				}
			}
		})

		t.Run("should handle missing content in contentsMap", func(t *testing.T) {
			sourceMapOutput := NewSourceMapOutput(options) // fresh instance
			fileInfo := &FileInfo{Filename: "missing.less"}
			
			sourceMapOutput.Add("body { color: blue; }", fileInfo, 0, false)
			
			expected := []string{"body { color: blue; }"}
			if len(sourceMapOutput.css) != 1 || sourceMapOutput.css[0] != expected[0] {
				t.Errorf("css = %v, want %v", sourceMapOutput.css, expected)
			}
		})
	})

	t.Run("IsEmpty", func(t *testing.T) {
		options := SourceMapOutputOptions{
			RootNode:               &MockNode{},
			ContentsMap:            map[string]string{},
			ContentsIgnoredCharsMap: map[string]int{},
		}
		sourceMapOutput := NewSourceMapOutput(options)

		t.Run("should return true when no CSS has been added", func(t *testing.T) {
			if !sourceMapOutput.IsEmpty() {
				t.Error("IsEmpty() should return true for empty output")
			}
		})

		t.Run("should return false when CSS has been added", func(t *testing.T) {
			sourceMapOutput.Add("body { color: red; }", nil, 0, false)
			if sourceMapOutput.IsEmpty() {
				t.Error("IsEmpty() should return false after adding CSS")
			}
		})
	})

	t.Run("ToCSS", func(t *testing.T) {
		mockContext := map[string]any{}
		options := SourceMapOutputOptions{
			RootNode: &MockNode{},
			ContentsMap: map[string]string{
				"test.less": "body { color: red; }",
			},
			ContentsIgnoredCharsMap: map[string]int{},
			OutputFilename:         "output.css",
			OutputSourceFiles:      true,
			SourceMapGeneratorConstructor: createMockSourceMapGenerator,
		}
		sourceMapOutput := NewSourceMapOutput(options)

		t.Run("should generate CSS and source map", func(t *testing.T) {
			sourceMapOutput.rootNode = &MockNode{
				GenCSSFunc: func(context map[string]any, output *SourceMapOutput) {
					output.Add("body { color: red; }", nil, 0, false)
				},
			}

			css := sourceMapOutput.ToCSS(mockContext)
			
			if css != "body { color: red; }" {
				t.Errorf("ToCSS() = %v, want %v", css, "body { color: red; }")
			}
			if sourceMapOutput.SourceMap == "" {
				t.Error("SourceMap should be defined")
			}
		})

		t.Run("should set source content when outputSourceFiles is true", func(t *testing.T) {
			sourceMapOutput.rootNode = &MockNode{
				GenCSSFunc: func(context map[string]any, output *SourceMapOutput) {
					output.Add("body { color: red; }", nil, 0, false)
				},
			}

			sourceMapOutput.ToCSS(mockContext)
			
			mockGen, ok := sourceMapOutput.sourceMapGenerator.(*MockSourceMapGenerator)
			if !ok {
				t.Fatal("Expected MockSourceMapGenerator")
			}
			if content, exists := mockGen.SourceContents["test.less"]; !exists || content != "body { color: red; }" {
				t.Errorf("Source content not set correctly: %v", mockGen.SourceContents)
			}
		})

		t.Run("should handle ignored characters in source content", func(t *testing.T) {
			options := SourceMapOutputOptions{
				RootNode: &MockNode{},
				ContentsMap: map[string]string{
					"test.less": "/* */body { color: red; }",
				},
				ContentsIgnoredCharsMap: map[string]int{"test.less": 5},
				OutputSourceFiles:      true,
				SourceMapGeneratorConstructor: createMockSourceMapGenerator,
			}
			sourceMapOutput := NewSourceMapOutput(options)
			sourceMapOutput.rootNode = &MockNode{
				GenCSSFunc: func(context map[string]any, output *SourceMapOutput) {
					output.Add("body { color: red; }", nil, 0, false)
				},
			}

			sourceMapOutput.ToCSS(mockContext)
			
			mockGen, ok := sourceMapOutput.sourceMapGenerator.(*MockSourceMapGenerator)
			if !ok {
				t.Fatal("Expected MockSourceMapGenerator")
			}
			if content, exists := mockGen.SourceContents["test.less"]; !exists || content != "body { color: red; }" {
				t.Errorf("Source content should have ignored chars removed: got %v", content)
			}
		})

		t.Run("should set sourceMapURL from options", func(t *testing.T) {
			sourceMapOutput.sourceMapURL = "custom.map"
			sourceMapOutput.rootNode = &MockNode{
				GenCSSFunc: func(context map[string]any, output *SourceMapOutput) {
					output.Add("body { color: red; }", nil, 0, false)
				},
			}

			sourceMapOutput.ToCSS(mockContext)
			
			if sourceMapOutput.sourceMapURL != "custom.map" {
				t.Errorf("sourceMapURL = %v, want %v", sourceMapOutput.sourceMapURL, "custom.map")
			}
		})

		t.Run("should use sourceMapFilename as URL when no sourceMapURL", func(t *testing.T) {
			sourceMapOutput.sourceMapFilename = "output.css.map"
			sourceMapOutput.sourceMapURL = ""
			sourceMapOutput.rootNode = &MockNode{
				GenCSSFunc: func(context map[string]any, output *SourceMapOutput) {
					output.Add("body { color: red; }", nil, 0, false)
				},
			}

			sourceMapOutput.ToCSS(mockContext)
			
			if sourceMapOutput.sourceMapURL != "output.css.map" {
				t.Errorf("sourceMapURL = %v, want %v", sourceMapOutput.sourceMapURL, "output.css.map")
			}
		})

		t.Run("should return empty string when no CSS generated", func(t *testing.T) {
			sourceMapOutput := NewSourceMapOutput(options)
			css := sourceMapOutput.ToCSS(mockContext)
			if css != "" {
				t.Errorf("ToCSS() = %v, want empty string", css)
			}
			if sourceMapOutput.SourceMap != "" {
				t.Error("SourceMap should be empty when no CSS generated")
			}
		})

		t.Run("should not set source content when outputSourceFiles is false", func(t *testing.T) {
			options := SourceMapOutputOptions{
				RootNode: &MockNode{},
				ContentsMap: map[string]string{
					"test.less": "body { color: red; }",
				},
				ContentsIgnoredCharsMap: map[string]int{},
				OutputSourceFiles:      false,
				SourceMapGeneratorConstructor: createMockSourceMapGenerator,
			}
			sourceMapOutput := NewSourceMapOutput(options)
			sourceMapOutput.rootNode = &MockNode{
				GenCSSFunc: func(context map[string]any, output *SourceMapOutput) {
					output.Add("body { color: red; }", nil, 0, false)
				},
			}

			sourceMapOutput.ToCSS(mockContext)
			
			mockGen, ok := sourceMapOutput.sourceMapGenerator.(*MockSourceMapGenerator)
			if !ok {
				t.Fatal("Expected MockSourceMapGenerator")
			}
			if len(mockGen.SourceContents) != 0 {
				t.Error("Source content should not be set when outputSourceFiles is false")
			}
		})
	})
}