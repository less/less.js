package less_go

import (
	"fmt"
	"strconv"
	"strings"
)

// Factory creates a new Less instance
func Factory(environment map[string]any, fileManagers []any) map[string]any {
	var sourceMapOutput any
	var sourceMapBuilder any
	var parseTree any
	var importManager any

	// Create Environment - equivalent to: new Environment(environment, fileManagers)
	env := createEnvironment(environment, fileManagers)

	// Create components in the same order as JavaScript
	sourceMapOutput = createSourceMapOutput(env)
	sourceMapBuilder = createSourceMapBuilder(sourceMapOutput, env)
	parseTree = createParseTree(sourceMapBuilder)
	importManager = createImportManager(env)

	// Create render and parse functions
	render := createRender(env, parseTree, importManager)
	parse := createParse(env, parseTree, importManager)

	// Parse version - equivalent to: parseVersion(`v${version}`)
	v := parseVersion("v4.2.2")

	// Create the initial object
	initial := map[string]any{
		"version":              []int{v.Major, v.Minor, v.Patch},
		"data":                 createDataExports(),
		"tree":                 createTreeExports(),
		"Environment":          createEnvironment,
		"AbstractFileManager":  createAbstractFileManager,
		"AbstractPluginLoader": createAbstractPluginLoader,
		"environment":          env,
		"visitors":             createVisitors(),
		"Parser":               createParser,
		"functions":            createFunctions(env),
		"contexts":             createContexts(),
		"SourceMapOutput":      sourceMapOutput,
		"SourceMapBuilder":     sourceMapBuilder,
		"ParseTree":            parseTree,
		"ImportManager":        importManager,
		"render":               render,
		"parse":                parse,
		"LessError":            createLessError,
		"transformTree":        createTransformTree,
		"utils":                createUtils(),
		"PluginManager":        createPluginManager,
		"logger":               createLogger(),
	}

	// Create a public API
	api := make(map[string]any)

	// Copy all initial properties to api
	for key, value := range initial {
		api[key] = value
	}

	// Process tree constructors - equivalent to JavaScript's for...in loop over initial.tree
	if tree, ok := initial["tree"].(map[string]any); ok {
		for name, t := range tree {
			if isFunction(t) {
				// Create lowercase constructor function
				api[strings.ToLower(name)] = createConstructor(t)
			} else if isObject(t) {
				// Handle nested objects
				nestedObj := make(map[string]any)
				if tMap, ok := t.(map[string]any); ok {
					for innerName, innerT := range tMap {
						if isFunction(innerT) {
							nestedObj[strings.ToLower(innerName)] = createConstructor(innerT)
						}
					}
				}
				api[strings.ToLower(name)] = nestedObj
			}
		}
	}

	// Bind functions to API context - equivalent to JavaScript's .bind(api)
	if renderFunc, ok := api["render"].(func(string, ...any) any); ok {
		api["render"] = bindRenderToContext(renderFunc, api)
	}
	if parseFunc, ok := api["parse"].(func(string, ...any) any); ok {
		api["parse"] = bindParseToContext(parseFunc, api)
	}

	return api
}

// Helper functions

// parseVersion parses a version string like "v4.2.2" into major, minor, patch
func parseVersion(version string) VersionInfo {
	// Remove 'v' prefix if present
	version = strings.TrimPrefix(version, "v")
	
	parts := strings.Split(version, ".")
	major, _ := strconv.Atoi(parts[0])
	minor, _ := strconv.Atoi(parts[1])
	patch, _ := strconv.Atoi(parts[2])
	
	return VersionInfo{
		Major: major,
		Minor: minor,
		Patch: patch,
	}
}

// VersionInfo represents parsed version information
type VersionInfo struct {
	Major int
	Minor int
	Patch int
}

