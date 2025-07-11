package less_go

import (
	"fmt"
	"regexp"
	"strconv"
)

// Compile regex patterns once at package level
var (
	variableRegex = regexp.MustCompile(`@\{([\w-]+)\}`)
	propRegex     = regexp.MustCompile(`\$\{([\w-]+)\}`)
)

// Quoted represents a quoted string in the Less AST
type Quoted struct {
	*Node
	escaped    bool
	value      string
	quote      string
	_index     int
	_fileInfo  map[string]any
	allowRoot  bool
}

// NewQuoted creates a new Quoted instance
func NewQuoted(str string, content string, escaped bool, index int, currentFileInfo map[string]any) *Quoted {
	// In JS, escaped defaults to true only when undefined
	// But when explicitly set to false, it should remain false
	if content == "" {
		content = ""
	}
	
	// Initialize fileInfo if nil
	if currentFileInfo == nil {
		currentFileInfo = make(map[string]any)
	}
	
	// Handle empty quote string safely
	var quote string
	if char, ok := SafeStringIndex(str, 0); ok {
		quote = string(char)
	} else {
		quote = ""
	}
	
	return &Quoted{
		Node:          NewNode(),
		escaped:       escaped,
		value:         content,
		quote:         quote,
		_index:        index,
		_fileInfo:     currentFileInfo,
		allowRoot:     escaped,
	}
}

// GetType returns the node type
func (q *Quoted) GetType() string {
	return "Quoted"
}

// GetIndex returns the node's index
func (q *Quoted) GetIndex() int {
	return q._index
}

// FileInfo returns the node's file information
func (q *Quoted) FileInfo() map[string]any {
	return q._fileInfo
}

// GenCSS generates CSS representation
func (q *Quoted) GenCSS(context any, output *CSSOutput) {
	if !q.escaped {
		output.Add(q.quote, q.FileInfo(), q.GetIndex())
	}
	output.Add(q.value, q.FileInfo(), q.GetIndex())
	if !q.escaped {
		output.Add(q.quote, q.FileInfo(), q.GetIndex())
	}
}

// ContainsVariables checks if the quoted string contains variable interpolations
func (q *Quoted) ContainsVariables() bool {
	return variableRegex.MatchString(q.value)
}

