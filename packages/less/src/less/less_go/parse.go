package less_go

import (
	"regexp"
	"strings"
)

// ParseCallbackFunc represents the callback function signature for parse operations
type ParseCallbackFunc func(error, any, *ImportManager, map[string]any)

// ParseFunc represents the parse function signature returned by the factory  
type ParseFunc func(string, map[string]any, ParseCallbackFunc) any

// LessContextInterface extends LessInterface with additional methods needed for parsing
type LessContextInterface interface {
	LessInterface
	GetOptions() map[string]any
	SetImportManager(*ImportManager)
}

// ParserFactory creates a new parser instance that matches the existing ParserInterface
type ParserFactory func(context map[string]any, imports map[string]any, fileInfo map[string]any, currentIndex int) ParserInterface

// CreateParse creates a parse function with the given dependencies
// This mirrors the JavaScript export default function(environment, ParseTree, ImportManager)
func CreateParse(environment any, parseTree any, importManagerFactory func(any, *Parse, map[string]any) *ImportManager) ParseFunc {
	return CreateParseWithParserFactory(environment, parseTree, importManagerFactory, nil)
}

// CreateParseWithParserFactory creates a parse function with a parser factory to avoid circular dependencies
func CreateParseWithParserFactory(environment any, parseTree any, importManagerFactory func(any, *Parse, map[string]any) *ImportManager, parserFactory ParserFactory) ParseFunc {
	parse := func(input string, options map[string]any, callback ParseCallbackFunc) any {
		// This should be called with a LessInterface as 'this' context
		// We need to check if it's available from some context
		
		var actualOptions map[string]any
		var actualCallback ParseCallbackFunc
		
		if callback == nil {
			// No callback provided, return promise
			if options == nil {
				actualOptions = map[string]any{}
			} else {
				actualOptions = options
			}
			return createPromise(input, actualOptions, environment, parseTree, importManagerFactory)
		} else {
			actualCallback = callback
			if options == nil {
				actualOptions = CopyOptions(map[string]any{}, map[string]any{})
			} else {
				actualOptions = CopyOptions(map[string]any{}, options)
			}
		}

		// Main parsing logic
		performParseWithFactory(input, actualOptions, actualCallback, environment, parseTree, importManagerFactory, parserFactory)
		return nil
	}
	
	return parse
}

// CreateParseWithContext creates a parse function that operates with a specific "this" context
// This is closer to how the JavaScript version works
func CreateParseWithContext(environment any, parseTree any, importManagerFactory func(any, *Parse, map[string]any) *ImportManager) func(LessContextInterface, string, map[string]any, ParseCallbackFunc) any {
	return func(lessContext LessContextInterface, input string, options map[string]any, callback ParseCallbackFunc) any {
		var actualOptions map[string]any
		var actualCallback ParseCallbackFunc
		
		// Handle JavaScript-style overloading: if options is actually a callback function
		if callback == nil && options != nil {
			// Check if options is actually a callback (in JavaScript this would be typeof options === 'function')
			// In Go, we can't do this directly, so we assume if callback is nil but options is provided,
			// and the caller wants callback behavior, they should pass the callback as the third parameter
			
			// No callback provided, return promise
			thisOptions := lessContext.GetOptions()
			if thisOptions != nil {
				actualOptions = CopyOptions(thisOptions, options)
			} else {
				actualOptions = CopyOptions(map[string]any{}, options)
			}
			return createPromiseWithContext(lessContext, input, actualOptions, environment, parseTree, importManagerFactory)
		} else if callback == nil {
			// No options and no callback - return promise with empty options merged with this.options
			thisOptions := lessContext.GetOptions()
			if thisOptions != nil {
				actualOptions = CopyOptions(thisOptions, map[string]any{})
			} else {
				actualOptions = CopyOptions(map[string]any{}, map[string]any{})
			}
			return createPromiseWithContext(lessContext, input, actualOptions, environment, parseTree, importManagerFactory)
		} else {
			// Both options and callback provided
			actualCallback = callback
			thisOptions := lessContext.GetOptions()
			if options == nil {
				if thisOptions != nil {
					actualOptions = CopyOptions(thisOptions, map[string]any{})
				} else {
					actualOptions = CopyOptions(map[string]any{}, map[string]any{})
				}
			} else {
				if thisOptions != nil {
					actualOptions = CopyOptions(thisOptions, options)
				} else {
					actualOptions = CopyOptions(map[string]any{}, options)
				}
			}
		}

		// Main parsing logic with context
		performParseWithContext(lessContext, input, actualOptions, actualCallback, environment, parseTree, importManagerFactory)
		return nil
	}
}

