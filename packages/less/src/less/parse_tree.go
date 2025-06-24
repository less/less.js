package less

import (
	"fmt"
)

// TransformTree transforms the parse tree with the given options
// TODO: This is a stub implementation - needs to be replaced with full port of transform-tree.js
func TransformTree(root any, options *ToCSSOptions) (any, error) {
	// For now, return the root unchanged
	// The actual implementation should handle:
	// - Variable evaluation with contexts.Eval
	// - Visitor pattern execution (JoinSelectorVisitor, MarkVisibleSelectorsVisitor, ExtendVisitor, ToCSSVisitor)
	// - Plugin manager integration
	return root, nil
}

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
}

// ToCSS converts the parse tree to CSS
func (pt *ParseTree) ToCSS(options *ToCSSOptions) (*ToCSSResult, error) {
	var evaldRoot any
	result := &ToCSSResult{}
	var sourceMapBuilder any

	// Transform the tree
	transformedRoot, err := TransformTree(pt.Root, options)
	if err != nil {
		return nil, NewLessError(ErrorDetails{
			Message: err.Error(),
		}, pt.Imports.contents, pt.Imports.rootFilename)
	}
	evaldRoot = transformedRoot

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
				generatedCSS, err := builder.ToCSS(evaldRoot, toCSSOptions, pt.Imports)
				if err != nil {
					return nil, NewLessError(ErrorDetails{
						Message: err.Error(),
					}, pt.Imports.contents, pt.Imports.rootFilename)
				}
				css = generatedCSS
			}
		}
	} else {
		// Generate CSS without source map
		if cssGenerator, ok := evaldRoot.(interface {
			ToCSS(map[string]any) (string, error)
		}); ok {
			generatedCSS, err := cssGenerator.ToCSS(toCSSOptions)
			if err != nil {
				return nil, NewLessError(ErrorDetails{
					Message: err.Error(),
				}, pt.Imports.contents, pt.Imports.rootFilename)
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
	if pt.Imports != nil && pt.Imports.files != nil {
		for filename := range pt.Imports.files {
			if filename != pt.Imports.rootFilename {
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