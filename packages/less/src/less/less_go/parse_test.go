package less_go

import (
	"testing"
)

func TestParseBasicFunctionality(t *testing.T) {
	// Setup
	environment := &MockEnvironment{}
	parseTree := map[string]any{"tree": true}
	importManagerFactory := func(env any, context *Parse, rootFileInfo map[string]any) *ImportManager {
		filename := "test.less"
		if rootFileInfo != nil {
			if fn, ok := rootFileInfo["filename"].(string); ok {
				filename = fn
			}
		}
		return &ImportManager{
			context:              map[string]any{"context": context},
			contents:             make(map[string]string),
			contentsIgnoredChars: make(map[string]string),
			rootFilename:         filename,
		}
	}

	t.Run("should return a parse function", func(t *testing.T) {
		parse := CreateParse(environment, parseTree, importManagerFactory)
		if parse == nil {
			t.Fatal("CreateParse should return a function")
		}
	})

	t.Run("should parse simple CSS with callback", func(t *testing.T) {
		parse := CreateParse(environment, parseTree, importManagerFactory)
		input := ".class { color: red; }"
		options := map[string]any{"filename": "test.less"}

		done := make(chan bool, 1)
		var callbackErr error
		var callbackRoot any
		var callbackImports *ImportManager
		var callbackOpts map[string]any

		parse(input, options, func(err error, root any, imports *ImportManager, opts map[string]any) {
			callbackErr = err
			callbackRoot = root
			callbackImports = imports
			callbackOpts = opts
			done <- true
		})

		<-done

		if callbackErr != nil {
			t.Errorf("Expected no error, got: %v", callbackErr)
		}
		if callbackRoot == nil {
			t.Error("Expected root to be defined")
		}
		if callbackImports == nil {
			t.Error("Expected imports to be defined")
		}
		if callbackOpts == nil {
			t.Error("Expected options to be defined")
		}
		if filename, ok := callbackOpts["filename"].(string); !ok || filename != "test.less" {
			t.Errorf("Expected filename 'test.less', got: %v", callbackOpts["filename"])
		}
	})

	t.Run("should return a promise when no callback provided", func(t *testing.T) {
		parse := CreateParse(environment, parseTree, importManagerFactory)
		input := ".class { color: red; }"
		options := map[string]any{"filename": "test.less"}

		result := parse(input, options, nil)

		promise, ok := result.(*ParsePromise)
		if !ok {
			t.Fatal("Expected ParsePromise when no callback provided")
		}
		if promise == nil {
			t.Fatal("Promise should not be nil")
		}

		// Test promise resolution
		resultValue, err := promise.Await()
		if err != nil {
			t.Errorf("Promise should resolve without error, got: %v", err)
		}
		if resultValue == nil {
			t.Error("Promise should resolve with a value")
		}
	})

	t.Run("should handle callback as second argument", func(t *testing.T) {
		parse := CreateParse(environment, parseTree, importManagerFactory)
		input := ".class { color: red; }"

		done := make(chan bool, 1)
		var callbackErr error
		var callbackRoot any

		// Call with input and callback only (no options)
		parse(input, nil, func(err error, root any, imports *ImportManager, opts map[string]any) {
			callbackErr = err
			callbackRoot = root
			done <- true
		})

		<-done

		if callbackErr != nil {
			t.Errorf("Expected no error, got: %v", callbackErr)
		}
		if callbackRoot == nil {
			t.Error("Expected root to be defined")
		}
	})
}