// isFunction checks if a value is a function (constructor)
func isFunction(value any) bool {
	// In Go, we'll identify functions by their type
	switch value.(type) {
	case func() any, func(...any) any:
		return true
	default:
		// Check if it's a type that can be constructed
		return fmt.Sprintf("%T", value) == "func() interface {}"
	}
}

// isObject checks if a value is an object/map
func isObject(value any) bool {
	_, ok := value.(map[string]any)
	return ok
}

// createConstructor creates a constructor function equivalent to JavaScript's ctor helper
func createConstructor(t any) func(...any) any {
	return func(args ...any) any {
		// This is equivalent to JavaScript's:
		// function() {
		//     const obj = Object.create(t.prototype);
		//     t.apply(obj, Array.prototype.slice.call(arguments, 0));
		//     return obj;
		// };
		
		// In Go, we need to call the constructor function directly
		switch constructor := t.(type) {
		case func() any:
			return constructor()
		case func(...any) any:
			return constructor(args...)
		default:
			// For other types, try to create them using reflection or factory patterns
			return createInstanceFromType(t, args...)
		}
	}
}

// createInstanceFromType creates an instance using type information
func createInstanceFromType(t any, args ...any) any {
	// This is a placeholder for the actual type creation logic
	// In a real implementation, this would use reflection or factory patterns
	// to create instances of tree node types
	return map[string]any{
		"type": fmt.Sprintf("%T", t),
		"args": args,
	}
}

// bindRenderToContext binds the render function to the API context
func bindRenderToContext(renderFunc func(string, ...any) any, context map[string]any) func(string, ...any) any {
	// Equivalent to JavaScript's initial.render = initial.render.bind(api);
	return func(input string, args ...any) any {
		return callRenderWithContext(renderFunc, context, input, args...)
	}
}

// bindParseToContext binds the parse function to the API context
func bindParseToContext(parseFunc func(string, ...any) any, context map[string]any) func(string, ...any) any {
	// Equivalent to JavaScript's initial.parse = initial.parse.bind(api);
	return func(input string, args ...any) any {
		// Create a bound context for the parse function
		return callParseWithContext(parseFunc, context, input, args...)
	}
}

// APIContext implements the ContextInterface for render function binding
type APIContext struct {
	context map[string]any
}

func (ac *APIContext) Parse(input string, options map[string]any, callback func(error, any, any, map[string]any)) {
	// This would delegate to the actual parse function with the bound context
	if parseFunc, ok := ac.context["parse"].(func(string, map[string]any, func(error, any, any, map[string]any))); ok {
		parseFunc(input, options, callback)
	}
}

func (ac *APIContext) GetOptions() map[string]any {
	// Return the context options or empty map
	if options, ok := ac.context["options"].(map[string]any); ok {
		return options
	}
	return make(map[string]any)
}

// callRenderWithContext calls the render function with the bound context
func callRenderWithContext(renderFunc func(string, ...any) any, context map[string]any, input string, args ...any) any {
	// This implements the context binding for render function
	return renderFunc(input, args...)
}

// callParseWithContext calls the parse function with the bound context
func callParseWithContext(parseFunc func(string, ...any) any, context map[string]any, input string, args ...any) any {
	// This implements the context binding for parse function
	return parseFunc(input, args...)
}

// Implementation functions for missing dependencies

func createEnvironment(environment map[string]any, fileManagers []any) any {
	// This should return the actual Environment instance
	return map[string]any{
		"environment":  environment,
		"fileManagers": fileManagers,
	}
}

func createSourceMapOutput(env any) any {
	// This should return the actual SourceMapOutput instance
	return map[string]any{"type": "SourceMapOutput"}
}

func createSourceMapBuilder(sourceMapOutput any, env any) any {
	// This should return the actual SourceMapBuilder instance
	return map[string]any{"type": "SourceMapBuilder"}
}

func createImportManager(env any) any {
	// This should return the actual ImportManager instance
	return map[string]any{"type": "ImportManager"}
}

