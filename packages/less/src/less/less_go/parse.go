package less_go

import (
	"fmt"
	"os"
	"regexp"
	"strings"
)

// ParseCallbackFunc represents the callback function signature for parse operations
type ParseCallbackFunc func(error, any, *ImportManager, map[string]any)

// ParseFunc represents the parse function signature returned by the factory  
type ParseFunc func(string, map[string]any, ParseCallbackFunc) any

// LessContext represents the "this" context that contains options and importManager
type LessContext struct {
	Options       map[string]any
	ImportManager *ImportManager
	PluginLoader  PluginLoaderFactory
	Functions     Functions
}

// NewLessContext creates a new LessContext
func NewLessContext(options map[string]any) *LessContext {
	return &LessContext{
		Options: options,
		PluginLoader: func(less LessInterface) PluginLoader {
			return &DefaultPluginLoader{}
		},
		Functions: &DefaultFunctions{},
	}
}

// GetPluginLoader implements LessInterface
func (lc *LessContext) GetPluginLoader() PluginLoaderFactory {
	return lc.PluginLoader
}

// GetFunctions implements LessInterface
func (lc *LessContext) GetFunctions() Functions {
	return lc.Functions
}

// ParsePromise represents a basic promise-like structure
type ParsePromise struct {
	result any
	error  error
	done   chan bool
}

// Then provides promise-like then functionality
func (p *ParsePromise) Then(onSuccess func(any), onError func(error)) {
	go func() {
		<-p.done
		if p.error != nil && onError != nil {
			onError(p.error)
		} else if p.result != nil && onSuccess != nil {
			onSuccess(p.result)
		}
	}()
}

// Await waits for the promise to complete and returns result and error
func (p *ParsePromise) Await() (any, error) {
	<-p.done
	return p.result, p.error
}

// CreateParse creates a parse function with the given dependencies
// This mirrors the JavaScript export default function(environment, ParseTree, ImportManager)
func CreateParse(environment any, parseTree any, importManagerFactory func(any, *Parse, map[string]any) *ImportManager) ParseFunc {
	parse := func(input string, options map[string]any, callback ParseCallbackFunc) any {
		// In Go, we can't use dynamic 'this' context like JavaScript, so we create a default context
		// The caller can use CreateParseWithContext for more control
		defaultContext := NewLessContext(map[string]any{})
		return performParse(defaultContext, input, options, callback, environment, parseTree, importManagerFactory)
	}
	return parse
}

// CreateParseWithContext creates a parse function that can be called with a specific context
// This is closer to how the JavaScript version works with 'this' context
func CreateParseWithContext(environment any, parseTree any, importManagerFactory func(any, *Parse, map[string]any) *ImportManager) func(*LessContext, string, map[string]any, ParseCallbackFunc) any {
	return func(lessContext *LessContext, input string, options map[string]any, callback ParseCallbackFunc) any {
		return performParse(lessContext, input, options, callback, environment, parseTree, importManagerFactory)
	}
}