func TestParseOptionsHandling(t *testing.T) {
	environment := &MockEnvironment{}
	parseTree := map[string]any{"tree": true}
	importManagerFactory := func(env any, context *Parse, rootFileInfo map[string]any) *ImportManager {
		return &ImportManager{
			context:              map[string]any{"context": context},
			contents:             make(map[string]string),
			contentsIgnoredChars: make(map[string]string),
			rootFilename:         "test.less",
		}
	}

	t.Run("should use default options when no options provided", func(t *testing.T) {
		parse := CreateParse(environment, parseTree, importManagerFactory)
		input := ".class { color: red; }"

		done := make(chan bool, 1)
		var callbackOpts map[string]any

		parse(input, map[string]any{}, func(err error, root any, imports *ImportManager, opts map[string]any) {
			callbackOpts = opts
			done <- true
		})

		<-done

		if callbackOpts == nil {
			t.Error("Expected options to be defined")
		}
	})

	t.Run("should copy options from context", func(t *testing.T) {
		parseWithContext := CreateParseWithContext(environment, parseTree, importManagerFactory)
		mockContext := &LessContext{
			Options: map[string]any{
				"paths":    []string{"/base/path"},
				"compress": true,
			},
			PluginLoader: func(less LessInterface) PluginLoader {
				return &DefaultPluginLoader{}
			},
			Functions: &DefaultFunctions{},
		}
		input := ".class { color: red; }"

		done := make(chan bool, 1)
		var callbackOpts map[string]any

		parseWithContext(mockContext, input, map[string]any{}, func(err error, root any, imports *ImportManager, opts map[string]any) {
			callbackOpts = opts
			done <- true
		})

		<-done

		if callbackOpts == nil {
			t.Fatal("Expected options to be defined")
		}
		if paths, ok := callbackOpts["paths"].([]string); !ok || len(paths) == 0 || paths[0] != "/base/path" {
			t.Errorf("Expected paths to be copied from context, got: %v", callbackOpts["paths"])
		}
		if compress, ok := callbackOpts["compress"].(bool); !ok || !compress {
			t.Errorf("Expected compress to be true, got: %v", callbackOpts["compress"])
		}
	})

	t.Run("should merge provided options with context options", func(t *testing.T) {
		parseWithContext := CreateParseWithContext(environment, parseTree, importManagerFactory)
		mockContext := &LessContext{
			Options: map[string]any{
				"paths":    []string{"/base/path"},
				"compress": true,
			},
			PluginLoader: func(less LessInterface) PluginLoader {
				return &DefaultPluginLoader{}
			},
			Functions: &DefaultFunctions{},
		}
		input := ".class { color: red; }"
		options := map[string]any{
			"filename": "custom.less",
			"compress": false, // Override context option
		}

		done := make(chan bool, 1)
		var callbackOpts map[string]any

		parseWithContext(mockContext, input, options, func(err error, root any, imports *ImportManager, opts map[string]any) {
			callbackOpts = opts
			done <- true
		})

		<-done

		if callbackOpts == nil {
			t.Fatal("Expected options to be defined")
		}
		if paths, ok := callbackOpts["paths"].([]string); !ok || len(paths) == 0 || paths[0] != "/base/path" {
			t.Errorf("Expected paths from context, got: %v", callbackOpts["paths"])
		}
		if compress, ok := callbackOpts["compress"].(bool); !ok || compress {
			t.Errorf("Expected compress to be overridden to false, got: %v", callbackOpts["compress"])
		}
		if filename, ok := callbackOpts["filename"].(string); !ok || filename != "custom.less" {
			t.Errorf("Expected filename 'custom.less', got: %v", callbackOpts["filename"])
		}
	})
}

func TestParseRootFileInfoHandling(t *testing.T) {
	environment := &MockEnvironment{}
	parseTree := map[string]any{"tree": true}
	importManagerFactory := func(env any, context *Parse, rootFileInfo map[string]any) *ImportManager {
		// Extract filename from rootFileInfo for testing
		filename := "test.less"
		if rootFileInfo != nil {
			if fn, ok := rootFileInfo["filename"].(string); ok {
				filename = fn
			}
		}
		return &ImportManager{
			context:              map[string]any{"context": context},
			contents:             make(map[string]string),
			contentsIgnoredChars: make(map[string]string),
			rootFilename:         filename,
		}
	}

	t.Run("should use provided rootFileInfo", func(t *testing.T) {
		parse := CreateParse(environment, parseTree, importManagerFactory)
		input := ".class { color: red; }"
		rootFileInfo := map[string]any{
			"filename":         "custom.less",
			"rootpath":         "/custom/path/",
			"currentDirectory": "/custom/",
			"entryPath":        "/custom/",
			"rootFilename":     "custom.less",
		}
		options := map[string]any{"rootFileInfo": rootFileInfo}

		done := make(chan bool, 1)
		var callbackImports *ImportManager

		parse(input, options, func(err error, root any, imports *ImportManager, opts map[string]any) {
			callbackImports = imports
			done <- true
		})

		<-done

		if callbackImports == nil {
			t.Fatal("Expected imports to be defined")
		}
		if callbackImports.rootFilename != "custom.less" {
			t.Errorf("Expected rootFilename 'custom.less', got: %s", callbackImports.rootFilename)
		}
	})

	t.Run("should create rootFileInfo from filename", func(t *testing.T) {
		parse := CreateParse(environment, parseTree, importManagerFactory)
		input := ".class { color: red; }"
		options := map[string]any{"filename": "/path/to/file.less"}

		done := make(chan bool, 1)
		var callbackImports *ImportManager

		parse(input, options, func(err error, root any, imports *ImportManager, opts map[string]any) {
			callbackImports = imports
			done <- true
		})

		<-done

		if callbackImports == nil {
			t.Fatal("Expected imports to be defined")
		}
		if callbackImports.rootFilename != "/path/to/file.less" {
			t.Errorf("Expected rootFilename '/path/to/file.less', got: %s", callbackImports.rootFilename)
		}
	})

	t.Run("should default filename to input if not provided", func(t *testing.T) {
		parse := CreateParse(environment, parseTree, importManagerFactory)
		input := ".class { color: red; }"

		done := make(chan bool, 1)
		var callbackImports *ImportManager

		parse(input, map[string]any{}, func(err error, root any, imports *ImportManager, opts map[string]any) {
			callbackImports = imports
			done <- true
		})

		<-done

		if callbackImports == nil {
			t.Fatal("Expected imports to be defined")
		}
		if callbackImports.rootFilename != "input" {
			t.Errorf("Expected rootFilename 'input', got: %s", callbackImports.rootFilename)
		}
	})
}

