package less_go

import (
	"encoding/base64"
	"encoding/xml"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"net/url"
	"path/filepath"
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
		// URL encode to match JavaScript's encodeURIComponent exactly
		buf = encodeURIComponent(buf)
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
	evaluated, err := urlNode.Eval(context)
	if err != nil {
		// Return nil on error - caller will handle appropriately
		return nil
	}
	return evaluated
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

// GetWrappedDataURIFunctions returns data-uri functions for registry
func GetWrappedDataURIFunctions() map[string]interface{} {
	return map[string]interface{}{
		"data-uri":   &DataURIFunctionWrapper{},
		"image-size": &ImageSizeFunctionWrapper{},
	}
}

// DataURIFunctionWrapper wraps the data-uri function to implement FunctionDefinition
type DataURIFunctionWrapper struct{}

func (w *DataURIFunctionWrapper) Call(args ...any) (any, error) {
	return nil, fmt.Errorf("data-uri function requires context - use CallCtx instead")
}

func (w *DataURIFunctionWrapper) CallCtx(ctx *Context, args ...any) (any, error) {
	contextMap := buildContextMap(ctx)
	var result any
	if len(args) == 1 {
		result = DataURI(contextMap, nil, args[0])
	} else if len(args) == 2 {
		result = DataURI(contextMap, args[0], args[1])
	} else {
		return nil, fmt.Errorf("data-uri expects 1 or 2 arguments, got %d", len(args))
	}
	return result, nil
}

func (w *DataURIFunctionWrapper) NeedsEvalArgs() bool {
	return false
}

// ImageSizeFunctionWrapper wraps the image-size function to implement FunctionDefinition
type ImageSizeFunctionWrapper struct{}

func (w *ImageSizeFunctionWrapper) Call(args ...any) (any, error) {
	return nil, fmt.Errorf("image-size function requires context - use CallCtx instead")
}

func (w *ImageSizeFunctionWrapper) CallCtx(ctx *Context, args ...any) (any, error) {
	if len(args) != 1 {
		return nil, fmt.Errorf("image-size expects 1 argument, got %d", len(args))
	}
	contextMap := buildContextMap(ctx)
	result := ImageSize(contextMap, args[0])
	return result, nil
}

func (w *ImageSizeFunctionWrapper) NeedsEvalArgs() bool {
	return false
}

// buildContextMap builds a context map from the Context for data-uri and image-size functions
func buildContextMap(ctx *Context) map[string]any {
	contextMap := make(map[string]any)
	var paths []string
	var currentFileInfo map[string]any
	var currentDirectory string

	if ctx != nil && len(ctx.Frames) > 0 && ctx.Frames[0] != nil {
		frame := ctx.Frames[0]
		if evalCtx, ok := frame.EvalContext.(*Eval); ok {
			paths = evalCtx.Paths
		}
		if frame.CurrentFileInfo != nil {
			currentFileInfo = frame.CurrentFileInfo
			if filename, ok := currentFileInfo["filename"].(string); ok {
				currentDirectory = filepath.Dir(filename)
			}
		}
	}

	if currentDirectory == "" {
		currentDirectory = "."
	}
	if currentFileInfo == nil {
		currentFileInfo = make(map[string]any)
	}
	currentFileInfo["currentDirectory"] = currentDirectory

	contextMap["paths"] = paths
	contextMap["currentFileInfo"] = currentFileInfo
	contextMap["index"] = 0
	contextMap["environment"] = createGoEnvironment()
	return contextMap
}

// createGoEnvironment creates a simplified environment for Go-based file operations
func createGoEnvironment() map[string]any {
	fileManager := NewFileSystemFileManager()
	return map[string]any{
		"getFileManager": func(filename, currentDirectory string, context, environment map[string]any, isReference bool) any {
			return map[string]any{
				"loadFileSync": func(filename, currentDirectory string, context, environment map[string]any) map[string]any {
					result := fileManager.LoadFileSync(filename, currentDirectory, context, nil)
					if result.Message != "" {
						return nil
					}
					return map[string]any{
						"contents": result.Contents,
						"filename": result.Filename,
					}
				},
			}
		},
		"mimeLookup":    func(filename string) string { return getMimeType(filename) },
		"charsetLookup": func(mimeType string) string { return getCharset(mimeType) },
		"encodeBase64":  func(data string) string { return encodeBase64(data) },
	}
}

// ImageSize implements the image-size function
func ImageSize(context map[string]any, filePathNode any) any {
	var filePath string
	if quoted, ok := filePathNode.(*Quoted); ok {
		filePath = quoted.value
	} else {
		return nil
	}

	environment, ok := context["environment"].(map[string]any)
	if !ok {
		return nil
	}

	var currentFileInfo map[string]any
	var currentDirectory string
	if cfi, ok := context["currentFileInfo"].(map[string]any); ok {
		currentFileInfo = cfi
		if cd, ok := cfi["currentDirectory"].(string); ok {
			currentDirectory = cd
		}
	}

	getFileManager, ok := environment["getFileManager"].(func(string, string, map[string]any, map[string]any, bool) any)
	if !ok {
		return nil
	}

	fileManager := getFileManager(filePath, currentDirectory, context, environment, true)
	if fileManager == nil {
		return nil
	}

	loadFileSync, ok := fileManager.(map[string]any)["loadFileSync"].(func(string, string, map[string]any, map[string]any) map[string]any)
	if !ok {
		return nil
	}

	fileSync := loadFileSync(filePath, currentDirectory, context, environment)
	if fileSync == nil {
		return nil
	}

	contents, ok := fileSync["contents"].(string)
	if !ok || contents == "" {
		return nil
	}

	width, height := getImageDimensions(filePath, contents)
	if width == 0 && height == 0 {
		return nil
	}

	index := 0
	if idx, ok := context["index"].(int); ok {
		index = idx
	}

	widthDim, err := NewDimension(float64(width), "px")
	if err != nil {
		return nil
	}
	heightDim, err := NewDimension(float64(height), "px")
	if err != nil {
		return nil
	}

	expr, err := NewExpression([]any{widthDim, heightDim}, false)
	if err != nil {
		return nil
	}

	expr.Index = index
	if currentFileInfo != nil {
		expr.SetFileInfo(currentFileInfo)
	}
	return expr
}

// getImageDimensions extracts width and height from an image file
func getImageDimensions(filename, contents string) (int, int) {
	lower := strings.ToLower(filename)
	if strings.HasSuffix(lower, ".svg") {
		return parseSVGDimensions(contents)
	}
	reader := strings.NewReader(contents)
	config, _, err := image.DecodeConfig(reader)
	if err != nil {
		return 0, 0
	}
	return config.Width, config.Height
}

// parseSVGDimensions extracts dimensions from SVG content
func parseSVGDimensions(contents string) (int, int) {
	type SVGRoot struct {
		Width  string `xml:"width,attr"`
		Height string `xml:"height,attr"`
	}
	var svg SVGRoot
	err := xml.Unmarshal([]byte(contents), &svg)
	if err != nil {
		return 0, 0
	}
	width := parseDimension(svg.Width)
	height := parseDimension(svg.Height)
	return width, height
}

// parseDimension parses a dimension string like "100" or "100px" to an integer
func parseDimension(dim string) int {
	dim = strings.TrimSpace(dim)
	dim = strings.TrimSuffix(dim, "px")
	dim = strings.TrimSuffix(dim, "pt")
	dim = strings.TrimSpace(dim)
	var value int
	_, err := fmt.Sscanf(dim, "%d", &value)
	if err != nil {
		return 0
	}
	return value
}

// getMimeType returns the MIME type for a filename
func getMimeType(filename string) string {
	lower := strings.ToLower(filename)
	mimeTypes := map[string]string{
		".svg":   "image/svg+xml",
		".png":   "image/png",
		".jpg":   "image/jpeg",
		".jpeg":  "image/jpeg",
		".gif":   "image/gif",
		".bmp":   "image/bmp",
		".webp":  "image/webp",
		".ico":   "image/x-icon",
		".woff":  "application/font-woff",
		".woff2": "application/font-woff2",
		".ttf":   "application/x-font-ttf",
		".eot":   "application/vnd.ms-fontobject",
		".otf":   "application/x-font-opentype",
	}
	for ext, mime := range mimeTypes {
		if strings.HasSuffix(lower, ext) {
			return mime
		}
	}
	return "application/octet-stream"
}

// getCharset returns the charset for a MIME type
func getCharset(mimeType string) string {
	if strings.HasPrefix(mimeType, "text/") {
		return "UTF-8"
	}
	if strings.Contains(mimeType, "svg") {
		return "UTF-8"
	}
	return "binary"
}

// encodeBase64 encodes a string to base64
func encodeBase64(data string) string {
	return base64.StdEncoding.EncodeToString([]byte(data))
}

// encodeURIComponent encodes a string to match JavaScript's encodeURIComponent
// JavaScript's encodeURIComponent does NOT encode: A-Z a-z 0-9 - _ . ! ~ * ' ( )
// This differs from Go's url.QueryEscape which:
//   - Uses + for spaces (we need %20)
//   - Encodes ! * ' ( ) (JavaScript doesn't)
func encodeURIComponent(s string) string {
	// Start with QueryEscape which handles most characters correctly
	encoded := url.QueryEscape(s)

	// Fix space encoding: JavaScript uses %20, not +
	encoded = strings.ReplaceAll(encoded, "+", "%20")

	// Unescape characters that JavaScript's encodeURIComponent leaves unencoded
	encoded = strings.ReplaceAll(encoded, "%21", "!") // !
	encoded = strings.ReplaceAll(encoded, "%2A", "*") // *
	encoded = strings.ReplaceAll(encoded, "%27", "'") // '
	encoded = strings.ReplaceAll(encoded, "%28", "(") // (
	encoded = strings.ReplaceAll(encoded, "%29", ")") // )

	// Note: url.QueryEscape already leaves these unencoded: - _ . ~
	// which matches JavaScript's behavior

	return encoded
}