package go_parser

import "strings"

// QueryInParens represents a query in parentheses node in the Less AST
type QueryInParens struct {
	*Node
	op        string
	lvalue    any
	mvalue    any
	op2       string
	rvalue    any
	mvalues   []any
	mvalueCopy any
}

// NewQueryInParens creates a new QueryInParens instance
func NewQueryInParens(op string, l any, m any, op2 string, r any, i int) *QueryInParens {
	q := &QueryInParens{
		Node:    NewNode(),
		op:      strings.TrimSpace(op),
		lvalue:  l,
		mvalue:  m,
		op2:     strings.TrimSpace(op2),
		rvalue:  r,
		mvalues: make([]any, 0),
	}
	q.Index = i
	return q
}

// GetType returns the type of the node
func (q *QueryInParens) GetType() string {
	return "QueryInParens"
}

// Accept visits the node with a visitor
func (q *QueryInParens) Accept(visitor any) {
	if v, ok := visitor.(Visitor); ok {
		q.lvalue = v.Visit(q.lvalue)
		q.mvalue = v.Visit(q.mvalue)
		if q.rvalue != nil {
			q.rvalue = v.Visit(q.rvalue)
		}
	}
}

// Eval evaluates the query
func (q *QueryInParens) Eval(context any) any {
	var err error
	q.lvalue, err = q.lvalue.(Evaluator).Eval(context)
	if err != nil {
		return q
	}

	var variableDeclaration any

	if ctx, ok := context.(map[string]any); ok {
		if frames, ok := ctx["frames"].([]any); ok {
			for _, frame := range frames {
				if frameMap, ok := frame.(map[string]any); ok {
					if frameMap["type"] == "Ruleset" {
						if rules, ok := frameMap["rules"].([]any); ok {
							for _, r := range rules {
								if decl, ok := r.(*Declaration); ok && decl.variable {
									variableDeclaration = decl
									break
								}
							}
							if variableDeclaration != nil {
								break
							}
						}
					}
				}
			}
		}
	}

	if q.mvalueCopy == nil {
		// Create a deep copy of mvalue
		q.mvalueCopy = deepCopy(q.mvalue)
	}

	if variableDeclaration != nil {
		q.mvalue = q.mvalueCopy
		q.mvalue, err = q.mvalue.(Evaluator).Eval(context)
		if err != nil {
			return q
		}
		q.mvalues = append(q.mvalues, q.mvalue)
	} else {
		q.mvalue, err = q.mvalue.(Evaluator).Eval(context)
		if err != nil {
			return q
		}
	}

	if q.rvalue != nil {
		q.rvalue, err = q.rvalue.(Evaluator).Eval(context)
		if err != nil {
			return q
		}
	}
	return q
}

// GenCSS generates CSS representation
func (q *QueryInParens) GenCSS(context any, output *CSSOutput) {
	if q.lvalue != nil {
		if anon, ok := q.lvalue.(*Anonymous); ok {
			output.Add(anon.Value, nil, nil)
		} else if generator, ok := q.lvalue.(CSSGenerator); ok {
			generator.GenCSS(context, output)
		} else {
			output.Add(q.lvalue, nil, nil)
		}
	}

	output.Add(" "+q.op+" ", nil, nil)

	if len(q.mvalues) > 0 {
		if val, ok := SafeSliceIndex(q.mvalues, 0); ok {
			q.mvalue = val
			q.mvalues = q.mvalues[1:]
		}
	}

	if !SafeNilCheck(q.mvalue) {
		if anon, ok := SafeTypeAssertion[*Anonymous](q.mvalue); ok {
			output.Add(anon.Value, nil, nil)
		} else if generator, ok := SafeTypeAssertion[CSSGenerator](q.mvalue); ok {
			SafeGenCSS(generator, context, output)
		} else {
			output.Add(q.mvalue, nil, nil)
		}
	} else if len(q.mvalues) == 0 {
		// Instead of panicking, output a placeholder or empty value
		// This maintains CSS generation while avoiding panics
		output.Add("/* missing value */", nil, nil)
	}

	if q.rvalue != nil {
		output.Add(" "+q.op2+" ", nil, nil)
		if anon, ok := q.rvalue.(*Anonymous); ok {
			output.Add(anon.Value, nil, nil)
		} else if generator, ok := q.rvalue.(CSSGenerator); ok {
			generator.GenCSS(context, output)
		} else {
			output.Add(q.rvalue, nil, nil)
		}
	}
}

// deepCopy creates a deep copy of a value
func deepCopy(value any) any {
	switch v := value.(type) {
	case *QueryInParens:
		copy := *v
		return &copy
	case *Node:
		copy := *v
		return &copy
	case *Declaration:
		copy := *v
		return &copy
	case *Anonymous:
		copy := *v
		return &copy
	case *Value:
		copy := *v
		return &copy
	case []any:
		copy := make([]any, len(v))
		for i, item := range v {
			copy[i] = deepCopy(item)
		}
		return copy
	case map[string]any:
		copy := make(map[string]any)
		for k, val := range v {
			copy[k] = deepCopy(val)
		}
		return copy
	default:
		return v
	}
} 