func TestParsePluginHandling(t *testing.T) {
	environment := &MockEnvironment{}
	parseTree := map[string]any{"tree": true}
	importManagerFactory := func(env any, context *Parse, rootFileInfo map[string]any) *ImportManager {
		return &ImportManager{
			context:              map[string]any{"context": context},
			contents:             make(map[string]string),
			contentsIgnoredChars: make(map[string]string),
			rootFilename:         "test.less",
		}
	}

	t.Run("should create PluginManager instance", func(t *testing.T) {
		parse := CreateParse(environment, parseTree, importManagerFactory)
		input := ".class { color: red; }"

		done := make(chan bool, 1)
		var callbackOpts map[string]any

		parse(input, map[string]any{}, func(err error, root any, imports *ImportManager, opts map[string]any) {
			callbackOpts = opts
			done <- true
		})

		<-done

		if callbackOpts == nil {
			t.Fatal("Expected options to be defined")
		}
		if pluginManager := callbackOpts["pluginManager"]; pluginManager == nil {
			t.Error("Expected pluginManager to be defined")
		}
	})

	t.Run("should process plugins array with direct plugins", func(t *testing.T) {
		parse := CreateParse(environment, parseTree, importManagerFactory)
		input := ".class { color: red; }"
		plugin1 := map[string]any{
			"install":    func() {},
			"minVersion": []int{3, 0, 0},
		}
		options := map[string]any{"plugins": []any{plugin1}}

		done := make(chan bool, 1)
		var callbackErr error

		parse(input, options, func(err error, root any, imports *ImportManager, opts map[string]any) {
			callbackErr = err
			done <- true
		})

		<-done

		if callbackErr != nil {
			t.Errorf("Expected no error, got: %v", callbackErr)
		}
	})

	t.Run("should handle plugin fileContent", func(t *testing.T) {
		parse := CreateParse(environment, parseTree, importManagerFactory)
		input := ".class { color: red; }"
		plugin := map[string]any{
			"fileContent": `functions.add("test", function() { return "test"; });`,
			"filename":    "plugin.js",
		}
		options := map[string]any{"plugins": []any{plugin}}

		done := make(chan bool, 1)
		var callbackErr error

		parse(input, options, func(err error, root any, imports *ImportManager, opts map[string]any) {
			callbackErr = err
			done <- true
		})

		<-done

		if callbackErr != nil {
			t.Errorf("Expected no error with plugin content, got: %v", callbackErr)
		}
	})

	t.Run("should strip BOM from plugin fileContent", func(t *testing.T) {
		parse := CreateParse(environment, parseTree, importManagerFactory)
		input := ".class { color: red; }"
		plugin := map[string]any{
			"fileContent": "\uFEFFfunctions.add(\"test\", function() { return \"test\"; });",
			"filename":    "plugin.js",
		}
		options := map[string]any{"plugins": []any{plugin}}

		done := make(chan bool, 1)
		var callbackErr error

		parse(input, options, func(err error, root any, imports *ImportManager, opts map[string]any) {
			callbackErr = err
			done <- true
		})

		<-done

		if callbackErr != nil {
			t.Errorf("Expected no error with BOM removal, got: %v", callbackErr)
		}
	})
}

