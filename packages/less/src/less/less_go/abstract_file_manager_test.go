package less_go

import (
	"testing"
)

func TestAbstractFileManager(t *testing.T) {
	fileManager := NewAbstractFileManager()

	t.Run("GetPath", func(t *testing.T) {
		t.Run("should return path portion of filename with trailing slash", func(t *testing.T) {
			if got := fileManager.GetPath("/path/to/file.less"); got != "/path/to/" {
				t.Errorf("GetPath() = %v, want %v", got, "/path/to/")
			}
			if got := fileManager.GetPath("path/to/file.less"); got != "path/to/" {
				t.Errorf("GetPath() = %v, want %v", got, "path/to/")
			}
			if got := fileManager.GetPath("C:\\path\\to\\file.less"); got != "C:\\path\\to\\" {
				t.Errorf("GetPath() = %v, want %v", got, "C:\\path\\to\\")
			}
		})

		t.Run("should handle filenames with query parameters", func(t *testing.T) {
			if got := fileManager.GetPath("/path/to/file.less?v=123"); got != "/path/to/" {
				t.Errorf("GetPath() = %v, want %v", got, "/path/to/")
			}
			if got := fileManager.GetPath("file.less?query=value"); got != "" {
				t.Errorf("GetPath() = %v, want %v", got, "")
			}
		})

		t.Run("should return empty string for filenames without path separators", func(t *testing.T) {
			if got := fileManager.GetPath("file.less"); got != "" {
				t.Errorf("GetPath() = %v, want %v", got, "")
			}
			if got := fileManager.GetPath("file"); got != "" {
				t.Errorf("GetPath() = %v, want %v", got, "")
			}
		})

		t.Run("should handle edge cases", func(t *testing.T) {
			if got := fileManager.GetPath(""); got != "" {
				t.Errorf("GetPath() = %v, want %v", got, "")
			}
			if got := fileManager.GetPath("/"); got != "/" {
				t.Errorf("GetPath() = %v, want %v", got, "/")
			}
			if got := fileManager.GetPath("\\"); got != "\\" {
				t.Errorf("GetPath() = %v, want %v", got, "\\")
			}
			if got := fileManager.GetPath("/file"); got != "/" {
				t.Errorf("GetPath() = %v, want %v", got, "/")
			}
			if got := fileManager.GetPath("\\file"); got != "\\" {
				t.Errorf("GetPath() = %v, want %v", got, "\\")
			}
		})

		t.Run("should handle mixed path separators", func(t *testing.T) {
			if got := fileManager.GetPath("/path\\to/file.less"); got != "/path\\to/" {
				t.Errorf("GetPath() = %v, want %v", got, "/path\\to/")
			}
			if got := fileManager.GetPath("\\path/to\\file.less"); got != "\\path/" {
				t.Errorf("GetPath() = %v, want %v", got, "\\path/")
			}
		})
	})

	t.Run("TryAppendExtension", func(t *testing.T) {
		t.Run("should append extension when path has no extension", func(t *testing.T) {
			if got := fileManager.TryAppendExtension("file", ".less"); got != "file.less" {
				t.Errorf("TryAppendExtension() = %v, want %v", got, "file.less")
			}
			if got := fileManager.TryAppendExtension("path/file", ".css"); got != "path/file.css" {
				t.Errorf("TryAppendExtension() = %v, want %v", got, "path/file.css")
			}
		})

		t.Run("should not append extension when path already has extension", func(t *testing.T) {
			if got := fileManager.TryAppendExtension("file.less", ".css"); got != "file.less" {
				t.Errorf("TryAppendExtension() = %v, want %v", got, "file.less")
			}
			if got := fileManager.TryAppendExtension("file.css", ".less"); got != "file.css" {
				t.Errorf("TryAppendExtension() = %v, want %v", got, "file.css")
			}
			if got := fileManager.TryAppendExtension("file.txt", ".less"); got != "file.txt" {
				t.Errorf("TryAppendExtension() = %v, want %v", got, "file.txt")
			}
		})

		t.Run("should not append extension when path has query parameters", func(t *testing.T) {
			if got := fileManager.TryAppendExtension("file?v=1", ".less"); got != "file?v=1" {
				t.Errorf("TryAppendExtension() = %v, want %v", got, "file?v=1")
			}
			if got := fileManager.TryAppendExtension("file;jsessionid=123", ".less"); got != "file;jsessionid=123" {
				t.Errorf("TryAppendExtension() = %v, want %v", got, "file;jsessionid=123")
			}
		})

		t.Run("should handle empty paths", func(t *testing.T) {
			if got := fileManager.TryAppendExtension("", ".less"); got != ".less" {
				t.Errorf("TryAppendExtension() = %v, want %v", got, ".less")
			}
		})

		t.Run("should handle paths ending with dots", func(t *testing.T) {
			if got := fileManager.TryAppendExtension("file.", ".less"); got != "file." {
				t.Errorf("TryAppendExtension() = %v, want %v", got, "file.")
			}
			if got := fileManager.TryAppendExtension("file..", ".less"); got != "file.." {
				t.Errorf("TryAppendExtension() = %v, want %v", got, "file..")
			}
		})
	})

	t.Run("TryAppendLessExtension", func(t *testing.T) {
		t.Run("should append .less extension", func(t *testing.T) {
			if got := fileManager.TryAppendLessExtension("file"); got != "file.less" {
				t.Errorf("TryAppendLessExtension() = %v, want %v", got, "file.less")
			}
			if got := fileManager.TryAppendLessExtension("path/file"); got != "path/file.less" {
				t.Errorf("TryAppendLessExtension() = %v, want %v", got, "path/file.less")
			}
		})

		t.Run("should not append .less when extension exists", func(t *testing.T) {
			if got := fileManager.TryAppendLessExtension("file.css"); got != "file.css" {
				t.Errorf("TryAppendLessExtension() = %v, want %v", got, "file.css")
			}
			if got := fileManager.TryAppendLessExtension("file.less"); got != "file.less" {
				t.Errorf("TryAppendLessExtension() = %v, want %v", got, "file.less")
			}
		})
	})

	t.Run("SupportsSync", func(t *testing.T) {
		t.Run("should return false by default", func(t *testing.T) {
			if got := fileManager.SupportsSync(); got != false {
				t.Errorf("SupportsSync() = %v, want %v", got, false)
			}
		})
	})

	t.Run("AlwaysMakePathsAbsolute", func(t *testing.T) {
		t.Run("should return false by default", func(t *testing.T) {
			if got := fileManager.AlwaysMakePathsAbsolute(); got != false {
				t.Errorf("AlwaysMakePathsAbsolute() = %v, want %v", got, false)
			}
		})
	})

	t.Run("IsPathAbsolute", func(t *testing.T) {
		t.Run("should identify absolute paths with protocol", func(t *testing.T) {
			if got := fileManager.IsPathAbsolute("http://example.com/file.less"); got != true {
				t.Errorf("IsPathAbsolute() = %v, want %v", got, true)
			}
			if got := fileManager.IsPathAbsolute("https://example.com/file.less"); got != true {
				t.Errorf("IsPathAbsolute() = %v, want %v", got, true)
			}
			if got := fileManager.IsPathAbsolute("file:///path/file.less"); got != true {
				t.Errorf("IsPathAbsolute() = %v, want %v", got, true)
			}
			if got := fileManager.IsPathAbsolute("ftp://server/file.less"); got != true {
				t.Errorf("IsPathAbsolute() = %v, want %v", got, true)
			}
		})

		t.Run("should identify absolute paths with forward slash", func(t *testing.T) {
			if got := fileManager.IsPathAbsolute("/path/file.less"); got != true {
				t.Errorf("IsPathAbsolute() = %v, want %v", got, true)
			}
			if got := fileManager.IsPathAbsolute("/file.less"); got != true {
				t.Errorf("IsPathAbsolute() = %v, want %v", got, true)
			}
		})

		t.Run("should identify absolute paths with backslash", func(t *testing.T) {
			if got := fileManager.IsPathAbsolute("\\path\\file.less"); got != true {
				t.Errorf("IsPathAbsolute() = %v, want %v", got, true)
			}
			if got := fileManager.IsPathAbsolute("\\file.less"); got != true {
				t.Errorf("IsPathAbsolute() = %v, want %v", got, true)
			}
		})

		t.Run("should identify hash paths as absolute", func(t *testing.T) {
			if got := fileManager.IsPathAbsolute("#fragment"); got != true {
				t.Errorf("IsPathAbsolute() = %v, want %v", got, true)
			}
		})

		t.Run("should identify relative paths", func(t *testing.T) {
			if got := fileManager.IsPathAbsolute("file.less"); got != false {
				t.Errorf("IsPathAbsolute() = %v, want %v", got, false)
			}
			if got := fileManager.IsPathAbsolute("path/file.less"); got != false {
				t.Errorf("IsPathAbsolute() = %v, want %v", got, false)
			}
			if got := fileManager.IsPathAbsolute("./file.less"); got != false {
				t.Errorf("IsPathAbsolute() = %v, want %v", got, false)
			}
			if got := fileManager.IsPathAbsolute("../file.less"); got != false {
				t.Errorf("IsPathAbsolute() = %v, want %v", got, false)
			}
		})

		t.Run("should handle empty and special cases", func(t *testing.T) {
			if got := fileManager.IsPathAbsolute(""); got != false {
				t.Errorf("IsPathAbsolute() = %v, want %v", got, false)
			}
			if got := fileManager.IsPathAbsolute("C:"); got != true {
				t.Errorf("IsPathAbsolute() = %v, want %v", got, true)
			}
		})
	})

	t.Run("Join", func(t *testing.T) {
		t.Run("should join paths", func(t *testing.T) {
			if got := fileManager.Join("/base/", "file.less"); got != "/base/file.less" {
				t.Errorf("Join() = %v, want %v", got, "/base/file.less")
			}
			if got := fileManager.Join("base", "/file.less"); got != "base/file.less" {
				t.Errorf("Join() = %v, want %v", got, "base/file.less")
			}
			if got := fileManager.Join("base/", "path/file.less"); got != "base/path/file.less" {
				t.Errorf("Join() = %v, want %v", got, "base/path/file.less")
			}
		})

		t.Run("should return laterPath when basePath is empty", func(t *testing.T) {
			if got := fileManager.Join("", "file.less"); got != "file.less" {
				t.Errorf("Join() = %v, want %v", got, "file.less")
			}
		})

		t.Run("should handle empty laterPath", func(t *testing.T) {
			if got := fileManager.Join("/base/", ""); got != "/base/" {
				t.Errorf("Join() = %v, want %v", got, "/base/")
			}
		})
	})

	t.Run("ExtractURLParts", func(t *testing.T) {
		t.Run("should parse simple URLs", func(t *testing.T) {
			result, err := fileManager.ExtractURLParts("http://example.com/path/file.less", "")
			if err != nil {
				t.Fatalf("ExtractURLParts() error = %v", err)
			}
			if result.HostPart != "http://example.com/" {
				t.Errorf("HostPart = %v, want %v", result.HostPart, "http://example.com/")
			}
			expected := []string{"path", ""}
			if len(result.Directories) != len(expected) {
				t.Errorf("Directories length = %v, want %v", len(result.Directories), len(expected))
			}
			for i, dir := range expected {
				if i >= len(result.Directories) || result.Directories[i] != dir {
					t.Errorf("Directories[%d] = %v, want %v", i, result.Directories[i], dir)
				}
			}
			if result.Filename != "file.less" {
				t.Errorf("Filename = %v, want %v", result.Filename, "file.less")
			}
			if result.Path != "http://example.com/path/" {
				t.Errorf("Path = %v, want %v", result.Path, "http://example.com/path/")
			}
			if result.FileURL != "http://example.com/path/file.less" {
				t.Errorf("FileURL = %v, want %v", result.FileURL, "http://example.com/path/file.less")
			}
			if result.URL != "http://example.com/path/file.less" {
				t.Errorf("URL = %v, want %v", result.URL, "http://example.com/path/file.less")
			}
		})

		t.Run("should parse URLs with query parameters", func(t *testing.T) {
			result, err := fileManager.ExtractURLParts("http://example.com/path/file.less?v=1&t=2", "")
			if err != nil {
				t.Fatalf("ExtractURLParts() error = %v", err)
			}
			if result.HostPart != "http://example.com/" {
				t.Errorf("HostPart = %v, want %v", result.HostPart, "http://example.com/")
			}
			expected := []string{"path", ""}
			if len(result.Directories) != len(expected) {
				t.Errorf("Directories length = %v, want %v", len(result.Directories), len(expected))
			}
			if result.Filename != "file.less" {
				t.Errorf("Filename = %v, want %v", result.Filename, "file.less")
			}
			if result.URL != "http://example.com/path/file.less?v=1&t=2" {
				t.Errorf("URL = %v, want %v", result.URL, "http://example.com/path/file.less?v=1&t=2")
			}
		})

		t.Run("should parse relative paths", func(t *testing.T) {
			result, err := fileManager.ExtractURLParts("/path/to/file.less", "")
			if err != nil {
				t.Fatalf("ExtractURLParts() error = %v", err)
			}
			if result.HostPart != "/" {
				t.Errorf("HostPart = %v, want %v", result.HostPart, "/")
			}
			expected := []string{"path", "to", ""}
			if len(result.Directories) != len(expected) {
				t.Errorf("Directories length = %v, want %v", len(result.Directories), len(expected))
			}
			if result.Filename != "file.less" {
				t.Errorf("Filename = %v, want %v", result.Filename, "file.less")
			}
			if result.Path != "/path/to/" {
				t.Errorf("Path = %v, want %v", result.Path, "/path/to/")
			}
		})

		t.Run("should handle paths with .. and . directories", func(t *testing.T) {
			result, err := fileManager.ExtractURLParts("/path/./to/../file.less", "")
			if err != nil {
				t.Fatalf("ExtractURLParts() error = %v", err)
			}
			expected := []string{"path", ""}
			if len(result.Directories) != len(expected) {
				t.Errorf("Directories length = %v, want %v", len(result.Directories), len(expected))
			}
			if result.Path != "/path/" {
				t.Errorf("Path = %v, want %v", result.Path, "/path/")
			}
		})

		t.Run("should parse Windows-style paths", func(t *testing.T) {
			result, err := fileManager.ExtractURLParts("\\path\\to\\file.less", "")
			if err != nil {
				t.Fatalf("ExtractURLParts() error = %v", err)
			}
			expected := []string{"path", "to", ""}
			if len(result.Directories) != len(expected) {
				t.Errorf("Directories length = %v, want %v", len(result.Directories), len(expected))
			}
			if result.Filename != "file.less" {
				t.Errorf("Filename = %v, want %v", result.Filename, "file.less")
			}
		})

		t.Run("should handle baseUrl for relative URLs", func(t *testing.T) {
			result, err := fileManager.ExtractURLParts("file.less", "http://example.com/base/")
			if err != nil {
				t.Fatalf("ExtractURLParts() error = %v", err)
			}
			if result.HostPart != "http://example.com/" {
				t.Errorf("HostPart = %v, want %v", result.HostPart, "http://example.com/")
			}
			expected := []string{"base", ""}
			if len(result.Directories) != len(expected) {
				t.Errorf("Directories length = %v, want %v", len(result.Directories), len(expected))
			}
			if result.Filename != "file.less" {
				t.Errorf("Filename = %v, want %v", result.Filename, "file.less")
			}
		})

		t.Run("should handle root-relative URLs with baseUrl", func(t *testing.T) {
			result, err := fileManager.ExtractURLParts("/file.less", "http://example.com/base/")
			if err != nil {
				t.Fatalf("ExtractURLParts() error = %v", err)
			}
			if result.HostPart != "/" {
				t.Errorf("HostPart = %v, want %v", result.HostPart, "/")
			}
			if len(result.Directories) != 0 {
				t.Errorf("Directories length = %v, want %v", len(result.Directories), 0)
			}
			if result.Filename != "file.less" {
				t.Errorf("Filename = %v, want %v", result.Filename, "file.less")
			}
		})

		t.Run("should handle edge cases for URLs", func(t *testing.T) {
			// Empty string actually returns a valid result with the regex
			result, err := fileManager.ExtractURLParts("", "")
			if err != nil {
				t.Fatalf("ExtractURLParts() error = %v", err)
			}
			if result == nil {
				t.Error("Expected result to be defined")
			}
		})

		t.Run("should handle edge cases for baseUrl", func(t *testing.T) {
			// Empty baseUrl actually doesn't trigger the error path unless needed
			result, err := fileManager.ExtractURLParts("file.less", "")
			if err != nil {
				t.Fatalf("ExtractURLParts() error = %v", err)
			}
			if result == nil {
				t.Error("Expected result to be defined")
			}
		})

		t.Run("should handle complex directory navigation", func(t *testing.T) {
			result, err := fileManager.ExtractURLParts("/a/b/c/../../d/../e/f.less", "")
			if err != nil {
				t.Fatalf("ExtractURLParts() error = %v", err)
			}
			expected := []string{"a", "e", ""}
			if len(result.Directories) != len(expected) {
				t.Errorf("Directories length = %v, want %v", len(result.Directories), len(expected))
			}
			if result.Path != "/a/e/" {
				t.Errorf("Path = %v, want %v", result.Path, "/a/e/")
			}
		})

		t.Run("should handle fragments", func(t *testing.T) {
			result, err := fileManager.ExtractURLParts("http://example.com/file.less#section", "")
			if err != nil {
				t.Fatalf("ExtractURLParts() error = %v", err)
			}
			if result.Filename != "file.less" {
				t.Errorf("Filename = %v, want %v", result.Filename, "file.less")
			}
			if result.URL != "http://example.com/file.less#section" {
				t.Errorf("URL = %v, want %v", result.URL, "http://example.com/file.less#section")
			}
		})
	})

	t.Run("PathDiff", func(t *testing.T) {
		t.Run("should calculate relative path between URLs", func(t *testing.T) {
			result := fileManager.PathDiff(
				"http://example.com/path/to/file.less",
				"http://example.com/base/from/here.less",
			)
			if result != "../../path/to/" {
				t.Errorf("PathDiff() = %v, want %v", result, "../../path/to/")
			}
		})

		t.Run("should return empty string for different hosts", func(t *testing.T) {
			result := fileManager.PathDiff(
				"http://example.com/file.less",
				"http://other.com/file.less",
			)
			if result != "" {
				t.Errorf("PathDiff() = %v, want %v", result, "")
			}
		})

		t.Run("should handle same directory", func(t *testing.T) {
			result := fileManager.PathDiff(
				"http://example.com/path/file1.less",
				"http://example.com/path/file2.less",
			)
			if result != "" {
				t.Errorf("PathDiff() = %v, want %v", result, "")
			}
		})

		t.Run("should handle subdirectory", func(t *testing.T) {
			result := fileManager.PathDiff(
				"http://example.com/path/sub/file.less",
				"http://example.com/path/file.less",
			)
			if result != "sub/" {
				t.Errorf("PathDiff() = %v, want %v", result, "sub/")
			}
		})

		t.Run("should handle parent directory", func(t *testing.T) {
			result := fileManager.PathDiff(
				"http://example.com/file.less",
				"http://example.com/path/file.less",
			)
			if result != "../" {
				t.Errorf("PathDiff() = %v, want %v", result, "../")
			}
		})

		t.Run("should handle complex relative paths", func(t *testing.T) {
			result := fileManager.PathDiff(
				"http://example.com/a/b/c/file.less",
				"http://example.com/x/y/file.less",
			)
			if result != "../../a/b/c/" {
				t.Errorf("PathDiff() = %v, want %v", result, "../../a/b/c/")
			}
		})

		t.Run("should handle root paths", func(t *testing.T) {
			result := fileManager.PathDiff(
				"http://example.com/file.less",
				"http://example.com/",
			)
			if result != "" {
				t.Errorf("PathDiff() = %v, want %v", result, "")
			}
		})
	})
}