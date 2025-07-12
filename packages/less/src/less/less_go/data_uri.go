package less_go

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"
)

// DataURI implements the data-uri function
func DataURI(context map[string]any, mimetypeNode, filePathNode any) any {
	// Handle parameter shifting - if only one parameter, it's the file path
	var mimetype string
	var filePath string
	
	if filePathNode == nil {
		filePathNode = mimetypeNode
		mimetypeNode = nil
	}
	
	// Extract mimetype if provided
	if mimetypeNode != nil {
		if quoted, ok := mimetypeNode.(*Quoted); ok {
			mimetype = quoted.value
		}
	}
	
	// Extract file path
	if quoted, ok := filePathNode.(*Quoted); ok {
		filePath = quoted.value
	} else {
		return createFallbackURL(context, filePathNode)
	}
	
	// Get current file info from context (following the JS pattern)
	var currentFileInfo map[string]any
	var currentDirectory string
	
	if cfi, ok := context["currentFileInfo"].(map[string]any); ok {
		currentFileInfo = cfi
		if rewriteUrls, ok := cfi["rewriteUrls"].(bool); ok && rewriteUrls {
			if cd, ok := cfi["currentDirectory"].(string); ok {
				currentDirectory = cd
			}
		} else {
			if ep, ok := cfi["entryPath"].(string); ok {
				currentDirectory = ep
			}
		}
	}
	
	// Handle fragments (hash parts)
	fragmentStart := strings.Index(filePath, "#")
	fragment := ""
	if fragmentStart != -1 {
		fragment = filePath[fragmentStart:]
		filePath = filePath[:fragmentStart]
	}
	
	// Clone context and set rawBuffer (following JS pattern)
	clonedContext := make(map[string]any)
	for k, v := range context {
		clonedContext[k] = v
	}
	clonedContext["rawBuffer"] = true
	
	// Get environment
	environment, ok := context["environment"].(map[string]any)
	if !ok {
		return createFallbackURL(context, filePathNode)
	}
	
	// Get file manager
	getFileManager, ok := environment["getFileManager"].(func(string, string, map[string]any, map[string]any, bool) any)
	if !ok {
		return createFallbackURL(context, filePathNode)
	}
	
	fileManager := getFileManager(filePath, currentDirectory, clonedContext, environment, true)
	if fileManager == nil {
		return createFallbackURL(context, filePathNode)
	}
	
	useBase64 := false
	
	// Detect mimetype if not provided
	if mimetypeNode == nil {
		if mimeLookup, ok := environment["mimeLookup"].(func(string) string); ok {
			mimetype = mimeLookup(filePath)
		}
		
		if mimetype == "image/svg+xml" {
			useBase64 = false
		} else {
			// Use base64 unless it's ASCII or UTF-8
			if charsetLookup, ok := environment["charsetLookup"].(func(string) string); ok {
				charset := charsetLookup(mimetype)
				useBase64 = charset != "US-ASCII" && charset != "UTF-8"
			} else {
				useBase64 = true // Default to base64 if no charset lookup
			}
		}
		if useBase64 {
			mimetype += ";base64"
		}
	} else {
		// Check if base64 is explicitly specified
		base64Regex := regexp.MustCompile(`;base64$`)
		useBase64 = base64Regex.MatchString(mimetype)
	}
	
	// Load file contents
	loadFileSync, ok := fileManager.(map[string]any)["loadFileSync"].(func(string, string, map[string]any, map[string]any) map[string]any)
	if !ok {
		return createFallbackURL(context, filePathNode)
	}
	
	fileSync := loadFileSync(filePath, currentDirectory, clonedContext, environment)
	if fileSync == nil {
		return logWarningAndFallback(context, filePath, mimetypeNode, filePathNode)
	}
	
	contents, ok := fileSync["contents"].(string)
	if !ok || contents == "" {
		return logWarningAndFallback(context, filePath, mimetypeNode, filePathNode)
	}
	
	buf := contents
	
	// Handle base64 encoding
	if useBase64 {
		encodeBase64, ok := environment["encodeBase64"].(func(string) string)
		if !ok {
			return createFallbackURL(context, filePathNode)
		}
		buf = encodeBase64(buf)
	} else {
		// URL encode the content
		buf = url.QueryEscape(buf)
	}
	
	// Create data URI
	uri := fmt.Sprintf("data:%s,%s%s", mimetype, buf, fragment)
	
	// Get index and file info from context
	index := 0
	if idx, ok := context["index"].(int); ok {
		index = idx
	}
	
	// Create URL node with quoted value
	quotedValue := NewQuoted("\"", uri, false, index, currentFileInfo)
	urlNode := NewURL(quotedValue, index, currentFileInfo, false)
	
	return urlNode
}

// createFallbackURL creates a fallback URL node when data-uri fails
func createFallbackURL(context map[string]any, node any) any {
	index := 0
	if idx, ok := context["index"].(int); ok {
		index = idx
	}
	
	var currentFileInfo map[string]any
	if cfi, ok := context["currentFileInfo"].(map[string]any); ok {
		currentFileInfo = cfi
	}
	
	urlNode := NewURL(node, index, currentFileInfo, false)
	return urlNode.Eval(context)
}

// logWarningAndFallback logs a warning and creates a fallback URL
func logWarningAndFallback(context map[string]any, filePath string, mimetypeNode, filePathNode any) any {
	// Log warning if logger is available
	if logger, ok := context["logger"].(map[string]any); ok {
		if warn, ok := logger["warn"].(func(string)); ok {
			warn(fmt.Sprintf("Skipped data-uri embedding of %s because file not found", filePath))
		}
	}
	
	if mimetypeNode != nil {
		return createFallbackURL(context, mimetypeNode)
	}
	return createFallbackURL(context, filePathNode)
}

// GetDataURIFunctions returns the data-uri function registry
func GetDataURIFunctions() map[string]any {
	return map[string]any{
		"data-uri": DataURI,
	}
}