package less_go

import (
	"testing"
)

func TestDataURI(t *testing.T) {
	// Create mock context
	createMockContext := func() map[string]any {
		mockEnvironment := map[string]any{
			"getFileManager": func(filePath, currentDirectory string, context, environment map[string]any, sync bool) any {
				return map[string]any{
					"loadFileSync": func(filePath, currentDirectory string, context, environment map[string]any) map[string]any {
						return map[string]any{
							"contents": "mock content",
							"filename": filePath,
						}
					},
				}
			},
			"mimeLookup": func(filePath string) string {
				if filePath == "test.png" {
					return "image/png"
				}
				return "application/octet-stream"
			},
			"charsetLookup": func(mimetype string) string {
				if mimetype == "image/png" {
					return "binary"
				}
				return "UTF-8"
			},
			"encodeBase64": func(content string) string {
				return "encoded-" + content
			},
		}
		
		return map[string]any{
			"environment": mockEnvironment,
			"currentFileInfo": map[string]any{
				"rewriteUrls":        false,
				"currentDirectory":   "/test/dir",
				"entryPath":          "/test/entry",
			},
			"index": 0,
		}
	}

	t.Run("should handle single parameter (file path only)", func(t *testing.T) {
		context := createMockContext()
		filePathNode := NewQuoted("\"", "test.png", true, 0, nil)
		
		result := DataURI(context, filePathNode, nil)
		
		if result == nil {
			t.Fatal("Expected URL result, got nil")
		}
		
		if _, ok := result.(*URL); !ok {
			t.Fatalf("Expected URL type, got %T", result)
		}
	})

	t.Run("should handle two parameters (mimetype and file path)", func(t *testing.T) {
		context := createMockContext()
		mimetypeNode := NewQuoted("\"", "image/jpeg", true, 0, nil)
		filePathNode := NewQuoted("\"", "test.jpg", true, 0, nil)
		
		result := DataURI(context, mimetypeNode, filePathNode)
		
		if result == nil {
			t.Fatal("Expected URL result, got nil")
		}
		
		if _, ok := result.(*URL); !ok {
			t.Fatalf("Expected URL type, got %T", result)
		}
	})

	t.Run("should auto-detect mimetype when not provided", func(t *testing.T) {
		context := createMockContext()
		filePathNode := NewQuoted("\"", "image.png", true, 0, nil)
		
		// Update mime lookup for this test
		environment := context["environment"].(map[string]any)
		environment["mimeLookup"] = func(filePath string) string {
			if filePath == "image.png" {
				return "image/png"
			}
			return "application/octet-stream"
		}
		
		result := DataURI(context, filePathNode, nil)
		
		if result == nil {
			t.Fatal("Expected URL result, got nil")
		}
		
		if _, ok := result.(*URL); !ok {
			t.Fatalf("Expected URL type, got %T", result)
		}
	})

	t.Run("should handle SVG files without base64 encoding", func(t *testing.T) {
		context := createMockContext()
		filePathNode := NewQuoted("\"", "icon.svg", true, 0, nil)
		
		// Update environment for SVG
		environment := context["environment"].(map[string]any)
		environment["mimeLookup"] = func(filePath string) string {
			if filePath == "icon.svg" {
				return "image/svg+xml"
			}
			return "application/octet-stream"
		}
		environment["getFileManager"] = func(filePath, currentDirectory string, context, environment map[string]any, sync bool) any {
			return map[string]any{
				"loadFileSync": func(filePath, currentDirectory string, context, environment map[string]any) map[string]any {
					return map[string]any{
						"contents": "<svg>test</svg>",
						"filename": filePath,
					}
				},
			}
		}
		
		result := DataURI(context, filePathNode, nil)
		
		if result == nil {
			t.Fatal("Expected URL result, got nil")
		}
		
		if _, ok := result.(*URL); !ok {
			t.Fatalf("Expected URL type, got %T", result)
		}
	})

	t.Run("should use base64 for binary files", func(t *testing.T) {
		context := createMockContext()
		filePathNode := NewQuoted("\"", "binary.bin", true, 0, nil)
		
		// Update environment for binary
		environment := context["environment"].(map[string]any)
		environment["mimeLookup"] = func(filePath string) string {
			return "application/octet-stream"
		}
		environment["charsetLookup"] = func(mimetype string) string {
			return "binary"
		}
		environment["getFileManager"] = func(filePath, currentDirectory string, context, environment map[string]any, sync bool) any {
			return map[string]any{
				"loadFileSync": func(filePath, currentDirectory string, context, environment map[string]any) map[string]any {
					return map[string]any{
						"contents": "binarydata",
						"filename": filePath,
					}
				},
			}
		}
		
		result := DataURI(context, filePathNode, nil)
		
		if result == nil {
			t.Fatal("Expected URL result, got nil")
		}
		
		if _, ok := result.(*URL); !ok {
			t.Fatalf("Expected URL type, got %T", result)
		}
	})

	t.Run("should not use base64 for UTF-8 text files", func(t *testing.T) {
		context := createMockContext()
		filePathNode := NewQuoted("\"", "text.txt", true, 0, nil)
		
		// Update environment for text
		environment := context["environment"].(map[string]any)
		environment["mimeLookup"] = func(filePath string) string {
			return "text/plain"
		}
		environment["charsetLookup"] = func(mimetype string) string {
			return "UTF-8"
		}
		environment["getFileManager"] = func(filePath, currentDirectory string, context, environment map[string]any, sync bool) any {
			return map[string]any{
				"loadFileSync": func(filePath, currentDirectory string, context, environment map[string]any) map[string]any {
					return map[string]any{
						"contents": "hello world",
						"filename": filePath,
					}
				},
			}
		}
		
		result := DataURI(context, filePathNode, nil)
		
		if result == nil {
			t.Fatal("Expected URL result, got nil")
		}
		
		if _, ok := result.(*URL); !ok {
			t.Fatalf("Expected URL type, got %T", result)
		}
	})

	t.Run("should detect base64 from explicit mimetype", func(t *testing.T) {
		context := createMockContext()
		mimetypeNode := NewQuoted("\"", "image/png;base64", true, 0, nil)
		filePathNode := NewQuoted("\"", "test.png", true, 0, nil)
		
		result := DataURI(context, mimetypeNode, filePathNode)
		
		if result == nil {
			t.Fatal("Expected URL result, got nil")
		}
		
		if _, ok := result.(*URL); !ok {
			t.Fatalf("Expected URL type, got %T", result)
		}
	})

	t.Run("should handle file fragments (hash parts)", func(t *testing.T) {
		context := createMockContext()
		filePathNode := NewQuoted("\"", "icon.svg#icon-home", true, 0, nil)
		
		// Track the file path passed to loadFileSync
		var receivedFilePath string
		environment := context["environment"].(map[string]any)
		environment["mimeLookup"] = func(filePath string) string {
			return "image/svg+xml"
		}
		environment["getFileManager"] = func(filePath, currentDirectory string, context, environment map[string]any, sync bool) any {
			receivedFilePath = filePath
			return map[string]any{
				"loadFileSync": func(filePath, currentDirectory string, context, environment map[string]any) map[string]any {
					return map[string]any{
						"contents": "<svg>icon</svg>",
						"filename": filePath,
					}
				},
			}
		}
		
		result := DataURI(context, filePathNode, nil)
		
		// Should receive path without fragment
		if receivedFilePath != "icon.svg" {
			t.Errorf("Expected file path 'icon.svg', got '%s'", receivedFilePath)
		}
		
		if result == nil {
			t.Fatal("Expected URL result, got nil")
		}
		
		if _, ok := result.(*URL); !ok {
			t.Fatalf("Expected URL type, got %T", result)
		}
	})

	t.Run("should handle rewriteUrls option", func(t *testing.T) {
		context := createMockContext()
		currentFileInfo := context["currentFileInfo"].(map[string]any)
		currentFileInfo["rewriteUrls"] = true
		
		filePathNode := NewQuoted("\"", "test.png", true, 0, nil)
		
		// Track the directory passed to getFileManager
		var receivedDirectory string
		environment := context["environment"].(map[string]any)
		environment["getFileManager"] = func(filePath, currentDirectory string, context, environment map[string]any, sync bool) any {
			receivedDirectory = currentDirectory
			return map[string]any{
				"loadFileSync": func(filePath, currentDirectory string, context, environment map[string]any) map[string]any {
					return map[string]any{
						"contents": "content",
						"filename": filePath,
					}
				},
			}
		}
		
		result := DataURI(context, filePathNode, nil)
		
		// Should use currentDirectory when rewriteUrls is true
		if receivedDirectory != "/test/dir" {
			t.Errorf("Expected currentDirectory '/test/dir', got '%s'", receivedDirectory)
		}
		
		if result == nil {
			t.Fatal("Expected URL result, got nil")
		}
		
		if _, ok := result.(*URL); !ok {
			t.Fatalf("Expected URL type, got %T", result)
		}
	})

	t.Run("should fallback when file manager is not available", func(t *testing.T) {
		context := createMockContext()
		environment := context["environment"].(map[string]any)
		environment["getFileManager"] = func(filePath, currentDirectory string, context, environment map[string]any, sync bool) any {
			return nil
		}
		
		filePathNode := NewQuoted("\"", "missing.png", true, 0, nil)
		
		result := DataURI(context, filePathNode, nil)
		
		if result == nil {
			t.Fatal("Expected URL result (fallback), got nil")
		}
		
		if _, ok := result.(*URL); !ok {
			t.Fatalf("Expected URL type, got %T", result)
		}
	})

	t.Run("should fallback when file contents are empty", func(t *testing.T) {
		context := createMockContext()
		filePathNode := NewQuoted("\"", "empty.png", true, 0, nil)
		
		// Mock logger to capture warnings
		warnings := []string{}
		context["logger"] = map[string]any{
			"warn": func(message string) {
				warnings = append(warnings, message)
			},
		}
		
		environment := context["environment"].(map[string]any)
		environment["getFileManager"] = func(filePath, currentDirectory string, context, environment map[string]any, sync bool) any {
			return map[string]any{
				"loadFileSync": func(filePath, currentDirectory string, context, environment map[string]any) map[string]any {
					return map[string]any{
						"contents": "",
						"filename": filePath,
					}
				},
			}
		}
		
		result := DataURI(context, filePathNode, nil)
		
		if result == nil {
			t.Fatal("Expected URL result (fallback), got nil")
		}
		
		if len(warnings) == 0 {
			t.Error("Expected warning to be logged for empty file")
		}
		
		if _, ok := result.(*URL); !ok {
			t.Fatalf("Expected URL type, got %T", result)
		}
	})

	t.Run("should fallback when base64 encoding is not available", func(t *testing.T) {
		context := createMockContext()
		filePathNode := NewQuoted("\"", "image.png", true, 0, nil)
		
		environment := context["environment"].(map[string]any)
		environment["mimeLookup"] = func(filePath string) string {
			return "image/png"
		}
		environment["charsetLookup"] = func(mimetype string) string {
			return "binary"
		}
		// Remove encodeBase64 function
		delete(environment, "encodeBase64")
		
		result := DataURI(context, filePathNode, nil)
		
		if result == nil {
			t.Fatal("Expected URL result (fallback), got nil")
		}
		
		if _, ok := result.(*URL); !ok {
			t.Fatalf("Expected URL type, got %T", result)
		}
	})

	t.Run("should handle non-quoted input gracefully", func(t *testing.T) {
		context := createMockContext()
		filePathNode := "not-a-quoted-node"
		
		result := DataURI(context, filePathNode, nil)
		
		if result == nil {
			t.Fatal("Expected URL result (fallback), got nil")
		}
		
		if _, ok := result.(*URL); !ok {
			t.Fatalf("Expected URL type, got %T", result)
		}
	})
}

