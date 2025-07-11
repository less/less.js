package less_go

import (
	"fmt"
	"strings"
)

// ErrorDetails holds the raw information from which a LessError is constructed.
// This mirrors the 'e' object passed to the JS constructor.
type ErrorDetails struct {
	Message  string
	Stack    string
	Filename string
	Index    any // Can be int or nil
	Call     any // Can be int or nil
	Type     string
}

// LessError represents a Less-specific error, containing contextual information.
type LessError struct {
	Type        string
	Message     string
	Stack       string // Original stack trace if provided
	Filename    string
	Index       any    // Original index, might be nil
	Line        *int   // Use pointer to represent potential null/undefined
	Column      int    // 0-based column index
	CallLine    *int   // Line number from where the error originated (e.g., mixin call)
	CallExtract string // Source line from the call site
	Extract     []string // Lines of source code around the error: [line-1, line, line+1]
	fileContentMap map[string]string // Keep reference for formatting if needed later
}

// NewLessError creates a new LessError instance.
// fileContentMap maps filenames to their content.
// currentFilename is used if e.Filename is not provided.
func NewLessError(e ErrorDetails, fileContentMap map[string]string, currentFilename string) *LessError {
	filename := e.Filename
	if filename == "" {
		filename = currentFilename
	}

	le := &LessError{
		Message:        e.Message,
		Stack:         e.Stack,
		Type:          e.Type,
		Filename:      filename,
		Index:         e.Index,
		fileContentMap: fileContentMap,
		Column:        -1, // Default if not calculable
		Extract:       make([]string, 3), // Initialize with empty strings
	}

	if le.Type == "" {
		le.Type = "Syntax" // Default type
	}

	// If we don't have input content, return early
	input, hasInput := fileContentMap[filename]
	if !hasInput {
		return le
	}

	// Process index to get line and column
	if indexInt, ok := e.Index.(int); ok && indexInt >= 0 {
		loc := GetLocation(indexInt, input)
		if loc.Line != nil {
			lineNum := *loc.Line + 1 // Convert 0-based from GetLocation to 1-based
			le.Line = &lineNum
		}
		le.Column = loc.Column // GetLocation provides 0-based column
	}

	// Process call location if available
	if callInt, ok := e.Call.(int); ok && callInt >= 0 {
		callLoc := GetLocation(callInt, input)
		if callLoc.Line != nil {
			callLineNum := *callLoc.Line + 1 // Convert 0-based to 1-based
			le.CallLine = &callLineNum
		}
	}

	// Split input into lines for extract and call extract
	lines := strings.Split(input, "\n")

	// Set call extract if we have a valid call line
	if le.CallLine != nil && *le.CallLine > 0 && *le.CallLine <= len(lines) {
		le.CallExtract = lines[*le.CallLine-1]
	}

	// Populate extract array if we have a valid line number
	if le.Line != nil {
		lineIdx := *le.Line - 1 // Convert to 0-based index for lines slice
		
		// Previous line
		if lineIdx > 0 {
			le.Extract[0] = lines[lineIdx-1]
		}
		
		// Current line
		if lineIdx >= 0 && lineIdx < len(lines) {
			le.Extract[1] = lines[lineIdx]
		}
		
		// Next line
		if lineIdx+1 < len(lines) {
			le.Extract[2] = lines[lineIdx+1]
		}
	}

	return le
}

// Error implements the standard Go error interface.
func (le *LessError) Error() string {
	// Return a simple message, consistent with Go error conventions.
	// The full formatted message is available via ToString().
	if le.Filename != "" {
		return fmt.Sprintf("%s: %s in %s", le.Type, le.Message, le.Filename)
	}
	return fmt.Sprintf("%s: %s", le.Type, le.Message)
}

// StylizeFunc defines the signature for a function that can apply styles (e.g., colors).
type StylizeFunc func(str string, style string) string

// DefaultStylize provides no styling.
func DefaultStylize(str string, style string) string {
	return str
}

// ToStringOptions provides options for formatting the error message.
type ToStringOptions struct {
	Stylize StylizeFunc
}

