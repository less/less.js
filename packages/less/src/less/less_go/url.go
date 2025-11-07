package less_go

import (
	"fmt"
	"os"
	"regexp"
	"strings"
)

// URL represents a URL node in the Less AST
type URL struct {
	*Node
	Value    any            // Exported for external access
	_index   int
	_fileInfo map[string]any // Use _fileInfo to match JavaScript naming
	IsEvald  bool           // Exported for external access
}

// Type returns the node type to match JavaScript's lowercase 'Url'
func (u *URL) Type() string {
	return "Url"
}

// GetType returns the type of the node for visitor pattern consistency
func (u *URL) GetType() string {
	return "Url"
}

// NewURL creates a new URL instance
func NewURL(val any, index int, currentFileInfo map[string]any, isEvald bool) *URL {
	url := &URL{
		Node:      NewNode(),
		Value:     val,
		_index:    index,
		_fileInfo: currentFileInfo,
		IsEvald:   isEvald,
	}
	
	// Set the index and file info in the embedded Node
	url.Node.Index = index
	if currentFileInfo != nil {
		url.Node.SetFileInfo(currentFileInfo)
	}
	
	return url
}

// fileInfo returns the file info for this node, traversing up the parent chain if needed
func (u *URL) fileInfo() map[string]any {
	if u._fileInfo != nil {
		return u._fileInfo
	}
	if u.Node != nil && u.Node.Parent != nil {
		// Parent is already a *Node, so we can call FileInfo directly
		return u.Node.Parent.FileInfo()
	}
	return make(map[string]any)
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
	if v, ok := visitor.(interface{ Visit(any) any }); ok && u.Value != nil {
		u.Value = v.Visit(u.Value)
	}
}

// GenCSS generates CSS representation
func (u *URL) GenCSS(context any, output *CSSOutput) {
	output.Add("url(", nil, nil)
	if u.Value != nil {
		// In JS, only the genCSS method is used if available
		// The value should have a genCSS method, matching the JS behavior
		if v, ok := u.Value.(map[string]any); ok {
			if genCSS, ok := v["genCSS"].(func(any, *CSSOutput)); ok {
				genCSS(context, output)
			}
		} else if hasGenCSS, ok := u.Value.(interface{ GenCSS(any, *CSSOutput) }); ok {
			// This is a Go-specific enhancement for typed objects that implement GenCSS
			hasGenCSS.GenCSS(context, output)
		}
	}
	output.Add(")", nil, nil)
}

