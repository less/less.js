package less_go

import (
	"fmt"
	"os"
	"runtime"
	"strings"
)


// ParseTreeFactory represents the factory function type that creates ParseTree classes
type ParseTreeFactory func(sourceMapBuilder any) *ParseTreeClass

// ParseTreeClass represents the ParseTree class constructor
type ParseTreeClass struct {
	SourceMapBuilder any
}

// NewParseTree creates a new ParseTree instance
func (ptc *ParseTreeClass) NewParseTree(root any, imports *ImportManager) *ParseTree {
	return &ParseTree{
		Root:    root,
		Imports: imports,
		sourceMapBuilder: ptc.SourceMapBuilder,
	}
}

// ParseTree represents a Less parse tree that can be converted to CSS
type ParseTree struct {
	Root    any
	Imports *ImportManager
	sourceMapBuilder any
}

// ToCSSResult represents the result of converting a parse tree to CSS
type ToCSSResult struct {
	CSS     string   `json:"css"`
	Map     string   `json:"map,omitempty"`
	Imports []string `json:"imports"`
}

// ToCSSOptions represents options for CSS conversion
type ToCSSOptions struct {
	Compress         bool
	DumpLineNumbers  any
	StrictUnits      bool
	NumPrecision     int
	SourceMap        any
	PluginManager    any
	Functions        any
	ProcessImports   bool
	ImportManager    any
}

