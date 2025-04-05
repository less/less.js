package tree

// Keyword represents a keyword node in the Less AST
type Keyword struct {
	*Node
	value string
	type_ string
}

// NewKeyword creates a new Keyword instance
func NewKeyword(value string) *Keyword {
	k := &Keyword{
		Node:  NewNode(),
		value: value,
		type_: "Keyword",
	}
	k.Value = value // Set the Node's Value field
	return k
}

// Type returns the type of the node
func (k *Keyword) Type() string {
	return k.type_
}

// GenCSS generates the CSS representation of the keyword
func (k *Keyword) GenCSS(context any, output *CSSOutput) {
	if k.value == "%" {
		panic(map[string]string{
			"type":    "Syntax",
			"message": "Invalid % without number",
		})
	}
	output.Add(k.value, nil, nil)
}

// Predefined keywords
var (
	KeywordTrue  = NewKeyword("true")
	KeywordFalse = NewKeyword("false")
) 