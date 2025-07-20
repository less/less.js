package less_go

import (
	"testing"
)

func TestContexts(t *testing.T) {
	t.Run("Parse context", func(t *testing.T) {
		t.Run("should create a Parse context with default options", func(t *testing.T) {
			parseContext := NewParse(map[string]any{})
			if parseContext == nil {
				t.Error("Parse context should be defined")
				return
			}
			if parseContext.Paths != nil {
				t.Error("Paths should be nil")
			}
		})

		t.Run("should copy all specified properties from options", func(t *testing.T) {
			options := map[string]any{
				"paths":           []string{"/test/path"},
				"rewriteUrls":     RewriteUrlsAll,
				"rootpath":        "/root",
				"strictImports":   true,
				"insecure":        true,
				"dumpLineNumbers": true,
				"compress":        true,
				"syncImport":      true,
				"chunkInput":      true,
				"mime":            "text/less",
				"useFileCache":    true,
				"processImports":  true,
				"pluginManager":   struct{}{},
				"quiet":           true,
			}

			parseContext := NewParse(options)
			if parseContext.Paths[0] != "/test/path" {
				t.Error("Paths not copied correctly")
			}
			if parseContext.RewriteUrls != RewriteUrlsAll {
				t.Error("RewriteUrls not copied correctly")
			}
			if parseContext.Rootpath != "/root" {
				t.Error("Rootpath not copied correctly")
			}
			if !parseContext.StrictImports {
				t.Error("StrictImports not copied correctly")
			}
			if !parseContext.Insecure {
				t.Error("Insecure not copied correctly")
			}
			if !parseContext.DumpLineNumbers {
				t.Error("DumpLineNumbers not copied correctly")
			}
			if !parseContext.Compress {
				t.Error("Compress not copied correctly")
			}
			if !parseContext.SyncImport {
				t.Error("SyncImport not copied correctly")
			}
			if !parseContext.ChunkInput {
				t.Error("ChunkInput not copied correctly")
			}
			if parseContext.Mime != "text/less" {
				t.Error("Mime not copied correctly")
			}
			if !parseContext.UseFileCache {
				t.Error("UseFileCache not copied correctly")
			}
			if !parseContext.ProcessImports {
				t.Error("ProcessImports not copied correctly")
			}
			if parseContext.PluginManager == nil {
				t.Error("PluginManager not copied correctly")
			}
			if !parseContext.Quiet {
				t.Error("Quiet not copied correctly")
			}
		})

		t.Run("should convert string paths to array", func(t *testing.T) {
			parseContext := NewParse(map[string]any{
				"paths": "/test/path",
			})
			if len(parseContext.Paths) != 1 || parseContext.Paths[0] != "/test/path" {
				t.Error("String path not converted to array correctly")
			}
		})

		t.Run("should handle empty paths array", func(t *testing.T) {
			parseContext := NewParse(map[string]any{
				"paths": []string{},
			})
			if len(parseContext.Paths) != 0 {
				t.Error("Empty paths array not handled correctly")
			}
		})
	})

	t.Run("Eval context", func(t *testing.T) {
		t.Run("should create an Eval context with default options", func(t *testing.T) {
			evalContext := NewEval(map[string]any{}, nil)
			if evalContext == nil {
				t.Fatal("Eval context should be defined")
			}
			if len(evalContext.Frames) != 0 {
				t.Error("Frames should be empty")
			}
			if len(evalContext.ImportantScope) != 0 {
				t.Error("ImportantScope should be empty")
			}
			if evalContext.InCalc {
				t.Error("InCalc should be false")
			}
			if !evalContext.MathOn {
				t.Error("MathOn should be true")
			}
		})

		t.Run("should copy all specified properties from options", func(t *testing.T) {
			options := map[string]any{
				"paths":            []string{"/test/path"},
				"compress":         true,
				"math":             MathParens,
				"strictUnits":      true,
				"sourceMap":        true,
				"importMultiple":   true,
				"urlArgs":          "?v=1",
				"javascriptEnabled": true,
				"pluginManager":    struct{}{},
				"importantScope":   []map[string]any{},
				"rewriteUrls":      RewriteUrlsAll,
			}

			evalContext := NewEval(options, nil)
			if len(evalContext.Paths) != 1 || evalContext.Paths[0] != "/test/path" {
				t.Error("Paths not copied correctly")
			}
			if !evalContext.Compress {
				t.Error("Compress not copied correctly")
			}
			if evalContext.Math != MathParens {
				t.Error("Math not copied correctly")
			}
			if !evalContext.StrictUnits {
				t.Error("StrictUnits not copied correctly")
			}
			if !evalContext.SourceMap {
				t.Error("SourceMap not copied correctly")
			}
			if !evalContext.ImportMultiple {
				t.Error("ImportMultiple not copied correctly")
			}
			if evalContext.UrlArgs != "?v=1" {
				t.Error("UrlArgs not copied correctly")
			}
			if !evalContext.JavascriptEnabled {
				t.Error("JavascriptEnabled not copied correctly")
			}
			if evalContext.PluginManager == nil {
				t.Error("PluginManager not copied correctly")
			}
			if len(evalContext.ImportantScope) != 0 {
				t.Error("ImportantScope not copied correctly")
			}
			if evalContext.RewriteUrls != RewriteUrlsAll {
				t.Error("RewriteUrls not copied correctly")
			}
		})

		t.Run("calc stack operations", func(t *testing.T) {
			t.Run("should handle entering and exiting calc context", func(t *testing.T) {
				evalContext := NewEval(map[string]any{}, nil)

				evalContext.EnterCalc()
				if !evalContext.InCalc {
					t.Error("InCalc should be true after entering")
				}
				if len(evalContext.CalcStack) != 1 || !evalContext.CalcStack[0] {
					t.Error("CalcStack should contain true")
				}

				evalContext.EnterCalc()
				if len(evalContext.CalcStack) != 2 || !evalContext.CalcStack[1] {
					t.Error("CalcStack should contain two true values")
				}

				evalContext.ExitCalc()
				if len(evalContext.CalcStack) != 1 || !evalContext.CalcStack[0] {
					t.Error("CalcStack should contain one true value")
				}
				if !evalContext.InCalc {
					t.Error("InCalc should still be true")
				}

				evalContext.ExitCalc()
				if len(evalContext.CalcStack) != 0 {
					t.Error("CalcStack should be empty")
				}
				if evalContext.InCalc {
					t.Error("InCalc should be false")
				}
			})
		})

		t.Run("parenthesis stack operations", func(t *testing.T) {
			t.Run("should handle entering and exiting parenthesis context", func(t *testing.T) {
				evalContext := NewEval(map[string]any{}, nil)

				evalContext.InParenthesis()
				if len(evalContext.ParensStack) != 1 || !evalContext.ParensStack[0] {
					t.Error("ParensStack should contain true")
				}

				evalContext.InParenthesis()
				if len(evalContext.ParensStack) != 2 || !evalContext.ParensStack[1] {
					t.Error("ParensStack should contain two true values")
				}

				evalContext.OutOfParenthesis()
				if len(evalContext.ParensStack) != 1 || !evalContext.ParensStack[0] {
					t.Error("ParensStack should contain one true value")
				}

				evalContext.OutOfParenthesis()
				if len(evalContext.ParensStack) != 0 {
					t.Error("ParensStack should be empty")
				}
			})
		})

		t.Run("math operations", func(t *testing.T) {
			t.Run("should handle math operations correctly based on settings", func(t *testing.T) {
				evalContext := NewEval(map[string]any{
					"math": MathAlways,
				}, nil)

				if !evalContext.IsMathOnWithOp("+") {
					t.Error("Math should be on for + with MathAlways")
				}
				if !evalContext.IsMathOnWithOp("/") {
					t.Error("Math should be on for / with MathAlways")
				}

				evalContext.Math = MathParensDivision
				if !evalContext.IsMathOnWithOp("+") {
					t.Error("Math should be on for + with MathParensDivision")
				}
				if evalContext.IsMathOnWithOp("/") {
					t.Error("Math should be off for / with MathParensDivision")
				}

				evalContext.InParenthesis()
				if !evalContext.IsMathOnWithOp("/") {
					t.Error("Math should be on for / inside parentheses with MathParensDivision")
				}

				evalContext.OutOfParenthesis()
				evalContext.Math = MathParens

				if evalContext.IsMathOnWithOp("+") {
					t.Error("Math should be off for + with MathParens")
				}
				if evalContext.IsMathOnWithOp("/") {
					t.Error("Math should be off for / with MathParens")
				}

				evalContext.InParenthesis()
				if !evalContext.IsMathOnWithOp("+") {
					t.Error("Math should be on for + inside parentheses with MathParens")
				}
				if !evalContext.IsMathOnWithOp("/") {
					t.Error("Math should be on for / inside parentheses with MathParens")
				}
			})

			t.Run("should handle invalid operators when mathOn is true", func(t *testing.T) {
				evalContext := NewEval(map[string]any{}, nil)
				if !evalContext.IsMathOnWithOp("invalid") {
					t.Error("Math should be on for invalid operator")
				}
				if !evalContext.IsMathOnWithOp("") {
					t.Error("Math should be on for empty operator")
				}
			})

			t.Run("should respect mathOn setting", func(t *testing.T) {
				evalContext := NewEval(map[string]any{}, nil)
				evalContext.MathOn = false
				if evalContext.IsMathOnWithOp("+") {
					t.Error("Math should be off when mathOn is false")
				}
				if evalContext.IsMathOnWithOp("/") {
					t.Error("Math should be off when mathOn is false")
				}
				if evalContext.IsMathOnWithOp("invalid") {
					t.Error("Math should be off for invalid operator when mathOn is false")
				}
			})
		})

		t.Run("path handling", func(t *testing.T) {
			t.Run("should correctly identify relative paths", func(t *testing.T) {
				evalContext := NewEval(map[string]any{}, nil)
				if evalContext.PathRequiresRewrite("http://example.com") {
					t.Error("Should not rewrite http URLs")
				}
				if evalContext.PathRequiresRewrite("https://example.com") {
					t.Error("Should not rewrite https URLs")
				}
				if evalContext.PathRequiresRewrite("/absolute/path") {
					t.Error("Should not rewrite absolute paths")
				}
				if evalContext.PathRequiresRewrite("#hash") {
					t.Error("Should not rewrite hash fragments")
				}
				if !evalContext.PathRequiresRewrite("relative/path") {
					t.Error("Should rewrite relative paths")
				}
				// Test empty path
				if !evalContext.PathRequiresRewrite("") {
					t.Error("Should rewrite empty paths as relative")
				}
			})

			t.Run("should correctly identify local relative paths", func(t *testing.T) {
				evalContext := NewEval(map[string]any{
					"rewriteUrls": RewriteUrlsLocal,
				}, nil)
				if !evalContext.PathRequiresRewrite("./local/path") {
					t.Error("Should rewrite local relative paths")
				}
				if !evalContext.PathRequiresRewrite("../parent/path") {
					t.Error("Should rewrite parent relative paths")
				}
				if evalContext.PathRequiresRewrite("not/relative/path") {
					t.Error("Should not rewrite non-relative paths")
				}
			})

			t.Run("should normalize paths correctly", func(t *testing.T) {
				evalContext := NewEval(map[string]any{}, nil)
				if evalContext.NormalizePath("a/b/c") != "a/b/c" {
					t.Error("Should not modify simple paths")
				}
				if evalContext.NormalizePath("a/./b/c") != "a/b/c" {
					t.Error("Should remove single dots")
				}
				if evalContext.NormalizePath("a/../b/c") != "b/c" {
					t.Error("Should handle parent directory")
				}
				if evalContext.NormalizePath("./a/b/c") != "a/b/c" {
					t.Error("Should remove leading single dot")
				}
				if evalContext.NormalizePath("../a/b/c") != "../a/b/c" {
					t.Error("Should preserve parent directory at start")
				}
			})

			t.Run("should rewrite paths correctly with rootpath", func(t *testing.T) {
				evalContext := NewEval(map[string]any{}, nil)
				if evalContext.RewritePath("path/to/file", "/root") != "/rootpath/to/file" {
					t.Error("Should rewrite path with rootpath")
				}
				if evalContext.RewritePath("./path/to/file", "/root") != "/root./path/to/file" {
					t.Error("Should rewrite relative path with rootpath")
				}
				if evalContext.RewritePath("../path/to/file", "/root") != "/root../path/to/file" {
					t.Error("Should rewrite parent path with rootpath")
				}
			})

			t.Run("should handle paths with special characters", func(t *testing.T) {
				evalContext := NewEval(map[string]any{}, nil)
				if evalContext.NormalizePath("path/with spaces/file") != "path/with spaces/file" {
					t.Error("Should preserve spaces in paths")
				}
				if evalContext.NormalizePath("path/with@special/chars") != "path/with@special/chars" {
					t.Error("Should preserve special characters in paths")
				}
				if evalContext.NormalizePath("path/with%20encoded/chars") != "path/with%20encoded/chars" {
					t.Error("Should preserve encoded characters in paths")
				}
			})

			t.Run("should handle Windows-style paths", func(t *testing.T) {
				evalContext := NewEval(map[string]any{}, nil)
				if evalContext.NormalizePath("C:\\path\\to\\file") != "C:\\path\\to\\file" {
					t.Error("Should preserve Windows backslashes")
				}
				if evalContext.NormalizePath("C:/path/to/file") != "C:/path/to/file" {
					t.Error("Should preserve Windows forward slashes")
				}
			})

			t.Run("should handle URLs with query parameters and hash fragments", func(t *testing.T) {
				evalContext := NewEval(map[string]any{}, nil)
				if evalContext.PathRequiresRewrite("http://example.com?param=value") {
					t.Error("Should not rewrite URLs with query parameters")
				}
				if evalContext.PathRequiresRewrite("https://example.com#fragment") {
					t.Error("Should not rewrite URLs with hash fragments")
				}
				if evalContext.PathRequiresRewrite("http://example.com?param=value#fragment") {
					t.Error("Should not rewrite URLs with both query parameters and hash fragments")
				}
			})
		})

		t.Run("frames handling", func(t *testing.T) {
			t.Run("should initialize with provided frames", func(t *testing.T) {
				frames := []any{struct{ ID int }{1}, struct{ ID int }{2}}
				evalContext := NewEval(map[string]any{}, frames)
				if len(evalContext.Frames) != 2 {
					t.Error("Should initialize with provided frames")
				}
			})

			t.Run("should initialize with empty frames array if not provided", func(t *testing.T) {
				evalContext := NewEval(map[string]any{}, nil)
				if len(evalContext.Frames) != 0 {
					t.Error("Should initialize with empty frames array")
				}
			})
		})

		t.Run("importantScope handling", func(t *testing.T) {
			t.Run("should initialize with provided importantScope", func(t *testing.T) {
				importantScope := []map[string]any{{"important": " !important"}}
				evalContext := NewEval(map[string]any{
					"importantScope": importantScope,
				}, nil)
				if len(evalContext.ImportantScope) != 1 {
					t.Error("Should have one importantScope entry")
				}
				if evalContext.ImportantScope[0]["important"] != " !important" {
					t.Error("Should initialize with provided importantScope")
				}
			})

			t.Run("should initialize with empty importantScope array if not provided", func(t *testing.T) {
				evalContext := NewEval(map[string]any{}, nil)
				if len(evalContext.ImportantScope) != 0 {
					t.Error("Should initialize with empty importantScope array")
				}
			})
		})

		t.Run("path normalization edge cases", func(t *testing.T) {
			t.Run("should preserve multiple consecutive slashes", func(t *testing.T) {
				evalContext := NewEval(map[string]any{}, nil)
				if evalContext.NormalizePath("a//b///c") != "a//b///c" {
					t.Error("Should preserve multiple consecutive slashes")
				}
			})

			t.Run("should handle empty path", func(t *testing.T) {
				evalContext := NewEval(map[string]any{}, nil)
				if evalContext.NormalizePath("") != "" {
					t.Error("Should handle empty path")
				}
			})

			t.Run("should handle root path", func(t *testing.T) {
				evalContext := NewEval(map[string]any{}, nil)
				if evalContext.NormalizePath("/") != "/" {
					t.Error("Should handle root path")
				}
			})

			t.Run("should handle special dot paths", func(t *testing.T) {
				evalContext := NewEval(map[string]any{}, nil)
				if evalContext.NormalizePath("...") != "..." {
					t.Error("Should preserve three dots")
				}
				if evalContext.NormalizePath("..") != ".." {
					t.Error("Should preserve two dots when alone")
				}
			})
		})

		t.Run("url handling", func(t *testing.T) {
			t.Run("should handle urlArgs correctly", func(t *testing.T) {
				evalContext := NewEval(map[string]any{
					"urlArgs": "?v=1",
				}, nil)
				if evalContext.UrlArgs != "?v=1" {
					t.Error("Should handle urlArgs correctly")
				}
			})

			t.Run("should handle javascriptEnabled option", func(t *testing.T) {
				evalContext := NewEval(map[string]any{
					"javascriptEnabled": true,
				}, nil)
				if !evalContext.JavascriptEnabled {
					t.Error("Should handle javascriptEnabled option")
				}
			})

			t.Run("should handle importMultiple option", func(t *testing.T) {
				evalContext := NewEval(map[string]any{
					"importMultiple": true,
				}, nil)
				if !evalContext.ImportMultiple {
					t.Error("Should handle importMultiple option")
				}
			})
		})
	})
}

