package less_go

import "fmt"

// Paren represents a parenthesized value in the Less AST
type Paren struct {
	*Node
	Value any // This will store the node value
}

// NewParen creates a new Paren instance with the provided node as value
func NewParen(node any) *Paren {
	return &Paren{
		Node:  NewNode(),
		Value: node,
	}
}

// Type returns the type of the node
func (p *Paren) Type() string {
	return "Paren"
}

// GenCSS generates CSS representation with parentheses around the value
func (p *Paren) GenCSS(context any, output *CSSOutput) {
	output.Add("(", nil, nil)
	
	// Call genCSS on the value if it implements the required method
	if valueWithGenCSS, ok := p.Value.(interface {
		GenCSS(any, *CSSOutput)
	}); ok {
		valueWithGenCSS.GenCSS(context, output)
	} else if valueWithToCSS, ok := p.Value.(interface {
		ToCSS(any) string
	}); ok {
		// Fallback to ToCSS if GenCSS is not available
		output.Add(valueWithToCSS.ToCSS(context), nil, nil)
	} else {
		// Fallback for basic types
		output.Add(fmt.Sprintf("%v", p.Value), nil, nil)
	}
	
	output.Add(")", nil, nil)
}

// Eval evaluates the node and returns a new Paren with the evaluated value
func (p *Paren) Eval(context any) *Paren {
	var evaluatedValue any = p.Value
	
	// Call eval on the value if it implements the required method
	if valueWithEval, ok := p.Value.(interface {
		Eval(any) any
	}); ok {
		evaluatedValue = valueWithEval.Eval(context)
	} else if parenValue, ok := p.Value.(*Paren); ok {
		// Handle nested Paren structures
		evaluatedValue = parenValue.Eval(context)
	}
	
	return NewParen(evaluatedValue)
}

// ToCSS generates a CSS string representation
func (p *Paren) ToCSS(context any) string {
	strs := []string{}
	output := &CSSOutput{
		Add: func(chunk any, fileInfo any, index any) {
			if strChunk, ok := chunk.(string); ok {
				strs = append(strs, strChunk)
			} else {
				// Handle non-string chunks if necessary, or convert
				strs = append(strs, fmt.Sprintf("%v", chunk))
			}
		},
		IsEmpty: func() bool {
			return len(strs) == 0
		},
	}
	p.GenCSS(context, output)
	
	// Join all the strings to create the CSS representation
	result := ""
	for _, s := range strs {
		result += s
	}
	return result
} 