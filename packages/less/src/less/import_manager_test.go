package less

import (
	"fmt"
	"testing"
	"time"
)

// Mock implementations for testing

// MockEnvironment implements the Environment interface
type MockEnvironment struct {
	FileManager FileManager
}

func (m *MockEnvironment) GetFileManager(path, currentDirectory string, context map[string]any, environment Environment) FileManager {
	return m.FileManager
}

// MockFileManager implements the FileManager interface
type MockFileManager struct {
	LoadFileSyncFunc         func(path, currentDirectory string, context map[string]any, environment Environment) *LoadedFile
	LoadFileFunc             func(path, currentDirectory string, context map[string]any, environment Environment, callback func(error, *LoadedFile)) any
	GetPathFunc              func(filename string) string
	JoinFunc                 func(path1, path2 string) string
	PathDiffFunc             func(currentDirectory, entryPath string) string
	IsPathAbsoluteFunc       func(path string) bool
	AlwaysMakePathsAbsoluteFunc func() bool
}

func (m *MockFileManager) LoadFileSync(path, currentDirectory string, context map[string]any, environment Environment) *LoadedFile {
	if m.LoadFileSyncFunc != nil {
		return m.LoadFileSyncFunc(path, currentDirectory, context, environment)
	}
	return &LoadedFile{Filename: path, Contents: ".test { color: red; }"}
}

func (m *MockFileManager) LoadFile(path, currentDirectory string, context map[string]any, environment Environment, callback func(error, *LoadedFile)) any {
	if m.LoadFileFunc != nil {
		return m.LoadFileFunc(path, currentDirectory, context, environment, callback)
	}
	// Default async behavior
	go callback(nil, &LoadedFile{Filename: path, Contents: ".test { color: red; }"})
	return nil
}

func (m *MockFileManager) GetPath(filename string) string {
	if m.GetPathFunc != nil {
		return m.GetPathFunc(filename)
	}
	return "/resolved/"
}

func (m *MockFileManager) Join(path1, path2 string) string {
	if m.JoinFunc != nil {
		return m.JoinFunc(path1, path2)
	}
	return path1 + path2
}

func (m *MockFileManager) PathDiff(currentDirectory, entryPath string) string {
	if m.PathDiffFunc != nil {
		return m.PathDiffFunc(currentDirectory, entryPath)
	}
	return "../"
}

func (m *MockFileManager) IsPathAbsolute(path string) bool {
	if m.IsPathAbsoluteFunc != nil {
		return m.IsPathAbsoluteFunc(path)
	}
	return false
}

func (m *MockFileManager) AlwaysMakePathsAbsolute() bool {
	if m.AlwaysMakePathsAbsoluteFunc != nil {
		return m.AlwaysMakePathsAbsoluteFunc()
	}
	return true
}

// MockImportPluginLoader implements the PluginLoader interface for import manager tests
type MockImportPluginLoader struct {
	EvalPluginFunc      func(contents string, newEnv *Parse, importManager any, pluginArgs map[string]any, newFileInfo any) any
	LoadPluginSyncFunc  func(path, currentDirectory string, context map[string]any, environment any, fileManager any) any
	LoadPluginFunc      func(path, currentDirectory string, context map[string]any, environment any, fileManager any) any
}

func (m *MockImportPluginLoader) EvalPlugin(contents string, newEnv *Parse, importManager any, pluginArgs map[string]any, newFileInfo any) any {
	if m.EvalPluginFunc != nil {
		return m.EvalPluginFunc(contents, newEnv, importManager, pluginArgs, newFileInfo)
	}
	return map[string]string{"name": "test-plugin"}
}

func (m *MockImportPluginLoader) LoadPluginSync(path, currentDirectory string, context map[string]any, environment any, fileManager any) any {
	if m.LoadPluginSyncFunc != nil {
		return m.LoadPluginSyncFunc(path, currentDirectory, context, environment, fileManager)
	}
	return &LoadedFile{Filename: "/resolved/test.js", Contents: "module.exports = {};"}
}

func (m *MockImportPluginLoader) LoadPlugin(path, currentDirectory string, context map[string]any, environment any, fileManager any) any {
	if m.LoadPluginFunc != nil {
		return m.LoadPluginFunc(path, currentDirectory, context, environment, fileManager)
	}
	return nil
}

// MockParserInterface implements the ParserInterface
type MockParserInterface struct {
	ParseFunc func(str string, callback func(*LessError, any), additionalData map[string]any)
}

func (m *MockParserInterface) Parse(str string, callback func(*LessError, any), additionalData map[string]any) {
	if m.ParseFunc != nil {
		m.ParseFunc(str, callback, additionalData)
	} else {
		// Default behavior - return a mock root
		callback(nil, map[string]string{"type": "Ruleset"})
	}
}

// Test helper functions

func createMockEnvironment() *MockEnvironment {
	return &MockEnvironment{
		FileManager: &MockFileManager{},
	}
}

func createMockContext() map[string]any {
	return map[string]any{
		"paths":       []string{"/mock/path1", "/mock/path2"},
		"mime":        "text/css",
		"rewriteUrls": true,
		"rootpath":    "/root/",
		"syncImport":  true,
		"pluginManager": map[string]any{
			"Loader": &MockImportPluginLoader{},
		},
		"parserFactory": func(context map[string]any, imports map[string]any, fileInfo map[string]any, index int) ParserInterface {
			return &MockParserInterface{}
		},
	}
}

func createMockRootFileInfo() *FileInfo {
	return &FileInfo{
		Filename:         "/root/main.less",
		CurrentDirectory: "/root/",
		Rootpath:         "/root/",
		EntryPath:        "/root/",
		RootFilename:     "/root/main.less",
	}
}

// Tests

func TestImportManagerConstructor(t *testing.T) {
	mockEnv := createMockEnvironment()
	mockContext := createMockContext()
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{"parse": func() {}}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	// Test initialization
	if im.less == nil {
		t.Error("Expected less to be set")
	}

	if im.rootFilename != "/root/main.less" {
		t.Errorf("Expected rootFilename to be '/root/main.less', got '%s'", im.rootFilename)
	}

	expectedPaths := []string{"/mock/path1", "/mock/path2"}
	if len(im.paths) != len(expectedPaths) {
		t.Errorf("Expected paths length %d, got %d", len(expectedPaths), len(im.paths))
	}
	for i, path := range expectedPaths {
		if im.paths[i] != path {
			t.Errorf("Expected path[%d] to be '%s', got '%s'", i, path, im.paths[i])
		}
	}

	if len(im.contents) != 0 {
		t.Errorf("Expected contents to be empty, got %v", im.contents)
	}

	if len(im.contentsIgnoredChars) != 0 {
		t.Errorf("Expected contentsIgnoredChars to be empty, got %v", im.contentsIgnoredChars)
	}

	if im.mime != "text/css" {
		t.Errorf("Expected mime to be 'text/css', got '%s'", im.mime)
	}

	if im.error != nil {
		t.Errorf("Expected error to be nil, got %v", im.error)
	}

	if len(im.queue) != 0 {
		t.Errorf("Expected queue to be empty, got %v", im.queue)
	}

	if len(im.files) != 0 {
		t.Errorf("Expected files to be empty, got %v", im.files)
	}
}

func TestImportManagerConstructorWithUndefinedPaths(t *testing.T) {
	mockEnv := createMockEnvironment()
	mockContext := createMockContext()
	delete(mockContext, "paths")
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	if len(im.paths) != 0 {
		t.Errorf("Expected paths to be empty when undefined, got %v", im.paths)
	}
}

