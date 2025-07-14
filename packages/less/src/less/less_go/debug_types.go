package less_go

import (
	"fmt"
)

// DebugContext represents debug context information
type DebugContext struct {
	DebugInfo any
}

// ParserContext represents parser context information  
type ParserContext struct {
	DumpLineNumbers string
	Compress        bool
}

// DebugInfo generates debug information output
func DebugInfo(context *ParserContext, debugCtx *DebugContext, separator string) string {
	if debugCtx == nil || debugCtx.DebugInfo == nil {
		return ""
	}
	
	if context.DumpLineNumbers == "comments" {
		return asComment(debugCtx)
	}
	
	return ""
}

// asComment converts debug context to comment format
func asComment(debugCtx *DebugContext) string {
	if debugCtx == nil || debugCtx.DebugInfo == nil {
		return ""
	}
	
	// Extract line and filename from debug info
	if debugInfo, ok := debugCtx.DebugInfo.(struct {
		LineNumber any
		FileName   string
	}); ok {
		var lineStr string
		switch line := debugInfo.LineNumber.(type) {
		case int:
			lineStr = fmt.Sprintf("%d", line)
		case float64:
			lineStr = fmt.Sprintf("%.0f", line)
		default:
			lineStr = fmt.Sprintf("%v", line)
		}
		return "/* line " + lineStr + ", " + debugInfo.FileName + " */\n"
	}
	
	return ""
}

// asMediaQuery converts debug context to media query format
func asMediaQuery(debugCtx *DebugContext) string {
	if debugCtx == nil || debugCtx.DebugInfo == nil {
		return ""
	}
	
	// Extract line and filename from debug info
	if debugInfo, ok := debugCtx.DebugInfo.(struct {
		LineNumber any
		FileName   string
	}); ok {
		var lineStr string
		switch line := debugInfo.LineNumber.(type) {
		case int:
			lineStr = fmt.Sprintf("%d", line)
		case float64:
			lineStr = fmt.Sprintf("%.0f", line)
		default:
			lineStr = fmt.Sprintf("%v", line)
		}
		return "@media -sass-debug-info{filename{font-family:file\\://" + debugInfo.FileName + 
			"}line{font-family:\\00003" + lineStr + "}}\n"
	}
	
	return ""
}