package less_go

import (
	"reflect"
)

// createBoundFunction creates a function that simulates JavaScript's .bind() behavior
// It preserves the context (externalEnvironment) for function calls
func createBoundFunction(fn any, context map[string]any) func() string {
	return func() string {
		// Handle different function types that might exist in the environment
		switch f := fn.(type) {
		case func() string:
			// Simple function without context
			return f()
		case func(map[string]any) string:
			// Function that expects the context as parameter
			return f(context)
		default:
			// Try reflection for functions that access context via closure
			// This simulates JavaScript's "this" binding
			fnValue := reflect.ValueOf(fn)
			if fnValue.Kind() == reflect.Func {
				// Check if it's a no-arg function returning string
				fnType := fnValue.Type()
				if fnType.NumIn() == 0 && fnType.NumOut() == 1 {
					results := fnValue.Call(nil)
					if len(results) > 0 {
						if str, ok := results[0].Interface().(string); ok {
							return str
						}
					}
				}
			}
			return ""
		}
	}
}

// createBoundFunctionAny creates a function that returns any type
func createBoundFunctionAny(fn any, context map[string]any) func() any {
	return func() any {
		switch f := fn.(type) {
		case func() any:
			return f()
		case func(map[string]any) any:
			return f(context)
		default:
			// Try reflection
			fnValue := reflect.ValueOf(fn)
			if fnValue.Kind() == reflect.Func {
				fnType := fnValue.Type()
				if fnType.NumIn() == 0 && fnType.NumOut() == 1 {
					results := fnValue.Call(nil)
					if len(results) > 0 {
						return results[0].Interface()
					}
				}
			}
			return nil
		}
	}
}

// EnvironmentFileManager represents a file manager interface
type EnvironmentFileManager interface {
	Supports(filename, currentDirectory string, options map[string]any, environment map[string]any) bool
	SupportsSync(filename, currentDirectory string, options map[string]any, environment map[string]any) bool
}

// EnvironmentPluginManager represents a plugin manager interface for environments
type EnvironmentPluginManager interface {
	GetFileManagers() []EnvironmentFileManager
}

// EnvironmentEnvironment represents an environment with file managers and external functions
type EnvironmentEnvironment struct {
	FileManagers           []EnvironmentFileManager
	EncodeBase64          func() string
	MimeLookup            func() string
	CharsetLookup         func() string
	GetSourceMapGenerator func() any
	externalEnvironment   map[string]any // Store original external environment for context binding
}

// NewEnvironment creates a new EnvironmentEnvironment instance
func NewEnvironment(externalEnvironment map[string]any, fileManagers []EnvironmentFileManager) *EnvironmentEnvironment {
	env := &EnvironmentEnvironment{}
	
	// Handle fileManagers - matches JS: this.fileManagers = fileManagers || [];
	if fileManagers != nil {
		env.FileManagers = fileManagers
	} else {
		env.FileManagers = make([]EnvironmentFileManager, 0)
	}
	
	// Handle externalEnvironment - matches JS: externalEnvironment = externalEnvironment || {};
	if externalEnvironment == nil {
		externalEnvironment = make(map[string]any)
	}
	env.externalEnvironment = externalEnvironment
	
	optionalFunctions := []string{"encodeBase64", "mimeLookup", "charsetLookup", "getSourceMapGenerator"}
	requiredFunctions := []string{}
	functions := append(requiredFunctions, optionalFunctions...)
	
	// Match JavaScript loop: for (let i = 0; i < functions.length; i++)
	for i, propName := range functions {
		if environmentFunc, exists := externalEnvironment[propName]; exists && environmentFunc != nil {
			// Create bound functions that preserve external environment context
			// In JavaScript, .bind() preserves the `this` context
			// We need to support functions that might access other properties from externalEnvironment
			switch propName {
			case "encodeBase64":
				// Store as any to allow flexible function signatures
				env.EncodeBase64 = createBoundFunction(environmentFunc, externalEnvironment)
			case "mimeLookup":
				env.MimeLookup = createBoundFunction(environmentFunc, externalEnvironment)
			case "charsetLookup":
				env.CharsetLookup = createBoundFunction(environmentFunc, externalEnvironment)
			case "getSourceMapGenerator":
				env.GetSourceMapGenerator = createBoundFunctionAny(environmentFunc, externalEnvironment)
			}
		} else if i < len(requiredFunctions) {
			// Match JavaScript: this.warn(`missing required function in environment - ${propName}`);
			env.warn("missing required function in environment - " + propName)
		}
	}
	
	return env
}

// GetFileManager returns the first file manager that supports the given file
// Matches JavaScript signature: getFileManager(filename, currentDirectory, options, environment, isSync)
// Note: currentDirectory should be passed as *string to distinguish between nil (undefined) and empty string
func (e *EnvironmentEnvironment) GetFileManager(filename string, currentDirectory *string, options map[string]any, environment map[string]any, isSync bool) EnvironmentFileManager {
	// Match JavaScript: if (!filename) { logger.warn(...) }
	if filename == "" {
		Warn("getFileManager called with no filename.. Please report this issue. continuing.")
	}
	// Match JavaScript: if (currentDirectory === undefined) { logger.warn(...) }
	if currentDirectory == nil {
		Warn("getFileManager called with null directory.. Please report this issue. continuing.")
	}
	
	// Match JavaScript: let fileManagers = this.fileManagers;
	fileManagers := e.FileManagers
	
	// Match JavaScript: if (options.pluginManager) { ... }
	// Replicate JavaScript bug: this will panic if options is nil, just like JS throws
	if options == nil {
		panic("runtime error: invalid memory address or nil pointer dereference")
	}
	if pluginManager, exists := options["pluginManager"]; exists && pluginManager != nil {
		if pm, ok := pluginManager.(EnvironmentPluginManager); ok {
			pluginFileManagers := pm.GetFileManagers()
			// Match JavaScript: fileManagers = [].concat(fileManagers).concat(options.pluginManager.getFileManagers());
			combined := append([]EnvironmentFileManager(nil), fileManagers...)
			fileManagers = append(combined, pluginFileManagers...)
		}
	}
	
	// Match JavaScript: for (let i = fileManagers.length - 1; i >= 0 ; i--)
	for i := len(fileManagers) - 1; i >= 0; i-- {
		fileManager := fileManagers[i]
		// Match JavaScript: fileManager[isSync ? 'supportsSync' : 'supports'](filename, currentDirectory, options, environment)
		// Convert pointer back to string for the interface call
		currentDirStr := ""
		if currentDirectory != nil {
			currentDirStr = *currentDirectory
		}
		if isSync {
			if fileManager.SupportsSync(filename, currentDirStr, options, environment) {
				return fileManager
			}
		} else {
			if fileManager.Supports(filename, currentDirStr, options, environment) {
				return fileManager
			}
		}
	}
	
	// Match JavaScript: return null;
	return nil
}

// AddFileManager adds a file manager to the environment
func (e *EnvironmentEnvironment) AddFileManager(fileManager EnvironmentFileManager) {
	e.FileManagers = append(e.FileManagers, fileManager)
}

// ClearFileManagers clears all file managers from the environment
func (e *EnvironmentEnvironment) ClearFileManagers() {
	e.FileManagers = make([]EnvironmentFileManager, 0)
}

// warn is a helper method to issue warnings (mirrors JavaScript behavior)
// Matches JavaScript: this.warn = function(message) { ... }
func (e *EnvironmentEnvironment) warn(message string) {
	Warn(message)
}