// performParse handles the core parsing logic, mirroring the JavaScript implementation
func performParse(lessContext *LessContext, input string, options map[string]any, callback ParseCallbackFunc, environment any, parseTree any, importManagerFactory func(any, *Parse, map[string]any) *ImportManager) any {
	var actualOptions map[string]any
	var actualCallback ParseCallbackFunc

	// Handle JavaScript-style overloading: parse.js lines 10-16
	// In JavaScript: if (typeof options === 'function') { callback = options; options = ... }
	// In Go, we can't dynamically check if options is a function, so we assume correct typing
	
	if callback == nil {
		// No callback provided - return promise (parse.js lines 18-28)
		if lessContext.Options != nil {
			actualOptions = CopyOptions(lessContext.Options, options)
		} else {
			actualOptions = CopyOptions(map[string]any{}, options)
		}
		
		// Return promise equivalent
		return createPromise(lessContext, input, actualOptions, environment, parseTree, importManagerFactory)
	} else {
		// Callback provided - synchronous execution (parse.js line 29+)
		actualCallback = callback
		if lessContext.Options != nil {
			actualOptions = CopyOptions(lessContext.Options, options)
		} else {
			actualOptions = CopyOptions(map[string]any{}, options)
		}
	}

	// Main parsing logic - mirrors parse.js lines 30-84
	var context *Parse
	var rootFileInfo map[string]any
	
	// Create plugin manager (equivalent to: const pluginManager = new PluginManager(this, !options.reUsePluginManager))
	// Note: reUsePluginManager affects plugin manager creation behavior in JavaScript
	pluginManager := NewPluginManager(lessContext)
	actualOptions["pluginManager"] = pluginManager
	
	// Create parsing context (equivalent to: context = new contexts.Parse(options))
	if os.Getenv("LESS_GO_DEBUG") == "1" {
		fmt.Printf("[DEBUG performParse] Creating Parse context with actualOptions paths: %v\n", actualOptions["paths"])
	}
	context = NewParse(actualOptions)
	if os.Getenv("LESS_GO_DEBUG") == "1" {
		fmt.Printf("[DEBUG performParse] Created Parse context with context.Paths: %v\n", context.Paths)
	}
	
	// Handle rootFileInfo (parse.js lines 38-55)
	if rootFileInfoVal, ok := actualOptions["rootFileInfo"]; ok {
		if rootInfo, ok := rootFileInfoVal.(map[string]any); ok {
			rootFileInfo = rootInfo
		}
	} else {
		filename := "input"
		if filenameVal, ok := actualOptions["filename"]; ok {
			if fn, ok := filenameVal.(string); ok {
				filename = fn
			}
		}
		
		// Extract directory path using regex (equivalent to filename.replace(/[^/\\]*$/, ''))
		re := regexp.MustCompile(`[^/\\]*$`)
		entryPath := re.ReplaceAllString(filename, "")
		
		rootFileInfo = map[string]any{
			"filename":         filename,
			"rewriteUrls":      context.RewriteUrls,
			"rootpath":         getOrDefault(context.Rootpath, ""),
			"currentDirectory": entryPath,
			"entryPath":        entryPath,
			"rootFilename":     filename,
		}
		
		// Add missing trailing slash to rootpath (parse.js lines 52-54)
		if rootpath, ok := rootFileInfo["rootpath"].(string); ok {
			if rootpath != "" && !strings.HasSuffix(rootpath, "/") {
				rootFileInfo["rootpath"] = rootpath + "/"
			}
		}
	}
	
	// Create import manager (equivalent to: const imports = new ImportManager(this, context, rootFileInfo))
	if os.Getenv("LESS_GO_DEBUG") == "1" {
		fmt.Printf("[DEBUG performParse] About to call importManagerFactory with context.Paths: %v\n", context.Paths)
	}
	imports := importManagerFactory(environment, context, rootFileInfo)
	if os.Getenv("LESS_GO_DEBUG") == "1" {
		fmt.Printf("[DEBUG performParse] importManagerFactory returned, imports.paths: %v\n", imports.paths)
	}

	// Set importManager on the context (equivalent to: this.importManager = imports)
	lessContext.ImportManager = imports
	
	// Handle plugins (parse.js lines 63-77)
	if pluginsVal, ok := actualOptions["plugins"]; ok {
		if plugins, ok := pluginsVal.([]any); ok {
			for _, pluginVal := range plugins {
				if plugin, ok := pluginVal.(map[string]any); ok {
					if fileContentVal, ok := plugin["fileContent"]; ok {
						if fileContent, ok := fileContentVal.(string); ok {
							// Remove BOM character (equivalent to contents = plugin.fileContent.replace(/^\uFEFF/, ''))
							contents := strings.TrimPrefix(fileContent, "\uFEFF")
							
							var pluginOptions map[string]any
							if optsVal, ok := plugin["options"]; ok {
								if opts, ok := optsVal.(map[string]any); ok {
									pluginOptions = opts
								}
							}
							
							var filename any
							if filenameVal, ok := plugin["filename"]; ok {
								filename = filenameVal
							}
							
							// Try to evaluate plugin if PluginLoader is available
							if pluginManager.Loader != nil {
								evalResult := pluginManager.Loader.EvalPlugin(contents, context, imports, pluginOptions, filename)
								
								// Check if evalResult is a LessError (parse.js lines 69-71)
								if lessErr, ok := evalResult.(*LessError); ok {
									actualCallback(lessErr, nil, nil, nil)
									return nil
								}
							}
						}
					} else {
						// Direct plugin object (parse.js line 74: pluginManager.addPlugin(plugin))
						pluginManager.AddPlugin(plugin, "", nil)
					}
				}
			}
		}
	}
	
	// Create parser and parse (equivalent to: new Parser(context, imports, rootFileInfo).parse(input, function (e, root) { ... }, options))
	// This mirrors parse.js lines 79-83
	go func() {
		// Convert Parse context to map for NewParser
		contextMap := map[string]any{
			"paths":            context.Paths,
			"rewriteUrls":      context.RewriteUrls,
			"rootpath":         context.Rootpath,
			"strictImports":    context.StrictImports,
			"insecure":         context.Insecure,
			"dumpLineNumbers":  context.DumpLineNumbers,
			"compress":         context.Compress,
			"syncImport":       context.SyncImport,
			"chunkInput":       context.ChunkInput,
			"mime":             context.Mime,
			"useFileCache":     context.UseFileCache,
			"processImports":   context.ProcessImports,
			"pluginManager":    context.PluginManager,
			"quiet":            context.Quiet,
		}
		
		// Create imports map for NewParser (basic structure to match JavaScript)
		importsMap := map[string]any{
			"contents":             make(map[string]string),
			"contentsIgnoredChars": make(map[string]int),
			"rootFilename":         rootFileInfo["filename"],
		}
		
		// Create parser instance
		parser := NewParser(contextMap, importsMap, rootFileInfo, 0)
		
		// Prepare additional data for parsing
		additionalData := &AdditionalData{}
		
		// Set options from actualOptions if they exist
		if globalVarsVal, ok := actualOptions["globalVars"]; ok {
			if globalVars, ok := globalVarsVal.(map[string]any); ok {
				additionalData.GlobalVars = globalVars
			}
		}
		
		if modifyVarsVal, ok := actualOptions["modifyVars"]; ok {
			if modifyVars, ok := modifyVarsVal.(map[string]any); ok {
				additionalData.ModifyVars = modifyVars
			}
		}
		
		if bannerVal, ok := actualOptions["banner"]; ok {
			if banner, ok := bannerVal.(string); ok {
				additionalData.Banner = banner
			}
		}
		
		if disablePluginRuleVal, ok := actualOptions["disablePluginRule"]; ok {
			if disablePluginRule, ok := disablePluginRuleVal.(bool); ok {
				additionalData.DisablePluginRule = disablePluginRule
			}
		}
		
		// Call the actual parser
		parser.Parse(input, func(err *LessError, root *Ruleset) {
			if err != nil {
				actualCallback(err, nil, imports, actualOptions)
			} else {
				actualCallback(nil, root, imports, actualOptions)
			}
		}, additionalData)
	}()
	
	return nil
}

