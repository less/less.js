package less_go

import (
	"fmt"
	"regexp"

)

// CSS pattern regex for detecting CSS files
var cssPatternRegex = regexp.MustCompile(`[#.&?]css([?;].*)?$`)

// Import represents a CSS @import node
// The general strategy here is that we don't want to wait
// for the parsing to be completed, before we start importing
// the file. That's because in the context of a browser,
// most of the time will be spent waiting for the server to respond.
//
// On creation, we push the import path to our import queue, though
// `import,push`, we also pass it a callback, which it'll call once
// the file has been fetched, and parsed.
type Import struct {
	*Node
	path             any
	features         any
	options          map[string]any
	_index           int
	_fileInfo        map[string]any
	allowRoot        bool
	css              bool
	skip             any
	root             any
	importedFilename string
	error            error
}

// NewImport creates a new Import instance
func NewImport(path any, features any, options map[string]any, index int, currentFileInfo map[string]any, visibilityInfo map[string]any) *Import {
	imp := &Import{
		Node:      NewNode(),
		path:      path,
		features:  features,
		options:   options,
		_index:    index,
		_fileInfo: currentFileInfo,
		allowRoot: true,
	}

	if imp.options != nil {
		if _, hasLess := imp.options["less"]; hasLess || imp.options["inline"] != nil {
			imp.css = !imp.getBoolOption("less") || imp.getBoolOption("inline")
		} else {
			pathValue := imp.GetPath()
			if pathValue != nil {
				if pathStr, ok := pathValue.(string); ok && cssPatternRegex.MatchString(pathStr) {
					imp.css = true
				}
			}
		}
	} else {
		pathValue := imp.GetPath()
		if pathValue != nil {
			if pathStr, ok := pathValue.(string); ok && cssPatternRegex.MatchString(pathStr) {
				imp.css = true
			}
		}
	}

	imp.CopyVisibilityInfo(visibilityInfo)
	imp.SetParent(imp.features, imp.Node)
	imp.SetParent(imp.path, imp.Node)

	return imp
}

// getBoolOption safely gets a boolean option value
func (i *Import) getBoolOption(key string) bool {
	if i.options == nil {
		return false
	}
	if val, ok := i.options[key]; ok {
		if boolVal, ok := val.(bool); ok {
			return boolVal
		}
	}
	return false
}

// GetType returns the type of the node
func (i *Import) GetType() string {
	return "Import"
}

// GetIndex returns the node's index
func (i *Import) GetIndex() int {
	return i._index
}

// FileInfo returns the node's file information
func (i *Import) FileInfo() map[string]any {
	return i._fileInfo
}

// Accept visits the import with a visitor
func (i *Import) Accept(visitor any) {
	if v, ok := visitor.(interface{ Visit(any) any }); ok {
		if i.features != nil {
			i.features = v.Visit(i.features)
		}
		i.path = v.Visit(i.path)
		if i.options != nil && !i.getBoolOption("isPlugin") && !i.getBoolOption("inline") && i.root != nil {
			i.root = v.Visit(i.root)
		}
	}
}

// GenCSS generates CSS representation
func (i *Import) GenCSS(context any, output *CSSOutput) {
	if i.css && i.pathFileInfoReference() == nil {
		output.Add("@import ", i._fileInfo, i._index)
		if pathGen, ok := i.path.(interface{ GenCSS(any, *CSSOutput) }); ok {
			pathGen.GenCSS(context, output)
		}
		if i.features != nil {
			output.Add(" ", nil, nil)
			if featuresGen, ok := i.features.(interface{ GenCSS(any, *CSSOutput) }); ok {
				featuresGen.GenCSS(context, output)
			}
		}
		output.Add(";", nil, nil)
	}
}

// pathFileInfoReference gets the reference from path's file info
func (i *Import) pathFileInfoReference() any {
	if pathWithFileInfo, ok := i.path.(interface{ FileInfo() map[string]any }); ok {
		fileInfo := pathWithFileInfo.FileInfo()
		if fileInfo != nil {
			return fileInfo["reference"]
		}
	}
	// Handle the case where path has _fileInfo field directly
	if pathMap, ok := i.path.(map[string]any); ok {
		if fileInfo, ok := pathMap["_fileInfo"].(map[string]any); ok {
			return fileInfo["reference"]
		}
	}
	return nil
}

