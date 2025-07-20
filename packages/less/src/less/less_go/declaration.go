package less_go

import (
	"fmt"
	"strings"
)

// Declaration represents a declaration node in the Less AST
type Declaration struct {
	*Node
	name      any
	Value     *Value
	important string
	merge     any // Can be bool or string ('+' for comma merge)
	inline    bool
	variable  bool
}

// NewDeclaration creates a new Declaration instance
func NewDeclaration(name any, value any, important any, merge any, index int, fileInfo map[string]any, inline bool, variable any) (*Declaration, error) {
	d := &Declaration{
		Node:      NewNode(),
		name:      name,
		important: "",
		merge:     merge,
		inline:    inline || false,
		variable:  false,
	}

	// Set index and fileInfo
	d.Index = index
	d.SetFileInfo(fileInfo)

	// Handle important flag
	if important != nil {
		if str, ok := important.(string); ok {
			d.important = " " + str
		}
	}

	// Handle value - match JavaScript logic: (value instanceof Node) ? value : new Value([value ? new Anonymous(value) : null])
	if val, ok := value.(*Value); ok {
		d.Value = val
	} else {
		// Check if value is already a Node type (matches JavaScript: value instanceof Node)
		isNode := false
		switch value.(type) {
		case *Node, *Color, *Dimension, *Quoted, *Anonymous, *Keyword, *Expression, *Call, *Ruleset, *Declaration:
			isNode = true
		case interface{ GetType() string }:
			// Has GetType method, likely a node
			isNode = true
		}
		
		if isNode {
			// Value is already a Node, wrap it in Value([node])
			newValue, err := NewValue([]any{value})
			if err != nil {
				return nil, err
			}
			d.Value = newValue
		} else {
			// Value is not a Node, wrap in Value([Anonymous(value)])
			var anonymousValue any
			if value != nil {
				anonymousValue = NewAnonymous(value, 0, nil, false, false, nil)
			} else {
				anonymousValue = nil
			}
			newValue, err := NewValue([]any{anonymousValue})
			if err != nil {
				return nil, err
			}
			d.Value = newValue
		}
	}

	// Handle variable flag
	if variable != nil {
		if v, ok := variable.(bool); ok {
			d.variable = v
		}
	} else {
		// Check if name starts with '@'
		if str, ok := name.(string); ok {
			d.variable = len(str) > 0 && str[0] == '@'
		}
	}

	// Set allowRoot through the Node interface
	if n, ok := interface{}(d.Node).(interface{ SetAllowRoot(bool) }); ok {
		n.SetAllowRoot(true)
	}
	d.SetParent(d.Value, d.Node)

	return d, nil
}

// GetType returns the type of the node
func (d *Declaration) GetType() string {
	return "Declaration"
}

// GetTypeIndex returns the type index for visitor pattern
func (d *Declaration) GetTypeIndex() int {
	return 2 // Non-zero value to enable visitor pattern (different from Ruleset's 1)
}

// GetVariable returns whether this is a variable declaration
func (d *Declaration) GetVariable() bool {
	return d.variable
}

// GetName returns the declaration name
func (d *Declaration) GetName() string {
	if nameStr, ok := d.name.(string); ok {
		return nameStr
	}
	return fmt.Sprintf("%v", d.name)
}

// GetMerge returns the merge flag
func (d *Declaration) GetMerge() any {
	return d.merge
}

// MergeType returns the type of merge (true for space, "+" for comma)
func (d *Declaration) MergeType() string {
	switch m := d.merge.(type) {
	case string:
		return m
	case bool:
		if m {
			return "true" // space separated
		}
	}
	return ""
}

// GetImportant returns whether this declaration is important
func (d *Declaration) GetImportant() bool {
	return d.important != ""
}

// evalName evaluates the name of the declaration
func evalName(context any, name []any) string {
	value := ""
	output := &CSSOutput{
		Add: func(chunk any, fileInfo any, index any) {
			if chunk != nil {
				switch v := chunk.(type) {
				case string:
					value += v
				case *Keyword:
					value += v.value
				default:
					value += fmt.Sprintf("%v", v)
				}
			}
		},
	}

	// JavaScript always evaluates each name element first
	for _, n := range name {
		// Always evaluate first, matching JavaScript behavior
		var evaluated any = n
		if evaluator, ok := n.(Evaluator); ok {
			if evald, err := evaluator.Eval(context); err == nil && evald != nil {
				evaluated = evald
			}
		}
		
		// Then generate CSS
		if generator, ok := evaluated.(CSSGenerator); ok {
			generator.GenCSS(context, output)
		} else {
			// Handle simple types
			switch v := evaluated.(type) {
			case *Keyword:
				output.Add(v.value, nil, nil)
			case *Anonymous:
				output.Add(v.Value, nil, nil)
			default:
				output.Add(v, nil, nil)
			}
		}
	}

	return value
}

