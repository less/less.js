package less_go

import (
	"fmt"
	"strings"
)

// Registry represents a function registry that can store and retrieve functions
type Registry struct {
	data map[string]any
	base *Registry
}

// makeRegistry creates a new Registry with the specified base
func makeRegistry(base *Registry) *Registry {
	return &Registry{
		data: make(map[string]any),
		base: base,
	}
}

// Add adds a function to the registry with the given name
func (r *Registry) Add(name string, fn any) {
	// precautionary case conversion, as later querying of
	// the registry by function-caller uses lower case as well.
	name = strings.ToLower(name)

	// Check if the key already exists (equivalent to hasOwnProperty check)
	if _, exists := r.data[name]; exists {
		// TODO: Implement warning when function already exists
		_ = exists // Suppress unused variable warning
	}
	r.data[name] = fn
}

// AddMultiple adds multiple functions to the registry at once
func (r *Registry) AddMultiple(functions map[string]any) {
	for name, fn := range functions {
		r.Add(name, fn)
	}
}

// Get retrieves a function from the registry by name, falling back to base if not found locally
func (r *Registry) Get(name string) any {
	if fn, exists := r.data[name]; exists {
		return fn
	}
	if r.base != nil {
		return r.base.Get(name)
	}
	return nil
}

// GetLocalFunctions returns the local data map (equivalent to _data in JS)
func (r *Registry) GetLocalFunctions() map[string]any {
	return r.data
}

// Inherit creates a new registry with the current registry as the base
func (r *Registry) Inherit() *Registry {
	return makeRegistry(r)
}

// Create creates a new registry with the specified base
func (r *Registry) Create(base *Registry) *Registry {
	return makeRegistry(base)
}

// DefaultRegistry is the default registry instance (equivalent to the default export in JS)
var DefaultRegistry = makeRegistry(nil)

// SimpleFunctionDef wraps a simple Go function to implement FunctionDefinition
type SimpleFunctionDef struct {
	name string
	fn   func(any, any) any
}

func (s *SimpleFunctionDef) Call(args ...any) (any, error) {
	if len(args) != 2 {
		return nil, fmt.Errorf("function %s expects 2 arguments, got %d", s.name, len(args))
	}
	result := s.fn(args[0], args[1])
	return result, nil
}

func (s *SimpleFunctionDef) CallCtx(ctx *Context, args ...any) (any, error) {
	// For these simple functions, we don't need context
	return s.Call(args...)
}

func (s *SimpleFunctionDef) NeedsEvalArgs() bool {
	// Most list functions like 'each' need unevaluated args
	return s.name != "each"
}

// FlexibleFunctionDef wraps Go functions with variable argument counts
type FlexibleFunctionDef struct {
	name        string
	minArgs     int
	maxArgs     int
	variadic    bool
	fn          any
	needsEval   bool
}

func (f *FlexibleFunctionDef) Call(args ...any) (any, error) {
	if !f.variadic {
		if len(args) < f.minArgs || len(args) > f.maxArgs {
			return nil, fmt.Errorf("function %s expects %d-%d arguments, got %d", f.name, f.minArgs, f.maxArgs, len(args))
		}
	} else if len(args) < f.minArgs {
		return nil, fmt.Errorf("function %s expects at least %d arguments, got %d", f.name, f.minArgs, len(args))
	}
	
	switch fn := f.fn.(type) {
	case func(any) any:
		if len(args) != 1 {
			return nil, fmt.Errorf("function %s expects 1 argument, got %d", f.name, len(args))
		}
		return fn(args[0]), nil
	case func(any, any) any:
		if len(args) != 2 {
			return nil, fmt.Errorf("function %s expects 2 arguments, got %d", f.name, len(args))
		}
		return fn(args[0], args[1]), nil
	case func(any, any, any) any:
		if len(args) != 3 {
			return nil, fmt.Errorf("function %s expects 3 arguments, got %d", f.name, len(args))
		}
		return fn(args[0], args[1], args[2]), nil
	case func(...any) any:
		return fn(args...), nil
	default:
		return nil, fmt.Errorf("unknown function type for %s", f.name)
	}
}

func (f *FlexibleFunctionDef) CallCtx(ctx *Context, args ...any) (any, error) {
	// For these simple functions, we don't need context
	return f.Call(args...)
}

func (f *FlexibleFunctionDef) NeedsEvalArgs() bool {
	return f.needsEval
}

// RegistryFunctionAdapter adapts the Registry to work with function_caller.FunctionRegistry interface
type RegistryFunctionAdapter struct {
	registry *Registry
}

// NewRegistryFunctionAdapter creates a new adapter
func NewRegistryFunctionAdapter(registry *Registry) *RegistryFunctionAdapter {
	return &RegistryFunctionAdapter{registry: registry}
}

// Get implements the FunctionRegistry interface used by function_caller
func (r *RegistryFunctionAdapter) Get(name string) FunctionDefinition {
	fn := r.registry.Get(name)
	if fn == nil {
		return nil
	}
	if funcDef, ok := fn.(FunctionDefinition); ok {
		return funcDef
	}
	return nil
}