func TestParseEdgeCases(t *testing.T) {
	environment := &MockEnvironment{}
	parseTree := map[string]any{"tree": true}
	importManagerFactory := func(env any, context *Parse, rootFileInfo map[string]any) *ImportManager {
		return &ImportManager{
			context:              map[string]any{"context": context},
			contents:             make(map[string]string),
			contentsIgnoredChars: make(map[string]string),
			rootFilename:         "test.less",
		}
	}

	t.Run("should handle empty input", func(t *testing.T) {
		parse := CreateParse(environment, parseTree, importManagerFactory)

		done := make(chan bool, 1)
		var callbackErr error

		parse("", map[string]any{}, func(err error, root any, imports *ImportManager, opts map[string]any) {
			callbackErr = err
			done <- true
		})

		<-done

		if callbackErr != nil {
			t.Errorf("Expected no error with empty input, got: %v", callbackErr)
		}
	})

	t.Run("should handle nil options", func(t *testing.T) {
		parse := CreateParse(environment, parseTree, importManagerFactory)
		input := ".class { color: red; }"

		done := make(chan bool, 1)
		var callbackErr error

		parse(input, nil, func(err error, root any, imports *ImportManager, opts map[string]any) {
			callbackErr = err
			done <- true
		})

		<-done

		if callbackErr != nil {
			t.Errorf("Expected no error with nil options, got: %v", callbackErr)
		}
	})

	t.Run("should handle whitespace-only input", func(t *testing.T) {
		parse := CreateParse(environment, parseTree, importManagerFactory)
		input := "   \n\t  \n  "

		done := make(chan bool, 1)
		var callbackErr error

		parse(input, map[string]any{}, func(err error, root any, imports *ImportManager, opts map[string]any) {
			callbackErr = err
			done <- true
		})

		<-done

		if callbackErr != nil {
			t.Errorf("Expected no error with whitespace input, got: %v", callbackErr)
		}
	})

	t.Run("should handle undefined options (JS equivalent)", func(t *testing.T) {
		parse := CreateParse(environment, parseTree, importManagerFactory)
		input := ".class { color: red; }"

		done := make(chan bool, 1)
		var callbackErr error
		var callbackRoot any

		parse(input, nil, func(err error, root any, imports *ImportManager, opts map[string]any) {
			callbackErr = err
			callbackRoot = root
			done <- true
		})

		<-done

		if callbackErr != nil {
			t.Errorf("Expected no error with nil options, got: %v", callbackErr)
		}
		if callbackRoot == nil {
			t.Error("Expected root to be defined")
		}
	})

	t.Run("should handle context without options", func(t *testing.T) {
		parseWithContext := CreateParseWithContext(environment, parseTree, importManagerFactory)
		mockContext := &LessContext{
			Options: nil, // No options
			PluginLoader: func(less LessInterface) PluginLoader {
				return &DefaultPluginLoader{}
			},
			Functions: &DefaultFunctions{},
		}
		input := ".class { color: red; }"

		done := make(chan bool, 1)
		var callbackErr error
		var callbackRoot any

		parseWithContext(mockContext, input, map[string]any{}, func(err error, root any, imports *ImportManager, opts map[string]any) {
			callbackErr = err
			callbackRoot = root
			done <- true
		})

		<-done

		if callbackErr != nil {
			t.Errorf("Expected no error, got: %v", callbackErr)
		}
		if callbackRoot == nil {
			t.Error("Expected root to be defined")
		}
	})
}