func TestImportManagerPushBasicFunctionality(t *testing.T) {
	mockEnv := createMockEnvironment()
	mockContext := createMockContext()
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	type callbackData struct {
		called                bool
		err                   error
		root                  any
		importedEqualsRoot    bool
		fullPath              string
	}
	
	result := &callbackData{}

	callback := func(err error, root any, importedEqualsRoot bool, fullPath string) {
		result.called = true
		result.err = err
		result.root = root
		result.importedEqualsRoot = importedEqualsRoot
		result.fullPath = fullPath
	}

	importOptions := &ImportOptions{}
	currentFileInfo := &FileInfo{CurrentDirectory: "/current/"}

	im.Push("/test.less", true, currentFileInfo, importOptions, callback)

	// The path should be added to queue initially, but then removed after processing
	if len(im.queue) != 0 {
		t.Errorf("Expected queue to be empty after processing, got %v", im.queue)
	}

	if !result.called {
		t.Error("Expected callback to be called")
		return // Exit early if callback wasn't called
	}

	if result.err != nil {
		t.Errorf("Expected no error, got error: %v", result.err)
	}

	if result.root == nil {
		t.Error("Expected root to be set")
	}

	if result.importedEqualsRoot {
		t.Error("Expected importedEqualsRoot to be false")
	}

	if result.fullPath == "" {
		t.Error("Expected fullPath to be set")
	}
}

func TestImportManagerPushMissingFileManager(t *testing.T) {
	mockEnv := &MockEnvironment{FileManager: nil}
	mockContext := createMockContext()
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	var callbackCalled bool
	var callbackError error

	callback := func(err error, root any, importedEqualsRoot bool, fullPath string) {
		callbackCalled = true
		callbackError = err
	}

	importOptions := &ImportOptions{}
	currentFileInfo := &FileInfo{CurrentDirectory: "/current/"}

	im.Push("/test.less", true, currentFileInfo, importOptions, callback)

	if !callbackCalled {
		t.Error("Expected callback to be called")
	}

	if callbackError == nil {
		t.Error("Expected error when file manager is missing")
	}

	expectedError := "Could not find a file-manager for /test.less"
	if callbackError.Error() != expectedError {
		t.Errorf("Expected error message '%s', got '%s'", expectedError, callbackError.Error())
	}
}

func TestImportManagerPushSynchronousFileLoading(t *testing.T) {
	mockFileManager := &MockFileManager{
		LoadFileSyncFunc: func(path, currentDirectory string, context map[string]any, environment Environment) *LoadedFile {
			return &LoadedFile{
				Filename: "/resolved/test.less",
				Contents: ".test { color: red; }",
			}
		},
		GetPathFunc: func(filename string) string {
			return "/resolved/"
		},
	}

	mockEnv := &MockEnvironment{FileManager: mockFileManager}
	mockContext := createMockContext()
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	var callbackCalled bool
	var callbackError error
	var callbackRoot any

	callback := func(err error, root any, importedEqualsRoot bool, fullPath string) {
		callbackCalled = true
		callbackError = err
		callbackRoot = root
	}

	importOptions := &ImportOptions{}
	currentFileInfo := &FileInfo{CurrentDirectory: "/root/"}

	im.Push("/test.less", true, currentFileInfo, importOptions, callback)

	if !callbackCalled {
		t.Error("Expected callback to be called")
	}

	if callbackError != nil {
		t.Errorf("Expected no error, got error: %v", callbackError)
	}

	if callbackRoot == nil {
		t.Error("Expected root to be set")
	}

	// Check that file contents were stored
	if content, exists := im.contents["/resolved/test.less"]; !exists {
		t.Error("Expected file contents to be stored")
	} else if content != ".test { color: red; }" {
		t.Errorf("Expected content '.test { color: red; }', got '%s'", content)
	}
}

func TestImportManagerPushBOMRemoval(t *testing.T) {
	mockFileManager := &MockFileManager{
		LoadFileSyncFunc: func(path, currentDirectory string, context map[string]any, environment Environment) *LoadedFile {
			return &LoadedFile{
				Filename: "/resolved/test.less",
				Contents: "\uFEFF.test { color: red; }", // BOM + content
			}
		},
		GetPathFunc: func(filename string) string {
			return "/resolved/"
		},
	}

	mockEnv := &MockEnvironment{FileManager: mockFileManager}
	mockContext := createMockContext()
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	callback := func(err error, root any, importedEqualsRoot bool, fullPath string) {}

	importOptions := &ImportOptions{}
	currentFileInfo := &FileInfo{CurrentDirectory: "/root/"}

	im.Push("/test.less", true, currentFileInfo, importOptions, callback)

	// Check that BOM was removed from stored content
	if content, exists := im.contents["/resolved/test.less"]; !exists {
		t.Error("Expected file contents to be stored")
	} else if content != ".test { color: red; }" {
		t.Errorf("Expected BOM to be removed, got '%s'", content)
	}
}

func TestImportManagerPushImportedEqualsRoot(t *testing.T) {
	mockFileManager := &MockFileManager{
		LoadFileSyncFunc: func(path, currentDirectory string, context map[string]any, environment Environment) *LoadedFile {
			return &LoadedFile{
				Filename: "/root/main.less", // Same as root filename
				Contents: ".test { color: red; }",
			}
		},
		GetPathFunc: func(filename string) string {
			return "/root/"
		},
	}

	mockEnv := &MockEnvironment{FileManager: mockFileManager}
	mockContext := createMockContext()
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	var callbackImportedEqualsRoot bool

	callback := func(err error, root any, importedEqualsRoot bool, fullPath string) {
		callbackImportedEqualsRoot = importedEqualsRoot
	}

	importOptions := &ImportOptions{}
	currentFileInfo := &FileInfo{CurrentDirectory: "/root/"}

	im.Push("/test.less", true, currentFileInfo, importOptions, callback)

	if !callbackImportedEqualsRoot {
		t.Error("Expected importedEqualsRoot to be true when imported file equals root filename")
	}
}

func TestImportManagerPushOptionalImportWithError(t *testing.T) {
	mockFileManager := &MockFileManager{
		LoadFileSyncFunc: func(path, currentDirectory string, context map[string]any, environment Environment) *LoadedFile {
			return &LoadedFile{
				Message: "File not found", // Error case
			}
		},
	}

	mockEnv := &MockEnvironment{FileManager: mockFileManager}
	mockContext := createMockContext()
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	var callbackError error
	var callbackRoot any

	callback := func(err error, root any, importedEqualsRoot bool, fullPath string) {
		callbackError = err
		callbackRoot = root
	}

	importOptions := &ImportOptions{Optional: true}
	currentFileInfo := &FileInfo{CurrentDirectory: "/root/"}

	im.Push("/missing.less", true, currentFileInfo, importOptions, callback)

	if callbackError != nil {
		t.Errorf("Expected no error for optional import, got %v", callbackError)
	}

	// Should return empty rules for optional imports
	if rootMap, ok := callbackRoot.(map[string]any); !ok {
		t.Error("Expected root to be a map")
	} else if rules, exists := rootMap["rules"]; !exists {
		t.Error("Expected root to have 'rules' key")
	} else if rulesSlice, ok := rules.([]any); !ok {
		t.Error("Expected rules to be a slice")
	} else if len(rulesSlice) != 0 {
		t.Error("Expected rules to be empty for optional import")
	}
}

