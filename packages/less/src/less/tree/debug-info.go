package tree

import (
	"fmt"
	"regexp"
	"strings"
)

// DebugContext represents the context containing debug information
type DebugContext struct {
	DebugInfo struct {
		LineNumber interface{}
		FileName   string
	}
}

// Context represents the compilation context
type Context struct {
	DumpLineNumbers string
	Compress        bool
}

// asComment generates a comment string with line number and filename
func asComment(ctx *DebugContext) string {
	return fmt.Sprintf("/* line %v, %s */\n", ctx.DebugInfo.LineNumber, ctx.DebugInfo.FileName)
}

// asMediaQuery generates a media query string with line number and filename
func asMediaQuery(ctx *DebugContext) string {
	filenameWithProtocol := ctx.DebugInfo.FileName
	if !regexp.MustCompile(`^[a-z]+://`).MatchString(strings.ToLower(filenameWithProtocol)) {
		filenameWithProtocol = "file://" + filenameWithProtocol
	}

	// Replace special characters with escaped versions
	escapedFilename := strings.ReplaceAll(filenameWithProtocol, "\\", "/")
	escapedFilename = regexp.MustCompile(`([.:/\\])`).ReplaceAllString(escapedFilename, "\\$1")

	// Format line number to match JavaScript format exactly
	lineNumber := fmt.Sprintf("%d", ctx.DebugInfo.LineNumber)
	return fmt.Sprintf("@media -sass-debug-info{filename{font-family:%s}line{font-family:\\00003%s}}\n",
		escapedFilename, lineNumber)
}

// DebugInfo generates debug information based on the context and debug context
func DebugInfo(context *Context, ctx *DebugContext, lineSeparator string) string {
	if context.DumpLineNumbers == "" || context.Compress {
		return ""
	}

	var result string
	switch context.DumpLineNumbers {
	case "comments":
		result = asComment(ctx)
	case "mediaquery":
		result = asMediaQuery(ctx)
	case "all":
		result = asComment(ctx)
		if lineSeparator != "" {
			result += lineSeparator
		}
		result += asMediaQuery(ctx)
	}
	return result
} 