package less_go

import (
	"fmt"
	"os"
)

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

// GetType returns the type of the node for visitor pattern consistency
func (p *Paren) GetType() string {
	return "Paren"
}

// GenCSS generates CSS representation with parentheses around the value
func (p *Paren) GenCSS(context any, output *CSSOutput) {
	output.Add("(", nil, nil)
	
	// Match JavaScript: this.value.genCSS(context, output);
	if valueWithGenCSS, ok := p.Value.(interface{ GenCSS(any, *CSSOutput) }); ok {
		valueWithGenCSS.GenCSS(context, output)
	}
	
	output.Add(")", nil, nil)
}

// Eval evaluates the node and returns a new Paren with the evaluated value
func (p *Paren) Eval(context any) any {
	// Match JavaScript: return new Paren(this.value.eval(context));
	// Push to parensStack before evaluating (so operations inside know they're in parens)
	debug := os.Getenv("LESS_DEBUG_PAREN") == "1"
	if evalCtx, ok := context.(*Eval); ok {
		if debug {
			fmt.Printf("[Paren.Eval] Pushing to parensStack, value type: %T\n", p.Value)
		}
		evalCtx.InParenthesis()
		defer evalCtx.OutOfParenthesis()
	} else {
		if debug {
			fmt.Printf("[Paren.Eval] Context is not *Eval (type: %T)\n", context)
		}
	}

	var evaluatedValue any = p.Value

	// Try single-return eval first (matches most nodes)
	if valueWithEval, ok := p.Value.(interface{ Eval(any) any }); ok {
		evaluatedValue = valueWithEval.Eval(context)
		if debug {
			fmt.Printf("[Paren.Eval] Evaluated value (no error): %T\n", evaluatedValue)
		}
	} else if valueWithEval, ok := p.Value.(interface{ Eval(any) (any, error) }); ok {
		// Handle nodes that return errors
		result, _ := valueWithEval.Eval(context)
		if result != nil {
			evaluatedValue = result
		}
		if debug {
			fmt.Printf("[Paren.Eval] Evaluated value (with error): %T\n", evaluatedValue)
		}
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