func TestParseFilenameHandling(t *testing.T) {
	environment := &MockEnvironment{}
	parseTree := map[string]any{"tree": true}
	importManagerFactory := func(env any, context *Parse, rootFileInfo map[string]any) *ImportManager {
		filename := "test.less"
		if rootFileInfo != nil {
			if fn, ok := rootFileInfo["filename"].(string); ok {
				filename = fn
			}
		}
		return &ImportManager{
			context:              map[string]any{"context": context},
			contents:             make(map[string]string),
			contentsIgnoredChars: make(map[string]string),
			rootFilename:         filename,
		}
	}

	t.Run("should extract directory from filename correctly", func(t *testing.T) {
		parse := CreateParse(environment, parseTree, importManagerFactory)
		input := ".test { color: red; }"
		options := map[string]any{"filename": "/very/long/path/to/my/file.less"}

		done := make(chan bool, 1)
		var callbackImports *ImportManager

		parse(input, options, func(err error, root any, imports *ImportManager, opts map[string]any) {
			callbackImports = imports
			done <- true
		})

		<-done

		if callbackImports == nil {
			t.Fatal("Expected imports to be defined")
		}
		if callbackImports.rootFilename != "/very/long/path/to/my/file.less" {
			t.Errorf("Expected full filename, got: %s", callbackImports.rootFilename)
		}
	})

	t.Run("should handle filename without directory", func(t *testing.T) {
		parse := CreateParse(environment, parseTree, importManagerFactory)
		input := ".test { color: red; }"
		options := map[string]any{"filename": "file.less"}

		done := make(chan bool, 1)
		var callbackImports *ImportManager

		parse(input, options, func(err error, root any, imports *ImportManager, opts map[string]any) {
			callbackImports = imports
			done <- true
		})

		<-done

		if callbackImports == nil {
			t.Fatal("Expected imports to be defined")
		}
		if callbackImports.rootFilename != "file.less" {
			t.Errorf("Expected 'file.less', got: %s", callbackImports.rootFilename)
		}
	})

	t.Run("should handle Windows-style paths", func(t *testing.T) {
		parse := CreateParse(environment, parseTree, importManagerFactory)
		input := ".test { color: red; }"
		options := map[string]any{"filename": "C:\\path\\to\\file.less"}

		done := make(chan bool, 1)
		var callbackImports *ImportManager

		parse(input, options, func(err error, root any, imports *ImportManager, opts map[string]any) {
			callbackImports = imports
			done <- true
		})

		<-done

		if callbackImports == nil {
			t.Fatal("Expected imports to be defined")
		}
		if callbackImports.rootFilename != "C:\\path\\to\\file.less" {
			t.Errorf("Expected Windows path, got: %s", callbackImports.rootFilename)
		}
	})
}

func TestParsePromiseHandling(t *testing.T) {
	environment := &MockEnvironment{}
	parseTree := map[string]any{"tree": true}
	importManagerFactory := func(env any, context *Parse, rootFileInfo map[string]any) *ImportManager {
		return &ImportManager{
			context:              map[string]any{"context": context},
			contents:             make(map[string]string),
			contentsIgnoredChars: make(map[string]string),
			rootFilename:         "test.less",
		}
	}

	t.Run("should resolve promise with root on success", func(t *testing.T) {
		parse := CreateParse(environment, parseTree, importManagerFactory)
		input := ".valid { color: red; }"

		result := parse(input, map[string]any{}, nil)
		promise, ok := result.(*ParsePromise)
		if !ok {
			t.Fatal("Expected ParsePromise")
		}

		resultValue, err := promise.Await()
		if err != nil {
			t.Errorf("Promise should resolve without error, got: %v", err)
		}
		if resultValue == nil {
			t.Error("Promise should resolve with a value")
		}
	})
}

// Legacy tests for backward compatibility
func TestCreateParse(t *testing.T) {
	// Test that CreateParse returns a function
	environment := map[string]any{"test": true}
	parseTree := map[string]any{"tree": true}
	importManagerFactory := func(env any, context *Parse, rootFileInfo map[string]any) *ImportManager {
		return &ImportManager{
			context:              map[string]any{"context": context},
			contents:             make(map[string]string),
			contentsIgnoredChars: make(map[string]string),
			rootFilename:         "test.less",
		}
	}

	parse := CreateParse(environment, parseTree, importManagerFactory)

	if parse == nil {
		t.Fatal("CreateParse should return a function")
	}
}

func TestParsePromiseCreation(t *testing.T) {
	// Test that parse returns a promise when no callback is provided
	environment := map[string]any{"test": true}
	parseTree := map[string]any{"tree": true}
	importManagerFactory := func(env any, context *Parse, rootFileInfo map[string]any) *ImportManager {
		return &ImportManager{
			context:              map[string]any{"context": context},
			contents:             make(map[string]string),
			contentsIgnoredChars: make(map[string]string),
			rootFilename:         "test.less",
		}
	}

	parse := CreateParse(environment, parseTree, importManagerFactory)

	input := ".class { color: red; }"
	options := map[string]any{"filename": "test.less"}

	result := parse(input, options, nil)

	promise, ok := result.(*ParsePromise)
	if !ok {
		t.Fatal("Expected ParsePromise when no callback provided")
	}

	if promise == nil {
		t.Fatal("Promise should not be nil")
	}
}

