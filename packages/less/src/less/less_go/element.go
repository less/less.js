package less_go

import (
	"fmt"
	"strings"
)

// Element represents an element node in the Less AST
type Element struct {
	*Node
	Combinator  *Combinator
	Value       any
	IsVariable  bool
}

// NewElement creates a new Element instance
func NewElement(combinator any, value any, isVariable bool, index int, currentFileInfo map[string]any, visibilityInfo map[string]any) *Element {
	var comb *Combinator
	switch c := combinator.(type) {
	case *Combinator:
		if c == nil {
			comb = NewCombinator("")
		} else {
			comb = c
		}
	case string:
		comb = NewCombinator(c)
	default:
		// Handle nil or unexpected types gracefully
		comb = NewCombinator("")
	}

	var val any
	switch v := value.(type) {
	case string:
		val = strings.TrimSpace(v)
	case nil:
		val = ""
	case byte:
		// Convert byte to string character (e.g., byte(38) -> "&")
		// Note: byte is an alias for uint8 in Go
		val = string(v)
	case bool:
		// JavaScript converts false to ""
		if !v {
			val = ""
		} else {
			val = v
		}
	case int:
		// JavaScript converts 0 to ""
		if v == 0 {
			val = ""
		} else {
			val = v
		}
	case int64:
		if v == 0 {
			val = ""
		} else {
			val = v
		}
	case float32:
		if v == 0 {
			val = ""
		} else {
			val = v
		}
	case float64:
		if v == 0 {
			val = ""
		} else {
			val = v
		}
	default:
		// For objects and other types, preserve as is
		val = v
	}

	e := &Element{
		Node:       NewNode(),
		Combinator: comb,
		Value:      val,
		IsVariable: isVariable,
	}

	e.Index = index
	if currentFileInfo != nil {
		e.SetFileInfo(currentFileInfo)
	} else {
		e.SetFileInfo(make(map[string]any))
	}
	e.CopyVisibilityInfo(visibilityInfo)
	e.SetParent(comb, e.Node)

	return e
}

// Type returns the type of the node
func (e *Element) Type() string {
	return "Element"
}

// GetType returns the type of the node for visitor pattern consistency
func (e *Element) GetType() string {
	return "Element"
}

// Accept visits the node with a visitor
func (e *Element) Accept(visitor any) {
	if v, ok := visitor.(interface{ Visit(any) any }); ok {
		// Visit the combinator and handle its return value
		if e.Combinator != nil {
			if visitedComb := v.Visit(e.Combinator); visitedComb != nil {
				if comb, ok := visitedComb.(*Combinator); ok {
					e.Combinator = comb
				}
			}
		}

		// Visit the value only if it's an object (matching JavaScript's typeof value === 'object')
		// In JavaScript, objects include arrays, functions, and actual objects, but not primitives
		if e.Value != nil {
			switch e.Value.(type) {
			case string, bool, int, int64, float32, float64:
				// Don't visit primitive types
			default:
				// Visit objects (including structs, maps, slices, etc.)
				if visited := v.Visit(e.Value); visited != nil {
					e.Value = visited
				}
			}
		}
	}
}

// Eval evaluates the element and returns a new Element with evaluated values
func (e *Element) Eval(context any) (any, error) {
	var evaluatedValue any = e.Value

	// Match JavaScript logic: this.value.eval ? this.value.eval(context) : this.value
	if e.Value != nil {
		if evalValue, ok := e.Value.(interface{ Eval(any) (any, error) }); ok {
			evaluated, err := evalValue.Eval(context)
			if err != nil {
				return nil, err
			}
			evaluatedValue = evaluated
		} else if evalValue, ok := e.Value.(interface{ Eval(any) any }); ok {
			evaluatedValue = evalValue.Eval(context)
		} else if strValue, ok := e.Value.(string); ok {
			// Check if string contains variable interpolation
			if strings.Contains(strValue, "@{") {
				// Create a Quoted node to handle interpolation
				quoted := NewQuoted("", strValue, true, e.GetIndex(), e.FileInfo())
				evaluated, err := quoted.Eval(context)
				if err != nil {
					return nil, err
				}
				// Extract the string value from the evaluated Quoted node
				if quotedResult, ok := evaluated.(*Quoted); ok {
					evaluatedValue = quotedResult.value
				} else {
					evaluatedValue = evaluated
				}
			}
		}
	}

	// Handle potential nil Node
	index := 0
	if e.Node != nil {
		index = e.GetIndex()
	}

	fileInfo := make(map[string]any)
	if e.Node != nil {
		fileInfo = e.FileInfo()
	}

	visibilityInfo := make(map[string]any)
	if e.Node != nil {
		visibilityInfo = e.VisibilityInfo()
	}

	newElement := NewElement(
		e.Combinator,
		evaluatedValue,
		e.IsVariable,
		index,
		fileInfo,
		visibilityInfo,
	)

	return newElement, nil
}

// Clone creates a copy of the Element
func (e *Element) Clone() *Element {
	return NewElement(
		e.Combinator,
		e.Value,
		e.IsVariable,
		e.GetIndex(),
		e.FileInfo(),
		e.VisibilityInfo(),
	)
}

// GenCSS generates CSS representation
func (e *Element) GenCSS(context any, output *CSSOutput) {
	if output == nil {
		return
	}
	output.Add(e.ToCSS(context), e.FileInfo(), e.GetIndex())
}

// ToCSS converts the element to its CSS string representation
func (e *Element) ToCSS(context any) string {
	// Match JavaScript logic: context = context || {}
	ctx := make(map[string]any)
	if c, ok := context.(map[string]any); ok {
		ctx = c
	}

	var valueCSS string
	value := e.Value
	firstSelector := false
	if fs, exists := ctx["firstSelector"].(bool); exists {
		firstSelector = fs
	}

	// If value is a Paren, set firstSelector to true
	if paren, ok := value.(*Paren); ok && paren != nil {
		// selector in parens should not be affected by outer selector
		// flags (breaks only interpolated selectors - see #1973)
		ctx["firstSelector"] = true
	}

	// Convert value to CSS
	if value == nil {
		valueCSS = ""
	} else if cssValue, ok := value.(interface{ ToCSS(any) string }); ok {
		valueCSS = cssValue.ToCSS(ctx)
	} else if strValue, ok := value.(string); ok {
		valueCSS = strValue
	} else {
		valueCSS = fmt.Sprintf("%v", value)
	}

	// Restore firstSelector
	ctx["firstSelector"] = firstSelector

	// Handle empty value with & combinator
	if valueCSS == "" && e.Combinator != nil && len(e.Combinator.Value) > 0 && e.Combinator.Value[0] == '&' {
		return ""
	}

	// Get combinator CSS using the same pattern as JavaScript Node.toCSS
	combinatorCSS := ""
	if e.Combinator != nil {
		var strs []string
		output := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				if chunk != nil {
					if strChunk, ok := chunk.(string); ok {
						strs = append(strs, strChunk)
					} else {
						strs = append(strs, fmt.Sprintf("%v", chunk))
					}
				}
			},
			IsEmpty: func() bool {
				return len(strs) == 0
			},
		}
		e.Combinator.GenCSS(ctx, output)
		combinatorCSS = strings.Join(strs, "")
	}

	return combinatorCSS + valueCSS
} 