// Eval evaluates the URL - match JavaScript implementation closely
func (u *URL) Eval(context any) (any, error) {
	if os.Getenv("LESS_GO_DEBUG_URL") == "1" {
		fmt.Printf("[URL.Eval] context type: %T\n", context)
		if evalCtx, ok := context.(*Eval); ok {
			fmt.Printf("[URL.Eval] *Eval context with %d frames, RewriteUrls=%v\n", len(evalCtx.Frames), evalCtx.RewriteUrls)
		}
	}

	// Match JavaScript: const val = this.value.eval(context);
	var val any
	if u.Value != nil {
		if hasEval, ok := u.Value.(interface{ Eval(any) any }); ok {
			val = hasEval.Eval(context)
		} else {
			val = u.Value
		}
	}

	// Get rootpath from fileInfo
	var rootpath string
	if !u.IsEvald {
		// Match JavaScript: rootpath = this.fileInfo() && this.fileInfo().rootpath;
		fileInfo := u.fileInfo()
		if rp, ok := fileInfo["rootpath"].(string); ok {
			rootpath = rp
		}
		// Match JavaScript URL rewriting logic

		// Handle *Anonymous value (which may wrap a *Quoted)
		var quoted *Quoted
		if anon, ok := val.(*Anonymous); ok {
			// Check if Anonymous.Value is a *Quoted
			if q, ok := anon.Value.(*Quoted); ok {
				quoted = q
			}
		} else if q, ok := val.(*Quoted); ok {
			// Direct *Quoted value
			quoted = q
		}

		if quoted != nil {
			value := quoted.GetValue()

			// Use *Eval context for rewriting
			if evalCtx, ok := context.(*Eval); ok {
				// Match JavaScript: if (typeof rootpath === 'string' && typeof val.value === 'string' && context.pathRequiresRewrite(val.value))
				// Note: in JavaScript, typeof "" === "string" is true, so we check PathRequiresRewrite regardless of rootpath being empty
				if evalCtx.PathRequiresRewrite(value) {
					// Match JavaScript: if (!val.quote) { rootpath = escapePath(rootpath); }
					if quoted.GetQuote() == "" && rootpath != "" {
						rootpath = escapePath(rootpath)
					}
					// Match JavaScript: val.value = context.rewritePath(val.value, rootpath);
					value = evalCtx.RewritePath(value, rootpath)
				} else {
					// Match JavaScript: val.value = context.normalizePath(val.value);
					value = evalCtx.NormalizePath(value)
				}

				// Match JavaScript: Add url args if enabled
				if evalCtx.UrlArgs != "" {
					// Match JavaScript: if (!val.value.match(/^\s*data:/))
					if !regexp.MustCompile(`^\s*data:`).MatchString(value) {
						// Match JavaScript: const delimiter = val.value.indexOf('?') === -1 ? '?' : '&';
						delimiter := "?"
						if strings.Contains(value, "?") {
							delimiter = "&"
						}
						urlArgsStr := delimiter + evalCtx.UrlArgs
						// Match JavaScript: val.value.indexOf('#') !== -1
						if strings.Contains(value, "#") {
							// Match JavaScript: val.value.replace('#', `${urlArgs}#`)
							value = strings.Replace(value, "#", urlArgsStr+"#", 1)
						} else {
							// Match JavaScript: val.value += urlArgs
							value = value + urlArgsStr
						}
					}
				}
			}

			// Create new Quoted with updated value (wrap back in Anonymous if needed)
			newQuoted := NewQuoted(quoted.GetQuote()+value+quoted.GetQuote(), value, quoted.GetEscaped(), quoted.GetIndex(), quoted.FileInfo())
			if oldAnon, wasAnonymous := val.(*Anonymous); wasAnonymous {
				val = &Anonymous{
					Node:         NewNode(),
					Value:        newQuoted,
					Index:        oldAnon.Index,
					FileInfo:     oldAnon.FileInfo,
					MapLines:     oldAnon.MapLines,
					RulesetLike:  oldAnon.RulesetLike,
					AllowRoot:    oldAnon.AllowRoot,
				}
			} else {
				val = newQuoted
			}
		} else if valMap, ok := val.(map[string]any); ok {
			// Fallback: handle map-based values for backward compatibility
			if value, ok := valMap["value"].(string); ok {
				if evalCtx, ok := context.(*Eval); ok {
					// Match JavaScript: if (typeof rootpath === 'string' && typeof val.value === 'string' && context.pathRequiresRewrite(val.value))
					if evalCtx.PathRequiresRewrite(value) {
						// Match JavaScript: if (!val.quote) { rootpath = escapePath(rootpath); }
						if quote, ok := valMap["quote"].(string); (!ok || quote == "") && rootpath != "" {
							rootpath = escapePath(rootpath)
						}
						// Match JavaScript: val.value = context.rewritePath(val.value, rootpath);
						valMap["value"] = evalCtx.RewritePath(value, rootpath)
					} else {
						// Match JavaScript: val.value = context.normalizePath(val.value);
						valMap["value"] = evalCtx.NormalizePath(value)
					}

					// Match JavaScript: Add url args if enabled
					if evalCtx.UrlArgs != "" {
						if value, ok := valMap["value"].(string); ok {
							// Match JavaScript: if (!val.value.match(/^\s*data:/))
							if !regexp.MustCompile(`^\s*data:`).MatchString(value) {
								// Match JavaScript: const delimiter = val.value.indexOf('?') === -1 ? '?' : '&';
								delimiter := "?"
								if strings.Contains(value, "?") {
									delimiter = "&"
								}
								urlArgsStr := delimiter + evalCtx.UrlArgs
								// Match JavaScript: val.value.indexOf('#') !== -1
								if strings.Contains(value, "#") {
									// Match JavaScript: val.value.replace('#', `${urlArgs}#`)
									valMap["value"] = strings.Replace(value, "#", urlArgsStr+"#", 1)
								} else {
									// Match JavaScript: val.value += urlArgs
									valMap["value"] = value + urlArgsStr
								}
							}
						}
					}
				} else if ctx, ok := context.(map[string]any); ok {
					// Handle map-based context
					if pathRequiresRewrite, ok := ctx["pathRequiresRewrite"].(func(string) bool); ok {
						if pathRequiresRewrite(value) {
							// Match JavaScript: if (!val.quote) { rootpath = escapePath(rootpath); }
							if quote, ok := valMap["quote"].(string); (!ok || quote == "") && rootpath != "" {
								rootpath = escapePath(rootpath)
							}
							// Match JavaScript: val.value = context.rewritePath(val.value, rootpath);
							if rewritePath, ok := ctx["rewritePath"].(func(string, string) string); ok {
								valMap["value"] = rewritePath(value, rootpath)
							}
						} else {
							// Match JavaScript: val.value = context.normalizePath(val.value);
							if normalizePath, ok := ctx["normalizePath"].(func(string) string); ok {
								valMap["value"] = normalizePath(value)
							}
						}
					}

					// Match JavaScript: Add url args if enabled
					if urlArgs, ok := ctx["urlArgs"].(string); ok && urlArgs != "" {
						if value, ok := valMap["value"].(string); ok {
							// Match JavaScript: if (!val.value.match(/^\s*data:/))
							if !regexp.MustCompile(`^\s*data:`).MatchString(value) {
								// Match JavaScript: const delimiter = val.value.indexOf('?') === -1 ? '?' : '&';
								delimiter := "?"
								if strings.Contains(value, "?") {
									delimiter = "&"
								}
								urlArgsStr := delimiter + urlArgs
								// Match JavaScript: val.value.indexOf('#') !== -1
								if strings.Contains(value, "#") {
									// Match JavaScript: val.value.replace('#', `${urlArgs}#`)
									valMap["value"] = strings.Replace(value, "#", urlArgsStr+"#", 1)
								} else {
									// Match JavaScript: val.value += urlArgs
									valMap["value"] = value + urlArgsStr
								}
							}
						}
					}
				}
			}
		}
	}

	// Match JavaScript: return new URL(val, this.getIndex(), this.fileInfo(), true);
	return NewURL(val, u.GetIndex(), u.fileInfo(), true), nil
} 