func TestDataURIEdgeCases(t *testing.T) {
	createMockContext := func() map[string]any {
		mockEnvironment := map[string]any{
			"getFileManager": func(filePath, currentDirectory string, context, environment map[string]any, sync bool) any {
				return map[string]any{
					"loadFileSync": func(filePath, currentDirectory string, context, environment map[string]any) map[string]any {
						return map[string]any{
							"contents": "mock content",
							"filename": filePath,
						}
					},
				}
			},
			"mimeLookup": func(filePath string) string {
				return "application/octet-stream"
			},
			"charsetLookup": func(mimetype string) string {
				return "UTF-8"
			},
			"encodeBase64": func(content string) string {
				return "encoded-" + content
			},
		}
		
		return map[string]any{
			"environment": mockEnvironment,
			"currentFileInfo": map[string]any{
				"rewriteUrls":        false,
				"currentDirectory":   "/test/dir",
				"entryPath":          "/test/entry",
			},
			"index": 0,
		}
	}

	t.Run("should handle multiple fragments in file path", func(t *testing.T) {
		context := createMockContext()
		filePathNode := NewQuoted("\"", "file.svg#first#second", true, 0, nil)
		
		var receivedFilePath string
		environment := context["environment"].(map[string]any)
		environment["mimeLookup"] = func(filePath string) string {
			return "image/svg+xml"
		}
		environment["getFileManager"] = func(filePath, currentDirectory string, context, environment map[string]any, sync bool) any {
			receivedFilePath = filePath
			return map[string]any{
				"loadFileSync": func(filePath, currentDirectory string, context, environment map[string]any) map[string]any {
					return map[string]any{
						"contents": "<svg>multi</svg>",
						"filename": filePath,
					}
				},
			}
		}
		
		result := DataURI(context, filePathNode, nil)
		
		if receivedFilePath != "file.svg" {
			t.Errorf("Expected file path 'file.svg', got '%s'", receivedFilePath)
		}
		
		if result == nil {
			t.Fatal("Expected URL result, got nil")
		}
	})

	t.Run("should handle missing current file info", func(t *testing.T) {
		context := createMockContext()
		delete(context, "currentFileInfo")
		
		filePathNode := NewQuoted("\"", "test.txt", true, 0, nil)
		
		result := DataURI(context, filePathNode, nil)
		
		if result == nil {
			t.Fatal("Expected URL result, got nil")
		}
	})

	t.Run("should handle file load error", func(t *testing.T) {
		context := createMockContext()
		filePathNode := NewQuoted("\"", "error.txt", true, 0, nil)
		
		environment := context["environment"].(map[string]any)
		environment["getFileManager"] = func(filePath, currentDirectory string, context, environment map[string]any, sync bool) any {
			return map[string]any{
				"loadFileSync": func(filePath, currentDirectory string, context, environment map[string]any) map[string]any {
					return nil // Simulate file load error
				},
			}
		}
		
		result := DataURI(context, filePathNode, nil)
		
		if result == nil {
			t.Fatal("Expected URL result (fallback), got nil")
		}
	})
}

func TestGetDataURIFunctions(t *testing.T) {
	functions := GetDataURIFunctions()
	
	if len(functions) != 1 {
		t.Errorf("Expected 1 function, got %d", len(functions))
	}
	
	if _, exists := functions["data-uri"]; !exists {
		t.Error("Expected 'data-uri' function to exist")
	}
	
	// Test that the function is callable
	if fn, ok := functions["data-uri"].(func(map[string]any, any, any) any); ok {
		mockContext := map[string]any{
			"environment": map[string]any{
				"getFileManager": func(filePath, currentDirectory string, context, environment map[string]any, sync bool) any {
					return nil // This will trigger fallback
				},
			},
			"index": 0,
		}
		
		result := fn(mockContext, nil, NewQuoted("\"", "test.txt", true, 0, nil))
		if result == nil {
			t.Error("Expected function to return a result")
		}
	} else {
		t.Error("data-uri function has incorrect type")
	}
}