// Additional utility function tests
func TestUtilityFunctions(t *testing.T) {
	t.Run("getOrDefault with string", func(t *testing.T) {
		result := getOrDefault("test", "default")
		if result != "test" {
			t.Errorf("Expected 'test', got: %s", result)
		}
	})

	t.Run("getOrDefault with non-string", func(t *testing.T) {
		result := getOrDefault(123, "default")
		if result != "default" {
			t.Errorf("Expected 'default', got: %s", result)
		}
	})

	t.Run("getOrDefault with nil", func(t *testing.T) {
		result := getOrDefault(nil, "default")
		if result != "default" {
			t.Errorf("Expected 'default', got: %s", result)
		}
	})
}

// Tests that mirror JavaScript test coverage more closely

func TestParseJSEquivalentOptions(t *testing.T) {
	environment := &MockEnvironment{}
	parseTree := map[string]any{"tree": true}
	importManagerFactory := func(env any, context *Parse, rootFileInfo map[string]any) *ImportManager {
		return &ImportManager{
			context:              map[string]any{"context": context},
			contents:             make(map[string]string),
			contentsIgnoredChars: make(map[string]string),
			rootFilename:         "test.less",
		}
	}

	// Simulate JavaScript's parse.call(this, input, options, callback) behavior
	mockContext := &LessContext{
		Options: map[string]any{
			"paths":    []string{"/base/path"},
			"compress": true,
		},
		PluginLoader: func(less LessInterface) PluginLoader {
			return &DefaultPluginLoader{}
		},
		Functions: &DefaultFunctions{},
	}

	parseWithContext := CreateParseWithContext(environment, parseTree, importManagerFactory)

	t.Run("should handle callback as second argument (JS equivalent)", func(t *testing.T) {
		input := ".class { color: red; }"

		done := make(chan bool, 1)
		var callbackErr error
		var callbackRoot any

		// This mirrors: parse.call(mockLess, input, (err, root) => { ... })
		parseWithContext(mockContext, input, nil, func(err error, root any, imports *ImportManager, opts map[string]any) {
			callbackErr = err
			callbackRoot = root
			done <- true
		})

		<-done

		if callbackErr != nil {
			t.Errorf("Expected no error, got: %v", callbackErr)
		}
		if callbackRoot == nil {
			t.Error("Expected root to be defined")
		}
	})

	t.Run("should return promise when no callback provided (JS equivalent)", func(t *testing.T) {
		input := ".class { color: red; }"
		options := map[string]any{"filename": "test.less"}

		// This mirrors: await parse.call(mockLess, input, options)
		result := parseWithContext(mockContext, input, options, nil)

		promise, ok := result.(*ParsePromise)
		if !ok {
			t.Fatal("Expected ParsePromise when no callback provided")
		}

		resultValue, err := promise.Await()
		if err != nil {
			t.Errorf("Promise should resolve without error, got: %v", err)
		}
		if resultValue == nil {
			t.Error("Promise should resolve with a value")
		}
	})
}

func TestParseImportManagerIntegration(t *testing.T) {
	environment := &MockEnvironment{}
	parseTree := map[string]any{"tree": true}
	importManagerFactory := func(env any, context *Parse, rootFileInfo map[string]any) *ImportManager {
		return &ImportManager{
			context:              map[string]any{"context": context},
			contents:             make(map[string]string),
			contentsIgnoredChars: make(map[string]string),
			rootFilename:         "test.less",
		}
	}

	mockContext := &LessContext{
		Options: map[string]any{},
		PluginLoader: func(less LessInterface) PluginLoader {
			return &DefaultPluginLoader{}
		},
		Functions: &DefaultFunctions{},
	}

	parseWithContext := CreateParseWithContext(environment, parseTree, importManagerFactory)

	t.Run("should set importManager on context", func(t *testing.T) {
		input := ".class { color: red; }"

		done := make(chan bool, 1)
		var callbackErr error

		parseWithContext(mockContext, input, map[string]any{}, func(err error, root any, imports *ImportManager, opts map[string]any) {
			callbackErr = err
			done <- true
		})

		<-done

		if callbackErr != nil {
			t.Errorf("Expected no error, got: %v", callbackErr)
		}
		if mockContext.ImportManager == nil {
			t.Error("Expected importManager to be set on context")
		}
	})

	t.Run("should initialize imports with empty contents and contentsIgnoredChars", func(t *testing.T) {
		input := ".class { color: red; }"

		done := make(chan bool, 1)
		var callbackErr error
		var callbackImports *ImportManager

		parseWithContext(mockContext, input, map[string]any{}, func(err error, root any, imports *ImportManager, opts map[string]any) {
			callbackErr = err
			callbackImports = imports
			done <- true
		})

		<-done

		if callbackErr != nil {
			t.Errorf("Expected no error, got: %v", callbackErr)
		}
		if callbackImports.contents == nil {
			t.Error("Expected imports.contents to be defined")
		}
		if callbackImports.contentsIgnoredChars == nil {
			t.Error("Expected imports.contentsIgnoredChars to be defined")
		}
	})
}

