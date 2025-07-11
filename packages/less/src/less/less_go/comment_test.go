package less_go

import (
	"strings"
	"testing"
)

func TestComment(t *testing.T) {
	t.Run("constructor", func(t *testing.T) {
		t.Run("should create a comment with the given value", func(t *testing.T) {
			comment := NewComment("/* test */", false, 0, nil)
			if comment.Value != "/* test */" {
				t.Errorf("Expected comment value to be '/* test */', got '%s'", comment.Value)
			}
		})

		t.Run("should set isLineComment flag", func(t *testing.T) {
			lineComment := NewComment("// test", true, 0, nil)
			blockComment := NewComment("/* test */", false, 0, nil)

			if !lineComment.IsLineComment {
				t.Error("Expected lineComment.IsLineComment to be true")
			}
			if blockComment.IsLineComment {
				t.Error("Expected blockComment.IsLineComment to be false")
			}
		})

		t.Run("should set index and fileInfo", func(t *testing.T) {
			index := 5
			fileInfo := map[string]any{"filename": "test.less"}
			comment := NewComment("/* test */", false, index, fileInfo)

			if comment.GetIndex() != index {
				t.Errorf("Expected index to be %d, got %d", index, comment.GetIndex())
			}
			if comment.FileInfo()["filename"] != fileInfo["filename"] {
				t.Errorf("Expected filename to be %s, got %s", fileInfo["filename"], comment.FileInfo()["filename"])
			}
		})

		t.Run("should set allowRoot to true", func(t *testing.T) {
			comment := NewComment("/* test */", false, 0, nil)
			if !comment.AllowRoot {
				t.Error("Expected AllowRoot to be true")
			}
		})
	})

	t.Run("genCSS", func(t *testing.T) {
		t.Run("should output the comment value", func(t *testing.T) {
			comment := NewComment("/* test */", false, 0, nil)
			var output []string
			outputter := &CSSOutput{
				Add: func(chunk any, fileInfo any, index any) {
					output = append(output, chunk.(string))
				},
				IsEmpty: func() bool {
					return len(output) == 0
				},
			}
			context := &ParserContext{}

			comment.GenCSS(context, outputter)

			if len(output) != 1 || output[0] != "/* test */" {
				t.Errorf("Expected output to be ['/* test */'], got %v", output)
			}
		})

		t.Run("should handle multi-line comments", func(t *testing.T) {
			comment := NewComment("/*\n * Multi-line\n * comment\n */", false, 0, nil)
			var output []string
			outputter := &CSSOutput{
				Add: func(chunk any, fileInfo any, index any) {
					output = append(output, chunk.(string))
				},
				IsEmpty: func() bool {
					return len(output) == 0
				},
			}
			context := &ParserContext{}

			comment.GenCSS(context, outputter)

			expected := "/*\n * Multi-line\n * comment\n */"
			if len(output) != 1 || output[0] != expected {
				t.Errorf("Expected output to be ['%s'], got %v", expected, output)
			}
		})

		t.Run("should handle comments with special characters", func(t *testing.T) {
			comment := NewComment("/* @#$%%^&*() */", false, 0, nil)
			var output []string
			outputter := &CSSOutput{
				Add: func(chunk any, fileInfo any, index any) {
					output = append(output, chunk.(string))
				},
				IsEmpty: func() bool {
					return len(output) == 0
				},
			}
			context := &ParserContext{}

			comment.GenCSS(context, outputter)

			if len(output) != 1 || output[0] != "/* @#$%%^&*() */" {
				t.Errorf("Expected output to be ['/* @#$%%^&*() */'], got %v", output)
			}
		})

		t.Run("should handle empty comments", func(t *testing.T) {
			comment := NewComment("/* */", false, 0, nil)
			var output []string
			outputter := &CSSOutput{
				Add: func(chunk any, fileInfo any, index any) {
					output = append(output, chunk.(string))
				},
				IsEmpty: func() bool {
					return len(output) == 0
				},
			}
			context := &ParserContext{}

			comment.GenCSS(context, outputter)

			if len(output) != 1 || output[0] != "/* */" {
				t.Errorf("Expected output to be ['/* */'], got %v", output)
			}
		})

		t.Run("should handle comments with whitespace", func(t *testing.T) {
			comment := NewComment("/*   test   */", false, 0, nil)
			var output []string
			outputter := &CSSOutput{
				Add: func(chunk any, fileInfo any, index any) {
					output = append(output, chunk.(string))
				},
				IsEmpty: func() bool {
					return len(output) == 0
				},
			}
			context := &ParserContext{}

			comment.GenCSS(context, outputter)

			if len(output) != 1 || output[0] != "/*   test   */" {
				t.Errorf("Expected output to be ['/*   test   */'], got %v", output)
			}
		})

		t.Run("should handle large comments", func(t *testing.T) {
			largeComment := "/* " + strings.Repeat("x", 1000) + " */"
			comment := NewComment(largeComment, false, 0, nil)
			var output []string
			outputter := &CSSOutput{
				Add: func(chunk any, fileInfo any, index any) {
					output = append(output, chunk.(string))
				},
				IsEmpty: func() bool {
					return len(output) == 0
				},
			}
			context := &ParserContext{}

			comment.GenCSS(context, outputter)

			if len(output) != 1 || output[0] != largeComment {
				t.Error("Expected output to match largeComment")
			}
		})

		t.Run("should handle comments with Unicode characters", func(t *testing.T) {
			comment := NewComment("/* 🌟 Hello 世界 */", false, 0, nil)
			var output []string
			outputter := &CSSOutput{
				Add: func(chunk any, fileInfo any, index any) {
					output = append(output, chunk.(string))
				},
				IsEmpty: func() bool {
					return len(output) == 0
				},
			}
			context := &ParserContext{}

			comment.GenCSS(context, outputter)

			if len(output) != 1 || output[0] != "/* 🌟 Hello 世界 */" {
				t.Errorf("Expected output to be ['/* 🌟 Hello 世界 */'], got %v", output)
			}
		})

		t.Run("should handle comments with Less-specific syntax", func(t *testing.T) {
			comment := NewComment("/* @variable: value; */", false, 0, nil)
			var output []string
			outputter := &CSSOutput{
				Add: func(chunk any, fileInfo any, index any) {
					output = append(output, chunk.(string))
				},
				IsEmpty: func() bool {
					return len(output) == 0
				},
			}
			context := &ParserContext{}

			comment.GenCSS(context, outputter)

			if len(output) != 1 || output[0] != "/* @variable: value; */" {
				t.Errorf("Expected output to be ['/* @variable: value; */'], got %v", output)
			}
		})

		t.Run("should include debug info when debugInfo is present", func(t *testing.T) {
			comment := NewComment("/* test */", false, 0, nil)
			comment.DebugInfo = &DebugContext{
				DebugInfo: struct {
					LineNumber any
					FileName   string
				}{
					LineNumber: 1,
					FileName:   "test.less",
				},
			}
			var output []string
			outputter := &CSSOutput{
				Add: func(chunk any, fileInfo any, index any) {
					output = append(output, chunk.(string))
				},
				IsEmpty: func() bool {
					return len(output) == 0
				},
			}
			context := &ParserContext{DumpLineNumbers: "comments"}

			comment.GenCSS(context, outputter)

			if len(output) != 2 {
				t.Errorf("Expected 2 outputs, got %d", len(output))
			}
			if !strings.Contains(output[0], "line 1") {
				t.Errorf("Expected first output to contain 'line 1', got '%s'", output[0])
			}
			if output[1] != "/* test */" {
				t.Errorf("Expected second output to be '/* test */', got '%s'", output[1])
			}
		})
	})

	t.Run("isSilent", func(t *testing.T) {
		t.Run("should return true for line comments", func(t *testing.T) {
			comment := NewComment("// test", true, 0, nil)
			context := &ParserContext{Compress: false}

			if !comment.IsSilent(context) {
				t.Error("Expected IsSilent to return true for line comments")
			}
		})

		t.Run("should return true for compressed comments without !", func(t *testing.T) {
			comment := NewComment("/* test */", false, 0, nil)
			context := &ParserContext{Compress: true}

			if !comment.IsSilent(context) {
				t.Error("Expected IsSilent to return true for compressed comments without !")
			}
		})

		t.Run("should return false for compressed comments with !", func(t *testing.T) {
			comment := NewComment("/*! test */", false, 0, nil)
			context := &ParserContext{Compress: true}

			if comment.IsSilent(context) {
				t.Error("Expected IsSilent to return false for compressed comments with !")
			}
		})

		t.Run("should return false for block comments when not compressed", func(t *testing.T) {
			comment := NewComment("/* test */", false, 0, nil)
			context := &ParserContext{Compress: false}

			if comment.IsSilent(context) {
				t.Error("Expected IsSilent to return false for block comments when not compressed")
			}
		})
	})

	t.Run("Node inheritance", func(t *testing.T) {
		t.Run("should handle parent node relationship", func(t *testing.T) {
			parent := NewNode()
			comment := NewComment("/* test */", false, 0, nil)

			comment.SetParent(comment, parent)
			if comment.Parent != parent {
				t.Error("Expected comment.Parent to be parent")
			}
		})

		t.Run("should get index from parent if not set", func(t *testing.T) {
			parent := NewNode()
			parent.Index = 5
			comment := NewComment("/* test */", false, 0, nil)

			comment.SetParent(comment, parent)
			if comment.GetIndex() != 5 {
				t.Errorf("Expected GetIndex to return 5, got %d", comment.GetIndex())
			}
		})

		t.Run("should get fileInfo from parent if not set", func(t *testing.T) {
			parent := NewNode()
			parent.SetFileInfo(map[string]any{"filename": "test.less"})
			comment := NewComment("/* test */", false, 0, nil)

			comment.SetParent(comment, parent)
			if comment.FileInfo()["filename"] != "test.less" {
				t.Errorf("Expected filename to be 'test.less', got %v", comment.FileInfo()["filename"])
			}
		})
	})
} 