// createPromise creates a promise-like structure for async operations
func createPromise(lessContext *LessContext, input string, options map[string]any, environment any, parseTree any, importManagerFactory func(any, *Parse, map[string]any) *ImportManager) *ParsePromise {
	promise := &ParsePromise{
		done: make(chan bool, 1),
	}
	
	go func() {
		// Perform parse operation
		performParse(lessContext, input, options, func(e error, root any, imports *ImportManager, opts map[string]any) {
			if e != nil {
				promise.error = e
			} else {
				promise.result = root
			}
			promise.done <- true
		}, environment, parseTree, importManagerFactory)
	}()
	
	return promise
}

// getOrDefault returns the value if it's a string, otherwise returns the default
func getOrDefault(value any, defaultValue string) string {
	if str, ok := value.(string); ok {
		return str
	}
	return defaultValue
}

// DefaultPluginLoader provides a basic implementation of PluginLoader
type DefaultPluginLoader struct{}

func (d *DefaultPluginLoader) EvalPlugin(contents string, newEnv *Parse, importManager any, pluginArgs map[string]any, newFileInfo any) any {
	// Basic plugin evaluation - in a real implementation this would evaluate the plugin code
	return map[string]any{"name": "plugin", "type": "plugin"}
}

func (d *DefaultPluginLoader) LoadPluginSync(path, currentDirectory string, context map[string]any, environment any, fileManager any) any {
	return map[string]any{"name": "plugin", "type": "plugin"}
}

func (d *DefaultPluginLoader) LoadPlugin(path, currentDirectory string, context map[string]any, environment any, fileManager any) any {
	return map[string]any{"name": "plugin", "type": "plugin"}
}

// DefaultFunctions provides a basic implementation of Functions
type DefaultFunctions struct{
	registry *Registry
}

func (d *DefaultFunctions) GetFunctionRegistry() any {
	if d.registry != nil {
		return d.registry
	}
	return map[string]any{}
}