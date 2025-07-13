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
	default:
		// Preserve non-string values as is
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

		// Visit the value if it's not a string and not nil
		if e.Value != nil {
			if _, ok := e.Value.(string); !ok {
				if visited := v.Visit(e.Value); visited != nil {
					e.Value = visited
				}
			}
		}
	}
}

// Eval evaluates the element and returns a new Element with evaluated values
func (e *Element) Eval(context any) *Element {
	var evaluatedValue any = e.Value

	if e.Value != nil {
		if evalValue, ok := e.Value.(interface{ Eval(any) any }); ok {
			if evaluated := evalValue.Eval(context); evaluated != nil {
				evaluatedValue = evaluated
			}
		}
	}

	return NewElement(
		e.Combinator,
		evaluatedValue,
		e.IsVariable,
		e.GetIndex(),
		e.FileInfo(),
		e.VisibilityInfo(),
	)
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
	ctx := make(map[string]any)
	if c, ok := context.(map[string]any); ok {
		for k, v := range c {
			ctx[k] = v
		}
	}

	// Generate Combinator CSS
	combinatorCSS := ""
	combinatorOutput := &CSSOutput{
		Add: func(chunk any, fileInfo any, index any) {
			if chunk != nil {
				if strChunk, ok := chunk.(string); ok {
					combinatorCSS += strChunk
				} else {
					combinatorCSS += fmt.Sprintf("%v", chunk)
				}
			}
		},
		IsEmpty: func() bool {
			return len(combinatorCSS) == 0
		},
	}
	if e.Combinator != nil {
		e.Combinator.GenCSS(ctx, combinatorOutput)
	}

	// Generate Value CSS
	var valueCSS string
	if e.Value == nil {
		valueCSS = ""
	} else if paren, ok := e.Value.(*Paren); ok {
		// Handle Paren values
		originalFirstSelector := false
		if fs, exists := ctx["firstSelector"].(bool); exists {
			originalFirstSelector = fs
			ctx["firstSelector"] = true
		}
		// Try calling ToCSS on the Paren's inner value first
		if paren.Value != nil {
			if innerCSSValue, innerOK := paren.Value.(interface{ ToCSS(any) string }); innerOK {
				valueCSS = innerCSSValue.ToCSS(ctx)
			} else {
				// Fallback to Paren's ToCSS
				valueCSS = paren.ToCSS(ctx)
			}
		}
		if originalFirstSelector {
			ctx["firstSelector"] = originalFirstSelector
		}
	} else if cssValue, ok := e.Value.(interface{ ToCSS(any) string }); ok {
		valueCSS = cssValue.ToCSS(ctx)
	} else {
		// Handle potential circular references and other edge cases
		defer func() {
			if r := recover(); r != nil {
				valueCSS = fmt.Sprintf("%v", e.Value)
			}
		}()
		
		// Handle rune values (like & character) properly
		if runeVal, ok := e.Value.(rune); ok {
			valueCSS = string(runeVal)
		} else if stringVal, ok := e.Value.(string); ok {
			valueCSS = stringVal
		} else if uint8Val, ok := e.Value.(uint8); ok {
			// Handle uint8 values (like ASCII codes for characters)
			valueCSS = string(rune(uint8Val))
		} else {
			valueCSS = fmt.Sprintf("%v", e.Value)
		}
	}

	if valueCSS == "" && e.Combinator != nil && len(e.Combinator.Value) > 0 && e.Combinator.Value[0] == '&' {
		return ""
	}

	return combinatorCSS + valueCSS
} 