func TestImportManagerPushFileLoadError(t *testing.T) {
	mockFileManager := &MockFileManager{
		LoadFileSyncFunc: func(path, currentDirectory string, context map[string]any, environment Environment) *LoadedFile {
			return &LoadedFile{
				Message: "File not found", // Error case
			}
		},
	}

	mockEnv := &MockEnvironment{FileManager: mockFileManager}
	mockContext := createMockContext()
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	var callbackError error

	callback := func(err error, root any, importedEqualsRoot bool, fullPath string) {
		callbackError = err
	}

	importOptions := &ImportOptions{} // Not optional
	currentFileInfo := &FileInfo{CurrentDirectory: "/root/"}

	im.Push("/missing.less", true, currentFileInfo, importOptions, callback)

	if callbackError == nil {
		t.Error("Expected error for non-optional import when file not found")
	}

	expectedError := "File not found"
	if callbackError.Error() != expectedError {
		t.Errorf("Expected error message '%s', got '%s'", expectedError, callbackError.Error())
	}
}

func TestImportManagerPushInlineImport(t *testing.T) {
	mockFileManager := &MockFileManager{
		LoadFileSyncFunc: func(path, currentDirectory string, context map[string]any, environment Environment) *LoadedFile {
			return &LoadedFile{
				Filename: "/resolved/test.less",
				Contents: ".test { color: red; }",
			}
		},
		GetPathFunc: func(filename string) string {
			return "/resolved/"
		},
	}

	mockEnv := &MockEnvironment{FileManager: mockFileManager}
	mockContext := createMockContext()
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	var callbackRoot any

	callback := func(err error, root any, importedEqualsRoot bool, fullPath string) {
		callbackRoot = root
	}

	importOptions := &ImportOptions{Inline: true}
	currentFileInfo := &FileInfo{CurrentDirectory: "/root/"}

	im.Push("/test.less", true, currentFileInfo, importOptions, callback)

	// For inline imports, should return the raw contents, not parsed
	if content, ok := callbackRoot.(string); !ok {
		t.Error("Expected inline import to return string content")
	} else if content != ".test { color: red; }" {
		t.Errorf("Expected content '.test { color: red; }', got '%s'", content)
	}

	// Should not cache inline imports
	if _, exists := im.files["/resolved/test.less"]; exists {
		t.Error("Expected inline imports not to be cached")
	}
}

func TestImportManagerPushTryAppendExtension(t *testing.T) {
	mockFileManager := &MockFileManager{}
	mockEnv := &MockEnvironment{FileManager: mockFileManager}
	mockContext := createMockContext()
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	callback := func(err error, root any, importedEqualsRoot bool, fullPath string) {}

	// Test .less extension
	importOptions := &ImportOptions{}
	currentFileInfo := &FileInfo{CurrentDirectory: "/root/"}

	im.Push("/test", true, currentFileInfo, importOptions, callback)

	// Test .js extension for plugin
	importOptionsPlugin := &ImportOptions{IsPlugin: true}
	im.Push("/test", true, currentFileInfo, importOptionsPlugin, callback)

	// We can't easily verify the extension was set without exposing internals,
	// but this tests that the code path executes without errors
}

func TestImportManagerPushErrorHandling(t *testing.T) {
	mockEnv := createMockEnvironment()
	mockContext := createMockContext()
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	// Create a parser that returns an error
	mockContext["parserFactory"] = func(context map[string]any, imports map[string]any, fileInfo map[string]any, index int) ParserInterface {
		return &MockParserInterface{
			ParseFunc: func(str string, callback func(*LessError, any), additionalData map[string]any) {
				err := &LessError{Message: "Parse error"}
				callback(err, nil)
			},
		}
	}

	var callbackError error

	callback := func(err error, root any, importedEqualsRoot bool, fullPath string) {
		callbackError = err
	}

	importOptions := &ImportOptions{}
	currentFileInfo := &FileInfo{CurrentDirectory: "/root/"}

	im.Push("/test.less", true, currentFileInfo, importOptions, callback)

	if callbackError == nil {
		t.Error("Expected error from parser")
	}

	// Should store the first error
	if im.error == nil {
		t.Error("Expected import manager to store the first error")
	}

	// Second error should not overwrite the first
	firstError := im.error
	im.Push("/test2.less", true, currentFileInfo, importOptions, callback)

	if im.error != firstError {
		t.Error("Expected import manager to keep the first error")
	}
}

func TestImportManagerCloneContext(t *testing.T) {
	mockEnv := createMockEnvironment()
	mockContext := createMockContext()
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	cloned := im.cloneContext()

	// Should be a different map
	if &cloned == &im.context {
		t.Error("Expected cloned context to be a different map")
	}

	// Should have same content (but skip complex type comparisons)
	for key, value := range im.context {
		if clonedValue, exists := cloned[key]; !exists {
			t.Errorf("Expected cloned context to have key '%s'", key)
		} else if key != "parserFactory" && key != "pluginManager" && key != "paths" { // Skip function, complex object, and slice comparisons
			// Only compare primitive types safely
			switch value.(type) {
			case string, bool, int, int64, float64:
				if clonedValue != value {
					t.Errorf("Expected cloned context[%s] to be %v, got %v", key, value, clonedValue)
				}
			default:
				// For other types, just verify the key exists
				// t.Logf("Skipping comparison for complex type %s (type: %T)", key, value)
			}
		}
	}

	// Modifying cloned should not affect original
	cloned["newKey"] = "newValue"
	if _, exists := im.context["newKey"]; exists {
		t.Error("Expected modification to cloned context not to affect original")
	}
}

// Plugin loading tests

func TestImportManagerPushPluginSynchronous(t *testing.T) {
	mockPluginLoader := &MockImportPluginLoader{
		LoadPluginSyncFunc: func(path, currentDirectory string, context map[string]any, environment any, fileManager any) any {
			return &LoadedFile{
				Filename: "/resolved/test.js",
				Contents: "module.exports = {name: 'test-plugin'};",
			}
		},
		EvalPluginFunc: func(contents string, newEnv *Parse, importManager any, pluginArgs map[string]any, newFileInfo any) any {
			return map[string]any{"name": "test-plugin"}
		},
	}

	mockFileManager := &MockFileManager{}
	mockEnv := &MockEnvironment{FileManager: mockFileManager}
	mockContext := createMockContext()
	mockContext["syncImport"] = true
	mockContext["pluginManager"] = map[string]any{
		"Loader": mockPluginLoader,
	}
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	var callbackError error
	var callbackRoot any

	callback := func(err error, root any, importedEqualsRoot bool, fullPath string) {
		callbackError = err
		callbackRoot = root
	}

	importOptions := &ImportOptions{IsPlugin: true}
	currentFileInfo := &FileInfo{CurrentDirectory: "/root/"}

	im.Push("/test", true, currentFileInfo, importOptions, callback)

	if callbackError != nil {
		t.Errorf("Expected no error for plugin loading, got %v", callbackError)
	}

	if callbackRoot == nil {
		t.Error("Expected plugin to be loaded and returned")
	}

	if plugin, ok := callbackRoot.(map[string]any); !ok {
		t.Error("Expected plugin to be a map")
	} else if name, exists := plugin["name"]; !exists {
		t.Error("Expected plugin to have name property")
	} else if name != "test-plugin" {
		t.Errorf("Expected plugin name to be 'test-plugin', got '%v'", name)
	}
}