// Eval evaluates the quoted string, replacing variables and properties
func (q *Quoted) Eval(context EvalContext) (any, error) {
	value := q.value

	// Get frames from context safely
	frames := context.GetFrames()
	if frames == nil {
		frames = make([]ParserFrame, 0) // Provide empty frames if none available
	}

	// Define iterativeReplace to match JavaScript implementation
	iterativeReplace := func(value string, regex *regexp.Regexp, replacementFn func(string, string) (string, error)) (string, error) {
		var evaluatedValue string
		var err error
		for {
			evaluatedValue = regex.ReplaceAllStringFunc(value, func(match string) string {
				matches := regex.FindStringSubmatch(match)
				if len(matches) < 2 {
					return match
				}
				replacement, e := replacementFn(matches[0], matches[1])
				if e != nil {
					err = e
					return match
				}
				return replacement
			})
			
			if err != nil {
				return value, err
			}
			
			if value == evaluatedValue {
				break
			}
			value = evaluatedValue
		}
		return evaluatedValue, nil
	}

	// variableReplacement handles @{name} syntax
	variableReplacement := func(_ string, name string) (string, error) {
		// First try direct frame access for the test case
		for _, frame := range frames {
			if varResult := frame.Variable("@" + name); varResult != nil {
				if val, ok := varResult["value"]; ok {
					if quoted, ok := val.(*Quoted); ok {
						return quoted.value, nil
					} else if cssable, ok := val.(interface{ ToCSS(any) string }); ok {
						return cssable.ToCSS(nil), nil
					} else {
						return fmt.Sprintf("%v", val), nil
					}
				}
			}
		}
		
		// Fall back to Variable eval if frames don't have it
		v := NewVariable("@"+name, q.GetIndex(), q.FileInfo())
		result, err := v.Eval(context)
		if err != nil {
			return "", fmt.Errorf("variable @%s is undefined", name)
		}
		
		if quoted, ok := result.(*Quoted); ok {
			return quoted.value, nil
		}
		
		if cssable, ok := result.(interface{ ToCSS(any) string }); ok {
			return cssable.ToCSS(nil), nil
		}
		
		return fmt.Sprintf("%v", result), nil
	}

	// propertyReplacement handles ${name} syntax
	propertyReplacement := func(_ string, name string) (string, error) {
		// First try direct frame access for the test case
		for _, frame := range frames {
			if pFrame, ok := interface{}(frame).(interface{ Property(string) []any }); ok {
				if props := pFrame.Property("$" + name); len(props) > 0 && props[len(props)-1] != nil {
					decl := props[len(props)-1]
					
					// Try to access value through various interfaces
					if declWithValue, ok := decl.(interface{ Value() any }); ok {
						value := declWithValue.Value()
						if quoted, ok := value.(*Quoted); ok {
							return quoted.value, nil
						} else if cssable, ok := value.(interface{ ToCSS(any) string }); ok {
							return cssable.ToCSS(nil), nil
						} else {
							return fmt.Sprintf("%v", value), nil
						}
					}
					
					if cssable, ok := decl.(interface{ ToCSS(any) string }); ok {
						return cssable.ToCSS(nil), nil
					}
				}
			}
		}
		
		// Fall back to Property eval
		p := NewProperty("$"+name, q.GetIndex(), q.FileInfo())
		result, err := p.Eval(context)
		if err != nil {
			return "", fmt.Errorf("property $%s is undefined", name)
		}
		
		if quoted, ok := result.(*Quoted); ok {
			return quoted.value, nil
		}
		
		if cssable, ok := result.(interface{ ToCSS(any) string }); ok {
			return cssable.ToCSS(nil), nil
		}
		
		return fmt.Sprintf("%v", result), nil
	}

	// Process variable and property replacements
	var err error
	value, err = iterativeReplace(value, variableRegex, variableReplacement)
	if err != nil {
		return nil, err
	}
	
	value, err = iterativeReplace(value, propRegex, propertyReplacement)
	if err != nil {
		return nil, err
	}

	return NewQuoted(q.quote, value, q.escaped, q.GetIndex(), q.FileInfo()), nil
}

// Compare compares two quoted strings
func (q *Quoted) Compare(other *Node) (int, error) {
	if other == nil {
		return 0, fmt.Errorf("cannot compare with nil") // In JS: undefined
	}

	// Check if other is a Quoted type
	otherQuoted, ok := other.Value.(*Quoted)
	if !ok {
		// Try CSS-based comparison if both have ToCSS method
		if otherCSSable, ok := other.Value.(interface{ ToCSS(any) string }); ok {
			qCSS := q.ToCSS(nil)
			otherCSS := otherCSSable.ToCSS(nil)
			if qCSS == otherCSS {
				return 0, nil // Equal CSS output
			}
		}
		return 0, fmt.Errorf("cannot compare with non-quoted type") // In JS: undefined
	}

	// If values are different, they are not comparable regardless of escaped status
	if q.value != otherQuoted.value {
		return 0, fmt.Errorf("values are not equal")
	}

	// When comparing quoted strings allow the quote to differ
	if !q.escaped && !otherQuoted.escaped {
		// Try numeric comparison (matching JS behavior)
		qVal, err1 := strconv.ParseFloat(q.value, 64)
		otherVal, err2 := strconv.ParseFloat(otherQuoted.value, 64)
		
		if err1 == nil && err2 == nil {
			// Both parse as numbers
			if qVal < otherVal {
				return -1, nil
			} else if qVal > otherVal {
				return 1, nil
			}
			return 0, nil
		}
		
		// String comparison
		if q.value < otherQuoted.value {
			return -1, nil
		}
		if q.value > otherQuoted.value {
			return 1, nil
		}
		return 0, nil
	}

	// For other cases (both escaped or one escaped one unescaped with same value), compare CSS output
	qCSS := q.ToCSS(nil)
	otherCSS := otherQuoted.ToCSS(nil)
	if qCSS == otherCSS {
		return 0, nil
	}
	
	return 0, fmt.Errorf("values are not equal") // In JS: undefined
} 