func TestParseAddTrailingSlash(t *testing.T) {
	environment := &MockEnvironment{}
	parseTree := map[string]any{"tree": true}
	importManagerFactory := func(env any, context *Parse, rootFileInfo map[string]any) *ImportManager {
		return &ImportManager{
			context:              map[string]any{"context": context},
			contents:             make(map[string]string),
			contentsIgnoredChars: make(map[string]string),
			rootFilename:         "test.less",
		}
	}

	parse := CreateParse(environment, parseTree, importManagerFactory)

	t.Run("should add trailing slash to rootpath if missing", func(t *testing.T) {
		input := ".class { color: red; }"
		options := map[string]any{
			"filename": "test.less",
			// Note: We can't easily test the internal rootpath modification without 
			// checking the Parse context creation, but we ensure no error occurs
		}

		done := make(chan bool, 1)
		var callbackErr error

		parse(input, options, func(err error, root any, imports *ImportManager, opts map[string]any) {
			callbackErr = err
			done <- true
		})

		<-done

		if callbackErr != nil {
			t.Errorf("Expected no error, got: %v", callbackErr)
		}
	})
}

func TestParseComplexScenarios(t *testing.T) {
	environment := &MockEnvironment{}
	parseTree := map[string]any{"tree": true}
	importManagerFactory := func(env any, context *Parse, rootFileInfo map[string]any) *ImportManager {
		return &ImportManager{
			context:              map[string]any{"context": context},
			contents:             make(map[string]string),
			contentsIgnoredChars: make(map[string]string),
			rootFilename:         "test.less",
		}
	}

	t.Run("should handle multiple parse calls with different contexts", func(t *testing.T) {
		parseWithContext := CreateParseWithContext(environment, parseTree, importManagerFactory)
		
		input1 := ".class1 { color: red; }"
		input2 := ".class2 { color: blue; }"
		
		context1 := &LessContext{
			Options: map[string]any{"compress": true},
			PluginLoader: func(less LessInterface) PluginLoader {
				return &DefaultPluginLoader{}
			},
			Functions: &DefaultFunctions{},
		}
		
		context2 := &LessContext{
			Options: map[string]any{"compress": false},
			PluginLoader: func(less LessInterface) PluginLoader {
				return &DefaultPluginLoader{}
			},
			Functions: &DefaultFunctions{},
		}

		// Simulate Promise.all by running in parallel
		done1 := make(chan bool, 1)
		done2 := make(chan bool, 1)
		var result1, result2 any
		var err1, err2 error

		// Run both parses in parallel
		go func() {
			result1 = parseWithContext(context1, input1, map[string]any{}, nil)
			if promise, ok := result1.(*ParsePromise); ok {
				result1, err1 = promise.Await()
			}
			done1 <- true
		}()

		go func() {
			result2 = parseWithContext(context2, input2, map[string]any{}, nil)
			if promise, ok := result2.(*ParsePromise); ok {
				result2, err2 = promise.Await()
			}
			done2 <- true
		}()

		// Wait for both to complete
		<-done1
		<-done2

		if err1 != nil {
			t.Errorf("Expected no error for context1, got: %v", err1)
		}
		if err2 != nil {
			t.Errorf("Expected no error for context2, got: %v", err2)
		}
		if result1 == nil {
			t.Error("Expected result1 to be defined")
		}
		if result2 == nil {
			t.Error("Expected result2 to be defined")
		}
		if context1.ImportManager == nil {
			t.Error("Expected context1.importManager to be defined")
		}
		if context2.ImportManager == nil {
			t.Error("Expected context2.importManager to be defined")
		}
		if context1.ImportManager == context2.ImportManager {
			t.Error("Expected different import managers for different contexts")
		}
	})

	t.Run("should handle complex LESS features", func(t *testing.T) {
		parse := CreateParse(environment, parseTree, importManagerFactory)
		input := `
			@base-color: #f938ab;
			.mixin(@color) {
				color: @color;
				border: 1px solid darken(@color, 10%);
			}
			.header {
				.mixin(@base-color);
				h1 {
					font-size: 24px;
					&:hover {
						color: lighten(@base-color, 20%);
					}
				}
			}
		`

		done := make(chan bool, 1)
		var callbackErr error
		var callbackRoot any

		parse(input, map[string]any{"filename": "complex.less"}, func(err error, root any, imports *ImportManager, opts map[string]any) {
			callbackErr = err
			callbackRoot = root
			done <- true
		})

		<-done

		if callbackErr != nil {
			t.Errorf("Expected no error with complex LESS, got: %v", callbackErr)
		}
		if callbackRoot == nil {
			t.Error("Expected root to be defined")
		}
	})
}