func TestCopyFromOriginal(t *testing.T) {
	t.Run("should handle nil original map", func(t *testing.T) {
		parse := &Parse{}
		copyFromOriginal(nil, parse)
		// Should not panic and parse should remain unchanged
		if parse.Paths != nil {
			t.Error("Parse should remain unchanged with nil original")
		}
	})

	t.Run("should handle empty original map", func(t *testing.T) {
		parse := &Parse{}
		copyFromOriginal(map[string]any{}, parse)
		// Should not panic and parse should remain unchanged
		if parse.Paths != nil {
			t.Error("Parse should remain unchanged with empty original")
		}
	})

	t.Run("should handle nil values in original map", func(t *testing.T) {
		parse := &Parse{}
		original := map[string]any{
			"paths": nil,
		}
		copyFromOriginal(original, parse)
		if parse.Paths != nil {
			t.Error("Should handle nil values in original map")
		}
	})

	t.Run("should handle invalid type conversions gracefully", func(t *testing.T) {
		parse := &Parse{}
		original := map[string]any{
			"paths": 123, // Invalid type for paths
			"compress": "not a boolean", // Invalid type for compress
		}
		copyFromOriginal(original, parse)
		if parse.Paths != nil {
			t.Error("Should not copy invalid types")
		}
		if parse.Compress {
			t.Error("Should not copy invalid boolean value")
		}
	})

	t.Run("should handle partial property copying", func(t *testing.T) {
		parse := &Parse{}
		original := map[string]any{
			"paths": []string{"/test/path"},
			"compress": true,
			"invalidProperty": "should not copy",
		}
		copyFromOriginal(original, parse)
		if len(parse.Paths) != 1 || parse.Paths[0] != "/test/path" {
			t.Error("Should copy valid paths property")
		}
		if !parse.Compress {
			t.Error("Should copy valid compress property")
		}
		// invalidProperty should not be copied as it's not in the struct
	})

	t.Run("should handle nested struct copying", func(t *testing.T) {
		eval := &Eval{}
		original := map[string]any{
			"paths": []string{"/test/path"},
			"math": MathAlways,
			"importantScope": []map[string]any{{"important": " !important"}},
		}
		copyFromOriginal(original, eval)
		if len(eval.Paths) != 1 || eval.Paths[0] != "/test/path" {
			t.Error("Should copy valid paths property")
		}
		if eval.Math != MathAlways {
			t.Error("Should copy valid math property")
		}
		if len(eval.ImportantScope) != 1 || eval.ImportantScope[0]["important"] != " !important" {
			t.Error("Should copy valid importantScope property")
		}
	})

	t.Run("should handle zero values correctly", func(t *testing.T) {
		parse := &Parse{}
		original := map[string]any{
			"paths": []string{},
			"compress": false,
			"strictImports": false,
		}
		copyFromOriginal(original, parse)
		if len(parse.Paths) != 0 {
			t.Error("Should handle empty paths array")
		}
		if parse.Compress {
			t.Error("Should handle false boolean value")
		}
		if parse.StrictImports {
			t.Error("Should handle false boolean value")
		}
	})

	t.Run("should handle any type properties", func(t *testing.T) {
		parse := &Parse{}
		pluginManager := struct{}{}
		original := map[string]any{
			"pluginManager": pluginManager,
		}
		copyFromOriginal(original, parse)
		if parse.PluginManager == nil {
			t.Error("Should copy any type properties")
		}
	})

	t.Run("should preserve existing values when property not in original", func(t *testing.T) {
		parse := &Parse{
			Paths: []string{"/existing/path"},
		}
		original := map[string]any{
			"compress": true,
		}
		copyFromOriginal(original, parse)
		if len(parse.Paths) != 1 || parse.Paths[0] != "/existing/path" {
			t.Error("Should preserve existing values when property not in original")
		}
		if !parse.Compress {
			t.Error("Should copy new properties from original")
		}
	})
} 