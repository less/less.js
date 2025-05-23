package go_parser

import (
	"fmt"
)

// Property represents a property node in the Less AST
type Property struct {
	*Node
	name       string
	evaluating bool
}

// NewProperty creates a new Property instance
func NewProperty(name string, index int, fileInfo map[string]any) *Property {
	p := &Property{
		Node: NewNode(),
		name: name,
	}
	p.Index = index
	p.SetFileInfo(fileInfo)
	return p
}

// GetType returns the type of the node
func (p *Property) GetType() string {
	return "Property"
}

// Eval evaluates the property in the given context
func (p *Property) Eval(context any) (any, error) {
	if p.evaluating {
		return nil, &Error{
			Message: fmt.Sprintf("Recursive property reference for %s", p.name),
		}
	}

	p.evaluating = true
	defer func() { p.evaluating = false }()

	// Get frames from context
	ctx, ok := context.(map[string]any)
	if !ok {
		return nil, fmt.Errorf("invalid context type")
	}

	frames, ok := ctx["frames"].([]any)
	if !ok {
		return nil, fmt.Errorf("frames not found in context")
	}

	// Find property in frames
	for _, frame := range frames {
		f, ok := frame.(map[string]any)
		if !ok {
			continue
		}

		propertyFunc, ok := f["property"].(func(string) []any)
		if !ok {
			continue
		}

		vArr := propertyFunc(p.name)
		if vArr == nil {
			continue
		}

		// Process declarations
		for i, v := range vArr {
			decl, ok := v.(map[string]any)
			if !ok {
				continue
			}

			// Create new declaration
			newDecl, err := NewDeclaration(
				decl["name"],
				decl["value"],
				decl["important"],
				decl["merge"].(bool),
				decl["index"].(int),
				decl["currentFileInfo"].(map[string]any),
				decl["inline"].(bool),
				decl["variable"],
			)
			if err != nil {
				return nil, err
			}

			vArr[i] = newDecl
		}

		// Merge rules if needed
		if mergeRules, ok := ctx["mergeRules"].(func([]any)); ok {
			mergeRules(vArr)
		}

		// Get last declaration
		lastDecl := vArr[len(vArr)-1].(*Declaration)
		if lastDecl.important != "" {
			if importantScope, ok := ctx["importantScope"].([]any); ok && len(importantScope) > 0 {
				lastScope := importantScope[len(importantScope)-1].(map[string]any)
				lastScope["important"] = lastDecl.important
			}
		}

		// Evaluate value
		return lastDecl.value.Eval(context)
	}

	return nil, &Error{
		Message: fmt.Sprintf("Property '%s' is undefined", p.name),
	}
}

// Find searches through an array for the first element that satisfies the predicate
func (p *Property) Find(arr []any, predicate func(any) any) any {
	for _, item := range arr {
		if result := predicate(item); result != nil {
			return result
		}
	}
	return nil
} 