// GetPath returns the path value
func (i *Import) GetPath() any {
	if urlPath, ok := i.path.(*URL); ok {
		if urlValue, ok := urlPath.Value.(map[string]any); ok {
			return urlValue["value"]
		}
		return urlPath.Value
	}
	if pathMap, ok := i.path.(map[string]any); ok {
		return pathMap["value"]
	}
	if pathWithValue, ok := i.path.(interface{ GetValue() any }); ok {
		return pathWithValue.GetValue()
	}
	return i.path
}

// IsVariableImport checks if the import path contains variables
func (i *Import) IsVariableImport() bool {
	path := i.path
	if urlPath, ok := path.(*URL); ok {
		path = urlPath.Value
	}
	if quotedPath, ok := path.(*Quoted); ok {
		return quotedPath.ContainsVariables()
	}
	return true
}

// EvalForImport evaluates the import for import processing
func (i *Import) EvalForImport(context any) *Import {
	path := i.path
	if urlPath, ok := path.(*URL); ok {
		path = urlPath.Value
	}

	var evaluatedPath any
	if pathEval, ok := path.(interface{ Eval(any) (any, error) }); ok {
		result, err := pathEval.Eval(context)
		if err != nil {
			// In JS version, eval doesn't return error, so we use the original path
			evaluatedPath = path
		} else {
			evaluatedPath = result
		}
	} else {
		evaluatedPath = path
	}

	return NewImport(evaluatedPath, i.features, i.options, i._index, i._fileInfo, i.VisibilityInfo())
}

// EvalPath evaluates the import path
func (i *Import) EvalPath(context any) any {
	var path any
	if pathEval, ok := i.path.(interface{ Eval(any) (any, error) }); ok {
		result, err := pathEval.Eval(context)
		if err != nil {
			path = i.path
		} else {
			path = result
		}
	} else {
		path = i.path
	}

	fileInfo := i._fileInfo

	// Check if path is not a URL
	if _, ok := path.(*URL); !ok {
		var pathValue any
		if pathMap, ok := path.(map[string]any); ok {
			pathValue = pathMap["value"]
		} else if pathWithValue, ok := path.(interface{ GetValue() any }); ok {
			pathValue = pathWithValue.GetValue()
		} else {
			pathValue = path
		}

		if pathValueStr, ok := pathValue.(string); ok && pathValueStr != "" && fileInfo != nil {
			ctx, ok := context.(map[string]any)
			if ok {
				// Check if path requires rewrite
				if pathRequiresRewrite, ok := ctx["pathRequiresRewrite"].(func(string) bool); ok && pathRequiresRewrite(pathValueStr) {
					if rewritePath, ok := ctx["rewritePath"].(func(string, string) string); ok {
						if rootpath, ok := fileInfo["rootpath"].(string); ok {
							newValue := rewritePath(pathValueStr, rootpath)
							if pathMap, ok := path.(map[string]any); ok {
								pathMap["value"] = newValue
							}
						}
					}
				} else if normalizePath, ok := ctx["normalizePath"].(func(string) string); ok {
					normalizedValue := normalizePath(pathValueStr)
					if pathMap, ok := path.(map[string]any); ok {
						pathMap["value"] = normalizedValue
					}
				}
			}
		}
	}

	return path
}

// Eval evaluates the import
func (i *Import) Eval(context any) (any, error) {
	result, err := i.DoEval(context)
	if err != nil {
		return nil, err
	}

	if i.getBoolOption("reference") || i.BlocksVisibility() {
		if resultSlice, ok := result.([]any); ok {
			for _, node := range resultSlice {
				if nodeWithVisibility, ok := node.(interface{ AddVisibilityBlock() }); ok {
					nodeWithVisibility.AddVisibilityBlock()
				}
			}
		} else {
			if nodeWithVisibility, ok := result.(interface{ AddVisibilityBlock() }); ok {
				nodeWithVisibility.AddVisibilityBlock()
			}
		}
	}

	return result, nil
}

