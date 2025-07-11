package less_go

// NoSpaceCombinators defines which combinators should not have spaces
var NoSpaceCombinators = map[string]bool{
	"":  true,
	" ": true,
	"|": true,
}

// Combinator represents a CSS combinator node
type Combinator struct {
	*Node
	Value            string
	EmptyOrWhitespace bool
}

// NewCombinator creates a new Combinator instance
func NewCombinator(value string) *Combinator {
	c := &Combinator{
		Node: NewNode(),
	}

	if value == " " {
		c.Value = " "
		c.EmptyOrWhitespace = true
	} else {
		// Handle all Unicode whitespace characters
		runes := []rune(value)
		start := 0
		end := len(runes) - 1
		for start < len(runes) && isUnicodeWhitespace(runes[start]) {
			start++
		}
		for end >= start && isUnicodeWhitespace(runes[end]) {
			end--
		}
		if start > end {
			c.Value = ""
			c.EmptyOrWhitespace = true
		} else {
			c.Value = string(runes[start : end+1])
			c.EmptyOrWhitespace = false
		}
	}

	return c
}

// isUnicodeWhitespace checks if a rune is a Unicode whitespace character
func isUnicodeWhitespace(r rune) bool {
	switch r {
	case '\t', '\n', '\v', '\f', '\r', ' ', 0x85, 0xA0,
		0x1680, 0x180e, 0x2000, 0x2001, 0x2002, 0x2003,
		0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009,
		0x200A, 0x2028, 0x2029, 0x202F, 0x205F, 0x3000,
		0xFEFF:
		return true
	default:
		return false
	}
}

// GenCSS generates CSS representation of the combinator
func (c *Combinator) GenCSS(context any, output *CSSOutput) {
	var spaceOrEmpty string
	if ctx, ok := context.(map[string]any); ok {
		if compress, ok := ctx["compress"].(bool); ok && compress {
			spaceOrEmpty = ""
		} else if NoSpaceCombinators[c.Value] {
			spaceOrEmpty = ""
		} else {
			spaceOrEmpty = " "
		}
	} else {
		spaceOrEmpty = " "
	}
	output.Add(spaceOrEmpty+c.Value+spaceOrEmpty, nil, nil)
} 