// ToCSS converts the parse tree to CSS
func (pt *ParseTree) ToCSS(options *ToCSSOptions) (*ToCSSResult, error) {
	var evaldRoot any
	result := &ToCSSResult{}
	var sourceMapBuilder any

	// Transform the tree using TransformTree
	// Convert ToCSSOptions to map[string]any like the original JavaScript
	var optionsMap map[string]any
	if options != nil {
		optionsMap = map[string]any{
			"compress":         options.Compress,
			"dumpLineNumbers":  options.DumpLineNumbers,
			"strictUnits":      options.StrictUnits,
			"numPrecision":     options.NumPrecision,
			"sourceMap":        options.SourceMap,
			"pluginManager":    options.PluginManager,
			"functions":        options.Functions,
			"processImports":   options.ProcessImports,
			"importManager":    options.ImportManager,
		}
	} else {
		optionsMap = make(map[string]any)
	}

	// Use defer to catch panics from transform tree and convert to LessError
	defer func() {
		if r := recover(); r != nil {
			// Get stack trace for debugging
			buf := make([]byte, 4096)
			n := runtime.Stack(buf, false)
			stackTrace := string(buf[:n])

			var errMsg string
			if err, ok := r.(error); ok {
				errMsg = err.Error()
			} else {
				errMsg = fmt.Sprintf("transform tree failed: %v", r)
			}

			// Log stack trace for index out of range errors
			if strings.Contains(errMsg, "index out of range") {
				fmt.Fprintf(os.Stderr, "\n=== DEBUG: ParseTree.ToCSS panic ===\nError: %s\nStack trace:\n%s\n===\n", errMsg, stackTrace)
			}

			panic(NewLessError(ErrorDetails{
				Message: errMsg,
			}, pt.Imports.Contents(), pt.Imports.RootFilename()))
		}
	}()

	evaldRoot = TransformTree(pt.Root, optionsMap)

	// Handle CSS generation
	compress := false
	if options != nil && options.Compress {
		compress = true
		DefaultLogger.Warn("The compress option has been deprecated. " +
			"We recommend you use a dedicated css minifier, for instance see less-plugin-clean-css.")
	}

	strictUnits := false
	if options != nil {
		strictUnits = options.StrictUnits
	}

	var dumpLineNumbers any
	if options != nil {
		dumpLineNumbers = options.DumpLineNumbers
	}

	toCSSOptions := map[string]any{
		"compress":         compress,
		"dumpLineNumbers":  dumpLineNumbers,
		"strictUnits":      strictUnits,
		"numPrecision":     8,
	}

	// Handle source map generation
	var css string
	if options != nil && options.SourceMap != nil {
		// Create source map builder using the factory function
		if pt.sourceMapBuilder != nil {
			if builderFunc, ok := pt.sourceMapBuilder.(func(any) any); ok {
				sourceMapBuilder = builderFunc(options.SourceMap)
			}
			
			// Call toCSS on source map builder
			if builder, ok := sourceMapBuilder.(interface {
				ToCSS(any, map[string]any, *ImportManager) (string, error)
			}); ok {
				// Handle case where ToCSSVisitor returns multiple rulesets as array for source map generation
				if rulesetArray, ok := evaldRoot.([]any); ok {
					// Multiple rulesets - generate CSS for each separately with source map
					var cssBuilder strings.Builder
					for i, ruleset := range rulesetArray {
						generatedCSS, err := builder.ToCSS(ruleset, toCSSOptions, pt.Imports)
						if err != nil {
							return nil, NewLessError(ErrorDetails{
								Message: err.Error(),
							}, pt.Imports.Contents(), pt.Imports.RootFilename())
						}
						cssBuilder.WriteString(generatedCSS)
						// Add separator between rulesets (except for the last one)
						if i < len(rulesetArray)-1 && !compress {
							cssBuilder.WriteString("\n")
						}
					}
					css = cssBuilder.String()
				} else {
					// Single ruleset
					generatedCSS, err := builder.ToCSS(evaldRoot, toCSSOptions, pt.Imports)
					if err != nil {
						return nil, NewLessError(ErrorDetails{
							Message: err.Error(),
						}, pt.Imports.Contents(), pt.Imports.RootFilename())
					}
					css = generatedCSS
				}
			}
		}
	} else {
		// Generate CSS without source map
		// Handle case where ToCSSVisitor returns multiple rulesets as array
		if rulesetArray, ok := evaldRoot.([]any); ok {
			// Multiple rulesets returned by ToCSSVisitor - generate CSS for each separately
			var cssBuilder strings.Builder
			for i, ruleset := range rulesetArray {
				if cssGenerator, ok := ruleset.(interface {
					ToCSS(map[string]any) (string, error)
				}); ok {
					// Create a copy of options to ensure each ruleset is treated as top-level
					rulesetOptions := make(map[string]any)
					for k, v := range toCSSOptions {
						rulesetOptions[k] = v
					}
					// Mark this as a top-level ruleset to prevent extra space before first selector
					rulesetOptions["topLevel"] = true
					generatedCSS, err := cssGenerator.ToCSS(rulesetOptions)
					if err != nil {
						return nil, NewLessError(ErrorDetails{
							Message: err.Error(),
						}, pt.Imports.Contents(), pt.Imports.RootFilename())
					}
					cssBuilder.WriteString(generatedCSS)
					// Add separator between rulesets (except for the last one)
					if i < len(rulesetArray)-1 && !compress {
						cssBuilder.WriteString("\n")
					}
				}
			}
			css = cssBuilder.String()
		} else if cssGenerator, ok := evaldRoot.(interface {
			ToCSS(map[string]any) (string, error)
		}); ok {
			// Single ruleset
			generatedCSS, err := cssGenerator.ToCSS(toCSSOptions)
			if err != nil {
				return nil, NewLessError(ErrorDetails{
					Message: err.Error(),
				}, pt.Imports.Contents(), pt.Imports.RootFilename())
			}
			css = generatedCSS
		}
	}

	result.CSS = css

	// Apply post-processors if available
	if options != nil && options.PluginManager != nil {
		if pluginMgr, ok := options.PluginManager.(interface {
			GetPostProcessors() []any
		}); ok {
			postProcessors := pluginMgr.GetPostProcessors()
			for _, processor := range postProcessors {
				if proc, ok := processor.(interface {
					Process(string, map[string]any) (string, error)
				}); ok {
					processOptions := map[string]any{
						"sourceMap": sourceMapBuilder,
						"options":   options,
						"imports":   pt.Imports,
					}
					processedCSS, err := proc.Process(result.CSS, processOptions)
					if err != nil {
						return nil, fmt.Errorf("post-processor failed: %w", err)
					}
					result.CSS = processedCSS
				}
			}
		}
	}

	// Get external source map if enabled
	if options != nil && options.SourceMap != nil && sourceMapBuilder != nil {
		if builder, ok := sourceMapBuilder.(interface {
			GetExternalSourceMap() string
		}); ok {
			result.Map = builder.GetExternalSourceMap()
		}
	}

	// Collect imports (excluding root filename)
	result.Imports = []string{}
	if pt.Imports != nil && pt.Imports.Files() != nil {
		for filename := range pt.Imports.Files() {
			if filename != pt.Imports.RootFilename() {
				result.Imports = append(result.Imports, filename)
			}
		}
	}

	return result, nil
}

// NewParseTreeFactory creates a factory function for ParseTree
func NewParseTreeFactory(sourceMapBuilder any) ParseTreeFactory {
	return func(builder any) *ParseTreeClass {
		return &ParseTreeClass{
			SourceMapBuilder: builder,
		}
	}
}

// DefaultParseTreeFactory creates a default ParseTree factory
func DefaultParseTreeFactory(sourceMapBuilder any) *ParseTreeClass {
	return &ParseTreeClass{
		SourceMapBuilder: sourceMapBuilder,
	}
}

