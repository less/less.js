package less_go

import (
	"regexp"
	"strings"
)

// StringFunctions provides all the string-related functions
var StringFunctions = map[string]interface{}{
	"e":       E,
	"escape":  Escape,
	"replace": Replace,
	"%":       Format,
}

// E escapes a string value, creating a Quoted with escaped=true
func E(str interface{}) (*Quoted, error) {
	var value string
	
	// Handle Quoted type directly
	if quoted, ok := str.(*Quoted); ok {
		value = quoted.value
	} else if js, ok := str.(interface{ GetEvaluated() interface{} }); ok {
		// Handle JavaScript node with evaluated property
		if evaluated := js.GetEvaluated(); evaluated != nil {
			if evalStr, ok := evaluated.(string); ok {
				value = evalStr
			} else {
				value = ""
			}
		} else {
			// Fallback to str.value if no evaluated property
			if valuer, ok := str.(interface{ GetValue() interface{} }); ok {
				if strVal, ok := valuer.GetValue().(string); ok {
					value = strVal
				} else {
					value = ""
				}
			} else {
				value = ""
			}
		}
	} else if valuer, ok := str.(interface{ GetValue() interface{} }); ok {
		if strVal, ok := valuer.GetValue().(string); ok {
			value = strVal
		} else {
			value = ""
		}
	} else {
		value = ""
	}
	
	return NewQuoted("\"", value, true, 0, nil), nil
}

// Escape URI-encodes a string and replaces specific characters
func Escape(str interface{}) (*Anonymous, error) {
	var value string
	
	// Handle Quoted type directly
	if quoted, ok := str.(*Quoted); ok {
		value = quoted.value
	} else if valuer, ok := str.(interface{ GetValue() interface{} }); ok {
		if strVal, ok := valuer.GetValue().(string); ok {
			value = strVal
		} else {
			value = ""
		}
	} else {
		value = ""
	}
	
	// URI encode specific characters as in the JavaScript version
	encoded := value
	encoded = strings.ReplaceAll(encoded, " ", "%20")
	encoded = strings.ReplaceAll(encoded, "=", "%3D")
	encoded = strings.ReplaceAll(encoded, ":", "%3A")
	encoded = strings.ReplaceAll(encoded, "#", "%23")
	encoded = strings.ReplaceAll(encoded, ";", "%3B")
	encoded = strings.ReplaceAll(encoded, "(", "%28")
	encoded = strings.ReplaceAll(encoded, ")", "%29")
	encoded = strings.ReplaceAll(encoded, "?", "%3F")
	encoded = strings.ReplaceAll(encoded, "&", "%26")
	
	return NewAnonymous(encoded, 0, nil, false, false, nil), nil
}

// Replace performs string replacement using regular expressions
func Replace(stringArg, pattern, replacement interface{}, flags ...interface{}) (*Quoted, error) {
	// Get the string value
	var stringVal string
	var quote string
	var escaped bool
	
	if quotedStr, ok := stringArg.(*Quoted); ok {
		stringVal = quotedStr.value
		quote = quotedStr.quote
		escaped = quotedStr.escaped
	} else if valuer, ok := stringArg.(interface{ GetValue() interface{} }); ok {
		if strVal, ok := valuer.GetValue().(string); ok {
			stringVal = strVal
		}
	}
	
	// Get the pattern
	var patternStr string
	if quoted, ok := pattern.(*Quoted); ok {
		patternStr = quoted.value
	} else if valuer, ok := pattern.(interface{ GetValue() interface{} }); ok {
		if strVal, ok := valuer.GetValue().(string); ok {
			patternStr = strVal
		}
	}
	
	// Get the replacement value
	var replacementStr string
	if quotedRepl, ok := replacement.(*Quoted); ok {
		replacementStr = quotedRepl.value
	} else if cssable, ok := replacement.(interface{ ToCSS(interface{}) string }); ok {
		replacementStr = cssable.ToCSS(nil)
	} else if valuer, ok := replacement.(interface{ GetValue() interface{} }); ok {
		if strVal, ok := valuer.GetValue().(string); ok {
			replacementStr = strVal
		}
	}
	
	// Get the flags
	var flagsStr string
	if len(flags) > 0 {
		if quoted, ok := flags[0].(*Quoted); ok {
			flagsStr = quoted.value
		} else if valuer, ok := flags[0].(interface{ GetValue() interface{} }); ok {
			if strVal, ok := valuer.GetValue().(string); ok {
				flagsStr = strVal
			}
		}
	}
	
	// Create the regex with flags
	regexStr := patternStr
	if strings.Contains(flagsStr, "i") {
		regexStr = "(?i)" + regexStr
	}
	
	regex, err := regexp.Compile(regexStr)
	if err != nil {
		return NewQuoted(quote, stringVal, escaped, 0, nil), nil // Return original on error
	}
	
	var result string
	if strings.Contains(flagsStr, "g") {
		result = regex.ReplaceAllString(stringVal, replacementStr)
	} else {
		// Replace only the first occurrence
		if loc := regex.FindStringIndex(stringVal); loc != nil {
			result = stringVal[:loc[0]] + replacementStr + stringVal[loc[1]:]
		} else {
			result = stringVal
		}
	}
	
	return NewQuoted(quote, result, escaped, 0, nil), nil
}

