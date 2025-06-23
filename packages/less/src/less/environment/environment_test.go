package environment

import (
	"testing"

	"github.com/toakleaf/less.go/packages/less/src/less"
)

// MockFileManager implements FileManager for testing
type MockFileManager struct {
	SupportsFunc     func(string, string, map[string]any, map[string]any) bool
	SupportsSyncFunc func(string, string, map[string]any, map[string]any) bool
}

func (m *MockFileManager) Supports(filename, currentDirectory string, options map[string]any, environment map[string]any) bool {
	if m.SupportsFunc != nil {
		return m.SupportsFunc(filename, currentDirectory, options, environment)
	}
	return false
}

func (m *MockFileManager) SupportsSync(filename, currentDirectory string, options map[string]any, environment map[string]any) bool {
	if m.SupportsSyncFunc != nil {
		return m.SupportsSyncFunc(filename, currentDirectory, options, environment)
	}
	return false
}

// MockPluginManager implements PluginManager for testing
type MockPluginManager struct {
	GetFileManagersFunc func() []FileManager
}

func (m *MockPluginManager) GetFileManagers() []FileManager {
	if m.GetFileManagersFunc != nil {
		return m.GetFileManagersFunc()
	}
	return []FileManager{}
}

// MockLogListener implements LogListener for testing warnings
type MockLogListener struct {
	WarnMessages  []any
	ErrorMessages []any
	InfoMessages  []any
	DebugMessages []any
}

func (m *MockLogListener) Error(msg any) {
	m.ErrorMessages = append(m.ErrorMessages, msg)
}

func (m *MockLogListener) Warn(msg any) {
	m.WarnMessages = append(m.WarnMessages, msg)
}

func (m *MockLogListener) Info(msg any) {
	m.InfoMessages = append(m.InfoMessages, msg)
}

func (m *MockLogListener) Debug(msg any) {
	m.DebugMessages = append(m.DebugMessages, msg)
}

func TestEnvironmentConstructor(t *testing.T) {
	t.Run("should create an Environment with empty fileManagers when none provided", func(t *testing.T) {
		env := NewEnvironment(nil, nil)
		if len(env.FileManagers) != 0 {
			t.Errorf("Expected empty FileManagers, got %d", len(env.FileManagers))
		}
	})

	t.Run("should create an Environment with provided fileManagers", func(t *testing.T) {
		mockFileManager := &MockFileManager{}
		fileManagers := []FileManager{mockFileManager}
		env := NewEnvironment(nil, fileManagers)
		if len(env.FileManagers) != 1 {
			t.Errorf("Expected 1 FileManager, got %d", len(env.FileManagers))
		}
		if env.FileManagers[0] != mockFileManager {
			t.Error("FileManager was not set correctly")
		}
	})

	t.Run("should handle nil externalEnvironment", func(t *testing.T) {
		env := NewEnvironment(nil, nil)
		if len(env.FileManagers) != 0 {
			t.Errorf("Expected empty FileManagers, got %d", len(env.FileManagers))
		}
	})

	t.Run("should bind optional functions from externalEnvironment", func(t *testing.T) {
		externalEnv := map[string]any{
			"encodeBase64":          func() string { return "encoded" },
			"mimeLookup":            func() string { return "text/css" },
			"charsetLookup":         func() string { return "utf-8" },
			"getSourceMapGenerator": func() any { return "sourcemap" },
			"someOtherProp":         "ignored",
		}

		env := NewEnvironment(externalEnv, nil)

		if env.EncodeBase64 == nil {
			t.Error("EncodeBase64 should be defined")
		}
		if env.MimeLookup == nil {
			t.Error("MimeLookup should be defined")
		}
		if env.CharsetLookup == nil {
			t.Error("CharsetLookup should be defined")
		}
		if env.GetSourceMapGenerator == nil {
			t.Error("GetSourceMapGenerator should be defined")
		}
	})

	t.Run("should bind functions with correct context", func(t *testing.T) {
		externalEnv := map[string]any{
			"encodeBase64": func() string { return "test" },
		}

		env := NewEnvironment(externalEnv, nil)
		if env.EncodeBase64() != "test" {
			t.Errorf("Expected 'test', got '%s'", env.EncodeBase64())
		}
	})

	t.Run("should handle missing optional functions gracefully", func(t *testing.T) {
		externalEnv := map[string]any{
			"encodeBase64": func() string { return "encoded" },
		}

		env := NewEnvironment(externalEnv, nil)

		if env.EncodeBase64 == nil {
			t.Error("EncodeBase64 should be defined")
		}
		if env.MimeLookup != nil {
			t.Error("MimeLookup should be nil")
		}
		if env.CharsetLookup != nil {
			t.Error("CharsetLookup should be nil")
		}
		if env.GetSourceMapGenerator != nil {
			t.Error("GetSourceMapGenerator should be nil")
		}
	})

	t.Run("should not warn for missing optional functions", func(t *testing.T) {
		mockListener := &MockLogListener{}
		less.AddListener(mockListener)
		defer less.RemoveListener(mockListener)

		NewEnvironment(map[string]any{}, nil)

		if len(mockListener.WarnMessages) > 0 {
			t.Error("Should not warn for missing optional functions")
		}
	})

	t.Run("should handle empty externalEnvironment object", func(t *testing.T) {
		env := NewEnvironment(map[string]any{}, nil)
		if env.EncodeBase64 != nil {
			t.Error("EncodeBase64 should be nil")
		}
		if env.MimeLookup != nil {
			t.Error("MimeLookup should be nil")
		}
		if env.CharsetLookup != nil {
			t.Error("CharsetLookup should be nil")
		}
		if env.GetSourceMapGenerator != nil {
			t.Error("GetSourceMapGenerator should be nil")
		}
	})
}

