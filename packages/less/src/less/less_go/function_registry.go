package less_go

import (
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