// Eval evaluates the declaration
func (d *Declaration) Eval(context any) (any, error) {
	if context == nil {
		return nil, fmt.Errorf("context is required for Declaration.Eval")
	}

	mathBypass := false
	var prevMath any
	var name any = d.name
	variable := d.variable

	// Handle name evaluation
	if str, ok := name.(string); !ok {
		nameArr, ok := name.([]any)
		if ok && len(nameArr) == 1 {
			if keyword, ok := nameArr[0].(*Keyword); ok {
				name = keyword.value
			} else {
				name = evalName(context, nameArr)
			}
		} else if ok {
			name = evalName(context, nameArr)
		}
		variable = false
	} else {
		name = str
	}

	// Handle font and math context
	if name == "font" {
		if ctx, ok := context.(map[string]any); ok {
			if mathVal, ok := ctx["math"]; ok {
				if mathVal == Math.Always {
					mathBypass = true
					prevMath = mathVal
					ctx["math"] = Math.ParensDivision
				}
			}
		}
	}

	// Create important scope
	if ctx, ok := context.(map[string]any); ok {
		if importantScope, ok := ctx["importantScope"].([]any); ok {
			ctx["importantScope"] = append(importantScope, map[string]any{})
		}
	}

	// Evaluate value
	var evaldValue any
	var err error
	evaldValue, err = d.Value.Eval(context)
	if err != nil {
		return nil, err
	}

	// Check for detached ruleset
	if !d.variable {
		if val, ok := evaldValue.(map[string]any); ok {
			if val["type"] == "DetachedRuleset" {
				return nil, &ValueError{
					Message: "Rulesets cannot be evaluated on a property",
				}
			}
		}
	}

	// Handle important flag
	important := d.important
	if ctx, ok := context.(map[string]any); ok {
		if importantScope, ok := ctx["importantScope"].([]any); ok && len(importantScope) > 0 {
			lastScope := importantScope[len(importantScope)-1]
			if scope, ok := lastScope.(map[string]any); ok {
				if imp, ok := scope["important"].(string); ok {
					important = imp
				}
			}
			// Pop the scope
			ctx["importantScope"] = importantScope[:len(importantScope)-1]
		}
	}

	// Restore math context
	if mathBypass {
		if ctx, ok := context.(map[string]any); ok {
			ctx["math"] = prevMath
		}
	}

	newDecl, err := NewDeclaration(name, evaldValue, important, d.merge, d.Index, d.FileInfo(), d.inline, variable)
	if err != nil {
		return nil, err
	}

	return newDecl, nil
}

// GenCSS generates CSS representation
func (d *Declaration) GenCSS(context any, output *CSSOutput) {
	compress := false
	if ctx, ok := context.(map[string]any); ok {
		if c, ok := ctx["compress"].(bool); ok {
			compress = c
		}
	}

	// Format name as string for CSS output
	nameStr := ""
	switch n := d.name.(type) {
	case string:
		nameStr = n
	case *Keyword:
		nameStr = n.value
	case *Anonymous:
		nameStr = fmt.Sprintf("%v", n.Value)
	case []any:
		nameStr = evalName(context, n)
	default:
		nameStr = fmt.Sprintf("%v", n)
	}

	// Add name
	if compress {
		output.Add(nameStr, d.FileInfo(), d.GetIndex())
		output.Add(":", d.FileInfo(), d.GetIndex())
	} else {
		output.Add(nameStr, d.FileInfo(), d.GetIndex())
		output.Add(": ", d.FileInfo(), d.GetIndex())
	}

	// Add value with error handling to match JavaScript
	// Use defer/recover to catch panics and convert to proper errors
	defer func() {
		if r := recover(); r != nil {
			// Convert panic to error with proper index and filename information
			var errMsg string
			switch e := r.(type) {
			case error:
				errMsg = e.Error()
			default:
				errMsg = fmt.Sprintf("%v", e)
			}
			
			// Create an error with index and filename similar to JavaScript
			filename := ""
			if d.FileInfo() != nil {
				if f, ok := d.FileInfo()["filename"].(string); ok {
					filename = f
				}
			}
			
			// Re-panic with enhanced error message
			panic(fmt.Errorf("%s (index: %d, filename: %s)", errMsg, d.GetIndex(), filename))
		}
	}()
	
	d.Value.GenCSS(context, output)

	// Add important and semicolon
	if d.important != "" {
		output.Add(d.important, d.FileInfo(), d.GetIndex())
	}

	if !d.inline && !(compress && isLastRule(context)) {
		output.Add(";", d.FileInfo(), d.GetIndex())
	} else {
		output.Add("", d.FileInfo(), d.GetIndex())
	}
}


// isLastRule checks if this is the last rule in the context
func isLastRule(context any) bool {
	if ctx, ok := context.(map[string]any); ok {
		if lastRule, ok := ctx["lastRule"].(bool); ok {
			return lastRule
		}
	}
	return false
}

// IsVisible returns whether this declaration should be visible in CSS output
// Following JavaScript implementation: declarations are visible by default
func (d *Declaration) IsVisible() bool {
	// In JavaScript, nodeVisible is undefined for declarations, meaning they inherit
	// parent visibility. For practical purposes, declarations are visible unless
	// explicitly hidden, so we return true by default.
	return true
}

// MakeImportant creates a new Declaration with important flag
func (d *Declaration) MakeImportant() *Declaration {
	newDecl, _ := NewDeclaration(d.name, d.Value, "!important", d.merge, d.GetIndex(), d.FileInfo(), d.inline, d.variable)
	return newDecl
}

// ToCSS generates CSS string representation
func (d *Declaration) ToCSS(context any) string {
	var strs []string
	output := &CSSOutput{
		Add: func(chunk any, fileInfo any, index any) {
			strs = append(strs, fmt.Sprintf("%v", chunk))
		},
		IsEmpty: func() bool {
			return len(strs) == 0
		},
	}
	d.GenCSS(context, output)
	return strings.Join(strs, "")
} 