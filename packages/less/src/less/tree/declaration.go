package tree

import (
	"fmt"

	"github.com/toakleaf/less.go/packages/less/src/less"
)

// Declaration represents a declaration node in the Less AST
type Declaration struct {
	*Node
	name      any
	value     *Value
	important string
	merge     bool
	inline    bool
	variable  bool
}

// NewDeclaration creates a new Declaration instance
func NewDeclaration(name any, value any, important any, merge bool, index int, fileInfo map[string]any, inline bool, variable any) (*Declaration, error) {
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

	// Handle value
	if val, ok := value.(*Value); ok {
		d.value = val
	} else {
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
		d.value = newValue
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
	d.SetParent(d.value, d.Node)

	return d, nil
}

// GetType returns the type of the node
func (d *Declaration) GetType() string {
	return "Declaration"
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

	for _, n := range name {
		switch v := n.(type) {
		case *Keyword:
			output.Add(v.value, nil, nil)
		case *Anonymous:
			output.Add(v.Value, nil, nil)
		case Evaluator:
			evaluated, err := v.Eval(context)
			if err == nil && evaluated != nil {
				if generator, ok := evaluated.(CSSGenerator); ok {
					generator.GenCSS(context, output)
				} else {
					output.Add(evaluated, nil, nil)
				}
			}
		default:
			output.Add(v, nil, nil)
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
				if mathVal == less.Math.Always {
					mathBypass = true
					prevMath = mathVal
					ctx["math"] = less.Math.ParensDivision
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
	evaldValue, err = d.value.Eval(context)
	if err != nil {
		return nil, err
	}

	// Check for detached ruleset
	if !d.variable {
		if val, ok := evaldValue.(map[string]any); ok {
			if val["type"] == "DetachedRuleset" {
				return nil, &Error{
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

	// Add name
	if compress {
		output.Add(d.name, d.FileInfo(), d.GetIndex())
		output.Add(":", d.FileInfo(), d.GetIndex())
	} else {
		output.Add(d.name, d.FileInfo(), d.GetIndex())
		output.Add(": ", d.FileInfo(), d.GetIndex())
	}

	// Add value
	d.value.GenCSS(context, output)

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

// MakeImportant creates a new Declaration with important flag
func (d *Declaration) MakeImportant() *Declaration {
	newDecl, _ := NewDeclaration(d.name, d.value, "!important", d.merge, d.GetIndex(), d.FileInfo(), d.inline, d.variable)
	return newDecl
} 