func TestGetFileManager(t *testing.T) {
	var mockFileManager *MockFileManager
	var env *Environment

	setUp := func() {
		mockFileManager = &MockFileManager{}
		env = NewEnvironment(nil, []FileManager{mockFileManager})
	}

	t.Run("should warn when filename is not provided", func(t *testing.T) {
		setUp()
		mockListener := &MockLogListener{}
		less.AddListener(mockListener)
		defer less.RemoveListener(mockListener)

		env.GetFileManager("", "/path", map[string]any{}, map[string]any{}, false)

		if len(mockListener.WarnMessages) == 0 {
			t.Error("Should warn when filename is empty")
		}
		expectedMsg := "getFileManager called with no filename.. Please report this issue. continuing."
		if mockListener.WarnMessages[0] != expectedMsg {
			t.Errorf("Expected warning message '%s', got '%v'", expectedMsg, mockListener.WarnMessages[0])
		}
	})

	t.Run("should warn when currentDirectory is nil", func(t *testing.T) {
		setUp()
		mockListener := &MockLogListener{}
		less.AddListener(mockListener)
		defer less.RemoveListener(mockListener)

		env.GetFileManager("test.less", "", map[string]any{}, map[string]any{}, false)

		if len(mockListener.WarnMessages) == 0 {
			t.Error("Should warn when currentDirectory is nil")
		}
		expectedMsg := "getFileManager called with null directory.. Please report this issue. continuing."
		if mockListener.WarnMessages[0] != expectedMsg {
			t.Errorf("Expected warning message '%s', got '%v'", expectedMsg, mockListener.WarnMessages[0])
		}
	})

	t.Run("should not warn when currentDirectory is empty string", func(t *testing.T) {
		setUp()
		mockListener := &MockLogListener{}
		less.AddListener(mockListener)
		defer less.RemoveListener(mockListener)

		mockFileManager.SupportsFunc = func(string, string, map[string]any, map[string]any) bool { return true }
		env.GetFileManager("test.less", "null", map[string]any{}, map[string]any{}, false)

		if len(mockListener.WarnMessages) > 0 {
			t.Error("Should not warn when currentDirectory is empty string")
		}
	})

	t.Run("should return file manager that supports the file (async)", func(t *testing.T) {
		setUp()
		mockFileManager.SupportsFunc = func(filename, currentDirectory string, options, environment map[string]any) bool {
			return filename == "test.less" && currentDirectory == "/path"
		}

		result := env.GetFileManager("test.less", "/path", map[string]any{}, map[string]any{}, false)

		if result != mockFileManager {
			t.Error("Should return the mockFileManager")
		}
	})

	t.Run("should return file manager that supports the file (sync)", func(t *testing.T) {
		setUp()
		mockFileManager.SupportsSyncFunc = func(filename, currentDirectory string, options, environment map[string]any) bool {
			return filename == "test.less" && currentDirectory == "/path"
		}

		result := env.GetFileManager("test.less", "/path", map[string]any{}, map[string]any{}, true)

		if result != mockFileManager {
			t.Error("Should return the mockFileManager")
		}
	})

	t.Run("should return nil when no file manager supports the file", func(t *testing.T) {
		setUp()
		mockFileManager.SupportsFunc = func(string, string, map[string]any, map[string]any) bool { return false }

		result := env.GetFileManager("test.less", "/path", map[string]any{}, map[string]any{}, false)

		if result != nil {
			t.Error("Should return nil when no file manager supports the file")
		}
	})

	t.Run("should check file managers in reverse order", func(t *testing.T) {
		setUp()
		fileManager1 := &MockFileManager{
			SupportsFunc: func(string, string, map[string]any, map[string]any) bool { return false },
		}
		fileManager2 := &MockFileManager{
			SupportsFunc: func(string, string, map[string]any, map[string]any) bool { return true },
		}
		fileManager3 := &MockFileManager{
			SupportsFunc: func(string, string, map[string]any, map[string]any) bool { return true },
		}

		env.FileManagers = []FileManager{fileManager1, fileManager2, fileManager3}

		result := env.GetFileManager("test.less", "/path", map[string]any{}, map[string]any{}, false)

		// Should return the last one that supports (checked first due to reverse order)
		if result != fileManager3 {
			t.Error("Should return fileManager3 (last one checked)")
		}
	})

	t.Run("should include plugin manager file managers when pluginManager is provided", func(t *testing.T) {
		setUp()
		mockFileManager2 := &MockFileManager{
			SupportsFunc: func(string, string, map[string]any, map[string]any) bool { return true },
		}
		mockPluginManager := &MockPluginManager{
			GetFileManagersFunc: func() []FileManager { return []FileManager{mockFileManager2} },
		}

		options := map[string]any{"pluginManager": mockPluginManager}
		result := env.GetFileManager("test.less", "/path", options, map[string]any{}, false)

		if result != mockFileManager2 {
			t.Error("Should return mockFileManager2 from plugin manager")
		}
	})

	t.Run("should prioritize plugin manager file managers over environment file managers", func(t *testing.T) {
		setUp()
		mockFileManager.SupportsFunc = func(string, string, map[string]any, map[string]any) bool { return true }
		
		mockFileManager2 := &MockFileManager{
			SupportsFunc: func(string, string, map[string]any, map[string]any) bool { return true },
		}
		mockPluginManager := &MockPluginManager{
			GetFileManagersFunc: func() []FileManager { return []FileManager{mockFileManager2} },
		}

		options := map[string]any{"pluginManager": mockPluginManager}
		result := env.GetFileManager("test.less", "/path", options, map[string]any{}, false)

		// Plugin manager file managers come after environment file managers,
		// so they're checked first (reverse order)
		if result != mockFileManager2 {
			t.Error("Should return mockFileManager2 from plugin manager (higher priority)")
		}
	})

	t.Run("should handle empty plugin manager file managers", func(t *testing.T) {
		setUp()
		mockFileManager.SupportsFunc = func(string, string, map[string]any, map[string]any) bool { return true }
		
		emptyPluginManager := &MockPluginManager{
			GetFileManagersFunc: func() []FileManager { return []FileManager{} },
		}

		options := map[string]any{"pluginManager": emptyPluginManager}
		result := env.GetFileManager("test.less", "/path", options, map[string]any{}, false)

		if result != mockFileManager {
			t.Error("Should return environment file manager when plugin manager is empty")
		}
	})

	t.Run("should handle options without pluginManager", func(t *testing.T) {
		setUp()
		mockFileManager.SupportsFunc = func(string, string, map[string]any, map[string]any) bool { return true }

		options := map[string]any{}
		result := env.GetFileManager("test.less", "/path", options, map[string]any{}, false)

		if result != mockFileManager {
			t.Error("Should return environment file manager")
		}
	})

	t.Run("should handle nil options", func(t *testing.T) {
		setUp()
		mockFileManager.SupportsFunc = func(string, string, map[string]any, map[string]any) bool { return true }

		// The original JavaScript code has a bug - it doesn't handle null options
		// This test documents the current behavior - it should panic
		defer func() {
			if r := recover(); r == nil {
				t.Error("Expected panic when options is nil, but no panic occurred")
			}
		}()

		env.GetFileManager("test.less", "/path", nil, map[string]any{}, false)
	})

	t.Run("should handle undefined options", func(t *testing.T) {
		setUp()
		mockFileManager.SupportsFunc = func(string, string, map[string]any, map[string]any) bool { return true }

		// The original JavaScript code has a bug - it doesn't handle undefined options
		// This test documents the current behavior - it should panic
		defer func() {
			if r := recover(); r == nil {
				t.Error("Expected panic when options is undefined, but no panic occurred")
			}
		}()

		env.GetFileManager("test.less", "/path", nil, map[string]any{}, false)
	})

	t.Run("should pass all parameters to supports method", func(t *testing.T) {
		setUp()
		var capturedFilename, capturedCurrentDirectory string
		var capturedOptions, capturedEnvironment map[string]any

		mockFileManager.SupportsFunc = func(filename, currentDirectory string, options, environment map[string]any) bool {
			capturedFilename = filename
			capturedCurrentDirectory = currentDirectory
			capturedOptions = options
			capturedEnvironment = environment
			return true
		}

		filename := "test.less"
		currentDirectoryStr := "/some/path"
		options := map[string]any{"compress": true}
		environment := map[string]any{"debug": true}

		env.GetFileManager(filename, currentDirectoryStr, options, environment, false)

		if capturedFilename != filename {
			t.Errorf("Expected filename '%s', got '%s'", filename, capturedFilename)
		}
		if capturedCurrentDirectory != currentDirectoryStr {
			t.Errorf("Expected currentDirectory '%s', got '%s'", currentDirectoryStr, capturedCurrentDirectory)
		}
		if capturedOptions["compress"] != true {
			t.Error("Options not passed correctly")
		}
		if capturedEnvironment["debug"] != true {
			t.Error("Environment not passed correctly")
		}
	})

	t.Run("should pass all parameters to supportsSync method", func(t *testing.T) {
		setUp()
		var capturedFilename, capturedCurrentDirectory string
		var capturedOptions, capturedEnvironment map[string]any

		mockFileManager.SupportsSyncFunc = func(filename, currentDirectory string, options, environment map[string]any) bool {
			capturedFilename = filename
			capturedCurrentDirectory = currentDirectory
			capturedOptions = options
			capturedEnvironment = environment
			return true
		}

		filename := "test.less"
		currentDirectoryStr := "/some/path"
		options := map[string]any{"compress": true}
		environment := map[string]any{"debug": true}

		env.GetFileManager(filename, currentDirectoryStr, options, environment, true)

		if capturedFilename != filename {
			t.Errorf("Expected filename '%s', got '%s'", filename, capturedFilename)
		}
		if capturedCurrentDirectory != currentDirectoryStr {
			t.Errorf("Expected currentDirectory '%s', got '%s'", currentDirectoryStr, capturedCurrentDirectory)
		}
		if capturedOptions["compress"] != true {
			t.Error("Options not passed correctly")
		}
		if capturedEnvironment["debug"] != true {
			t.Error("Environment not passed correctly")
		}
	})
}

