package less_go

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

// GetName returns the property name
func (p *Property) GetName() string {
	return p.name
}

// Eval evaluates the property in the given context
func (p *Property) Eval(context any) (any, error) {
	if p.evaluating {
		// Match JavaScript error format
		return nil, fmt.Errorf("name: recursive property reference for %s (index: %d, filename: %s)",
			p.name, p.GetIndex(), p.FileInfo()["filename"])
	}

	p.evaluating = true
	defer func() { p.evaluating = false }()

	// Try to get frames from context - handle both EvalContext and map[string]any
	var frames []ParserFrame
	if evalCtx, ok := context.(interface{ GetFrames() []ParserFrame }); ok {
		frames = evalCtx.GetFrames()
	} else if ctx, ok := context.(map[string]any); ok {
		if framesAny, exists := ctx["frames"]; exists {
			if frameSlice, ok := framesAny.([]any); ok {
				frames = make([]ParserFrame, 0, len(frameSlice))
				for _, f := range frameSlice {
					if frame, ok := f.(ParserFrame); ok {
						frames = append(frames, frame)
					} else if frameMap, ok := f.(map[string]any); ok {
						// Handle test frames that are map[string]any with property function
						if propFunc, ok := frameMap["property"].(func(string) []any); ok {
							// Create adapter frame
							frames = append(frames, &mapFrame{
								propertyFunc: propFunc,
							})
						}
					}
				}
			}
		}
	}

	// Find property in frames using the find method
	property := p.find(frames, func(frame ParserFrame) any {
		vArr := frame.Property(p.name)
		if vArr == nil || len(vArr) == 0 {
			return nil
		}

		// Process declarations - create new Declaration objects from existing ones
		for i, v := range vArr {
			if decl, ok := v.(*Declaration); ok {
				// Already a Declaration, keep it
				vArr[i] = decl
			} else if declMap, ok := v.(map[string]any); ok {
				// Convert from map to Declaration
				merge, _ := declMap["merge"].(bool)
				index, _ := declMap["index"].(int)
				currentFileInfo, _ := declMap["currentFileInfo"].(map[string]any)
				inline, _ := declMap["inline"].(bool)
				
				newDecl, _ := NewDeclaration(
					declMap["name"],
					declMap["value"],
					declMap["important"],
					merge,
					index,
					currentFileInfo,
					inline,
					declMap["variable"],
				)
				vArr[i] = newDecl
			}
		}

		// TODO: mergeRules implementation
		// This would need access to context.pluginManager.less.visitors.ToCSSVisitor.prototype._mergeRules
		// For now, skip merging

		// Get last declaration
		lastDecl := vArr[len(vArr)-1].(*Declaration)
		if lastDecl.important != "" {
			// Handle important scope if available in context
			if ctx, ok := context.(map[string]any); ok {
				if importantScope, ok := ctx["importantScope"].([]any); ok && len(importantScope) > 0 {
					if lastScope, ok := importantScope[len(importantScope)-1].(map[string]any); ok {
						lastScope["important"] = lastDecl.important
					}
				}
			}
		}

		// Evaluate and return the value
		result, err := lastDecl.Value.Eval(context)
		if err != nil {
			return nil
		}
		return result
	})

	if property != nil {
		p.evaluating = false
		return property, nil
	}

	// Property not found - match JavaScript error format
	return nil, fmt.Errorf("name: property '%s' is undefined (index: %d, filename: %s)",
		p.name, p.GetIndex(), p.FileInfo()["filename"])
}

// find searches through frames for the first element that satisfies the predicate
func (p *Property) find(frames []ParserFrame, predicate func(ParserFrame) any) any {
	for _, frame := range frames {
		if result := predicate(frame); result != nil {
			return result
		}
	}
	return nil
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

// mapFrame adapter to implement ParserFrame for test frames that are map[string]any
type mapFrame struct {
	propertyFunc func(string) []any
}

func (m *mapFrame) Variable(name string) map[string]any {
	// Property frames don't have variables
	return nil
}

func (m *mapFrame) Property(name string) []any {
	if m.propertyFunc != nil {
		return m.propertyFunc(name)
	}
	return nil
} 