// ToString creates a detailed, formatted error message similar to the JS version.
func (le *LessError) ToString(options *ToStringOptions) string {
	stylize := DefaultStylize
	if options != nil && options.Stylize != nil {
		stylize = options.Stylize
	}

	isWarning := strings.Contains(strings.ToLower(le.Type), "warning")
	errorType := le.Type
	if !isWarning && le.Type != "" { // Ensure empty type doesn't become "Error"
		errorType += "Error"
	} else if le.Type == "" {
		// Handle case where type might be explicitly empty, default to SyntaxError
		errorType = "SyntaxError"
	}
	color := "red"
	if isWarning {
		color = "yellow"
	}

	var messageBuilder strings.Builder

	errorContext := ""
	if le.Line != nil && *le.Line > 0 {
		lineNum := *le.Line
		extract := le.Extract // Contains [line-1, line, line+1] (0-based indices adjusted)
		col := le.Column      // 0-based column

		var errorLines []string
		// Line before error
		if !isWarning && extract[0] != "" {
			errorLines = append(errorLines, stylize(fmt.Sprintf("%d %s", lineNum-1, extract[0]), "grey"))
		}

		// Error line with highlight
		lineContent := extract[1]
		if lineContent != "" || (lineContent == "" && col == 0) { // Handle error on empty line too if col is 0

            // Revised Highlighting Logic
            errorLineText := fmt.Sprintf("%d ", lineNum)
            runes := []rune(lineContent)
            lineLen := len(runes)

            // Clamp column to valid range [0, lineLen]
            // A column index equal to lineLen means the error is *after* the last character.
            if col < 0 {
                col = 0
            } else if col > lineLen {
                col = lineLen
            }

            if lineLen == 0 {
                 // Empty line: Always highlight a space (assuming col must be 0)
                 errorLineText += stylize(stylize(stylize(" ", "bold"), color), "inverse")
            } else {
                 // Line has content
                 if col < lineLen {
                     // Highlight char *at* col and rest of line
                     prefix := string(runes[:col])
                     highlightedChar := string(runes[col])
                     suffix := string(runes[col+1:])
                     // Apply styling similar to JS: style bold char, concat suffix, apply color, apply inverse
                     styledPart := stylize(stylize(stylize(highlightedChar, "bold") + suffix, color), "inverse")
                     errorLineText += prefix + styledPart
                 } else { // col == lineLen (error is *after* the last character)
                     // Highlight space *after* line
                     prefix := lineContent
                     highlightedChar := " "
                     // Apply styling similar to JS: style bold space, apply color, apply inverse
                     styledPart := stylize(stylize(stylize(highlightedChar, "bold"), color), "inverse")
                     errorLineText += prefix + styledPart
                 }
            }

            errorLines = append(errorLines, errorLineText)

		} else if lineNum > 0 {
            // Fallback for unexpected cases where line is empty but col isn't 0?
            errorLines = append(errorLines, fmt.Sprintf("%d ", lineNum))
        }

		// Line after error
		if !isWarning && extract[2] != "" {
			errorLines = append(errorLines, stylize(fmt.Sprintf("%d %s", lineNum+1, extract[2]), "grey"))
		}
		errorContext = strings.Join(errorLines, "\n") + stylize("", "reset") + "\n"
	}

	// Main error message line
	messageBuilder.WriteString(stylize(fmt.Sprintf("%s: %s", errorType, le.Message), color))
	if le.Filename != "" {
		messageBuilder.WriteString(stylize(" in ", color) + le.Filename)
	}
	if le.Line != nil {
		// Use Column+1 for 1-based display consistent with JS/editor conventions
		messageBuilder.WriteString(stylize(fmt.Sprintf(" on line %d, column %d:", *le.Line, le.Column+1), "grey"))
	}

	messageBuilder.WriteString("\n" + errorContext)

	// Add call site info if available
	if le.CallLine != nil {
		callFilename := le.Filename // Assume call is from same file, as in JS
		messageBuilder.WriteString(fmt.Sprintf("%s%s\n", stylize("from ", color), callFilename))
		messageBuilder.WriteString(fmt.Sprintf("%s %s\n", stylize(fmt.Sprintf("%d", *le.CallLine), "grey"), le.CallExtract))
	}

	return messageBuilder.String()
}