func TestAddFileManager(t *testing.T) {
	t.Run("should add file manager to the list", func(t *testing.T) {
		env := NewEnvironment(nil, nil)
		if len(env.FileManagers) != 0 {
			t.Error("Expected empty FileManagers initially")
		}

		mockFileManager := &MockFileManager{}
		env.AddFileManager(mockFileManager)

		if len(env.FileManagers) != 1 {
			t.Errorf("Expected 1 FileManager, got %d", len(env.FileManagers))
		}
		if env.FileManagers[0] != mockFileManager {
			t.Error("FileManager not added correctly")
		}
	})

	t.Run("should add multiple file managers", func(t *testing.T) {
		env := NewEnvironment(nil, nil)
		mockFileManager := &MockFileManager{}
		mockFileManager2 := &MockFileManager{}

		env.AddFileManager(mockFileManager)
		env.AddFileManager(mockFileManager2)

		if len(env.FileManagers) != 2 {
			t.Errorf("Expected 2 FileManagers, got %d", len(env.FileManagers))
		}
		if env.FileManagers[0] != mockFileManager {
			t.Error("First FileManager not correct")
		}
		if env.FileManagers[1] != mockFileManager2 {
			t.Error("Second FileManager not correct")
		}
	})

	t.Run("should add file manager to existing list", func(t *testing.T) {
		mockFileManager := &MockFileManager{}
		env := NewEnvironment(nil, []FileManager{mockFileManager})
		if len(env.FileManagers) != 1 {
			t.Error("Expected 1 FileManager initially")
		}

		mockFileManager2 := &MockFileManager{}
		env.AddFileManager(mockFileManager2)

		if len(env.FileManagers) != 2 {
			t.Errorf("Expected 2 FileManagers, got %d", len(env.FileManagers))
		}
		if env.FileManagers[0] != mockFileManager {
			t.Error("First FileManager not correct")
		}
		if env.FileManagers[1] != mockFileManager2 {
			t.Error("Second FileManager not correct")
		}
	})

	t.Run("should handle nil file manager", func(t *testing.T) {
		env := NewEnvironment(nil, nil)

		env.AddFileManager(nil)

		if len(env.FileManagers) != 1 {
			t.Errorf("Expected 1 FileManager, got %d", len(env.FileManagers))
		}
		if env.FileManagers[0] != nil {
			t.Error("Expected nil FileManager")
		}
	})
}

