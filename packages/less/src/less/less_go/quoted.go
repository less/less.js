package less_go

import (
	"fmt"
	"regexp"
	"strings"
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

// Type returns the node type
func (q *Quoted) Type() string {
	return "Quoted"
}

// GetType returns the node type
func (q *Quoted) GetType() string {
	return "Quoted"
}

// GetIndex returns the node's index
func (q *Quoted) GetIndex() int {
	return q._index
}

// GetValue returns the raw string value of the quoted string
func (q *Quoted) GetValue() string {
	return q.value
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
	output.Add(q.value, nil, nil)
	if !q.escaped {
		output.Add(q.quote, nil, nil)
	}
}

// ToCSS generates CSS string representation
func (q *Quoted) ToCSS(context any) string {
	var strs []string
	output := &CSSOutput{
		Add: func(chunk any, fileInfo any, index any) {
			strs = append(strs, fmt.Sprintf("%v", chunk))
		},
		IsEmpty: func() bool {
			return len(strs) == 0
		},
	}
	q.GenCSS(context, output)
	return strings.Join(strs, "")
}

// ContainsVariables checks if the quoted string contains variable interpolations
func (q *Quoted) ContainsVariables() bool {
	return variableRegex.MatchString(q.value)
}

// Eval evaluates the quoted string, replacing variables and properties  
func (q *Quoted) Eval(context any) (any, error) {
	value := q.value

	// Get frames from context safely - handle both EvalContext and map[string]any
	var frames []ParserFrame
	if evalCtx, ok := context.(interface{ GetFrames() []ParserFrame }); ok {
		frames = evalCtx.GetFrames()
	} else if ctx, ok := context.(map[string]any); ok {
		// Extract frames from map context
		if framesAny, exists := ctx["frames"]; exists {
			if frameSlice, ok := framesAny.([]any); ok {
				frames = make([]ParserFrame, 0, len(frameSlice))
				for _, f := range frameSlice {
					if frame, ok := f.(ParserFrame); ok {
						frames = append(frames, frame)
					}
				}
			}
		}
	}
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
	variableReplacement := func(match string, name string) (string, error) {
		// First try direct frame access for the test case
		for _, frame := range frames {
			if varResult := frame.Variable("@" + name); varResult != nil {
				if val, ok := varResult["value"]; ok {
					var result string
					if quoted, ok := val.(*Quoted); ok {
						result = quoted.value
					} else if anon, ok := val.(*Anonymous); ok {
						// Handle Anonymous objects by getting their value
						if str, ok := anon.Value.(string); ok {
							result = str
						} else if cssable, ok := anon.Value.(interface{ ToCSS(any) string }); ok {
							result = cssable.ToCSS(nil)
						} else {
							result = fmt.Sprintf("%v", anon.Value)
						}
					} else if value, ok := val.(*Value); ok {
						// Handle Value objects by evaluating them
						evaluated, err := value.Eval(context)
						if err != nil {
							result = fmt.Sprintf("%v", val)
						} else if anon, ok := evaluated.(*Anonymous); ok {
							// Handle Anonymous results from Value eval
							if str, ok := anon.Value.(string); ok {
								result = str
							} else if cssable, ok := anon.Value.(interface{ ToCSS(any) string }); ok {
								result = cssable.ToCSS(nil)
							} else {
								result = fmt.Sprintf("%v", anon.Value)
							}
						} else if quoted, ok := evaluated.(*Quoted); ok {
							// Handle Quoted results from Value eval
							result = quoted.value
						} else if expr, ok := evaluated.(*Expression); ok {
							// Handle Expression results from Value eval
							// Expression may contain multiple values, take the first one
							if len(expr.Value) > 0 {
								if quoted, ok := expr.Value[0].(*Quoted); ok {
									result = quoted.value
								} else if cssable, ok := expr.Value[0].(interface{ ToCSS(any) string }); ok {
									result = cssable.ToCSS(nil)
								} else {
									result = fmt.Sprintf("%v", expr.Value[0])
								}
							}
						} else if cssable, ok := evaluated.(interface{ ToCSS(any) string }); ok {
							result = cssable.ToCSS(nil)
						} else {
							result = fmt.Sprintf("%v", evaluated)
						}
					} else if cssable, ok := val.(interface{ ToCSS(any) string }); ok {
						result = cssable.ToCSS(nil)
					} else {
						result = fmt.Sprintf("%v", val)
					}
					return result, nil
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

	// Match JavaScript behavior: first parameter should be quote + value + quote
	return NewQuoted(q.quote+value+q.quote, value, q.escaped, q.GetIndex(), q.FileInfo()), nil
}

// Compare compares two quoted strings
func (q *Quoted) Compare(other any) *int {
	// Match JavaScript: if (other.type === 'Quoted' && !this.escaped && !other.escaped)
	if otherQuoted, ok := other.(*Quoted); ok && !q.escaped && !otherQuoted.escaped {
		// Match JavaScript: return Node.numericCompare(this.value, other.value);
		result := NumericCompareStrings(q.value, otherQuoted.value)
		return &result
	}
	
	// Match JavaScript: return other.toCSS && this.toCSS() === other.toCSS() ? 0 : undefined;
	if otherCSSable, ok := other.(interface{ ToCSS(any) string }); ok {
		if q.ToCSS(nil) == otherCSSable.ToCSS(nil) {
			result := 0
			return &result
		}
	}
	
	return nil // undefined in JavaScript
} 