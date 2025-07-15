package less_go

import (
	"net/url"
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

// Escape URI-encodes a string and replaces specific characters (matches JS encodeURI + specific replacements)
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
	
	// Match JavaScript behavior exactly: encodeURI(...).replace(/=/g, '%3D').replace(/:/g, '%3A')...
	// JavaScript encodeURI doesn't encode :/?=#[]@ but does encode spaces and special chars
	encoded := value
	
	// Only encode characters that encodeURI actually encodes
	encoded = strings.ReplaceAll(encoded, " ", "%20")
	encoded = strings.ReplaceAll(encoded, "\"", "%22")
	encoded = strings.ReplaceAll(encoded, "<", "%3C")
	encoded = strings.ReplaceAll(encoded, ">", "%3E")
	encoded = strings.ReplaceAll(encoded, "`", "%60")
	encoded = strings.ReplaceAll(encoded, "\\", "%5C")
	encoded = strings.ReplaceAll(encoded, "^", "%5E")
	encoded = strings.ReplaceAll(encoded, "{", "%7B")
	encoded = strings.ReplaceAll(encoded, "|", "%7C")
	encoded = strings.ReplaceAll(encoded, "}", "%7D")
	
	// Then do the specific replacements from the JavaScript version  
	encoded = strings.ReplaceAll(encoded, "=", "%3D")
	encoded = strings.ReplaceAll(encoded, ":", "%3A")
	encoded = strings.ReplaceAll(encoded, "#", "%23")
	encoded = strings.ReplaceAll(encoded, ";", "%3B")
	encoded = strings.ReplaceAll(encoded, "(", "%28")
	encoded = strings.ReplaceAll(encoded, ")", "%29")
	encoded = strings.ReplaceAll(encoded, "?", "%3F")
	
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
	
	// Replace placeholders sequentially, matching JavaScript behavior exactly
	re := regexp.MustCompile(`%[sdaSDA]`)
	argIndex := 0
	
	result = re.ReplaceAllStringFunc(result, func(match string) string {
		if argIndex >= len(args) {
			return match // Return the placeholder unchanged if no more args
		}
		
		arg := args[argIndex]
		argIndex++
		
		var value string
		placeholder := strings.ToLower(match)
		isUppercase := match != placeholder
		
		// Get the value based on placeholder type - matches JS exactly
		if strings.Contains(placeholder, "s") {
			// String value - use .value for Quoted types (matches JS: args[i].value)
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
			// %d or %a - use toCSS (matches JS: args[i].toCSS())
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
		
		// Apply URL encoding for uppercase placeholders (matches JS: encodeURIComponent)
		if isUppercase {
			// JavaScript uses encodeURIComponent which does full URI encoding
			// url.QueryEscape uses + for spaces but encodeURIComponent uses %20
			encoded := url.QueryEscape(value)
			encoded = strings.ReplaceAll(encoded, "+", "%20")
			return encoded
		}
		
		return value
	})
	
	// Replace %% with % (matches JavaScript behavior)
	result = strings.ReplaceAll(result, "%%", "%")
	
	return NewQuoted(quote, result, escaped, 0, nil), nil
}