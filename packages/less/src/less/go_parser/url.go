package go_parser

import (
	"regexp"
	"strings"
)

// URL represents a URL node in the Less AST
type URL struct {
	*Node
	value   any
	_index  int
	fileInfo map[string]any
	isEvald bool
}

// NewURL creates a new URL instance
func NewURL(val any, index int, currentFileInfo map[string]any, isEvald bool) *URL {
	return &URL{
		Node:     NewNode(),
		value:    val,
		_index:   index,
		fileInfo: currentFileInfo,
		isEvald:  isEvald,
	}
}

// escapePath escapes special characters in a path
func escapePath(path string) string {
	re := regexp.MustCompile(`[()'"\s]`)
	return re.ReplaceAllStringFunc(path, func(match string) string {
		return "\\" + match
	})
}

// Accept visits the URL with a visitor
func (u *URL) Accept(visitor any) {
	if v, ok := visitor.(Visitor); ok && u.value != nil {
		u.value = v.Visit(u.value)
	}
}

// GenCSS generates CSS representation
func (u *URL) GenCSS(context any, output *CSSOutput) {
	output.Add("url(", nil, nil)
	if u.value != nil {
		// In JS, only the genCSS method is used if available
		// The value should have a genCSS method, matching the JS behavior
		if v, ok := u.value.(map[string]any); ok {
			if genCSS, ok := v["genCSS"].(func(any, *CSSOutput)); ok {
				genCSS(context, output)
			}
		} else if hasGenCSS, ok := u.value.(interface{ GenCSS(any, *CSSOutput) }); ok {
			// This is a Go-specific enhancement for typed objects that implement GenCSS
			hasGenCSS.GenCSS(context, output)
		}
	}
	output.Add(")", nil, nil)
}

// Eval evaluates the URL
func (u *URL) Eval(context any) *URL {
	// First, evaluate the value
	var evaluatedVal any = nil
	
	if u.value != nil {
		if v, ok := u.value.(map[string]any); ok {
			if eval, ok := v["eval"].(func(any) any); ok {
				evaluatedVal = eval(context)
			} else {
				// If no eval function, use the value directly
				evaluatedVal = v
			}
		} else if hasEval, ok := u.value.(interface { Eval(any) any }); ok {
			// Go-specific enhancement for typed objects
			evaluatedVal = hasEval.Eval(context)
		} else {
			// If not a map, use the value directly
			evaluatedVal = u.value
		}
	}
	
	// If we don't have a value after evaluation, return early
	if evaluatedVal == nil {
		return NewURL(nil, u.GetIndex(), u.FileInfo(), true)
	}
	
	// Process the evaluated value if we're not already evaluated
	if !u.isEvald {
		// Get the rootpath from fileInfo
		rootpath := ""
		if u.fileInfo != nil {
			if rp, ok := u.fileInfo["rootpath"].(string); ok {
				rootpath = rp
			}
		}
		
		// Get the value string from the evaluated value
		if valMap, ok := evaluatedVal.(map[string]any); ok {
			if value, ok := valMap["value"].(string); ok {
				// Process the URL if we have a context
				if contextMap, ok := context.(map[string]any); ok {
					// Check if path requires rewriting
					if pathRequiresRewrite, ok := contextMap["pathRequiresRewrite"].(func(string) bool); ok {
						if pathRequiresRewrite(value) {
							// Get rewritePath function
							if rewritePath, ok := contextMap["rewritePath"].(func(string, string) string); ok {
								// Check if we need to escape the rootpath
								if quote, ok := valMap["quote"].(bool); !ok || !quote {
									rootpath = escapePath(rootpath)
								}
								// Rewrite the path
								valMap["value"] = rewritePath(value, rootpath)
							}
						} else if normalizePath, ok := contextMap["normalizePath"].(func(string) string); ok {
							valMap["value"] = normalizePath(value)
						}
					}
					
					// Add URL args if enabled
					if urlArgs, ok := contextMap["urlArgs"].(string); ok && urlArgs != "" {
						// Only add args if not a data URL
						if !strings.HasPrefix(strings.TrimSpace(valMap["value"].(string)), "data:") {
							delimiter := "?"
							if strings.Contains(valMap["value"].(string), "?") {
								delimiter = "&"
							}
							urlArgsStr := delimiter + urlArgs
							if strings.Contains(valMap["value"].(string), "#") {
								valMap["value"] = strings.Replace(valMap["value"].(string), "#", urlArgsStr+"#", 1)
							} else {
								valMap["value"] = valMap["value"].(string) + urlArgsStr
							}
						}
					}
				}
			}
		}
	}
	
	return NewURL(evaluatedVal, u.GetIndex(), u.FileInfo(), true)
} 