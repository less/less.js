package less_go

import (
	"fmt"
	"regexp"
	"strings"
)

// asComment generates debug info as a comment
func asComment(lineNumber int, fileName string) string {
	return fmt.Sprintf("/* line %d, %s */\n", lineNumber, fileName)
}

// asMediaQuery generates debug info as a media query
func asMediaQuery(lineNumber int, fileName string) string {
	filenameWithProtocol := fileName
	if matched, _ := regexp.MatchString(`^[a-z]+://`, strings.ToLower(filenameWithProtocol)); !matched {
		filenameWithProtocol = "file://" + filenameWithProtocol
	}
	
	// Replace special characters
	re := regexp.MustCompile(`[.:/\\]`)
	escapedFilename := re.ReplaceAllStringFunc(filenameWithProtocol, func(a string) string {
		if a == "\\" {
			a = "/"
		}
		return "\\" + a
	})
	
	return fmt.Sprintf("@media -sass-debug-info{filename{font-family:%s}line{font-family:\\00003%d}}\n", 
		escapedFilename, lineNumber)
}

// DebugInfo generates debug information based on context settings
func DebugInfo(context map[string]any, node any, lineSeparator string) string {
	result := ""
	
	dumpLineNumbers, _ := context["dumpLineNumbers"].(string)
	compress, _ := context["compress"].(bool)
	
	if dumpLineNumbers != "" && !compress {
		// Get debug info from the node
		var ctx map[string]any
		if nodeWithDebug, ok := node.(interface{ GetDebugInfo() map[string]any }); ok {
			if debugInfo := nodeWithDebug.GetDebugInfo(); debugInfo != nil {
				ctx = map[string]any{"debugInfo": debugInfo}
			}
		}
		
		if ctx != nil {
			debugInfo := ctx["debugInfo"].(map[string]any)
			lineNumber, _ := debugInfo["lineNumber"].(int)
			fileName, _ := debugInfo["fileName"].(string)
			
			switch dumpLineNumbers {
			case "comments":
				result = asComment(lineNumber, fileName)
			case "mediaquery":
				result = asMediaQuery(lineNumber, fileName)
			case "all":
				result = asComment(lineNumber, fileName) + lineSeparator + asMediaQuery(lineNumber, fileName)
			}
		}
	}
	
	return result
}