func TestImportManagerPushPluginWithArgs(t *testing.T) {
	var capturedArgs map[string]any

	mockPluginLoader := &MockImportPluginLoader{
		LoadPluginSyncFunc: func(path, currentDirectory string, context map[string]any, environment any, fileManager any) any {
			return &LoadedFile{
				Filename: "/resolved/test.js",
				Contents: "module.exports = {};",
			}
		},
		EvalPluginFunc: func(contents string, newEnv *Parse, importManager any, pluginArgs map[string]any, newFileInfo any) any {
			capturedArgs = pluginArgs
			return map[string]any{"name": "test-plugin"}
		},
	}

	mockFileManager := &MockFileManager{}
	mockEnv := &MockEnvironment{FileManager: mockFileManager}
	mockContext := createMockContext()
	mockContext["syncImport"] = true
	mockContext["pluginManager"] = map[string]any{
		"Loader": mockPluginLoader,
	}
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	callback := func(err error, root any, importedEqualsRoot bool, fullPath string) {}

	pluginArgs := map[string]any{
		"arg1": "value1",
		"arg2": 42,
	}
	importOptions := &ImportOptions{
		IsPlugin:   true,
		PluginArgs: pluginArgs,
	}
	currentFileInfo := &FileInfo{CurrentDirectory: "/root/"}

	im.Push("/test", true, currentFileInfo, importOptions, callback)

	if capturedArgs == nil {
		t.Error("Expected plugin args to be passed to evalPlugin")
	} else {
		if capturedArgs["arg1"] != "value1" {
			t.Errorf("Expected arg1 to be 'value1', got %v", capturedArgs["arg1"])
		}
		if capturedArgs["arg2"] != 42 {
			t.Errorf("Expected arg2 to be 42, got %v", capturedArgs["arg2"])
		}
	}
}

func TestImportManagerPushPluginError(t *testing.T) {
	mockPluginLoader := &MockImportPluginLoader{
		LoadPluginSyncFunc: func(path, currentDirectory string, context map[string]any, environment any, fileManager any) any {
			return &LoadedFile{
				Filename: "/resolved/test.js",
				Contents: "invalid javascript",
			}
		},
		EvalPluginFunc: func(contents string, newEnv *Parse, importManager any, pluginArgs map[string]any, newFileInfo any) any {
			return &LessError{Message: "Plugin compilation error"}
		},
	}

	mockFileManager := &MockFileManager{}
	mockEnv := &MockEnvironment{FileManager: mockFileManager}
	mockContext := createMockContext()
	mockContext["syncImport"] = true
	mockContext["pluginManager"] = map[string]any{
		"Loader": mockPluginLoader,
	}
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	var callbackError error

	callback := func(err error, root any, importedEqualsRoot bool, fullPath string) {
		callbackError = err
	}

	importOptions := &ImportOptions{IsPlugin: true}
	currentFileInfo := &FileInfo{CurrentDirectory: "/root/"}

	im.Push("/test", true, currentFileInfo, importOptions, callback)

	if callbackError == nil {
		t.Error("Expected error from plugin compilation")
	}

	if lessError, ok := callbackError.(*LessError); !ok {
		t.Error("Expected error to be a LessError")
	} else if lessError.Message != "Plugin compilation error" {
		t.Errorf("Expected error message 'Plugin compilation error', got '%s'", lessError.Message)
	}
}

func TestImportManagerPushPluginExtension(t *testing.T) {
	var capturedContext map[string]any

	mockPluginLoader := &MockImportPluginLoader{
		LoadPluginSyncFunc: func(path, currentDirectory string, context map[string]any, environment any, fileManager any) any {
			capturedContext = context
			return &LoadedFile{
				Filename: "/resolved/test.js",
				Contents: "module.exports = {};",
			}
		},
		EvalPluginFunc: func(contents string, newEnv *Parse, importManager any, pluginArgs map[string]any, newFileInfo any) any {
			return map[string]any{"name": "test-plugin"}
		},
	}

	mockFileManager := &MockFileManager{}
	mockEnv := &MockEnvironment{FileManager: mockFileManager}
	mockContext := createMockContext()
	mockContext["syncImport"] = true
	mockContext["pluginManager"] = map[string]any{
		"Loader": mockPluginLoader,
	}
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	callback := func(err error, root any, importedEqualsRoot bool, fullPath string) {}

	importOptions := &ImportOptions{IsPlugin: true}
	currentFileInfo := &FileInfo{CurrentDirectory: "/root/"}

	im.Push("/test", true, currentFileInfo, importOptions, callback)

	if capturedContext == nil {
		t.Error("Expected context to be passed to plugin loader")
	} else {
		if ext, exists := capturedContext["ext"]; !exists {
			t.Error("Expected context to have 'ext' property")
		} else if ext != ".js" {
			t.Errorf("Expected ext to be '.js' for plugin, got '%v'", ext)
		}

		if mime, exists := capturedContext["mime"]; !exists {
			t.Error("Expected context to have 'mime' property")
		} else if mime != "application/javascript" {
			t.Errorf("Expected mime to be 'application/javascript' for plugin, got '%v'", mime)
		}
	}
}

// Async operations tests

func TestImportManagerPushAsynchronousFileLoading(t *testing.T) {
	mockFileManager := &MockFileManager{
		LoadFileFunc: func(path, currentDirectory string, context map[string]any, environment Environment, callback func(error, *LoadedFile)) any {
			// Simulate async loading
			go func() {
				callback(nil, &LoadedFile{
					Filename: "/resolved/async.less",
					Contents: ".async { color: blue; }",
				})
			}()
			return nil
		},
		GetPathFunc: func(filename string) string {
			return "/resolved/"
		},
	}

	mockEnv := &MockEnvironment{FileManager: mockFileManager}
	mockContext := createMockContext()
	mockContext["syncImport"] = false // Enable async
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	var callbackCalled bool
	var callbackError error
	var callbackRoot any

	callback := func(err error, root any, importedEqualsRoot bool, fullPath string) {
		callbackCalled = true
		callbackError = err
		callbackRoot = root
	}

	importOptions := &ImportOptions{}
	currentFileInfo := &FileInfo{CurrentDirectory: "/root/"}

	im.Push("/async.less", true, currentFileInfo, importOptions, callback)

	// Wait a bit for async operation to complete
	for i := 0; i < 100 && !callbackCalled; i++ {
		time.Sleep(10 * time.Millisecond)
	}

	if !callbackCalled {
		t.Error("Expected async callback to be called")
	}

	if callbackError != nil {
		t.Errorf("Expected no error for async loading, got %v", callbackError)
	}

	if callbackRoot == nil {
		t.Error("Expected root to be set for async loading")
	}
}