func TestClearFileManagers(t *testing.T) {
	t.Run("should clear empty file managers list", func(t *testing.T) {
		env := NewEnvironment(nil, nil)

		env.ClearFileManagers()

		if len(env.FileManagers) != 0 {
			t.Errorf("Expected empty FileManagers, got %d", len(env.FileManagers))
		}
	})

	t.Run("should clear file managers list with items", func(t *testing.T) {
		mockFileManager := &MockFileManager{}
		mockFileManager2 := &MockFileManager{}
		env := NewEnvironment(nil, []FileManager{mockFileManager, mockFileManager2})
		if len(env.FileManagers) != 2 {
			t.Error("Expected 2 FileManagers initially")
		}

		env.ClearFileManagers()

		if len(env.FileManagers) != 0 {
			t.Errorf("Expected empty FileManagers, got %d", len(env.FileManagers))
		}
	})

	t.Run("should allow adding file managers after clearing", func(t *testing.T) {
		mockFileManager := &MockFileManager{}
		env := NewEnvironment(nil, []FileManager{mockFileManager})

		env.ClearFileManagers()
		mockFileManager2 := &MockFileManager{}
		env.AddFileManager(mockFileManager2)

		if len(env.FileManagers) != 1 {
			t.Errorf("Expected 1 FileManager, got %d", len(env.FileManagers))
		}
		if env.FileManagers[0] != mockFileManager2 {
			t.Error("FileManager not correct after clearing and adding")
		}
	})
}