// createPromise creates a promise-like structure for async operations
func createPromise(input string, options map[string]any, environment any, parseTree any, importManagerFactory func(any, *Parse, map[string]any) *ImportManager) *ParsePromise {
	promise := &ParsePromise{
		done: make(chan bool, 1),
	}
	
	go func() {
		// Perform parse operation
		actualOptions := CopyOptions(map[string]any{}, options)
		performParse(input, actualOptions, func(e error, root any, imports *ImportManager, opts map[string]any) {
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

// createPromiseWithContext creates a promise-like structure for async operations with a context
func createPromiseWithContext(lessContext LessContextInterface, input string, options map[string]any, environment any, parseTree any, importManagerFactory func(any, *Parse, map[string]any) *ImportManager) *ParsePromise {
	promise := &ParsePromise{
		done: make(chan bool, 1),
	}
	
	go func() {
		// Perform parse operation with context
		performParseWithContext(lessContext, input, options, func(e error, root any, imports *ImportManager, opts map[string]any) {
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

// performParse handles the core parsing logic
func performParse(input string, options map[string]any, callback ParseCallbackFunc, environment any, parseTree any, importManagerFactory func(any, *Parse, map[string]any) *ImportManager) {
	performParseWithFactory(input, options, callback, environment, parseTree, importManagerFactory, nil)
}

// performParseWithFactory handles the core parsing logic with a parser factory
func performParseWithFactory(input string, options map[string]any, callback ParseCallbackFunc, environment any, parseTree any, importManagerFactory func(any, *Parse, map[string]any) *ImportManager, parserFactory ParserFactory) {
	performParseWithContextAndFactory(&DefaultLessInterface{options: make(map[string]any)}, input, options, callback, environment, parseTree, importManagerFactory, parserFactory)
}

// performParseWithContext handles the core parsing logic with a LessContextInterface context
func performParseWithContext(lessContext LessContextInterface, input string, options map[string]any, callback ParseCallbackFunc, environment any, parseTree any, importManagerFactory func(any, *Parse, map[string]any) *ImportManager) {
	performParseWithContextAndFactory(lessContext, input, options, callback, environment, parseTree, importManagerFactory, nil)
}

// performParseWithContextAndFactory handles the core parsing logic with a LessContextInterface context and parser factory
func performParseWithContextAndFactory(lessContext LessContextInterface, input string, options map[string]any, callback ParseCallbackFunc, environment any, parseTree any, importManagerFactory func(any, *Parse, map[string]any) *ImportManager, parserFactory ParserFactory) {
	var context *Parse
	var rootFileInfo map[string]any
	
	// Create plugin manager (equivalent to: const pluginManager = new PluginManager(this, !options.reUsePluginManager))
	reUsePluginManager := false
	if reUseVal, ok := options["reUsePluginManager"]; ok {
		if reUse, ok := reUseVal.(bool); ok {
			reUsePluginManager = reUse
		}
	}
	_ = reUsePluginManager // Prevent unused variable error
	
	pluginManager := NewPluginManager(lessContext)
	options["pluginManager"] = pluginManager
	
	// Create parsing context (equivalent to: context = new contexts.Parse(options))
	context = NewParse(options)
	
	// Handle rootFileInfo
	if rootFileInfoVal, ok := options["rootFileInfo"]; ok {
		if rootInfo, ok := rootFileInfoVal.(map[string]any); ok {
			rootFileInfo = rootInfo
		}
	} else {
		filename := "input"
		if filenameVal, ok := options["filename"]; ok {
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
		
		// Add missing trailing slash to rootpath
		if rootpath, ok := rootFileInfo["rootpath"].(string); ok {
			if rootpath != "" && !strings.HasSuffix(rootpath, "/") {
				rootFileInfo["rootpath"] = rootpath + "/"
			}
		}
	}
	
	// Create import manager (equivalent to: const imports = new ImportManager(this, context, rootFileInfo))
	imports := importManagerFactory(environment, context, rootFileInfo)
	
	// Set importManager on the context (equivalent to: this.importManager = imports)
	lessContext.SetImportManager(imports)
	
	// Handle plugins
	if pluginsVal, ok := options["plugins"]; ok {
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
							
							// Skip plugin evaluation if PluginLoader is not available (not yet ported)
							if pluginManager.Loader != nil {
								evalResult := pluginManager.Loader.EvalPlugin(contents, context, imports, pluginOptions, filename)
								
								// Check if evalResult is a LessError
								if lessErr, ok := evalResult.(*LessError); ok {
									callback(lessErr, nil, nil, nil)
									return
								}
							}
						}
					} else {
						// Direct plugin object
						pluginManager.AddPlugin(plugin, "", nil)
					}
				}
			}
		}
	}
	
	// Create parser and parse (equivalent to: new Parser(context, imports, rootFileInfo).parse(input, function (e, root) { ... }, options))
	if parserFactory != nil {
		contextMap := map[string]any{"context": context}
		importsMap := map[string]any{"imports": imports}
		
		p := parserFactory(contextMap, importsMap, rootFileInfo, 0)
		
		// Create additional data for parser as map[string]any to match ParserInterface
		additionalData := make(map[string]any)
		if globalVarsVal, ok := options["globalVars"]; ok {
			if globalVars, ok := globalVarsVal.(map[string]any); ok {
				additionalData["globalVars"] = globalVars
			}
		}
		if modifyVarsVal, ok := options["modifyVars"]; ok {
			if modifyVars, ok := modifyVarsVal.(map[string]any); ok {
				additionalData["modifyVars"] = modifyVars
			}
		}
		
		// Call the parser (equivalent to the JavaScript parser.parse call)
		p.Parse(input, func(err *LessError, root any) {
			if err != nil {
				callback(err, nil, imports, options)
			} else {
				callback(nil, root, imports, options)
			}
		}, additionalData)
	} else {
		// No parser factory provided - create a simple mock result for testing
		callback(nil, map[string]any{"type": "Ruleset", "rules": []any{}}, imports, options)
	}
}

// getOrDefault returns the value if it's a string, otherwise returns the default
func getOrDefault(value any, defaultValue string) string {
	if str, ok := value.(string); ok {
		return str
	}
	return defaultValue
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

// DefaultLessInterface provides a basic implementation of LessContextInterface
type DefaultLessInterface struct {
	options       map[string]any
	importManager *ImportManager
}

func (d *DefaultLessInterface) GetOptions() map[string]any {
	return d.options
}

func (d *DefaultLessInterface) SetImportManager(im *ImportManager) {
	d.importManager = im
}

func (d *DefaultLessInterface) GetPluginLoader() PluginLoaderFactory {
	return func(less LessInterface) PluginLoader {
		return &DefaultPluginLoader{}
	}
}

func (d *DefaultLessInterface) GetFunctions() Functions {
	return &DefaultFunctions{}
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
type DefaultFunctions struct{}

func (d *DefaultFunctions) GetFunctionRegistry() any {
	return map[string]any{}
}