func TestImportManagerPushAsynchronousError(t *testing.T) {
	mockFileManager := &MockFileManager{
		LoadFileFunc: func(path, currentDirectory string, context map[string]any, environment Environment, callback func(error, *LoadedFile)) any {
			// Simulate async error
			go func() {
				callback(fmt.Errorf("async load failed"), nil)
			}()
			return nil
		},
	}

	mockEnv := &MockEnvironment{FileManager: mockFileManager}
	mockContext := createMockContext()
	mockContext["syncImport"] = false
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	var callbackCalled bool
	var callbackError error

	callback := func(err error, root any, importedEqualsRoot bool, fullPath string) {
		callbackCalled = true
		callbackError = err
	}

	importOptions := &ImportOptions{}
	currentFileInfo := &FileInfo{CurrentDirectory: "/root/"}

	im.Push("/missing.less", true, currentFileInfo, importOptions, callback)

	// Wait for async operation
	for i := 0; i < 100 && !callbackCalled; i++ {
		time.Sleep(10 * time.Millisecond)
	}

	if !callbackCalled {
		t.Error("Expected async callback to be called")
	}

	if callbackError == nil {
		t.Error("Expected error from async loading")
	}

	expectedError := "async load failed"
	if callbackError.Error() != expectedError {
		t.Errorf("Expected error '%s', got '%s'", expectedError, callbackError.Error())
	}
}

func TestImportManagerPushPromiseHandling(t *testing.T) {
	// Test with ConcretePromise
	promise := NewPromise()
	
	mockFileManager := &MockFileManager{
		LoadFileFunc: func(path, currentDirectory string, context map[string]any, environment Environment, callback func(error, *LoadedFile)) any {
			return promise
		},
		GetPathFunc: func(filename string) string {
			return "/resolved/"
		},
	}

	mockEnv := &MockEnvironment{FileManager: mockFileManager}
	mockContext := createMockContext()
	mockContext["syncImport"] = false
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	var callbackCalled bool
	var callbackError error
	var callbackRoot any

	callback := func(err error, root any, importedEqualsRoot bool, fullPath string) {
		callbackCalled = true
		callbackError = err
		callbackRoot = root
	}

	importOptions := &ImportOptions{}
	currentFileInfo := &FileInfo{CurrentDirectory: "/root/"}

	// Start the import
	im.Push("/promise.less", true, currentFileInfo, importOptions, callback)

	// Resolve the promise
	go func() {
		time.Sleep(50 * time.Millisecond)
		promise.Resolve(&LoadedFile{
			Filename: "/resolved/promise.less",
			Contents: ".promise { color: green; }",
		})
	}()

	// Wait for completion
	for i := 0; i < 200 && !callbackCalled; i++ {
		time.Sleep(10 * time.Millisecond)
	}

	if !callbackCalled {
		t.Error("Expected promise callback to be called")
	}

	if callbackError != nil {
		t.Errorf("Expected no error from promise, got %v", callbackError)
	}

	if callbackRoot == nil {
		t.Error("Expected root to be set from promise")
	}
}

func TestImportManagerPushPromiseRejection(t *testing.T) {
	promise := NewPromise()
	
	mockFileManager := &MockFileManager{
		LoadFileFunc: func(path, currentDirectory string, context map[string]any, environment Environment, callback func(error, *LoadedFile)) any {
			return promise
		},
	}

	mockEnv := &MockEnvironment{FileManager: mockFileManager}
	mockContext := createMockContext()
	mockContext["syncImport"] = false
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	var callbackCalled bool
	var callbackError error

	callback := func(err error, root any, importedEqualsRoot bool, fullPath string) {
		callbackCalled = true
		callbackError = err
	}

	importOptions := &ImportOptions{}
	currentFileInfo := &FileInfo{CurrentDirectory: "/root/"}

	// Start the import
	im.Push("/promise-error.less", true, currentFileInfo, importOptions, callback)

	// Reject the promise
	go func() {
		time.Sleep(50 * time.Millisecond)
		promise.Reject(fmt.Errorf("promise rejected"))
	}()

	// Wait for completion
	for i := 0; i < 200 && !callbackCalled; i++ {
		time.Sleep(10 * time.Millisecond)
	}

	if !callbackCalled {
		t.Error("Expected promise rejection callback to be called")
	}

	if callbackError == nil {
		t.Error("Expected error from promise rejection")
	}

	expectedError := "promise rejected"
	if callbackError.Error() != expectedError {
		t.Errorf("Expected error '%s', got '%s'", expectedError, callbackError.Error())
	}
}

func TestImportManagerPushChannelPromise(t *testing.T) {
	resultChan := make(chan *LoadedFile, 1)
	
	mockFileManager := &MockFileManager{
		LoadFileFunc: func(path, currentDirectory string, context map[string]any, environment Environment, callback func(error, *LoadedFile)) any {
			return (<-chan *LoadedFile)(resultChan)
		},
		GetPathFunc: func(filename string) string {
			return "/resolved/"
		},
	}

	mockEnv := &MockEnvironment{FileManager: mockFileManager}
	mockContext := createMockContext()
	mockContext["syncImport"] = false
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	var callbackCalled bool
	var callbackError error
	var callbackRoot any

	callback := func(err error, root any, importedEqualsRoot bool, fullPath string) {
		callbackCalled = true
		callbackError = err
		callbackRoot = root
	}

	importOptions := &ImportOptions{}
	currentFileInfo := &FileInfo{CurrentDirectory: "/root/"}

	// Start the import
	im.Push("/channel.less", true, currentFileInfo, importOptions, callback)

	// Send result through channel
	go func() {
		time.Sleep(50 * time.Millisecond)
		resultChan <- &LoadedFile{
			Filename: "/resolved/channel.less",
			Contents: ".channel { color: purple; }",
		}
	}()

	// Wait for completion
	for i := 0; i < 200 && !callbackCalled; i++ {
		time.Sleep(10 * time.Millisecond)
	}

	if !callbackCalled {
		t.Error("Expected channel promise callback to be called")
	}

	if callbackError != nil {
		t.Errorf("Expected no error from channel promise, got %v", callbackError)
	}

	if callbackRoot == nil {
		t.Error("Expected root to be set from channel promise")
	}
}

func TestImportManagerPushFunctionPromise(t *testing.T) {
	promiseFunc := func() (*LoadedFile, error) {
		return &LoadedFile{
			Filename: "/resolved/function.less",
			Contents: ".function { color: orange; }",
		}, nil
	}
	
	mockFileManager := &MockFileManager{
		LoadFileFunc: func(path, currentDirectory string, context map[string]any, environment Environment, callback func(error, *LoadedFile)) any {
			return promiseFunc
		},
		GetPathFunc: func(filename string) string {
			return "/resolved/"
		},
	}

	mockEnv := &MockEnvironment{FileManager: mockFileManager}
	mockContext := createMockContext()
	mockContext["syncImport"] = false
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	var callbackCalled bool
	var callbackError error
	var callbackRoot any

	callback := func(err error, root any, importedEqualsRoot bool, fullPath string) {
		callbackCalled = true
		callbackError = err
		callbackRoot = root
	}

	importOptions := &ImportOptions{}
	currentFileInfo := &FileInfo{CurrentDirectory: "/root/"}

	im.Push("/function.less", true, currentFileInfo, importOptions, callback)

	// Wait for completion
	for i := 0; i < 200 && !callbackCalled; i++ {
		time.Sleep(10 * time.Millisecond)
	}

	if !callbackCalled {
		t.Error("Expected function promise callback to be called")
	}

	if callbackError != nil {
		t.Errorf("Expected no error from function promise, got %v", callbackError)
	}

	if callbackRoot == nil {
		t.Error("Expected root to be set from function promise")
	}
}

// Complex scenarios and edge cases