func TestIntegrationTests(t *testing.T) {
	t.Run("should work with complete workflow", func(t *testing.T) {
		externalEnv := map[string]any{
			"encodeBase64": func() string { return "encoded" },
			"mimeLookup":   func() string { return "text/css" },
		}

		mockFileManager := &MockFileManager{}
		env := NewEnvironment(externalEnv, []FileManager{mockFileManager})

		// Test external environment functions
		if env.EncodeBase64() != "encoded" {
			t.Error("EncodeBase64 not working correctly")
		}
		if env.MimeLookup() != "text/css" {
			t.Error("MimeLookup not working correctly")
		}

		// Test file manager operations
		mockFileManager2 := &MockFileManager{}
		env.AddFileManager(mockFileManager2)
		if len(env.FileManagers) != 2 {
			t.Error("Expected 2 FileManagers after adding")
		}

		// Test getFileManager
		mockFileManager2.SupportsFunc = func(string, string, map[string]any, map[string]any) bool { return true }
		result := env.GetFileManager("test.less", "/path", map[string]any{}, map[string]any{}, false)
		if result != mockFileManager2 {
			t.Error("GetFileManager should return mockFileManager2")
		}

		// Test clear
		env.ClearFileManagers()
		if len(env.FileManagers) != 0 {
			t.Error("Expected empty FileManagers after clearing")
		}
	})

	t.Run("should handle complex plugin manager scenario", func(t *testing.T) {
		pluginFileManager1 := &MockFileManager{
			SupportsFunc: func(string, string, map[string]any, map[string]any) bool { return false },
		}
		pluginFileManager2 := &MockFileManager{
			SupportsFunc: func(string, string, map[string]any, map[string]any) bool { return true },
		}
		complexPluginManager := &MockPluginManager{
			GetFileManagersFunc: func() []FileManager {
				return []FileManager{pluginFileManager1, pluginFileManager2}
			},
		}

		mockFileManager := &MockFileManager{
			SupportsFunc: func(string, string, map[string]any, map[string]any) bool { return true },
		}
		env := NewEnvironment(nil, []FileManager{mockFileManager})

		options := map[string]any{"pluginManager": complexPluginManager}
		result := env.GetFileManager("test.less", "/path", options, map[string]any{}, false)

		// Should return the plugin file manager that supports (checked first due to reverse order)
		if result != pluginFileManager2 {
			t.Error("Should return pluginFileManager2")
		}
	})
}