package environment

import "github.com/toakleaf/less.go/packages/less/src/less"

// FileManager represents a file manager interface
type FileManager interface {
	Supports(filename, currentDirectory string, options map[string]any, environment map[string]any) bool
	SupportsSync(filename, currentDirectory string, options map[string]any, environment map[string]any) bool
}

// PluginManager represents a plugin manager interface
type PluginManager interface {
	GetFileManagers() []FileManager
}

// Environment represents an environment with file managers and external functions
type Environment struct {
	FileManagers           []FileManager
	EncodeBase64          func() string
	MimeLookup            func() string
	CharsetLookup         func() string
	GetSourceMapGenerator func() any
	externalEnvironment   map[string]any // Store original external environment for context binding
}

// NewEnvironment creates a new Environment instance
func NewEnvironment(externalEnvironment map[string]any, fileManagers []FileManager) *Environment {
	env := &Environment{}
	
	// Handle fileManagers - matches JS: this.fileManagers = fileManagers || [];
	if fileManagers != nil {
		env.FileManagers = fileManagers
	} else {
		env.FileManagers = make([]FileManager, 0)
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
			switch propName {
			case "encodeBase64":
				if fn, ok := environmentFunc.(func() string); ok {
					env.EncodeBase64 = func() string {
						return fn() // Context binding simulated
					}
				}
			case "mimeLookup":
				if fn, ok := environmentFunc.(func() string); ok {
					env.MimeLookup = func() string {
						return fn() // Context binding simulated
					}
				}
			case "charsetLookup":
				if fn, ok := environmentFunc.(func() string); ok {
					env.CharsetLookup = func() string {
						return fn() // Context binding simulated
					}
				}
			case "getSourceMapGenerator":
				if fn, ok := environmentFunc.(func() any); ok {
					env.GetSourceMapGenerator = func() any {
						return fn() // Context binding simulated
					}
				}
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
func (e *Environment) GetFileManager(filename string, currentDirectory string, options map[string]any, environment map[string]any, isSync bool) FileManager {
	// Match JavaScript: if (!filename) { logger.warn(...) }
	if filename == "" {
		less.Warn("getFileManager called with no filename.. Please report this issue. continuing.")
	}
	// Match JavaScript: if (currentDirectory === undefined) { logger.warn(...) }
	// Note: In Go, we'll use empty string to represent undefined, similar to JS
	if currentDirectory == "" {
		less.Warn("getFileManager called with null directory.. Please report this issue. continuing.")
	}
	
	// Match JavaScript: let fileManagers = this.fileManagers;
	fileManagers := e.FileManagers
	
	// Match JavaScript: if (options.pluginManager) { ... }
	// Replicate JavaScript bug: this will panic if options is nil, just like JS throws
	if options == nil {
		panic("runtime error: invalid memory address or nil pointer dereference")
	}
	if pluginManager, exists := options["pluginManager"]; exists && pluginManager != nil {
		if pm, ok := pluginManager.(PluginManager); ok {
			pluginFileManagers := pm.GetFileManagers()
			// Match JavaScript: fileManagers = [].concat(fileManagers).concat(options.pluginManager.getFileManagers());
			fileManagers = append(append([]FileManager(nil), fileManagers...), pluginFileManagers...)
		}
	}
	
	// Match JavaScript: for (let i = fileManagers.length - 1; i >= 0 ; i--)
	for i := len(fileManagers) - 1; i >= 0; i-- {
		fileManager := fileManagers[i]
		// Match JavaScript: fileManager[isSync ? 'supportsSync' : 'supports'](filename, currentDirectory, options, environment)
		if isSync {
			if fileManager.SupportsSync(filename, currentDirectory, options, environment) {
				return fileManager
			}
		} else {
			if fileManager.Supports(filename, currentDirectory, options, environment) {
				return fileManager
			}
		}
	}
	
	// Match JavaScript: return null;
	return nil
}

// AddFileManager adds a file manager to the environment
func (e *Environment) AddFileManager(fileManager FileManager) {
	e.FileManagers = append(e.FileManagers, fileManager)
}

// ClearFileManagers clears all file managers from the environment
func (e *Environment) ClearFileManagers() {
	e.FileManagers = make([]FileManager, 0)
}

// warn is a helper method to issue warnings (mirrors JavaScript behavior)
// Matches JavaScript: this.warn = function(message) { ... }
func (e *Environment) warn(message string) {
	less.Warn(message)
}