func TestImportManagerPushEmptyFileContents(t *testing.T) {
	mockFileManager := &MockFileManager{
		LoadFileSyncFunc: func(path, currentDirectory string, context map[string]any, environment Environment) *LoadedFile {
			return &LoadedFile{
				Filename: "/resolved/empty.less",
				Contents: "", // Empty content
			}
		},
		GetPathFunc: func(filename string) string {
			return "/resolved/"
		},
	}

	mockEnv := &MockEnvironment{FileManager: mockFileManager}
	mockContext := createMockContext()
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	var callbackError error
	var callbackRoot any

	callback := func(err error, root any, importedEqualsRoot bool, fullPath string) {
		callbackError = err
		callbackRoot = root
	}

	importOptions := &ImportOptions{}
	currentFileInfo := &FileInfo{CurrentDirectory: "/root/"}

	im.Push("/empty.less", true, currentFileInfo, importOptions, callback)

	if callbackError != nil {
		t.Errorf("Expected no error for empty file, got %v", callbackError)
	}

	if callbackRoot == nil {
		t.Error("Expected root to be set even for empty file")
	}

	// Check that empty content was stored
	if content, exists := im.contents["/resolved/empty.less"]; !exists {
		t.Error("Expected empty file contents to be stored")
	} else if content != "" {
		t.Errorf("Expected empty content, got '%s'", content)
	}
}

func TestImportManagerPushMultipleSimultaneousImports(t *testing.T) {
	mockFileManager := &MockFileManager{
		LoadFileSyncFunc: func(path, currentDirectory string, context map[string]any, environment Environment) *LoadedFile {
			filename := fmt.Sprintf("/resolved%s", path)
			content := fmt.Sprintf(".%s { color: red; }", path[1:]) // Remove leading slash
			return &LoadedFile{
				Filename: filename,
				Contents: content,
			}
		},
		GetPathFunc: func(filename string) string {
			return "/resolved/"
		},
	}

	mockEnv := &MockEnvironment{FileManager: mockFileManager}
	mockContext := createMockContext()
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	var callback1Called, callback2Called bool
	var callback1Root, callback2Root any

	callback1 := func(err error, root any, importedEqualsRoot bool, fullPath string) {
		callback1Called = true
		callback1Root = root
	}

	callback2 := func(err error, root any, importedEqualsRoot bool, fullPath string) {
		callback2Called = true
		callback2Root = root
	}

	importOptions := &ImportOptions{}
	currentFileInfo := &FileInfo{CurrentDirectory: "/root/"}

	// Import two files simultaneously
	im.Push("/test1.less", true, currentFileInfo, importOptions, callback1)
	im.Push("/test2.less", true, currentFileInfo, importOptions, callback2)

	if !callback1Called {
		t.Error("Expected first callback to be called")
	}

	if !callback2Called {
		t.Error("Expected second callback to be called")
	}

	if callback1Root == nil {
		t.Error("Expected first root to be set")
	}

	if callback2Root == nil {
		t.Error("Expected second root to be set")
	}

	// Queue should be empty after processing
	if len(im.queue) != 0 {
		t.Errorf("Expected queue to be empty, got %v", im.queue)
	}

	// Both files should be stored
	if len(im.contents) != 2 {
		t.Errorf("Expected 2 files in contents, got %d", len(im.contents))
	}
}

func TestImportManagerPushLongFilePaths(t *testing.T) {
	longPath := "/very/long/path/that/goes/on/for/quite/a/while/and/has/many/segments/file.less"
	resolvedPath := fmt.Sprintf("/resolved%s", longPath)

	mockFileManager := &MockFileManager{
		LoadFileSyncFunc: func(path, currentDirectory string, context map[string]any, environment Environment) *LoadedFile {
			return &LoadedFile{
				Filename: resolvedPath,
				Contents: ".test { color: red; }",
			}
		},
		GetPathFunc: func(filename string) string {
			return "/resolved/very/long/path/that/goes/on/for/quite/a/while/and/has/many/segments/"
		},
	}

	mockEnv := &MockEnvironment{FileManager: mockFileManager}
	mockContext := createMockContext()
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	var callbackCalled bool
	var callbackError error

	callback := func(err error, root any, importedEqualsRoot bool, fullPath string) {
		callbackCalled = true
		callbackError = err
		if fullPath != resolvedPath {
			t.Errorf("Expected fullPath to be '%s', got '%s'", resolvedPath, fullPath)
		}
	}

	importOptions := &ImportOptions{}
	currentFileInfo := &FileInfo{CurrentDirectory: "/root/"}

	im.Push(longPath, true, currentFileInfo, importOptions, callback)

	if !callbackCalled {
		t.Error("Expected callback to be called for long path")
	}

	if callbackError != nil {
		t.Errorf("Expected no error for long path, got %v", callbackError)
	}
}

func TestImportManagerPushSpecialCharactersInContent(t *testing.T) {
	specialContent := `.test { content: "特殊字符 🎨 \n\t\r"; }`

	mockFileManager := &MockFileManager{
		LoadFileSyncFunc: func(path, currentDirectory string, context map[string]any, environment Environment) *LoadedFile {
			return &LoadedFile{
				Filename: "/resolved/special.less",
				Contents: specialContent,
			}
		},
		GetPathFunc: func(filename string) string {
			return "/resolved/"
		},
	}

	mockEnv := &MockEnvironment{FileManager: mockFileManager}
	mockContext := createMockContext()
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	// Create a parser that captures the content
	var capturedContent string
	mockContext["parserFactory"] = func(context map[string]any, imports map[string]any, fileInfo map[string]any, index int) ParserInterface {
		return &MockParserInterface{
			ParseFunc: func(str string, callback func(*LessError, any), additionalData map[string]any) {
				capturedContent = str
				callback(nil, map[string]string{"type": "Ruleset"})
			},
		}
	}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	callback := func(err error, root any, importedEqualsRoot bool, fullPath string) {}

	importOptions := &ImportOptions{}
	currentFileInfo := &FileInfo{CurrentDirectory: "/root/"}

	im.Push("/special.less", true, currentFileInfo, importOptions, callback)

	if capturedContent != specialContent {
		t.Errorf("Expected captured content to be '%s', got '%s'", specialContent, capturedContent)
	}

	// Verify stored content
	if storedContent, exists := im.contents["/resolved/special.less"]; !exists {
		t.Error("Expected special content to be stored")
	} else if storedContent != specialContent {
		t.Errorf("Expected stored content to be '%s', got '%s'", specialContent, storedContent)
	}
}

