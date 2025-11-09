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
	} else if value != "" {
		// Use custom trim to match JavaScript's specific whitespace handling
		c.Value = trimWhitespace(value)
		c.EmptyOrWhitespace = c.Value == ""
	} else {
		c.Value = ""
		c.EmptyOrWhitespace = true
	}

	return c
}

// trimWhitespace trims whitespace characters matching JavaScript's trim() behavior
func trimWhitespace(s string) string {
	if s == "" {
		return s
	}
	
	runes := []rune(s)
	start := 0
	end := len(runes) - 1
	
	// Trim from start
	for start <= end && isJSWhitespace(runes[start]) {
		start++
	}
	
	// Trim from end
	for end >= start && isJSWhitespace(runes[end]) {
		end--
	}
	
	if start > end {
		return ""
	}
	
	return string(runes[start : end+1])
}

// isJSWhitespace matches JavaScript's definition of whitespace for trim()
func isJSWhitespace(r rune) bool {
	// JavaScript trim() removes these specific characters
	switch r {
	case '\t', '\n', '\v', '\f', '\r', ' ', // ASCII whitespace
		0x00A0, // NO-BREAK SPACE
		0x1680, // OGHAM SPACE MARK
		0x180E, // MONGOLIAN VOWEL SEPARATOR
		0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A, // Various spaces
		0x2028, // LINE SEPARATOR
		0x2029, // PARAGRAPH SEPARATOR
		0x202F, // NARROW NO-BREAK SPACE
		0x205F, // MEDIUM MATHEMATICAL SPACE
		0x3000, // IDEOGRAPHIC SPACE
		0xFEFF: // ZERO WIDTH NO-BREAK SPACE (BOM)
		return true
	default:
		return false
	}
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

// Type returns the node type
func (c *Combinator) Type() string {
	return "Combinator"
}

// GetType returns the node type
func (c *Combinator) GetType() string {
	return "Combinator"
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

	// For space combinators (" ") in no-space contexts (like keyframe selectors),
	// don't output anything. The indentation is already handled by the parent at-rule.
	// For empty combinators (""), always output nothing.
	if c.Value == "" || (c.Value == " " && spaceOrEmpty == "") {
		return
	}

	output.Add(spaceOrEmpty+c.Value+spaceOrEmpty, nil, nil)
} 