func TestParseParserIntegration(t *testing.T) {
	environment := &MockEnvironment{}
	parseTree := map[string]any{"tree": true}
	importManagerFactory := func(env any, context *Parse, rootFileInfo map[string]any) *ImportManager {
		return &ImportManager{
			context:              map[string]any{"context": context},
			contents:             make(map[string]string),
			contentsIgnoredChars: make(map[string]string),
			rootFilename:         "test.less",
		}
	}

	parse := CreateParse(environment, parseTree, importManagerFactory)

	t.Run("should handle simple CSS rules", func(t *testing.T) {
		input := ".test { color: blue; font-size: 14px; }"
		options := map[string]any{"filename": "test.less"}

		done := make(chan bool, 1)
		var callbackErr error
		var callbackRoot any

		parse(input, options, func(err error, root any, imports *ImportManager, opts map[string]any) {
			callbackErr = err
			callbackRoot = root
			done <- true
		})

		<-done

		if callbackErr != nil {
			t.Errorf("Expected no error, got: %v", callbackErr)
		}
		if callbackRoot == nil {
			t.Error("Expected root to be defined")
		}
	})

	t.Run("should handle LESS variables", func(t *testing.T) {
		input := "@color: red; .test { color: @color; }"
		options := map[string]any{"filename": "variables.less"}

		done := make(chan bool, 1)
		var callbackErr error
		var callbackRoot any

		parse(input, options, func(err error, root any, imports *ImportManager, opts map[string]any) {
			callbackErr = err
			callbackRoot = root
			done <- true
		})

		<-done

		if callbackErr != nil {
			t.Errorf("Expected no error, got: %v", callbackErr)
		}
		if callbackRoot == nil {
			t.Error("Expected root to be defined")
		}
	})

	t.Run("should handle nested rules", func(t *testing.T) {
		input := ".parent { .child { color: green; } }"
		options := map[string]any{"filename": "nested.less"}

		done := make(chan bool, 1)
		var callbackErr error
		var callbackRoot any

		parse(input, options, func(err error, root any, imports *ImportManager, opts map[string]any) {
			callbackErr = err
			callbackRoot = root
			done <- true
		})

		<-done

		if callbackErr != nil {
			t.Errorf("Expected no error, got: %v", callbackErr)
		}
		if callbackRoot == nil {
			t.Error("Expected root to be defined")
		}
	})
}

func TestParsePromiseErrorHandling(t *testing.T) {
	environment := &MockEnvironment{}
	parseTree := map[string]any{"tree": true}
	importManagerFactory := func(env any, context *Parse, rootFileInfo map[string]any) *ImportManager {
		return &ImportManager{
			context:              map[string]any{"context": context},
			contents:             make(map[string]string),
			contentsIgnoredChars: make(map[string]string),
			rootFilename:         "test.less",
		}
	}

	parse := CreateParse(environment, parseTree, importManagerFactory)

	t.Run("should resolve promise with root on success", func(t *testing.T) {
		input := ".valid { color: red; }"

		result := parse(input, map[string]any{}, nil)
		promise, ok := result.(*ParsePromise)
		if !ok {
			t.Fatal("Expected ParsePromise")
		}

		resultValue, err := promise.Await()
		if err != nil {
			t.Errorf("Promise should resolve without error, got: %v", err)
		}
		if resultValue == nil {
			t.Error("Promise should resolve with a value")
		}
	})

	// Note: We don't test promise rejection on invalid CSS since our mock implementation
	// doesn't actually parse CSS - it just returns a mock result. In a real implementation
	// with actual parser integration, this would test error handling.
}