func TestImportManagerPushPathRewriting(t *testing.T) {
	mockFileManager := &MockFileManager{
		LoadFileSyncFunc: func(path, currentDirectory string, context map[string]any, environment Environment) *LoadedFile {
			return &LoadedFile{
				Filename: "/resolved/subdir/test.less",
				Contents: ".test { color: red; }",
			}
		},
		GetPathFunc: func(filename string) string {
			return "/resolved/subdir/"
		},
		JoinFunc: func(path1, path2 string) string {
			if path1 == "" {
				return path2
			}
			if path2 == "" {
				return path1
			}
			return path1 + "/" + path2
		},
		PathDiffFunc: func(currentDirectory, entryPath string) string {
			return "../"
		},
		IsPathAbsoluteFunc: func(path string) bool {
			return false
		},
		AlwaysMakePathsAbsoluteFunc: func() bool {
			return true
		},
	}

	mockEnv := &MockEnvironment{FileManager: mockFileManager}
	mockContext := createMockContext()
	mockContext["rewriteUrls"] = true
	mockContext["rootpath"] = "/root/"
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	// Capture the file info passed to parser
	var capturedFileInfo map[string]any
	mockContext["parserFactory"] = func(context map[string]any, imports map[string]any, fileInfo map[string]any, index int) ParserInterface {
		capturedFileInfo = fileInfo
		return &MockParserInterface{}
	}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	callback := func(err error, root any, importedEqualsRoot bool, fullPath string) {}

	importOptions := &ImportOptions{}
	currentFileInfo := &FileInfo{
		CurrentDirectory: "/current/",
		EntryPath:        "/entry/",
		Rootpath:         "/currentroot/",
		RootFilename:     "/root.less",
	}

	im.Push("/test.less", true, currentFileInfo, importOptions, callback)

	if capturedFileInfo == nil {
		t.Fatal("Expected file info to be captured")
	}

	// Check that path rewriting occurred
	if rootpath, exists := capturedFileInfo["rootpath"]; !exists {
		t.Error("Expected rootpath to be set in file info")
	} else if rootpathStr, ok := rootpath.(string); !ok {
		t.Error("Expected rootpath to be string")
	} else {
		// Should be result of path processing - the join function adds extra slashes
		expectedRootpath := "/entry///root//../"
		if rootpathStr != expectedRootpath {
			t.Errorf("Expected rootpath to be '%s', got '%s'", expectedRootpath, rootpathStr)
		}
	}
}

func TestImportManagerPushReferenceHandling(t *testing.T) {
	mockFileManager := &MockFileManager{
		LoadFileSyncFunc: func(path, currentDirectory string, context map[string]any, environment Environment) *LoadedFile {
			return &LoadedFile{
				Filename: fmt.Sprintf("/resolved%s", path),
				Contents: ".test { color: red; }",
			}
		},
		GetPathFunc: func(filename string) string {
			return "/resolved/"
		},
	}

	mockEnv := &MockEnvironment{FileManager: mockFileManager}
	mockContext := createMockContext()
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	// Capture the file info passed to parser
	var capturedFileInfo map[string]any
	mockContext["parserFactory"] = func(context map[string]any, imports map[string]any, fileInfo map[string]any, index int) ParserInterface {
		capturedFileInfo = fileInfo
		return &MockParserInterface{}
	}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	callback := func(err error, root any, importedEqualsRoot bool, fullPath string) {}

	// Test with reference in current file info
	currentFileInfoWithRef := &FileInfo{
		CurrentDirectory: "/root/",
		Reference:        true,
	}
	importOptions := &ImportOptions{}

	im.Push("/test1.less", true, currentFileInfoWithRef, importOptions, callback)

	if capturedFileInfo == nil {
		t.Fatal("Expected file info to be captured for first test")
	}

	if reference, exists := capturedFileInfo["reference"]; !exists {
		t.Error("Expected reference to be set in file info")
	} else if refBool, ok := reference.(bool); !ok {
		t.Error("Expected reference to be bool")
	} else if !refBool {
		t.Error("Expected reference to be true when current file has reference")
	}

	// Test with reference in import options (use different file to avoid caching)
	capturedFileInfo = nil
	currentFileInfo := &FileInfo{CurrentDirectory: "/root/"}
	importOptionsWithRef := &ImportOptions{Reference: true}

	im.Push("/test2-ref.less", true, currentFileInfo, importOptionsWithRef, callback)

	if capturedFileInfo == nil {
		t.Fatal("Expected file info to be captured for second test")
	}

	if reference, exists := capturedFileInfo["reference"]; !exists {
		t.Error("Expected reference to be set in file info")
	} else if refBool, ok := reference.(bool); !ok {
		t.Error("Expected reference to be bool")
	} else if !refBool {
		t.Error("Expected reference to be true when import options has reference")
	}
}

func TestImportManagerPushMultipleErrors(t *testing.T) {
	mockEnv := createMockEnvironment()
	mockContext := createMockContext()
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	// Create parsers that return different errors
	parseCallCount := 0
	mockContext["parserFactory"] = func(context map[string]any, imports map[string]any, fileInfo map[string]any, index int) ParserInterface {
		parseCallCount++
		return &MockParserInterface{
			ParseFunc: func(str string, callback func(*LessError, any), additionalData map[string]any) {
				if parseCallCount == 1 {
					callback(&LessError{Message: "First error"}, nil)
				} else {
					callback(&LessError{Message: "Second error"}, nil)
				}
			},
		}
	}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	var firstCallbackError, secondCallbackError error

	callback1 := func(err error, root any, importedEqualsRoot bool, fullPath string) {
		firstCallbackError = err
	}

	callback2 := func(err error, root any, importedEqualsRoot bool, fullPath string) {
		secondCallbackError = err
	}

	importOptions := &ImportOptions{}
	currentFileInfo := &FileInfo{CurrentDirectory: "/root/"}

	// First import with error
	im.Push("/error1.less", true, currentFileInfo, importOptions, callback1)

	if firstCallbackError == nil {
		t.Error("Expected first callback to receive error")
	}

	if im.error == nil {
		t.Error("Expected import manager to store first error")
	}

	firstStoredError := im.error

	// Second import with different error
	im.Push("/error2.less", true, currentFileInfo, importOptions, callback2)

	if secondCallbackError == nil {
		t.Error("Expected second callback to receive error")
	}

	// First error should be preserved
	if im.error != firstStoredError {
		t.Error("Expected import manager to preserve first error")
	}

	if im.error.(*LessError).Message != "First error" {
		t.Errorf("Expected stored error to be 'First error', got '%s'", im.error.(*LessError).Message)
	}
}

func TestImportManagerPushFileCaching(t *testing.T) {
	mockFileManager := &MockFileManager{
		LoadFileSyncFunc: func(path, currentDirectory string, context map[string]any, environment Environment) *LoadedFile {
			return &LoadedFile{
				Filename: "/resolved/cached.less",
				Contents: ".cached { color: red; }",
			}
		},
		GetPathFunc: func(filename string) string {
			return "/resolved/"
		},
	}

	mockEnv := &MockEnvironment{FileManager: mockFileManager}
	mockContext := createMockContext()
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	parseCallCount := 0
	mockContext["parserFactory"] = func(context map[string]any, imports map[string]any, fileInfo map[string]any, index int) ParserInterface {
		return &MockParserInterface{
			ParseFunc: func(str string, callback func(*LessError, any), additionalData map[string]any) {
				parseCallCount++
				callback(nil, map[string]any{"type": "Ruleset", "parseCount": parseCallCount})
			},
		}
	}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	var firstRoot, secondRoot any

	callback1 := func(err error, root any, importedEqualsRoot bool, fullPath string) {
		firstRoot = root
	}

	callback2 := func(err error, root any, importedEqualsRoot bool, fullPath string) {
		secondRoot = root
	}

	importOptions := &ImportOptions{}
	currentFileInfo := &FileInfo{CurrentDirectory: "/root/"}

	// First import - should parse and cache
	im.Push("/cached.less", true, currentFileInfo, importOptions, callback1)

	if firstRoot == nil {
		t.Error("Expected first root to be set")
	}

	if parseCallCount != 1 {
		t.Errorf("Expected parse to be called once, got %d", parseCallCount)
	}

	// Second import - should use cache
	im.Push("/cached.less", true, currentFileInfo, importOptions, callback2)

	if secondRoot == nil {
		t.Error("Expected second root to be set")
	}

	// Parse should not be called again
	if parseCallCount != 1 {
		t.Errorf("Expected parse to still be called only once, got %d", parseCallCount)
	}

	// Both should return the same cached result (compare map contents)
	if firstRootMap, ok1 := firstRoot.(map[string]any); ok1 {
		if secondRootMap, ok2 := secondRoot.(map[string]any); ok2 {
			if firstRootMap["parseCount"] != secondRootMap["parseCount"] {
				t.Error("Expected both imports to return the same cached result")
			}
		} else {
			t.Error("Expected second root to be a map")
		}
	} else {
		t.Error("Expected first root to be a map")
	}
}