func createParseTree(sourceMapBuilder any) any {
	// This should return the actual ParseTree constructor
	return map[string]any{"type": "ParseTree", "sourceMapBuilder": sourceMapBuilder}
}

func createRender(env any, parseTree any, importManager any) func(string, ...any) any {
	// This should return the actual Render function
	return func(input string, args ...any) any {
		return map[string]any{"type": "Render", "input": input}
	}
}

func createTransformTree() any {
	// This should return the actual transformTree function
	return func(root any, options map[string]any) any {
		return map[string]any{"type": "TransformedTree", "root": root}
	}
}

func createParse(env any, parseTree any, importManager any) func(string, ...any) any {
	// This should return the actual Parse function
	return func(input string, args ...any) any {
		return map[string]any{"type": "Parse", "input": input}
	}
}

func createDataExports() map[string]any {
	return map[string]any{
		"colors":          Colors,
		"unitConversions": createUnitConversions(),
	}
}

func createUnitConversions() map[string]any {
	return map[string]any{
		"length":   UnitConversionsLength,
		"duration": UnitConversionsDuration,
		"angle":    UnitConversionsAngle,
	}
}

func createTreeExports() map[string]any {
	// This should return all the tree node constructors
	// For now, return a mock structure that matches the JavaScript tree export
	return map[string]any{
		"TestNode": func(args ...any) any {
			return map[string]any{"type": "TestNode", "args": args}
		},
		"AnotherNode": func(args ...any) any {
			return map[string]any{"type": "AnotherNode", "args": args}
		},
		"NestedNodes": map[string]any{
			"InnerNode": func(args ...any) any {
				return map[string]any{"type": "InnerNode", "args": args}
			},
			"DeepNode": func(args ...any) any {
				return map[string]any{"type": "DeepNode", "args": args}
			},
		},
	}
}

func createAbstractFileManager() any {
	return map[string]any{"type": "AbstractFileManager"}
}

func createAbstractPluginLoader() any {
	return map[string]any{"type": "AbstractPluginLoader"}
}

func createVisitors() any {
	return map[string]any{"type": "Visitors"}
}

func createParser() any {
	return map[string]any{"type": "Parser"}
}

func createFunctions(env any) any {
	return map[string]any{"type": "Functions"}
}

func createContexts() any {
	return map[string]any{"type": "Contexts"}
}

func createLessError() any {
	return func(details any, imports any, filename any) any {
		return map[string]any{"type": "LessError", "details": details}
	}
}

func createLogger() any {
	return map[string]any{
		"info":  func(msg string) {},
		"warn":  func(msg string) {},
		"error": func(msg string) {},
	}
}

func createUtils() map[string]any {
	return map[string]any{
		"copyArray": func(arr []any) []any { return append([]any{}, arr...) },
		"clone":     func(obj any) any { return cloneAny(obj) },
		"defaults":  func(target, source map[string]any) map[string]any { return mergeDefaults(target, source) },
	}
}

func createPluginManager() any {
	return map[string]any{"type": "PluginManager"}
}

// Helper function to clone any value
func cloneAny(obj any) any {
	// Simple JSON-based cloning for maps and slices
	if obj == nil {
		return nil
	}
	
	switch v := obj.(type) {
	case map[string]any:
		clone := make(map[string]any)
		for k, val := range v {
			clone[k] = cloneAny(val)
		}
		return clone
	case []any:
		clone := make([]any, len(v))
		for i, val := range v {
			clone[i] = cloneAny(val)
		}
		return clone
	default:
		// For primitive types, return as-is
		return obj
	}
}

// Helper function to merge defaults
func mergeDefaults(target, source map[string]any) map[string]any {
	result := make(map[string]any)
	
	// Copy target first
	for k, v := range target {
		result[k] = v
	}
	
	// Add source values that don't exist in target
	for k, v := range source {
		if _, exists := result[k]; !exists {
			result[k] = v
		}
	}
	
	return result
}