// Format performs string formatting with %s, %d, %a placeholders
func Format(stringArg interface{}, args ...interface{}) (*Quoted, error) {
	// Get the string value
	var stringVal string
	var quote string
	var escaped bool
	
	if quotedStr, ok := stringArg.(*Quoted); ok {
		stringVal = quotedStr.value
		quote = quotedStr.quote
		escaped = quotedStr.escaped
	} else if valuer, ok := stringArg.(interface{ GetValue() interface{} }); ok {
		if strVal, ok := valuer.GetValue().(string); ok {
			stringVal = strVal
		}
	}
	
	result := stringVal
	
	// Replace placeholders
	for i, arg := range args {
		if i >= len(args) {
			break
		}
		
		// Find the next placeholder (both upper and lowercase)
		re := regexp.MustCompile(`%[sdaSDA]`)
		match := re.FindString(result)
		if match == "" {
			break
		}
		
		var value string
		placeholder := strings.ToLower(match)
		isUppercase := match != placeholder
		
		// Get the value based on placeholder type
		if placeholder == "%s" {
			// String value - use .value for Quoted types
			if quotedArg, ok := arg.(*Quoted); ok {
				value = quotedArg.value
			} else if valuer, ok := arg.(interface{ GetValue() interface{} }); ok {
				if strVal, ok := valuer.GetValue().(string); ok {
					value = strVal
				} else {
					value = ""
				}
			} else {
				value = ""
			}
		} else {
			// %d or %a - use toCSS
			if cssable, ok := arg.(interface{ ToCSS(interface{}) string }); ok {
				value = cssable.ToCSS(nil)
			} else if valuer, ok := arg.(interface{ GetValue() interface{} }); ok {
				if strVal, ok := valuer.GetValue().(string); ok {
					value = strVal
				} else {
					value = ""
				}
			} else {
				value = ""
			}
		}
		
		// Apply URL encoding for uppercase placeholders
		if isUppercase {
			// Use the same encoding as the Escape function
			value = strings.ReplaceAll(value, " ", "%20")
			value = strings.ReplaceAll(value, "=", "%3D")
			value = strings.ReplaceAll(value, ":", "%3A")
			value = strings.ReplaceAll(value, "#", "%23")
			value = strings.ReplaceAll(value, ";", "%3B")
			value = strings.ReplaceAll(value, "(", "%28")
			value = strings.ReplaceAll(value, ")", "%29")
			value = strings.ReplaceAll(value, "?", "%3F")
			value = strings.ReplaceAll(value, "&", "%26")
		}
		
		// Replace the first occurrence
		re = regexp.MustCompile(`%[sdaSDA]`)
		if loc := re.FindStringIndex(result); loc != nil {
			result = result[:loc[0]] + value + result[loc[1]:]
		}
	}
	
	// Replace %% with %
	result = strings.ReplaceAll(result, "%%", "%")
	
	return NewQuoted(quote, result, escaped, 0, nil), nil
}