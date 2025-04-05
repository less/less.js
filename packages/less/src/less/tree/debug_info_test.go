package tree

import (
	"testing"
)

func createContext(dumpLineNumbers string, compress bool) *Context {
	return &Context{
		DumpLineNumbers: dumpLineNumbers,
		Compress:        compress,
	}
}

func createDebugContext(lineNumber any, fileName string) *DebugContext {
	ctx := &DebugContext{}
	ctx.DebugInfo.LineNumber = lineNumber
	ctx.DebugInfo.FileName = fileName
	return ctx
}

func TestDebugInfo(t *testing.T) {
	t.Run("should return empty string when dumpLineNumbers is not set", func(t *testing.T) {
		context := createContext("", false)
		ctx := createDebugContext(1, "test.less")
		result := DebugInfo(context, ctx, "")
		if result != "" {
			t.Errorf("Expected empty string, got %q", result)
		}
	})

	t.Run("should return empty string when compress is true", func(t *testing.T) {
		context := createContext("comments", true)
		ctx := createDebugContext(1, "test.less")
		result := DebugInfo(context, ctx, "")
		if result != "" {
			t.Errorf("Expected empty string, got %q", result)
		}
	})

	t.Run("when dumpLineNumbers is comments", func(t *testing.T) {
		t.Run("should generate correct comment format", func(t *testing.T) {
			context := createContext("comments", false)
			ctx := createDebugContext(42, "test.less")
			expected := "/* line 42, test.less */\n"
			result := DebugInfo(context, ctx, "")
			if result != expected {
				t.Errorf("Expected %q, got %q", expected, result)
			}
		})

		t.Run("should handle different line numbers", func(t *testing.T) {
			context := createContext("comments", false)
			ctx := createDebugContext(999, "test.less")
			expected := "/* line 999, test.less */\n"
			result := DebugInfo(context, ctx, "")
			if result != expected {
				t.Errorf("Expected %q, got %q", expected, result)
			}
		})

		t.Run("should handle different file names", func(t *testing.T) {
			context := createContext("comments", false)
			ctx := createDebugContext(1, "path/to/file.less")
			expected := "/* line 1, path/to/file.less */\n"
			result := DebugInfo(context, ctx, "")
			if result != expected {
				t.Errorf("Expected %q, got %q", expected, result)
			}
		})
	})

	t.Run("when dumpLineNumbers is mediaquery", func(t *testing.T) {
		t.Run("should generate correct media query format for local file", func(t *testing.T) {
			context := createContext("mediaquery", false)
			ctx := createDebugContext(42, "test.less")
			expected := "@media -sass-debug-info{filename{font-family:file\\:\\/\\/test\\.less}line{font-family:\\0000342}}\n"
			result := DebugInfo(context, ctx, "")
			if result != expected {
				t.Errorf("Expected %q, got %q", expected, result)
			}
		})

		t.Run("should handle URLs with protocols", func(t *testing.T) {
			context := createContext("mediaquery", false)
			ctx := createDebugContext(1, "https://example.com/test.less")
			expected := "@media -sass-debug-info{filename{font-family:https\\:\\/\\/example\\.com\\/test\\.less}line{font-family:\\000031}}\n"
			result := DebugInfo(context, ctx, "")
			if result != expected {
				t.Errorf("Expected %q, got %q", expected, result)
			}
		})

		t.Run("should handle Windows-style paths", func(t *testing.T) {
			context := createContext("mediaquery", false)
			ctx := createDebugContext(1, "C:\\path\\to\\file.less")
			expected := "@media -sass-debug-info{filename{font-family:file\\:\\/\\/C\\:\\/path\\/to\\/file\\.less}line{font-family:\\000031}}\n"
			result := DebugInfo(context, ctx, "")
			if result != expected {
				t.Errorf("Expected %q, got %q", expected, result)
			}
		})
	})

	t.Run("when dumpLineNumbers is all", func(t *testing.T) {
		t.Run("should combine both comment and media query formats", func(t *testing.T) {
			context := createContext("all", false)
			ctx := createDebugContext(42, "test.less")
			expected := "/* line 42, test.less */\n@media -sass-debug-info{filename{font-family:file\\:\\/\\/test\\.less}line{font-family:\\0000342}}\n"
			result := DebugInfo(context, ctx, "")
			if result != expected {
				t.Errorf("Expected %q, got %q", expected, result)
			}
		})

		t.Run("should handle custom line separator", func(t *testing.T) {
			context := createContext("all", false)
			ctx := createDebugContext(42, "test.less")
			lineSeparator := "\n\n"
			expected := "/* line 42, test.less */\n\n\n@media -sass-debug-info{filename{font-family:file\\:\\/\\/test\\.less}line{font-family:\\0000342}}\n"
			result := DebugInfo(context, ctx, lineSeparator)
			if result != expected {
				t.Errorf("Expected %q, got %q", expected, result)
			}
		})
	})

	t.Run("edge cases", func(t *testing.T) {
		t.Run("should handle empty file names", func(t *testing.T) {
			context := createContext("comments", false)
			ctx := createDebugContext(1, "")
			expected := "/* line 1,  */\n"
			result := DebugInfo(context, ctx, "")
			if result != expected {
				t.Errorf("Expected %q, got %q", expected, result)
			}
		})

		t.Run("should handle special characters in file names", func(t *testing.T) {
			context := createContext("comments", false)
			ctx := createDebugContext(1, "test@#$%.less")
			expected := "/* line 1, test@#$%.less */\n"
			result := DebugInfo(context, ctx, "")
			if result != expected {
				t.Errorf("Expected %q, got %q", expected, result)
			}
		})

		t.Run("should handle invalid dumpLineNumbers values", func(t *testing.T) {
			context := createContext("invalid", false)
			ctx := createDebugContext(1, "test.less")
			result := DebugInfo(context, ctx, "")
			if result != "" {
				t.Errorf("Expected empty string, got %q", result)
			}
		})

		t.Run("should handle negative line numbers", func(t *testing.T) {
			context := createContext("comments", false)
			ctx := createDebugContext(-1, "test.less")
			expected := "/* line -1, test.less */\n"
			result := DebugInfo(context, ctx, "")
			if result != expected {
				t.Errorf("Expected %q, got %q", expected, result)
			}
		})

		t.Run("should handle very large line numbers", func(t *testing.T) {
			context := createContext("comments", false)
			ctx := createDebugContext(999999, "test.less")
			expected := "/* line 999999, test.less */\n"
			result := DebugInfo(context, ctx, "")
			if result != expected {
				t.Errorf("Expected %q, got %q", expected, result)
			}
		})

		t.Run("should handle filenames with spaces", func(t *testing.T) {
			context := createContext("comments", false)
			ctx := createDebugContext(1, "my file.less")
			expected := "/* line 1, my file.less */\n"
			result := DebugInfo(context, ctx, "")
			if result != expected {
				t.Errorf("Expected %q, got %q", expected, result)
			}
		})

		t.Run("should handle filenames with unicode characters", func(t *testing.T) {
			context := createContext("comments", false)
			ctx := createDebugContext(1, "测试.less")
			expected := "/* line 1, 测试.less */\n"
			result := DebugInfo(context, ctx, "")
			if result != expected {
				t.Errorf("Expected %q, got %q", expected, result)
			}
		})

		t.Run("should handle undefined line numbers", func(t *testing.T) {
			context := createContext("comments", false)
			ctx := createDebugContext(nil, "test.less")
			expected := "/* line <nil>, test.less */\n"
			result := DebugInfo(context, ctx, "")
			if result != expected {
				t.Errorf("Expected %q, got %q", expected, result)
			}
		})

		t.Run("should handle different protocols in filenames", func(t *testing.T) {
			context := createContext("mediaquery", false)
			ctx := createDebugContext(1, "ftp://example.com/test.less")
			expected := "@media -sass-debug-info{filename{font-family:ftp\\:\\/\\/example\\.com\\/test\\.less}line{font-family:\\000031}}\n"
			result := DebugInfo(context, ctx, "")
			if result != expected {
				t.Errorf("Expected %q, got %q", expected, result)
			}
		})

		t.Run("should handle file:// protocol in filenames", func(t *testing.T) {
			context := createContext("mediaquery", false)
			ctx := createDebugContext(1, "file:///path/to/test.less")
			expected := "@media -sass-debug-info{filename{font-family:file\\:\\/\\/\\/path\\/to\\/test\\.less}line{font-family:\\000031}}\n"
			result := DebugInfo(context, ctx, "")
			if result != expected {
				t.Errorf("Expected %q, got %q", expected, result)
			}
		})
	})
} 