// DoEval performs the actual evaluation logic
func (i *Import) DoEval(context any) (any, error) {
	var features any
	if i.features != nil {
		if featuresEval, ok := i.features.(interface{ Eval(any) (any, error) }); ok {
			result, err := featuresEval.Eval(context)
			if err != nil {
				return nil, err
			}
			features = result
		} else {
			features = i.features
		}
	}

	// Handle plugin imports
	if i.getBoolOption("isPlugin") {
		if i.root != nil {
			if rootEval, ok := i.root.(interface{ Eval(any) (any, error) }); ok {
				_, err := rootEval.Eval(context)
				if err != nil {
					// Create LessError like JavaScript version
					var filename string
					if rootWithFilename, ok := i.root.(interface{ GetFilename() string }); ok {
						filename = rootWithFilename.GetFilename()
					}
					lessErr := NewLessError(ErrorDetails{
						Message: "Plugin error during evaluation",
					}, nil, filename)
					return nil, fmt.Errorf("%v", lessErr)
				}
			}
		}

		// Handle function registry
		if ctx, ok := context.(map[string]any); ok {
			if frames, ok := ctx["frames"].([]any); ok && len(frames) > 0 {
				if frameRuleset, ok := frames[0].(*Ruleset); ok && frameRuleset.FunctionRegistry != nil {
					if i.root != nil {
						if rootWithFunctions, ok := i.root.(interface{ GetFunctions() map[string]any }); ok {
							functions := rootWithFunctions.GetFunctions()
							if functions != nil {
								if registry, ok := frameRuleset.FunctionRegistry.(interface{ AddMultiple(map[string]any) }); ok {
									registry.AddMultiple(functions)
								}
							}
						}
					}
				}
			}
		}

		return []any{}, nil
	}

	// Handle skip logic
	if i.skip != nil {
		var shouldSkip bool
		if skipFunc, ok := i.skip.(func() bool); ok {
			shouldSkip = skipFunc()
		} else if skipBool, ok := i.skip.(bool); ok {
			shouldSkip = skipBool
		}
		if shouldSkip {
			return []any{}, nil
		}
	}

	// Handle inline imports
	if i.getBoolOption("inline") {
		contents := NewAnonymous(i.root, 0, map[string]any{
			"filename":  i.importedFilename,
			"reference": i.pathFileInfoReference(),
		}, true, true, nil)

		if features != nil {
			if featuresWithValue, ok := features.(interface{ GetValue() any }); ok {
				return NewMedia([]any{contents}, featuresWithValue.GetValue(), 0, nil, nil), nil
			}
			return NewMedia([]any{contents}, features, 0, nil, nil), nil
		}
		return []any{contents}, nil
	}

	// Handle CSS imports
	if i.css {
		newImport := NewImport(i.EvalPath(context), features, i.options, i._index, i._fileInfo, nil)
		if !newImport.css && i.error != nil {
			return nil, i.error
		}
		return newImport, nil
	}

	// Handle regular imports with root
	if i.root != nil {
		var rules []any
		if rootWithRules, ok := i.root.(interface{ GetRules() []any }); ok {
			rules = CopyArray(rootWithRules.GetRules())
		} else if rootRules, ok := i.root.([]any); ok {
			rules = CopyArray(rootRules)
		}

		ruleset := NewRuleset(nil, rules, false, nil)
		if err := ruleset.EvalImports(context); err != nil {
			return nil, err
		}

		if features != nil {
			if featuresWithValue, ok := features.(interface{ GetValue() any }); ok {
				return NewMedia(ruleset.Rules, featuresWithValue.GetValue(), 0, nil, nil), nil
			}
			return NewMedia(ruleset.Rules, features, 0, nil, nil), nil
		}
		return ruleset.Rules, nil
	}

	return []any{}, nil
} 