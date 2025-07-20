package less_go

import (
	"strings"
)

// Parse represents the parsing context
type Parse struct {
	// Options
	Paths           []string
	RewriteUrls     RewriteUrlsType
	Rootpath        string
	StrictImports   bool
	Insecure        bool
	DumpLineNumbers bool
	Compress        bool
	SyncImport      bool
	ChunkInput      bool
	Mime            string
	UseFileCache    bool
	// Context
	ProcessImports bool
	// Used by the import manager to stop multiple import visitors being created
	PluginManager any
	Quiet         bool
}

// NewParse creates a new Parse context with the given options
func NewParse(options map[string]any) *Parse {
	p := &Parse{}
	copyFromOriginal(options, p)
	if paths, ok := options["paths"].(string); ok {
		p.Paths = []string{paths}
	} else if paths, ok := options["paths"].([]string); ok {
		p.Paths = paths
	}
	return p
}

// Eval represents the evaluation context
type Eval struct {
	// Options
	Paths           []string
	Compress        bool
	Math            MathType
	StrictUnits     bool
	SourceMap       bool
	ImportMultiple  bool
	UrlArgs         string
	JavascriptEnabled bool
	PluginManager   any
	ImportantScope  []string
	RewriteUrls     RewriteUrlsType

	// Internal state
	Frames       []any
	CalcStack    []bool
	ParensStack  []bool
	InCalc       bool
	MathOn       bool
	DefaultFunc  *DefaultFunc // For default() function in mixin guards
}

// NewEval creates a new Eval context with the given options and frames
func NewEval(options map[string]any, frames []any) *Eval {
	e := &Eval{
		Frames:      frames,
		MathOn:      true,
		ImportantScope: []string{},
	}
	copyFromOriginal(options, e)
	if paths, ok := options["paths"].(string); ok {
		e.Paths = []string{paths}
	} else if paths, ok := options["paths"].([]string); ok {
		e.Paths = paths
	}
	return e
}

// EnterCalc enters a calc context
func (e *Eval) EnterCalc() {
	if e.CalcStack == nil {
		e.CalcStack = make([]bool, 0)
	}
	e.CalcStack = append(e.CalcStack, true)
	e.InCalc = true
}

// ExitCalc exits a calc context
func (e *Eval) ExitCalc() {
	if len(e.CalcStack) > 0 {
		e.CalcStack = e.CalcStack[:len(e.CalcStack)-1]
		if len(e.CalcStack) == 0 {
			e.InCalc = false
		}
	}
}

// InParenthesis enters a parenthesis context
func (e *Eval) InParenthesis() {
	if e.ParensStack == nil {
		e.ParensStack = make([]bool, 0)
	}
	e.ParensStack = append(e.ParensStack, true)
}

// OutOfParenthesis exits a parenthesis context
func (e *Eval) OutOfParenthesis() {
	if len(e.ParensStack) > 0 {
		e.ParensStack = e.ParensStack[:len(e.ParensStack)-1]
	}
}

// IsMathOn determines if math operations are enabled (EvalContext interface)
func (e *Eval) IsMathOn() bool {
	return e.MathOn
}

// IsMathOnWithOp determines if math operations are enabled for the given operator
func (e *Eval) IsMathOnWithOp(op string) bool {
	if !e.MathOn {
		return false
	}
	if op == "/" && e.Math != MathAlways && (len(e.ParensStack) == 0) {
		return false
	}
	if e.Math > MathParensDivision {
		return len(e.ParensStack) > 0
	}
	return true
}

// SetMathOn sets the math operation state (EvalContext interface)
func (e *Eval) SetMathOn(mathOn bool) {
	e.MathOn = mathOn
}

// IsInCalc returns whether we're in a calc context (EvalContext interface)
func (e *Eval) IsInCalc() bool {
	return e.InCalc
}

// GetFrames returns the evaluation frames (EvalContext interface)
func (e *Eval) GetFrames() []ParserFrame {
	frames := make([]ParserFrame, 0, len(e.Frames))
	for _, frame := range e.Frames {
		if parserFrame, ok := frame.(ParserFrame); ok {
			frames = append(frames, parserFrame)
		}
	}
	return frames
}

// GetImportantScope returns the important scope stack (EvalContext interface)
func (e *Eval) GetImportantScope() []map[string]bool {
	// Convert ImportantScope to the expected format
	// For now, return empty as this is used for !important handling
	return []map[string]bool{}
}

// GetDefaultFunc returns the default function instance (EvalContext interface)
func (e *Eval) GetDefaultFunc() *DefaultFunc {
	return e.DefaultFunc
}

// PathRequiresRewrite determines if a path needs to be rewritten
func (e *Eval) PathRequiresRewrite(path string) bool {
	if e.RewriteUrls == RewriteUrlsLocal {
		return isPathLocalRelative(path)
	}
	return isPathRelative(path)
}

// RewritePath rewrites a path with the given rootpath
func (e *Eval) RewritePath(path, rootpath string) string {
	if rootpath == "" {
		rootpath = ""
	}
	newPath := e.NormalizePath(rootpath + path)

	// If a path was explicit relative and the rootpath was not an absolute path
	// we must ensure that the new path is also explicit relative.
	if isPathLocalRelative(path) &&
		isPathRelative(rootpath) &&
		!isPathLocalRelative(newPath) {
		newPath = "./" + newPath
	}

	return newPath
}

