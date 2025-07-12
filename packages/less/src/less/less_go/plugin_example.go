package less_go

import (
	"fmt"
	"strings"
)

// ExamplePlugin demonstrates a Go-based Less plugin
type ExamplePlugin struct {
	name       string
	minVersion string
	functions  map[string]func(...any) any
}

// NewExamplePlugin creates a new example plugin
func NewExamplePlugin() *ExamplePlugin {
	return &ExamplePlugin{
		name:       "example-plugin",
		minVersion: "4.0.0",
		functions:  make(map[string]func(...any) any),
	}
}

// Install installs the plugin functions into the function registry
func (p *ExamplePlugin) Install(functions map[string]any, tree map[string]any) error {
	// Register custom functions
	p.functions["add-prefix"] = p.addPrefix
	p.functions["reverse-string"] = p.reverseString
	p.functions["go-version"] = p.goVersion
	
	// Add functions to the provided functions map
	for name, fn := range p.functions {
		functions[name] = fn
	}
	
	return nil
}

// Use returns the plugin's exports
func (p *ExamplePlugin) Use() (map[string]any, error) {
	return map[string]any{
		"name":      p.name,
		"version":   "1.0.0",
		"functions": p.functions,
	}, nil
}

// EvalPlugin returns the plugin evaluator
func (p *ExamplePlugin) EvalPlugin() interface{} {
	return &ExamplePluginEvaluator{plugin: p}
}

// GetMinVersion returns the minimum Less version required
func (p *ExamplePlugin) GetMinVersion() string {
	return p.minVersion
}

// Plugin functions

func (p *ExamplePlugin) addPrefix(args ...any) any {
	if len(args) < 2 {
		return NewAnonymous("", 0, nil, false, false, nil)
	}
	
	prefix := fmt.Sprintf("%v", args[0])
	value := fmt.Sprintf("%v", args[1])
	
	// Return as Anonymous node to integrate with Less AST
	return NewAnonymous(prefix+value, 0, nil, false, false, nil)
}

func (p *ExamplePlugin) reverseString(args ...any) any {
	if len(args) < 1 {
		return NewAnonymous("", 0, nil, false, false, nil)
	}
	
	str := fmt.Sprintf("%v", args[0])
	runes := []rune(str)
	for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
		runes[i], runes[j] = runes[j], runes[i]
	}
	
	return NewAnonymous(string(runes), 0, nil, false, false, nil)
}

func (p *ExamplePlugin) goVersion(args ...any) any {
	return NewAnonymous("go-less-plugin-v1.0", 0, nil, false, false, nil)
}

// ExamplePluginEvaluator handles plugin evaluation
type ExamplePluginEvaluator struct {
	plugin *ExamplePlugin
}

// Eval evaluates a node in the plugin context
func (e *ExamplePluginEvaluator) Eval(node any) (any, error) {
	// This could be used for custom node evaluation
	// For now, just return the node as-is
	return node, nil
}

// ExamplePreProcessor demonstrates a pre-processor plugin
type ExamplePreProcessor struct{}

// Process processes the input before parsing
func (p *ExamplePreProcessor) Process(input string, extra map[string]any) string {
	// Example: Add a timestamp comment at the beginning
	// In real use, this could do more complex transformations
	return fmt.Sprintf("/* Processed by Go plugin at build time */\n%s", input)
}

// ExamplePostProcessor demonstrates a post-processor plugin  
type ExamplePostProcessor struct{}

// Process processes the CSS output after generation
func (p *ExamplePostProcessor) Process(css string, extra map[string]any) string {
	// Example: Minify or add vendor prefixes
	// For now, just trim whitespace
	return strings.TrimSpace(css)
}