func TestImportManagerPushMultipleImportsBypass(t *testing.T) {
	mockFileManager := &MockFileManager{
		LoadFileSyncFunc: func(path, currentDirectory string, context map[string]any, environment Environment) *LoadedFile {
			return &LoadedFile{
				Filename: "/resolved/multiple.less",
				Contents: ".multiple { color: red; }",
			}
		},
		GetPathFunc: func(filename string) string {
			return "/resolved/"
		},
	}

	mockEnv := &MockEnvironment{FileManager: mockFileManager}
	mockContext := createMockContext()
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	parseCallCount := 0
	mockContext["parserFactory"] = func(context map[string]any, imports map[string]any, fileInfo map[string]any, index int) ParserInterface {
		return &MockParserInterface{
			ParseFunc: func(str string, callback func(*LessError, any), additionalData map[string]any) {
				parseCallCount++
				callback(nil, map[string]any{"type": "Ruleset", "parseCount": parseCallCount})
			},
		}
	}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	callback := func(err error, root any, importedEqualsRoot bool, fullPath string) {}

	importOptions := &ImportOptions{}
	currentFileInfo := &FileInfo{CurrentDirectory: "/root/"}

	// First import - should parse and cache
	im.Push("/multiple.less", true, currentFileInfo, importOptions, callback)

	if parseCallCount != 1 {
		t.Errorf("Expected parse to be called once, got %d", parseCallCount)
	}

	// Second import with multiple option - should bypass cache
	importOptionsMultiple := &ImportOptions{Multiple: true}
	im.Push("/multiple.less", true, currentFileInfo, importOptionsMultiple, callback)

	if parseCallCount != 2 {
		t.Errorf("Expected parse to be called twice with multiple option, got %d", parseCallCount)
	}
}

// Integration tests

func TestImportManagerFullPipeline(t *testing.T) {
	// Test the full import pipeline with all components working together
	mockFileManager := &MockFileManager{
		LoadFileSyncFunc: func(path, currentDirectory string, context map[string]any, environment Environment) *LoadedFile {
			// Simulate different file types and contents
			switch path {
			case "/main.less":
				return &LoadedFile{
					Filename: "/resolved/main.less",
					Contents: "@import 'variables.less';\n.main { color: @primary-color; }",
				}
			case "/variables.less":
				return &LoadedFile{
					Filename: "/resolved/variables.less", 
					Contents: "@primary-color: #007bff;",
				}
			default:
				return &LoadedFile{
					Filename: fmt.Sprintf("/resolved%s", path),
					Contents: fmt.Sprintf(".%s { content: 'test'; }", path[1:]),
				}
			}
		},
		GetPathFunc: func(filename string) string {
			return "/resolved/"
		},
		JoinFunc: func(path1, path2 string) string {
			if path1 == "" {
				return path2
			}
			if path2 == "" {
				return path1
			}
			return path1 + "/" + path2
		},
		PathDiffFunc: func(currentDirectory, entryPath string) string {
			return "./"
		},
		IsPathAbsoluteFunc: func(path string) bool {
			return path[0] == '/'
		},
		AlwaysMakePathsAbsoluteFunc: func() bool {
			return false
		},
	}

	mockEnv := &MockEnvironment{FileManager: mockFileManager}
	mockContext := createMockContext()
	mockContext["rewriteUrls"] = true
	mockRootFileInfo := createMockRootFileInfo()
	mockLess := map[string]any{}

	// Track all parsed files
	var parsedFiles []string
	mockContext["parserFactory"] = func(context map[string]any, imports map[string]any, fileInfo map[string]any, index int) ParserInterface {
		return &MockParserInterface{
			ParseFunc: func(str string, callback func(*LessError, any), additionalData map[string]any) {
				filename := fileInfo["filename"].(string)
				parsedFiles = append(parsedFiles, filename)
				
				// Simulate successful parsing
				callback(nil, map[string]any{
					"type":     "Stylesheet",
					"filename": filename,
					"content":  str,
				})
			},
		}
	}

	importManagerFactory := NewImportManager(mockEnv)
	im := importManagerFactory(mockLess, mockContext, mockRootFileInfo)

	// Track completion status
	var completedImports []string
	var importErrors []error

	callback := func(err error, root any, importedEqualsRoot bool, fullPath string) {
		if err != nil {
			importErrors = append(importErrors, err)
		} else {
			completedImports = append(completedImports, fullPath)
		}
	}

	importOptions := &ImportOptions{}
	currentFileInfo := &FileInfo{
		CurrentDirectory: "/project/",
		EntryPath:        "/project/",
		RootFilename:     "/project/main.less",
	}

	// Import multiple files to test the full pipeline
	im.Push("/main.less", true, currentFileInfo, importOptions, callback)
	im.Push("/variables.less", true, currentFileInfo, importOptions, callback)
	im.Push("/components.less", true, currentFileInfo, importOptions, callback)

	// Verify no errors occurred
	if len(importErrors) > 0 {
		t.Errorf("Expected no import errors, got %d: %v", len(importErrors), importErrors)
	}

	// Verify all imports completed
	expectedImports := 3
	if len(completedImports) != expectedImports {
		t.Errorf("Expected %d completed imports, got %d", expectedImports, len(completedImports))
	}

	// Verify all files were parsed
	if len(parsedFiles) != expectedImports {
		t.Errorf("Expected %d parsed files, got %d", expectedImports, len(parsedFiles))
	}

	// Verify file contents were stored
	if len(im.contents) != expectedImports {
		t.Errorf("Expected %d files in contents storage, got %d", expectedImports, len(im.contents))
	}

	// Verify file caching
	if len(im.files) != expectedImports {
		t.Errorf("Expected %d files in cache, got %d", expectedImports, len(im.files))
	}

	// Verify specific file content was stored correctly
	mainContent, exists := im.contents["/resolved/main.less"]
	if !exists {
		t.Error("Expected main.less content to be stored")
	} else {
		expectedMainContent := "@import 'variables.less';\n.main { color: @primary-color; }"
		if mainContent != expectedMainContent {
			t.Errorf("Expected main.less content '%s', got '%s'", expectedMainContent, mainContent)
		}
	}

	// Test cache reuse - import same file again
	var secondCallbackCalled bool
	secondCallback := func(err error, root any, importedEqualsRoot bool, fullPath string) {
		secondCallbackCalled = true
		if err != nil {
			t.Errorf("Expected no error on cached import, got %v", err)
		}
	}

	initialParseCount := len(parsedFiles)
	im.Push("/main.less", true, currentFileInfo, importOptions, secondCallback)

	if !secondCallbackCalled {
		t.Error("Expected second callback to be called for cached import")
	}

	// Parse count should not increase (cache hit)
	if len(parsedFiles) != initialParseCount {
		t.Errorf("Expected parse count to remain %d for cached import, got %d", initialParseCount, len(parsedFiles))
	}
}