// NormalizePath normalizes a path by removing . and .. segments
func (e *Eval) NormalizePath(path string) string {
	segments := strings.Split(path, "/")
	pathSegments := make([]string, 0)

	for _, segment := range segments {
		switch segment {
		case ".":
			continue
		case "..":
			if len(pathSegments) == 0 || pathSegments[len(pathSegments)-1] == ".." {
				pathSegments = append(pathSegments, segment)
			} else {
				pathSegments = pathSegments[:len(pathSegments)-1]
			}
		default:
			pathSegments = append(pathSegments, segment)
		}
	}

	return strings.Join(pathSegments, "/")
}

// Helper functions
func isPathRelative(path string) bool {
	// JavaScript regex: /^(?:[a-z-]+:|\/|#)/i
	// This matches any scheme (e.g., http:, https:, file:, data:, etc.), absolute paths, or hash fragments
	if path == "" {
		return true
	}
	
	// Check for absolute path or hash fragment
	if strings.HasPrefix(path, "/") || strings.HasPrefix(path, "#") {
		return false
	}
	
	// Check for any scheme (case-insensitive)
	// Look for pattern: [a-z-]+:
	lowerPath := strings.ToLower(path)
	colonIndex := strings.Index(lowerPath, ":")
	if colonIndex > 0 {
		// Check if all characters before colon are valid scheme characters (a-z or -)
		scheme := lowerPath[:colonIndex]
		for _, ch := range scheme {
			if !((ch >= 'a' && ch <= 'z') || ch == '-') {
				return true // Not a valid scheme, so it's relative
			}
		}
		return false // Valid scheme found, so it's not relative
	}
	
	return true
}

func isPathLocalRelative(path string) bool {
	return strings.HasPrefix(path, ".")
}

// copyFromOriginal copies properties from a map to a struct
func copyFromOriginal(original map[string]any, destination any) {
	if original == nil {
		return
	}

	switch d := destination.(type) {
	case *Parse:
		if paths, ok := original["paths"].([]string); ok {
			d.Paths = paths
		} else if path, ok := original["paths"].(string); ok {
			d.Paths = []string{path}
		}
		if rewriteUrls, ok := original["rewriteUrls"].(RewriteUrlsType); ok {
			d.RewriteUrls = rewriteUrls
		}
		if rootpath, ok := original["rootpath"].(string); ok {
			d.Rootpath = rootpath
		}
		if strictImports, ok := original["strictImports"].(bool); ok {
			d.StrictImports = strictImports
		}
		if insecure, ok := original["insecure"].(bool); ok {
			d.Insecure = insecure
		}
		if dumpLineNumbers, ok := original["dumpLineNumbers"].(bool); ok {
			d.DumpLineNumbers = dumpLineNumbers
		}
		if compress, ok := original["compress"].(bool); ok {
			d.Compress = compress
		}
		if syncImport, ok := original["syncImport"].(bool); ok {
			d.SyncImport = syncImport
		}
		if chunkInput, ok := original["chunkInput"].(bool); ok {
			d.ChunkInput = chunkInput
		}
		if mime, ok := original["mime"].(string); ok {
			d.Mime = mime
		}
		if useFileCache, ok := original["useFileCache"].(bool); ok {
			d.UseFileCache = useFileCache
		}
		if processImports, ok := original["processImports"].(bool); ok {
			d.ProcessImports = processImports
		}
		if pluginManager, ok := original["pluginManager"]; ok {
			d.PluginManager = pluginManager
		}
		if quiet, ok := original["quiet"].(bool); ok {
			d.Quiet = quiet
		}
	case *Eval:
		if paths, ok := original["paths"].([]string); ok {
			d.Paths = paths
		} else if path, ok := original["paths"].(string); ok {
			d.Paths = []string{path}
		}
		if compress, ok := original["compress"].(bool); ok {
			d.Compress = compress
		}
		if math, ok := original["math"].(MathType); ok {
			d.Math = math
		}
		if strictUnits, ok := original["strictUnits"].(bool); ok {
			d.StrictUnits = strictUnits
		}
		if sourceMap, ok := original["sourceMap"].(bool); ok {
			d.SourceMap = sourceMap
		}
		if importMultiple, ok := original["importMultiple"].(bool); ok {
			d.ImportMultiple = importMultiple
		}
		if urlArgs, ok := original["urlArgs"].(string); ok {
			d.UrlArgs = urlArgs
		}
		if javascriptEnabled, ok := original["javascriptEnabled"].(bool); ok {
			d.JavascriptEnabled = javascriptEnabled
		}
		if pluginManager, ok := original["pluginManager"]; ok {
			d.PluginManager = pluginManager
		}
		if importantScope, ok := original["importantScope"].([]string); ok {
			d.ImportantScope = importantScope
		}
		if rewriteUrls, ok := original["rewriteUrls"].(RewriteUrlsType); ok {
			d.RewriteUrls = rewriteUrls
		}
	}
} 