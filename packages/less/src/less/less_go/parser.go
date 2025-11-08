package less_go

import (
	"fmt"
	"os"
	"regexp"
	"strings"
)

// Parser represents a Less parser instance
type Parser struct {
	parserInput  *ParserInput
	imports      map[string]any
	fileInfo     map[string]any
	currentIndex int
	context      map[string]any
	parsers      *Parsers
}

// CreateSelectorParseFunc creates a SelectorParseFunc that can be used by selector nodes
func (p *Parser) CreateSelectorParseFunc() SelectorParseFunc {
	return func(input string, context map[string]any, imports map[string]any, fileInfo map[string]any, index int) ([]*Element, error) {
		// Create a new parser instance for parsing the selector string
		subParser := NewParser(context, imports, fileInfo, index)

		// Use channel to capture result from callback
		resultChan := make(chan *ParseNodeResult, 1)

		// Parse the input as a selector and extract elements
		subParser.parseNode(input, []string{"selector"}, func(result *ParseNodeResult) {
			resultChan <- result
		})

		// Get result from channel
		result := <-resultChan
		if result.Error != nil {
			return nil, fmt.Errorf("parse error: %v", result.Error)
		}

		// Extract elements from the parsed selector
		if len(result.Nodes) > 0 {
			if selector, ok := result.Nodes[0].(*Selector); ok {
				return selector.Elements, nil
			}
		}

		return nil, fmt.Errorf("failed to parse selector: %s", input)
	}
}

// CreateSelectorsParseFunc creates a SelectorsParseFunc that can be used by ruleset nodes
func (p *Parser) CreateSelectorsParseFunc() SelectorsParseFunc {
	return func(input string, context map[string]any, imports map[string]any, fileInfo map[string]any, index int) ([]any, error) {
		// Create a new parser instance for parsing the selectors string
		subParser := NewParser(context, imports, fileInfo, index)

		// Use channel to capture result from callback
		resultChan := make(chan *ParseNodeResult, 1)

		// Parse the input as selectors
		subParser.parseNode(input, []string{"selectors"}, func(result *ParseNodeResult) {
			resultChan <- result
		})

		// Get result from channel
		result := <-resultChan
		if result.Error != nil {
			return nil, fmt.Errorf("parse error: %v", result.Error)
		}

		return result.Nodes, nil
	}
}

// CreateValueParseFunc creates a ValueParseFunc that can be used by ruleset nodes
func (p *Parser) CreateValueParseFunc() ValueParseFunc {
	return func(input string, context map[string]any, imports map[string]any, fileInfo map[string]any, index int) ([]any, error) {
		// Create a new parser instance for parsing the value string
		subParser := NewParser(context, imports, fileInfo, index)

		// Use channel to capture result from callback
		resultChan := make(chan *ParseNodeResult, 1)

		// Parse the input as value and important
		subParser.parseNode(input, []string{"value", "important"}, func(result *ParseNodeResult) {
			resultChan <- result
		})

		// Get result from channel
		result := <-resultChan
		if result.Error != nil {
			return nil, fmt.Errorf("parse error: %v", result.Error)
		}

		return result.Nodes, nil
	}
}

// Parsers contains all the parsing methods
type Parsers struct {
	parser   *Parser
	mixin    *MixinParsers
	entities *EntityParsers
	plugin   func() any // Make this a field that can be overridden
}

// MixinParsers contains mixin-related parsing methods
type MixinParsers struct {
	parsers *Parsers
}

// EntityParsers contains entity-related parsing methods
type EntityParsers struct {
	parsers *Parsers
}

// ParseResult represents the result of a parse operation
type ParseResult struct {
	Error *LessError
	Root  *Ruleset
}

// ParseNodeResult represents the result of a parseNode operation
type ParseNodeResult struct {
	Error any   // Can be error or boolean true
	Nodes []any // Parsed nodes
}

// ParseNodeCallback is the callback function for parseNode
type ParseNodeCallback func(*ParseNodeResult)

// ParserLogger interface for parser logging functionality
type ParserLogger interface {
	Warn(msg string)
	Error(msg string)
	Info(msg string)
	Debug(msg string)
}

// defaultParserLogger provides a no-op logger implementation
type defaultParserLogger struct{}

func (l *defaultParserLogger) Warn(msg string)  {}
func (l *defaultParserLogger) Error(msg string) {}
func (l *defaultParserLogger) Info(msg string)  {}
func (l *defaultParserLogger) Debug(msg string) {}

var parserLogger ParserLogger = &defaultParserLogger{}

// SetParserLogger sets the global parser logger instance
func SetParserLogger(l ParserLogger) {
	parserLogger = l
}

// NewParsers creates a new Parsers instance
func NewParsers(parser *Parser) *Parsers {
	p := &Parsers{
		parser: parser,
	}
	p.mixin = &MixinParsers{parsers: p}
	p.entities = &EntityParsers{parsers: p}

	// Initialize plugin parser
	p.plugin = p.Plugin

	return p
}

// NewParser creates a new Parser instance
func NewParser(context map[string]any, imports map[string]any, fileInfo map[string]any, currentIndex int) *Parser {
	if currentIndex == 0 {
		currentIndex = 0
	}

	p := &Parser{
		parserInput:  NewParserInput(),
		imports:      imports,
		fileInfo:     fileInfo,
		currentIndex: currentIndex,
		context:      context,
	}

	p.parsers = NewParsers(p)
	return p
}

// error throws a LessError
func (p *Parser) error(msg string, errorType string) {
	tracer := GetParserTracer()
	if tracer.IsEnabled() {
		tracer.TraceError("Parser.error", msg, p)
	}

	if errorType == "" {
		errorType = "Syntax"
	}

	filename, _ := p.fileInfo["filename"].(string)
	errorDetails := ErrorDetails{
		Index:    p.parserInput.GetIndex(),
		Filename: filename,
		Type:     errorType,
		Message:  msg,
	}

	contents, _ := p.imports["contents"].(map[string]string)
	panic(NewLessError(errorDetails, contents, filename))
}

// warn logs a warning message
func (p *Parser) warn(msg string, index any, warnType string) {
	if quiet, ok := p.context["quiet"].(bool); ok && quiet {
		return
	}

	filename, _ := p.fileInfo["filename"].(string)

	if index == nil {
		index = p.parserInput.GetIndex()
	}

	typeStr := "WARNING"
	if warnType != "" {
		typeStr = strings.ToUpper(warnType) + " WARNING"
	}

	errorDetails := ErrorDetails{
		Index:    index,
		Filename: filename,
		Type:     typeStr,
		Message:  msg,
	}

	contents, _ := p.imports["contents"].(map[string]string)
	lessError := NewLessError(errorDetails, contents, filename)
	parserLogger.Warn(lessError.ToString(nil))
}

// expect expects a token and throws an error if not found
func (p *Parser) expect(arg any, msg string) any {
	var result any

	switch v := arg.(type) {
	case func() any:
		result = v()
	case *regexp.Regexp:
		result = p.parserInput.Re(v)
	case string:
		result = p.parserInput.Str(v)
	}

	if result != nil {
		return result
	}

	if msg == "" {
		if str, ok := arg.(string); ok {
			msg = fmt.Sprintf("expected '%s' got '%c'", str, p.parserInput.CurrentChar())
		} else {
			msg = "unexpected token"
		}
	}

	p.error(msg, "")
	return nil // Never reached due to panic
}

// expectChar expects a specific character
func (p *Parser) expectChar(char byte, msg string) byte {
	if result := p.parserInput.Char(char); result != nil {
		return char
	}

	if msg == "" {
		msg = fmt.Sprintf("expected '%c' got '%c'", char, p.parserInput.CurrentChar())
	}

	p.error(msg, "")
	return 0 // Never reached due to panic
}

// getDebugInfo returns debug information for the current position
func (p *Parser) getDebugInfo(index int) map[string]any {
	filename, _ := p.fileInfo["filename"].(string)
	location := GetLocation(index, p.parserInput.GetInput())

	lineNumber := 1
	if location.Line != nil {
		lineNumber = *location.Line + 1
	}

	return map[string]any{
		"lineNumber": lineNumber,
		"fileName":   filename,
	}
}

// parseNode parses a string with specific parsers
func (p *Parser) parseNode(str string, parseList []string, callback ParseNodeCallback) {
	returnNodes := make([]any, 0)
	parser := p.parserInput

	defer func() {
		if r := recover(); r != nil {
			if lessErr, ok := r.(*LessError); ok {
				// Adjust index
				if idx, ok := lessErr.Index.(int); ok {
					lessErr.Index = idx + p.currentIndex
				}
				callback(&ParseNodeResult{
					Error: lessErr,
					Nodes: nil,
				})
				return
			}
			panic(r) // Re-panic if it's not a LessError
		}
	}()

	parser.Start(str, false, func(msg string, index int) {
		callback(&ParseNodeResult{
			Error: map[string]any{
				"message": msg,
				"index":   index + p.currentIndex,
			},
			Nodes: nil,
		})
	})

	for _, parserName := range parseList {
		var result any
		switch parserName {
		case "primary":
			result = p.parsers.Primary()
		case "value":
			result = p.parsers.Value()
		case "important":
			result = p.parsers.Important()
		case "selector":
			result = p.parsers.Selector(true)
		case "selectors":
			result = p.parsers.Selectors()
		case "expression":
			result = p.parsers.Expression()
		case "declaration":
			result = p.parsers.Declaration()
		// Add more parser methods as needed
		default:
			result = nil
		}

		if result != nil {
			returnNodes = append(returnNodes, result)
		} else if parserName == "important" {
			// Important is optional, don't fail if not found
			continue
		} else {
			// If any required parser fails, we should fail the whole parseNode operation
			callback(&ParseNodeResult{
				Error: true,
				Nodes: nil,
			})
			return
		}
	}

	// For parseNode, we should be more permissive about trailing whitespace
	// Skip any trailing whitespace and see if we've consumed all meaningful content
	currentIndex := parser.GetIndex()
	input := parser.GetInput()

	// Skip trailing whitespace
	for currentIndex < len(input) {
		c := input[currentIndex]
		if c == ' ' || c == '\t' || c == '\n' || c == '\r' {
			currentIndex++
		} else {
			break
		}
	}

	// Check if we've consumed all input or only have whitespace remaining
	isFinished := currentIndex >= len(input)

	// JavaScript parser requires all input to be consumed
	if isFinished {
		callback(&ParseNodeResult{
			Error: nil,
			Nodes: returnNodes,
		})
	} else {
		callback(&ParseNodeResult{
			Error: true,
			Nodes: nil,
		})
	}
}

// AdditionalData represents additional data that can be passed to the parser
type AdditionalData struct {
	GlobalVars        map[string]any
	ModifyVars        map[string]any
	DisablePluginRule bool
	Banner            string
}

// NewAdditionalData creates a new AdditionalData with initialized maps
func NewAdditionalData() *AdditionalData {
	return &AdditionalData{
		GlobalVars: make(map[string]any),
		ModifyVars: make(map[string]any),
	}
}

// Parse parses a Less string using structured AdditionalData
func (p *Parser) Parse(str string, callback func(*LessError, *Ruleset), data *AdditionalData) {
	p.parseInternal(str, callback, data)
}

// parseInternal is the core parsing implementation that works with AdditionalData directly
func (p *Parser) parseInternal(str string, callback func(*LessError, *Ruleset), data *AdditionalData) {
	var root *Ruleset
	var err *LessError
	var globalVars string
	var modifyVars string
	var ignored map[string]int
	var preText string

	defer func() {
		if r := recover(); r != nil {
			if lessErr, ok := r.(*LessError); ok {
				callback(lessErr, nil)
				return
			}
			panic(r) // Re-panic if it's not a LessError
		}
	}()

	// Ensure we have valid data
	if data == nil {
		data = &AdditionalData{}
	}

	// Optionally disable @plugin parsing
	if data.DisablePluginRule {
		p.parsers.plugin = func() any {
			dir := p.parserInput.Re(regexp.MustCompile(`^@plugin?\s+`))
			if dir != nil {
				p.error("@plugin statements are not allowed when disablePluginRule is set to true", "")
			}
			return nil
		}
	}

	// Handle global vars
	if len(data.GlobalVars) > 0 {
		globalVars = SerializeVars(data.GlobalVars) + "\n"
	}

	// Handle modify vars
	if len(data.ModifyVars) > 0 {
		modifyVars = "\n" + SerializeVars(data.ModifyVars)
	}

	// Handle plugin manager preprocessing
	if pluginManager, ok := p.context["pluginManager"].(*PluginManager); ok && pluginManager != nil {
		preProcessors := pluginManager.GetPreProcessors()
		for _, processor := range preProcessors {
			// Check if processor has Process method
			if proc, ok := processor.(interface{ Process(string, map[string]any) string }); ok {
				str = proc.Process(str, map[string]any{
					"context":  p.context,
					"imports":  p.imports,
					"fileInfo": p.fileInfo,
				})
			}
		}
	}

	// Handle banner and global vars
	if globalVars != "" || data.Banner != "" {
		preText = data.Banner + globalVars

		if p.imports["contentsIgnoredChars"] == nil {
			p.imports["contentsIgnoredChars"] = make(map[string]int)
		}
		ignored = p.imports["contentsIgnoredChars"].(map[string]int)
		filename, _ := p.fileInfo["filename"].(string)
		if ignored[filename] == 0 {
			ignored[filename] = 0
		}
		ignored[filename] += len(preText)
	}

	// Normalize line endings and remove BOM
	str = strings.ReplaceAll(str, "\r\n", "\n")
	str = strings.ReplaceAll(str, "\r", "\n")
	str = strings.TrimPrefix(str, "\uFEFF") // Remove UTF BOM
	str = preText + str + modifyVars

	// Store content
	if p.imports["contents"] == nil {
		p.imports["contents"] = make(map[string]string)
	}
	contents := p.imports["contents"].(map[string]string)
	filename, _ := p.fileInfo["filename"].(string)
	contents[filename] = str

	// Start parsing
	chunkInput := true // Default to true for main parsing (comments should be stripped)
	if val, ok := p.context["chunkInput"].(bool); ok {
		chunkInput = val
	}
	p.parserInput.Start(str, chunkInput, func(msg string, index int) {
		panic(NewLessError(ErrorDetails{
			Index:    index,
			Type:     "Parse",
			Message:  msg,
			Filename: filename,
		}, contents, filename))
	})

	// Set up node prototypes (equivalent to JS tree.Node.prototype.parse = this)
	// This would be handled differently in Go, probably through interfaces

	// Create root ruleset
	root = NewRuleset(nil, p.parsers.Primary(), false, nil, p.CreateSelectorsParseFunc(), p.CreateValueParseFunc(), p.context, p.imports)
	root.Root = true
	root.FirstRoot = true
	
	// Set up function registry for the root
	if funcRegistry, ok := p.context["functionRegistry"].(*Registry); ok && funcRegistry != nil {
		// Create an inherited registry for this parse tree
		root.FunctionRegistry = funcRegistry.Inherit()
	} else {
		// Use the default registry if none provided
		root.FunctionRegistry = DefaultRegistry.Inherit()
	}

	// Check if parsing completed
	endInfo := p.parserInput.End()
	if !endInfo.IsFinished {
		message := endInfo.FurthestPossibleErrorMessage
		if message == "" {
			message = "Unrecognised input"
			if endInfo.FurthestChar == '}' {
				message += ". Possibly missing opening '{'"
			} else if endInfo.FurthestChar == ')' {
				message += ". Possibly missing opening '('"
			} else if endInfo.FurthestReachedEnd {
				message += ". Possibly missing something"
			}
		}

		err = NewLessError(ErrorDetails{
			Type:     "Parse",
			Message:  message,
			Index:    endInfo.Furthest,
			Filename: filename,
		}, contents, filename)
	}

	finish := func(e *LessError) {
		if e == nil {
			e = err
		}
		if e == nil {
			if importErr, ok := p.imports["error"].(*LessError); ok {
				e = importErr
			}
		}

		if e != nil {
			callback(e, nil)
		} else {
			callback(nil, root)
		}
	}

	// Handle imports
	if processImports, ok := p.context["processImports"].(bool); !ok || processImports {
		// Create adapter function to match expected signature
		finishAdapter := func(err error) {
			if err != nil {
				if lessErr, ok := err.(*LessError); ok {
					finish(lessErr)
				} else {
					// Convert regular error to LessError
					finish(NewLessError(ErrorDetails{
						Type:     "Import",
						Message:  err.Error(),
						Index:    0,
						Filename: filename,
					}, contents, filename))
				}
			} else {
				finish(nil)
			}
		}
		// Create and run ImportVisitor
		importVisitor := NewImportVisitor(p.imports, finishAdapter)
		importVisitor.Run(root)
	} else {
		finish(nil)
	}
}

// SerializeVars serializes variables from a map to Less format
// Go 1.21+ preserves insertion order for string keys like JavaScript objects
func SerializeVars(vars map[string]any) string {
	if len(vars) == 0 {
		return ""
	}

	var sb strings.Builder

	// Iterate over map - Go 1.21+ preserves insertion order for string keys
	for name, value := range vars {
		// Add @ prefix if not present
		if !strings.HasPrefix(name, "@") {
			name = "@" + name
		}

		valueStr := fmt.Sprintf("%v", value)

		// Add semicolon if not present
		if !strings.HasSuffix(valueStr, ";") {
			valueStr += ";"
		}

		sb.WriteString(fmt.Sprintf("%s: %s", name, valueStr))
	}

	return sb.String()
}

// Primary is the main entry and exit point of the parser
func (p *Parsers) Primary() []any {
	tracer := GetParserTracer()
	if tracer.IsEnabled() {
		defer tracer.TraceEnter("Primary", p.parser)()
	}

	root := make([]any, 0)
	var node any
	maxIterations := 10000 // Safety limit
	iterations := 0

	for iterations < maxIterations {
		iterations++

		// Check termination conditions first
		if p.parser.parserInput.Finished() {
			break
		}

		// Additional safety check: if we're at the end of input, break
		if p.parser.parserInput.GetIndex() >= len(p.parser.parserInput.GetInput()) {
			break
		}

		// Collect comments BEFORE checking for closing brace
		// This ensures comments in commentStore are collected even in empty blocks
		commentCount := 0
		for {
			node = p.Comment()
			if node == nil {
				break
			}

			root = append(root, node)
			commentCount++
			// Safety check: prevent infinite comment loops
			if commentCount > 1000 {
				break
			}
		}

		// Check for closing brace AFTER collecting comments
		// This is the key termination condition
		if p.parser.parserInput.CurrentChar() == '}' {
			break
		}

		// Check termination conditions again after processing comments
		if p.parser.parserInput.Finished() {
			break
		}

		// Try extend rule
		node = p.ExtendRule()
		if node != nil {
			// Check if it's an empty slice - treat as nil
			if nodes, ok := node.([]any); ok {
				if len(nodes) > 0 {
					root = append(root, nodes...)
					continue
				}
				// Empty slice should be treated as no node found
			} else {
				root = append(root, node)
				continue
			}
		}

		// Try other rules
		tracer := GetParserTracer()
		node = p.mixin.Definition()
		if node != nil {
			tracer.TraceCheckpoint("Parsed MixinDefinition", p.parser)
		}
		if node == nil {
			node = p.Declaration()
			if node != nil {
				tracer.TraceCheckpoint("Parsed Declaration", p.parser)
			}
		}
		if node == nil {
			node = p.mixin.Call(false, false)
			if node != nil {
				tracer.TraceCheckpoint("Parsed MixinCall", p.parser)
			}
		}
		if node == nil {
			node = p.Ruleset()
			if node != nil {
				tracer.TraceCheckpoint("Parsed Ruleset", p.parser)
			}
		}
		if node == nil {
			node = p.VariableCall()
			if node != nil {
				tracer.TraceCheckpoint("Parsed VariableCall", p.parser)
			}
		}
		if node == nil {
			// CRITICAL: entities.Call() should only be tried if all else fails
			tracer.TraceCallStackAt("About to try entities.Call() in Primary()", p.parser)
			node = p.entities.Call()
			if node != nil {
				tracer.TraceCheckpoint("Parsed entities.Call()", p.parser)
			}
		}
		if node == nil {
			node = p.AtRule()
			if node != nil {
				tracer.TraceCheckpoint("Parsed AtRule", p.parser)
			}
		}

		if node != nil {
			root = append(root, node)
			continue
		} else {
			// Try to consume semicolons
			foundSemiColon := false
			for p.parser.parserInput.Char(';') != nil {
				foundSemiColon = true
			}
			if !foundSemiColon {
				// JavaScript parser simply breaks here without additional checks
				// This allows trailing comments to be picked up in the next iteration
				break
			}
		}
	}

	return root
}

// Comment parses comments
func (p *Parsers) Comment() any {
	if comments := p.parser.parserInput.GetComments(); len(comments) > 0 {
		comment := p.parser.parserInput.ConsumeComment()
		if comment != nil {
			return NewComment(comment.GetText(), comment.IsLineComment(), comment.GetIndex()+p.parser.currentIndex, p.parser.fileInfo)
		}
	}
	return nil
}

// Declaration parses property declarations
func (p *Parsers) Declaration() any {
	tracer := GetParserTracer()
	if tracer.IsEnabled() {
		defer tracer.TraceEnter("Declaration", p.parser)()
	}

	var name any
	var value any
	index := p.parser.parserInput.GetIndex()
	var hasDR bool
	c := p.parser.parserInput.CurrentChar()
	var important any
	var merge string
	var isVariable bool

	tracer.TraceMode("Declaration: checking current char", fmt.Sprintf("char='%c' (0x%02x)", c, c), p.parser)
	if c == '.' || c == '#' || c == '&' || c == ':' {
		tracer.TraceMode("Declaration: early return", fmt.Sprintf("current char is '%c'", c), p.parser)
		return nil
	}

	p.parser.parserInput.Save()

	name = p.Variable()
	if name == nil {
		name = p.RuleProperty()
	}
	tracer.TraceMode("Declaration: after parsing name", fmt.Sprintf("name=%v", name != nil), p.parser)

	if name != nil {
		// Determine if this is a variable declaration
		if nameStr, ok := name.(string); ok {
			isVariable = true
			if nameStr != "" {
				value = p.DetachedRuleset()
				if value != nil {
					hasDR = true
				}
			}
		} else {
			isVariable = false
		}

		if !hasDR {
			// Handle merge flag for non-variables
			if !isVariable {
				if nameSlice, ok := name.([]any); ok && len(nameSlice) > 1 {
					lastItem := nameSlice[len(nameSlice)-1]
					if keyword, ok := lastItem.(*Keyword); ok {
						if keywordValue, ok := keyword.Value.(string); ok {
							merge = keywordValue
							if merge == "+" || merge == "+_" {
								name = nameSlice[:len(nameSlice)-1] // Remove merge indicator
							} else {
								merge = ""
							}
						}
					}
				}
			}

			// Handle custom property values
			if nameSlice, ok := name.([]any); ok && len(nameSlice) > 0 {
				if keyword, ok := nameSlice[0].(*Keyword); ok {
					if keywordValue, ok := keyword.Value.(string); ok && len(keywordValue) >= 2 && keywordValue[:2] == "--" {
						if p.parser.parserInput.Char(';') != nil {
							value = NewAnonymous("", 0, nil, false, false, nil)
						} else {
							value = p.PermissiveValue(regexp.MustCompile(`[;}]`), true)
						}
					}
				}
			}

			// Try anonymousValue for performance
			if value == nil {
				value = p.AnonymousValue()
				tracer.TraceMode("Declaration: after AnonymousValue()", fmt.Sprintf("value=%v", value != nil), p.parser)
			}

			if value != nil {
				// For anonymous values, check if they contain !important
				if anon, ok := value.(*Anonymous); ok {
					if str, ok := anon.Value.(string); ok && strings.Contains(str, "!important") {
						// Extract the value without !important
						parts := strings.Split(str, "!")
						if len(parts) >= 2 {
							anon.Value = strings.TrimSpace(parts[0])
							important = "!important"
						}
					}
				}
				// Still try to parse important flag in case it's after the anonymous value
				if important == nil {
					important = p.Important()
				}
				p.parser.parserInput.Forget()
				// Pass merge as-is (string "+" or "+_")
			var mergeFlag any
			if merge != "" {
				mergeFlag = merge
			} else {
				mergeFlag = false
			}
				// Create declaration
				decl, err := NewDeclaration(name, value, important, mergeFlag, index+p.parser.currentIndex, p.parser.fileInfo, false, isVariable)
				if err != nil {
					return nil
				}
				return decl
			}

			value = p.Value()
			tracer.TraceMode("Declaration: after Value()", fmt.Sprintf("value=%v", value != nil), p.parser)
			// Handle variable lookups in property values, e.g., @detached[@color]
			if value == nil {
				value = p.VariableCall()
				tracer.TraceMode("Declaration: after VariableCall()", fmt.Sprintf("value=%v", value != nil), p.parser)
			}
			if value != nil {
				important = p.Important()
			} else if isVariable {
				// As fallback, try permissive value for variables
				value = p.PermissiveValue(nil, false)
				tracer.TraceMode("Declaration: after PermissiveValue()", fmt.Sprintf("value=%v", value != nil), p.parser)
			}
		}

		endResult := p.End()
		tracer.TraceMode("Declaration: checking End()", fmt.Sprintf("value=%v, End()=%v, hasDR=%v", value != nil, endResult, hasDR), p.parser)
		if value != nil && (endResult || hasDR) {
			p.parser.parserInput.Forget()
			// Pass merge as-is (string "+" or "+_")
			var mergeFlag any
			if merge != "" {
				mergeFlag = merge
			} else {
				mergeFlag = false
			}

			decl, err := NewDeclaration(name, value, important, mergeFlag, index+p.parser.currentIndex, p.parser.fileInfo, false, isVariable)
			if err != nil {
				return nil
			}
			return decl
		} else {
			p.parser.parserInput.Restore("")
		}
	} else {
		p.parser.parserInput.Restore("")
	}

	return nil
}

// Variable parses variable entities - @fink
func (e *EntityParsers) Variable() any {
	var ch byte
	var name string
	index := e.parsers.parser.parserInput.GetIndex()

	e.parsers.parser.parserInput.Save()
	if e.parsers.parser.parserInput.CurrentChar() == '@' {
		nameMatch := e.parsers.parser.parserInput.Re(regexp.MustCompile(`^@@?[\w-]+`))
		if nameMatch != nil {
			// Handle both string and []string cases
			if matches, ok := nameMatch.([]string); ok {
				name = matches[0]
			} else if match, ok := nameMatch.(string); ok {
				name = match
			}
			ch = e.parsers.parser.parserInput.CurrentChar()
			if ch == '(' || (ch == '[' && !e.parsers.parser.parserInput.IsWhitespace(-1)) {
				// This may be a VariableCall lookup
				// We need to restore to the beginning and let VariableCall parse the whole thing
				e.parsers.parser.parserInput.Restore("")
				e.parsers.parser.parserInput.Save()
				result := e.parsers.VariableCall()
				if result != nil {
					e.parsers.parser.parserInput.Forget()
					return result
				}
				// If VariableCall failed, restore and continue with simple variable
				e.parsers.parser.parserInput.Restore("")
				e.parsers.parser.parserInput.Save()
				// Re-parse the variable name
				nameMatch = e.parsers.parser.parserInput.Re(regexp.MustCompile(`^@@?[\w-]+`))
				if nameMatch != nil {
					// Handle both string and []string cases
					if matches, ok := nameMatch.([]string); ok {
						name = matches[0]
					} else if match, ok := nameMatch.(string); ok {
						name = match
					}
				} else {
					// If re-parsing failed, we can't create a variable
					e.parsers.parser.parserInput.Restore("")
					return nil
				}
			}
			e.parsers.parser.parserInput.Forget()
			variable := NewVariable(name, index+e.parsers.parser.currentIndex, e.parsers.parser.fileInfo)
			return variable
		}
	}
	e.parsers.parser.parserInput.Restore("")
	return nil
}

// RuleProperty parses rule properties
func (p *Parsers) RuleProperty() any {
	name := make([]any, 0)
	index := make([]int, 0)

	p.parser.parserInput.Save()

	// Simple property match first
	simpleProperty := p.parser.parserInput.Re(regexp.MustCompile(`^([_a-zA-Z0-9-]+)\s*:`))
	if simpleProperty != nil {
		if matches, ok := simpleProperty.([]string); ok && len(matches) > 1 {
			name = append(name, NewKeyword(matches[1]))
			p.parser.parserInput.Forget()
			return name
		}
	}

	// Complex property matching function
	match := func(re *regexp.Regexp) bool {
		i := p.parser.parserInput.GetIndex()
		chunk := p.parser.parserInput.Re(re)
		if chunk != nil {
			index = append(index, i)
			if matches, ok := chunk.([]string); ok && len(matches) > 1 {
				name = append(name, matches[1])
				return true
			}
		}
		return false
	}

	// Match initial wildcard
	match(regexp.MustCompile(`^(\*?)`))

	// Match property parts
	for {
		if !match(regexp.MustCompile(`^((?:[\w-]+)|(?:[@$]\{[\w-]+\}))`)) {
			break
		}
	}

	// Match merge indicator and colon
	if len(name) > 1 && match(regexp.MustCompile(`^((?:\+_|\+)?)\s*:`)) {
		p.parser.parserInput.Forget()

		// Remove empty first element if present
		if len(name) > 0 {
			if str, ok := name[0].(string); ok && str == "" {
				name = name[1:]
				index = index[1:]
			}
		}

		// Convert name parts to proper nodes
		for k := 0; k < len(name); k++ {
			s := name[k]
			if str, ok := s.(string); ok {
				if len(str) > 0 && str[0] != '@' && str[0] != '$' {
					name[k] = NewKeyword(str)
				} else if len(str) > 0 && str[0] == '@' {
					// Extract variable name from @{var} format
					if len(str) > 3 && str[len(str)-1] == '}' {
						varName := "@" + str[2:len(str)-1]
						name[k] = NewVariable(varName, index[k]+p.parser.currentIndex, p.parser.fileInfo)
					} else {
						name[k] = NewVariable(str, index[k]+p.parser.currentIndex, p.parser.fileInfo)
					}
				} else if len(str) > 0 && str[0] == '$' {
					// Extract property name from ${prop} format
					if len(str) > 3 && str[len(str)-1] == '}' {
						propName := "$" + str[2:len(str)-1]
						name[k] = NewProperty(propName, index[k]+p.parser.currentIndex, p.parser.fileInfo)
					} else {
						name[k] = NewProperty(str, index[k]+p.parser.currentIndex, p.parser.fileInfo)
					}
				}
			}
		}

		return name
	}

	p.parser.parserInput.Restore("")
	return nil
}

// AnonymousValue parses anonymous values for performance
func (p *Parsers) AnonymousValue() any {
	index := p.parser.parserInput.GetIndex()
	match := p.parser.parserInput.Re(regexp.MustCompile(`^([^.#@$+/'"*` + "`" + `(;{}-]*);`))
	if match != nil {
		if matches, ok := match.([]string); ok && len(matches) > 1 {
			return NewAnonymous(matches[1], index+p.parser.currentIndex, p.parser.fileInfo, false, false, nil)
		}
	}
	return nil
}

// DetachedRuleset parses detached rulesets
func (p *Parsers) DetachedRuleset() any {
	tracer := GetParserTracer()
	if tracer.IsEnabled() {
		defer tracer.TraceEnter("DetachedRuleset", p.parser)()
	}

	var argInfo map[string]any
	var params []any
	var variadic bool

	p.parser.parserInput.Save()
	if tracer.IsEnabled() {
		tracer.TraceSaveRestore("Save", "DetachedRuleset", p.parser)
	}

	// Check for anonymous mixin syntax: .(@args) or #(@args)
	// DR args currently only implemented for each() function
	mixinMatch := p.parser.parserInput.Re(regexp.MustCompile(`^[.#]\(`))
	if tracer.IsEnabled() {
		tracer.TraceRegex("DetachedRuleset", "^[.#]\\(", mixinMatch != nil, mixinMatch)
	}
	if mixinMatch != nil {
		argInfo = p.parser.parsers.mixin.Args(false)
		if argInfo != nil {
			if args, ok := argInfo["args"].([]any); ok {
				params = args
			}
			if v, ok := argInfo["variadic"].(bool); ok {
				variadic = v
			}
			if p.parser.parserInput.Char(')') == nil {
				p.parser.parserInput.Restore("")
				if tracer.IsEnabled() {
					tracer.TraceSaveRestore("Restore", "DetachedRuleset", p.parser)
					tracer.TraceResult("DetachedRuleset", nil, "missing closing paren after args")
				}
				return nil
			}
		}
	}

	blockRuleset := p.BlockRuleset()
	if blockRuleset != nil {
		p.parser.parserInput.Forget()
		if tracer.IsEnabled() {
			tracer.TraceSaveRestore("Forget", "DetachedRuleset", p.parser)
		}
		// If we have params, return a MixinDefinition instead
		if params != nil {
			// Get the rules from the blockRuleset
			var rules []any
			if ruleset, ok := blockRuleset.(*Ruleset); ok {
				rules = ruleset.Rules
			}
			// NewMixinDefinition expects: (name string, params []any, rules []any, condition any, variadic bool, frames []any, visibilityInfo map[string]any)
			mixinDef, err := NewMixinDefinition("", params, rules, nil, variadic, nil, nil)
			if err != nil {
				p.parser.parserInput.Restore("")
				if tracer.IsEnabled() {
					tracer.TraceSaveRestore("Restore", "DetachedRuleset", p.parser)
					tracer.TraceResult("DetachedRuleset", nil, "mixin definition creation failed")
				}
				return nil
			}

			// Mark all nested rulesets as being inside a mixin definition
			// This prevents them from being output directly - they should only be output when the mixin is called
			for _, rule := range rules {
				if nestedRuleset, ok := rule.(*Ruleset); ok {
					nestedRuleset.InsideMixinDefinition = true
				}
			}

			if tracer.IsEnabled() {
				tracer.TraceResult("DetachedRuleset", mixinDef, "mixin definition with params")
			}
			return mixinDef
		}
		result := NewDetachedRuleset(blockRuleset, nil)
		if tracer.IsEnabled() {
			tracer.TraceResult("DetachedRuleset", result, "detached ruleset")
		}
		return result
	}
	p.parser.parserInput.Restore("")
	if tracer.IsEnabled() {
		tracer.TraceSaveRestore("Restore", "DetachedRuleset", p.parser)
		tracer.TraceResult("DetachedRuleset", nil, "no block found")
	}
	return nil
}

// BlockRuleset parses a block and wraps it in a ruleset
func (p *Parsers) BlockRuleset() any {
	block := p.Block()
	if block != nil {
		return NewRuleset(nil, block.([]any), false, nil, p.parser.CreateSelectorsParseFunc(), p.parser.CreateValueParseFunc(), p.parser.context, p.parser.imports)
	}
	return nil
}

// Block parses a { ... } block
func (p *Parsers) Block() any {
	tracer := GetParserTracer()
	openBrace := p.parser.parserInput.Char('{') != nil
	tracer.TraceMode("Block: after checking '{'", fmt.Sprintf("found={%v}", openBrace), p.parser)
	if openBrace {
		content := p.Primary()
		tracer.TraceMode("Block: after Primary()", fmt.Sprintf("content=%v", content != nil), p.parser)
		closeBrace := p.parser.parserInput.Char('}') != nil
		tracer.TraceMode("Block: after checking '}'", fmt.Sprintf("found=%v}", closeBrace), p.parser)
		if closeBrace {
			return content
		}
	}
	return nil
}

// PermissiveValue parses permissive values
func (p *Parsers) PermissiveValue(untilTokens *regexp.Regexp, allowComments bool) any {
	var tok any = ";"
	if untilTokens != nil {
		tok = untilTokens
	}
	index := p.parser.parserInput.GetIndex()
	result := make([]any, 0)

	testCurrentChar := func() bool {
		char := p.parser.parserInput.CurrentChar()
		if tokStr, ok := tok.(string); ok {
			return char == tokStr[0]
		} else if tokRe, ok := tok.(*regexp.Regexp); ok {
			return tokRe.MatchString(string(char))
		}
		return false
	}

	if testCurrentChar() {
		return nil
	}

	value := make([]any, 0)
	var e any
	for {
		if allowComments {
			e = p.Comment()
			if e != nil {
				value = append(value, e)
				continue
			}
		}

		e = p.Entity()
		if e != nil {
			value = append(value, e)
		}

		if p.parser.parserInput.Peek(",") {
			value = append(value, NewAnonymous(",", p.parser.parserInput.GetIndex()+p.parser.currentIndex, p.parser.fileInfo, false, false, nil))
			p.parser.parserInput.Char(',')
		}

		if e == nil {
			break
		}
	}

	done := testCurrentChar()

	if len(value) > 0 {
		expr, err := NewExpression(value, false)
		if err != nil {
			return nil
		}
		if done {
			return expr
		} else {
			result = append(result, expr)
		}
		// Preserve space before parseUntil
		if p.parser.parserInput.PrevChar() == ' ' {
			result = append(result, NewAnonymous(" ", index+p.parser.currentIndex, p.parser.fileInfo, false, false, nil))
		}
	}

	p.parser.parserInput.Save()
	untilValue := p.parser.parserInput.ParseUntil(tok)

	if untilValue != nil {
		if str, ok := untilValue.(string); ok {
			p.parser.error(fmt.Sprintf("Expected '%s'", str), "Parse")
			return nil
		}

		if valueSlice, ok := untilValue.([]any); ok {
			if len(valueSlice) == 1 && valueSlice[0] == " " {
				p.parser.parserInput.Forget()
				return NewAnonymous("", index+p.parser.currentIndex, p.parser.fileInfo, false, false, nil)
			}

			for i, item := range valueSlice {
				if itemSlice, ok := item.([]any); ok {
					// Treat actual quotes as normal quoted values
					result = append(result, NewQuoted(itemSlice[0].(string), itemSlice[1].(string), true, index+p.parser.currentIndex, p.parser.fileInfo))
				} else {
					itemStr := fmt.Sprintf("%v", item)
					if i == len(valueSlice)-1 {
						itemStr = strings.TrimSpace(itemStr)
					}
					// Create quoted value and set regex patterns for variable/property replacement
					quoted := NewQuoted("'", itemStr, true, index+p.parser.currentIndex, p.parser.fileInfo)
					result = append(result, quoted)
				}
			}

			p.parser.parserInput.Forget()
			expr, err := NewExpression(result, true)
			if err != nil {
				return nil
			}
			return expr
		}
	}

	p.parser.parserInput.Restore("")
	return nil
}

// Entity parses entities
func (p *Parsers) Entity() any {
	tracer := GetParserTracer()
	if tracer.IsEnabled() {
		defer tracer.TraceEnter("Entity", p.parser)()
		// Log current character for debugging
		if p.parser.parserInput != nil {
			c := p.parser.parserInput.CurrentChar()
			idx := p.parser.parserInput.GetIndex()
			input := p.parser.parserInput.GetInput()
			remaining := ""
			if idx < len(input) {
				end := idx + 30
				if end > len(input) {
					end = len(input)
				}
				remaining = input[idx:end]
			}
			tracer.TraceMode("Entity: parser state", fmt.Sprintf("currentChar='%c'(0x%02x) idx=%d remaining=%q", c, c, idx, remaining), p.parser)
		}
	}

	entities := p.entities

	result := p.Comment()
	tracer.TraceMode("Entity: Comment()", fmt.Sprintf("result=%v", result != nil), p.parser)
	if result != nil {
		return result
	}
	result = entities.Literal()
	tracer.TraceMode("Entity: Literal()", fmt.Sprintf("result=%v", result != nil), p.parser)
	if result != nil {
		return result
	}
	result = entities.Variable()
	tracer.TraceMode("Entity: Variable()", fmt.Sprintf("result=%v", result != nil), p.parser)
	if result != nil {
		return result
	}
	result = entities.URL()
	tracer.TraceMode("Entity: URL()", fmt.Sprintf("result=%v", result != nil), p.parser)
	if result != nil {
		return result
	}
	result = entities.Property()
	tracer.TraceMode("Entity: Property()", fmt.Sprintf("result=%v", result != nil), p.parser)
	if result != nil {
		return result
	}
	result = entities.Call()
	tracer.TraceMode("Entity: Call()", fmt.Sprintf("result=%v", result != nil), p.parser)
	if result != nil {
		return result
	}
	result = entities.Keyword()
	tracer.TraceMode("Entity: Keyword()", fmt.Sprintf("result=%v", result != nil), p.parser)
	if result != nil {
		return result
	}
	result = p.mixin.Call(true, false)
	tracer.TraceMode("Entity: mixin.Call()", fmt.Sprintf("result=%v", result != nil), p.parser)
	if result != nil {
		return result
	}
	result = entities.JavaScript()
	if result != nil {
		return result
	}
	return nil
}

// Value parses values
func (p *Parsers) Value() any {
	expressions := make([]any, 0)

	for {
		e := p.Expression()
		if e != nil {
			expressions = append(expressions, e)
			if p.parser.parserInput.Char(',') == nil {
				break
			}
		} else {
			break
		}
	}

	if len(expressions) > 0 {
		value, err := NewValue(expressions)
		if err != nil {
			return nil
		}
		return value
	}
	return nil
}

// End checks for declaration terminators
func (p *Parsers) End() bool {
	return p.parser.parserInput.Peek(";") || p.parser.parserInput.Peek("}")
}

// Variable parses variable declarations (@var:)
func (p *Parsers) Variable() any {
	if p.parser.parserInput.CurrentChar() == '@' {
		name := p.parser.parserInput.Re(regexp.MustCompile(`^(@[\w-]+)\s*:`))
		if name != nil {
			if matches, ok := name.([]string); ok && len(matches) > 1 {
				return matches[1] // Return just the variable name (e.g., "@my-color")
			}
		}
	}
	return nil
}

// EntityParsers methods

// Quoted parses quoted strings - "milky way" 'he\'s the one!'
func (e *EntityParsers) Quoted(forceEscaped bool) any {
	var str string
	index := e.parsers.parser.parserInput.GetIndex() // Fix: Use GetIndex() for current position
	isEscaped := false

	e.parsers.parser.parserInput.Save()
	if e.parsers.parser.parserInput.Char('~') != nil {
		isEscaped = true
	} else if forceEscaped {
		e.parsers.parser.parserInput.Restore("")
		return nil
	}

	quoted := e.parsers.parser.parserInput.Quoted(-1)
	if quoted == nil {
		e.parsers.parser.parserInput.Restore("")
		return nil
	}

	str = quoted.(string)
	e.parsers.parser.parserInput.Forget()

	return NewQuoted(string(str[0]), str[1:len(str)-1], isEscaped, index+e.parsers.parser.currentIndex, e.parsers.parser.fileInfo)
}

// Keyword parses keywords - black border-collapse
func (e *EntityParsers) Keyword() any {
	tracer := GetParserTracer()
	if tracer.IsEnabled() {
		defer tracer.TraceEnter("Keyword", e.parsers.parser)()
	}

	k := e.parsers.parser.parserInput.Char('%')
	if k == nil {
		k = e.parsers.parser.parserInput.Re(regexp.MustCompile(`^\[?(?:[\w-]|\\(?:[A-Fa-f0-9]{1,6} ?|[^A-Fa-f0-9]))+\]?`))
		tracer.TraceMode("Keyword: after regex", fmt.Sprintf("matched=%v, value=%v", k != nil, k), e.parsers.parser)
	}

	if k != nil {
		kStr := ""
		if kByte, ok := k.(byte); ok {
			kStr = string(kByte)
		} else if kString, ok := k.(string); ok {
			kStr = kString
		} else if kSlice, ok := k.([]string); ok && len(kSlice) > 0 {
			kStr = kSlice[0]
		}

		// Try to create a color from keyword first
		if color := FromKeyword(kStr); color != nil {
			return color
		}
		return NewKeyword(kStr)
	}
	return nil
}

// VariableCurly parses variable entity using protective {} e.g. @{var}
func (e *EntityParsers) VariableCurly() any {
	index := e.parsers.parser.parserInput.GetIndex()

	if e.parsers.parser.parserInput.CurrentChar() == '@' {
		curly := e.parsers.parser.parserInput.Re(regexp.MustCompile(`^@\{([\w-]+)\}`))
		if curly != nil {
			matches := curly.([]string)
			if len(matches) > 1 {
				return NewVariable("@"+matches[1], index+e.parsers.parser.currentIndex, e.parsers.parser.fileInfo)
			}
		}
	}
	return nil
}

// Property parses property accessors - $color
func (e *EntityParsers) Property() any {
	index := e.parsers.parser.parserInput.GetIndex()

	if e.parsers.parser.parserInput.CurrentChar() == '$' {
		name := e.parsers.parser.parserInput.Re(regexp.MustCompile(`^\$[\w-]+`))
		if name != nil {
			var nameStr string
			if matches, ok := name.([]string); ok {
				nameStr = matches[0]
			} else if match, ok := name.(string); ok {
				nameStr = match
			}
			return NewProperty(nameStr, index+e.parsers.parser.currentIndex, e.parsers.parser.fileInfo)
		}
	}
	return nil
}

// PropertyCurly parses property entity using protective {} e.g. ${prop}
func (e *EntityParsers) PropertyCurly() any {
	index := e.parsers.parser.parserInput.GetIndex()

	if e.parsers.parser.parserInput.CurrentChar() == '$' {
		curly := e.parsers.parser.parserInput.Re(regexp.MustCompile(`^\$\{([\w-]+)\}`))
		if curly != nil {
			matches := curly.([]string)
			if len(matches) > 1 {
				return NewProperty("$"+matches[1], index+e.parsers.parser.currentIndex, e.parsers.parser.fileInfo)
			}
		}
	}
	return nil
}

// Color parses hexadecimal colors - #4F3C2F
func (e *EntityParsers) Color() any {
	e.parsers.parser.parserInput.Save()

	if e.parsers.parser.parserInput.CurrentChar() == '#' {
		rgb := e.parsers.parser.parserInput.Re(regexp.MustCompile(`^#([A-Fa-f0-9]{8}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3,4})`))
		if rgb != nil {
			matches := rgb.([]string)
			if len(matches) > 1 {
				// Check if followed by '.' or '[' - if so, this is a namespace/mixin reference, not a color
				// This handles cases like #DEF.colors[primary] where #DEF looks like a color but isn't
				nextChar := e.parsers.parser.parserInput.CurrentChar()
				if nextChar == '.' || nextChar == '[' {
					e.parsers.parser.parserInput.Restore("")
					return nil
				}
				e.parsers.parser.parserInput.Forget()
				return NewColor(matches[1], 1.0, matches[0])
			}
		}
	}
	e.parsers.parser.parserInput.Restore("")
	return nil
}

// ColorKeyword parses color keywords
func (e *EntityParsers) ColorKeyword() any {
	e.parsers.parser.parserInput.Save()
	// Note: autoCommentAbsorb access would need to be implemented in ParserInput
	k := e.parsers.parser.parserInput.Re(regexp.MustCompile(`^[_A-Za-z-][_A-Za-z0-9-]+`))

	if k == nil {
		e.parsers.parser.parserInput.Forget()
		return nil
	}
	e.parsers.parser.parserInput.Restore("")

	var kStr string
	if matches, ok := k.([]string); ok {
		kStr = matches[0]
	} else if match, ok := k.(string); ok {
		kStr = match
	}

	color := FromKeyword(kStr)
	if color != nil {
		e.parsers.parser.parserInput.Str(kStr)
		return color
	}
	return nil
}

// Dimension parses dimensions (numbers with units) - 0.5em 95%
func (e *EntityParsers) Dimension() any {
	if e.parsers.parser.parserInput.PeekNotNumeric() {
		return nil
	}

	value := e.parsers.parser.parserInput.Re(regexp.MustCompile(`^([+-]?\d*\.?\d+)(%|[a-z_]+)?`))
	if value != nil {
		matches := value.([]string)
		var unit string
		if len(matches) > 2 {
			unit = matches[2]
		}
		dimension, _ := NewDimension(matches[1], unit)
		return dimension
	}
	return nil
}

// UnicodeDescriptor parses unicode descriptors - U+0?? or U+00A1-00A9
func (e *EntityParsers) UnicodeDescriptor() any {
	ud := e.parsers.parser.parserInput.Re(regexp.MustCompile(`^U\+[0-9a-fA-F?]+(-[0-9a-fA-F?]+)?`))
	if ud != nil {
		var udStr string
		if matches, ok := ud.([]string); ok {
			udStr = matches[0]
		} else if match, ok := ud.(string); ok {
			udStr = match
		}
		return NewUnicodeDescriptor(udStr)
	}
	return nil
}

// JavaScript parses JavaScript evaluation - `window.location.href`
func (e *EntityParsers) JavaScript() any {
	index := e.parsers.parser.parserInput.GetIndex()

	e.parsers.parser.parserInput.Save()

	escape := e.parsers.parser.parserInput.Char('~') != nil
	jsQuote := e.parsers.parser.parserInput.Char('`') != nil

	if !jsQuote {
		e.parsers.parser.parserInput.Restore("")
		return nil
	}

	js := e.parsers.parser.parserInput.Re(regexp.MustCompile("^[^`]*`"))
	if js != nil {
		var jsStr string
		if matches, ok := js.([]string); ok {
			jsStr = matches[0]
		} else if match, ok := js.(string); ok {
			jsStr = match
		}
		e.parsers.parser.parserInput.Forget()
		return NewJavaScript(jsStr[:len(jsStr)-1], escape, index+e.parsers.parser.currentIndex, e.parsers.parser.fileInfo)
	}
	e.parsers.parser.parserInput.Restore("invalid javascript definition")
	return nil
}

// Ruleset parses CSS rulesets
func (p *Parsers) Ruleset() any {
	tracer := GetParserTracer()
	if tracer.IsEnabled() {
		defer tracer.TraceEnter("Ruleset", p.parser)()
	}

	var selectors []any
	var rules []any
	var debugInfo map[string]any

	p.parser.parserInput.Save()

	if context, ok := p.parser.context["dumpLineNumbers"]; ok && context != nil {
		debugInfo = p.parser.getDebugInfo(p.parser.parserInput.GetIndex())
	}

	selectors = p.Selectors()
	tracer.TraceMode("After Selectors()", fmt.Sprintf("selectors=%v", selectors != nil), p.parser)

	if selectors != nil {
		blockResult := p.Block()
		tracer.TraceMode("After Block()", fmt.Sprintf("blockResult=%v", blockResult != nil), p.parser)
		if blockResult != nil {
			if rulesSlice, ok := blockResult.([]any); ok {
				rules = rulesSlice
				p.parser.parserInput.Forget()
				strictImports := false
				if val, ok := p.parser.context["strictImports"].(bool); ok {
					strictImports = val
				}
				ruleset := NewRuleset(selectors, rules, strictImports, nil, p.parser.CreateSelectorsParseFunc(), p.parser.CreateValueParseFunc(), p.parser.context, p.parser.imports)
				if debugInfo != nil {
					ruleset.DebugInfo = debugInfo
				}
				return ruleset
			}
		}
	}

	p.parser.parserInput.Restore("")
	return nil
}

// ExtendRule parses extend rules
func (p *Parsers) ExtendRule() any {
	result := p.Extend()

	// Fix: If Extend() returns an empty slice, convert it to nil to prevent infinite loop
	if result != nil && len(result) == 0 {
		return nil
	}

	return result
}

// VariableCall parses variable calls
func (p *Parsers) VariableCall() any {
	var lookups []string
	i := p.parser.parserInput.GetIndex()
	var name string

	p.parser.parserInput.Save()

	if p.parser.parserInput.CurrentChar() == '@' {
		nameMatch := p.parser.parserInput.Re(regexp.MustCompile(`^(@[\w-]+)(\(\s*\))?`))
		if nameMatch != nil {
			matches, ok := nameMatch.([]string)
			if ok && len(matches) > 1 {
				name = matches[1]
			}

			lookups = p.mixin.RuleLookups()

			if len(lookups) == 0 && (len(matches) < 3 || matches[2] != "()") {
				p.parser.parserInput.Restore("Missing '[...]' lookup in variable call")
				return nil
			}

			if len(lookups) == 0 {
				p.parser.parserInput.Forget()
				return NewVariableCall(name, i, p.parser.fileInfo)
			} else {
				p.parser.parserInput.Forget()
				varCall := NewVariableCall(name, i, p.parser.fileInfo)
				return NewNamespaceValue(varCall, lookups, i, p.parser.fileInfo)
			}
		}
	}
	p.parser.parserInput.Restore("")
	return nil
}

// AtRule parses at-rules
func (p *Parsers) AtRule() any {
	index := p.parser.parserInput.GetIndex()
	var name string
	var value any
	var rules any
	var nonVendorSpecificName string
	var hasIdentifier bool
	var hasExpression bool
	var hasUnknown bool
	hasBlock := true
	isRooted := true

	if p.parser.parserInput.CurrentChar() != '@' {
		return nil
	}

	// Check for special at-rules first
	value = p.Import()
	if value != nil {
		return value
	}

	value = p.Plugin()
	if value != nil {
		return value
	}

	value = p.NestableAtRule()
	if value != nil {
		return value
	}

	p.parser.parserInput.Save()

	nameMatch := p.parser.parserInput.Re(regexp.MustCompile(`^@[a-z-]+`))
	if nameMatch == nil {
		return nil
	}

	if nameSlice, ok := nameMatch.([]string); ok && len(nameSlice) > 0 {
		name = nameSlice[0]
	} else if nameStr, ok := nameMatch.(string); ok {
		name = nameStr
	}

	nonVendorSpecificName = name
	if len(name) > 1 && name[1] == '-' {
		if dashIndex := strings.Index(name[2:], "-"); dashIndex > 0 {
			nonVendorSpecificName = "@" + name[dashIndex+3:]
		}
	}

	// Determine parsing strategy based on at-rule type
	switch nonVendorSpecificName {
	case "@charset":
		hasIdentifier = true
		hasBlock = false
	case "@namespace":
		hasExpression = true
		hasBlock = false
	case "@keyframes", "@counter-style":
		hasIdentifier = true
	case "@document", "@supports":
		hasUnknown = true
		isRooted = false
	default:
		hasUnknown = true
	}

	p.parser.parserInput.CommentsReset()

	if hasIdentifier {
		value = p.Entity()
		if value == nil {
			p.parser.error(fmt.Sprintf("expected %s identifier", name), "")
		}
	} else if hasExpression {
		value = p.Expression()
		if value == nil {
			p.parser.error(fmt.Sprintf("expected %s expression", name), "")
		}
	} else if hasUnknown {
		value = p.PermissiveValue(regexp.MustCompile(`^[{;]`), false)
		hasBlock = (p.parser.parserInput.CurrentChar() == '{')
		if value == nil {
			if !hasBlock && p.parser.parserInput.CurrentChar() != ';' {
				p.parser.error(fmt.Sprintf("%s rule is missing block or ending semi-colon", name), "")
			}
		}
		// TODO: Implement proper value content checking when value is not nil
	}

	if hasBlock {
		rules = p.BlockRuleset()
	}

	if rules != nil || (!hasBlock && value != nil && p.parser.parserInput.Char(';') != nil) {
		p.parser.parserInput.Forget()
		var debugInfo map[string]any
		if p.parser.context["dumpLineNumbers"] != nil {
			debugInfo = p.parser.getDebugInfo(index)
		}
		return NewAtRule(name, value, rules, index+p.parser.currentIndex, p.parser.fileInfo, debugInfo, isRooted, nil)
	}

	p.parser.parserInput.Restore("at-rule options not recognised")
	return nil
}

// Important parses !important
func (p *Parsers) Important() any {
	if p.parser.parserInput.CurrentChar() == '!' {
		result := p.parser.parserInput.Re(regexp.MustCompile(`^! *important`))
		if result != nil {
			if matches, ok := result.([]string); ok {
				return matches[0]
			} else if match, ok := result.(string); ok {
				return match
			}
		}
	}
	return nil
}

// Selectors parses multiple selectors separated by commas
func (p *Parsers) Selectors() []any {
	var s any
	var selectors []any

	for {
		s = p.Selector(true)
		if s == nil {
			break
		}
		if selectors != nil {
			selectors = append(selectors, s)
		} else {
			selectors = []any{s}
		}
		// CommentsReset equivalent - clear comment store
		p.parser.parserInput.CommentsReset()
		if selector, ok := s.(*Selector); ok && selector.Condition != nil && len(selectors) > 1 {
			p.parser.error("Guards are only currently allowed on a single selector.", "")
		}
		if p.parser.parserInput.Char(',') == nil {
			break
		}
		if selector, ok := s.(*Selector); ok && selector.Condition != nil {
			p.parser.error("Guards are only currently allowed on a single selector.", "")
		}
		// CommentsReset equivalent - clear comment store
		p.parser.parserInput.CommentsReset()
	}
	return selectors
}

// Selector parses selectors
func (p *Parsers) Selector(isLess bool) any {
	index := p.parser.parserInput.GetIndex()
	var elements []*Element
	var extendList []any
	var e any
	var allExtends []any
	var when bool
	var condition any

	// Fix: Handle isLess parameter properly like JavaScript version
	// In JavaScript: isLess = isLess !== false means isLess defaults to true unless explicitly false
	// Since Go bool defaults to false, we need to handle the case where it wasn't explicitly set to false
	// The method signature should match: in JS it's called as selector(true) or selector(false) explicitly
	// So isLess parameter should be used as-is since it's explicitly passed

	for {
		if isLess {
			extendList = p.Extend()
			if extendList != nil {
				if allExtends != nil {
					allExtends = append(allExtends, extendList...)
				} else {
					allExtends = extendList
				}
				continue
			}

			if p.parser.parserInput.Str("when") != nil {
				when = true
				break
			}
		}

		e = p.Element()
		if e == nil {
			break
		}

		if when {
			p.parser.error("CSS guard can only be used at the end of selector", "")
		} else if allExtends != nil {
			p.parser.error("Extend can only be used at the end of selector", "")
		}

		if element, ok := e.(*Element); ok {
			elements = append(elements, element)
		}

		// Check if we should continue parsing more elements
		cByte := p.parser.parserInput.CurrentChar()
		if cByte == '{' || cByte == '}' || cByte == ';' || cByte == ',' || cByte == ')' {
			break
		}

		// Continue if there might be more elements (whitespace or combinators ahead)
		// This allows parsing sequences like "div > p" or "a b c"
	}

	if when {
		condition = p.parser.expect(p.Conditions, "expected condition")
	}

	if len(elements) > 0 {
		selector, err := NewSelector(elements, allExtends, condition, index+p.parser.currentIndex, p.parser.fileInfo, nil, p.parser.CreateSelectorParseFunc(), p.parser.context, p.parser.imports)
		if err != nil {
			p.parser.error(fmt.Sprintf("Failed to create selector: %v", err), "Parse")
			return nil
		}
		return selector
	}
	if allExtends != nil {
		p.parser.error("Extend must be used to extend a selector, it cannot be used on its own", "")
	}

	return nil
}

// Extend parses extend rules
func (p *Parsers) Extend() []any {
	var elements []any
	var e any
	index := p.parser.parserInput.GetIndex()
	var option string
	var extendList []any
	var extend any

	// Check for both ":extend(" and "&:extend(" patterns
	if p.parser.parserInput.Str("&:extend(") == nil && p.parser.parserInput.Str(":extend(") == nil {
		return nil
	}

	for {
		option = ""
		elements = nil
		first := true

		for {
			// Check for option (all or !all) followed by whitespace and closing paren or comma
			p.parser.parserInput.Save()
			optionMatch := p.parser.parserInput.Re(regexp.MustCompile(`^(!?all)`))
			if optionMatch != nil {
				if matches, ok := optionMatch.([]string); ok && len(matches) > 1 {
					// Check if followed by whitespace and ) or ,
					p.parser.parserInput.Re(regexp.MustCompile(`^\s*`)) // Skip whitespace
					nextChar := p.parser.parserInput.CurrentChar()
					if nextChar == ')' || nextChar == ',' {
						option = matches[1]
						p.parser.parserInput.Forget()
						break
					}
				}
			}
			p.parser.parserInput.Restore("")

			e = p.Element()
			if e == nil {
				break
			}

			// Warn about complex selectors targeting
			if !first {
				if element, ok := e.(*Element); ok && element.Combinator != nil && element.Combinator.Value != "" {
					p.parser.warn("Targeting complex selectors can have unexpected behavior, and this behavior may change in the future.", index, "")
				}
			}
			first = false

			if elements != nil {
				elements = append(elements, e)
			} else {
				elements = []any{e}
			}
		}

		if elements == nil {
			p.parser.error("Missing target selector for :extend().", "")
		}

		// Convert []any to []*Element
		var elementSlice []*Element
		for _, elem := range elements {
			if element, ok := elem.(*Element); ok {
				elementSlice = append(elementSlice, element)
			}
		}

		selector, err := NewSelector(elementSlice, nil, nil, index+p.parser.currentIndex, p.parser.fileInfo, nil, p.parser.CreateSelectorParseFunc(), p.parser.context, p.parser.imports)
		if err != nil {
			p.parser.error(fmt.Sprintf("Failed to create selector for extend: %v", err), "Parse")
			return nil
		}
		extend = NewExtend(selector, option, index+p.parser.currentIndex, p.parser.fileInfo, nil)

		if extendList != nil {
			extendList = append(extendList, extend)
		} else {
			extendList = []any{extend}
		}

		if p.parser.parserInput.Char(',') == nil {
			break
		}
	}

	p.parser.expect(regexp.MustCompile(`^\)`), "")
	return extendList
}

// MediaFeature parses media features
func (p *Parsers) MediaFeature(syntaxOptions map[string]any) any {
	entities := p.entities
	nodes := make([]any, 0)
	var e any
	var prop any
	var rangeProp any

	p.parser.parserInput.Save()

	for {
		e = entities.DeclarationCall()
		if e == nil {
			e = entities.Keyword()
		}
		if e == nil {
			e = entities.Variable()
		}
		if e == nil {
			e = entities.MixinLookup()
		}

		if e != nil {
			nodes = append(nodes, e)
		} else if p.parser.parserInput.Char('(') != nil {
			prop = p.Property()
			p.parser.parserInput.Save()

			// Check if this is a query-in-parens condition (e.g., (width > 500px))
			conditionMatched := false
			if prop == nil && syntaxOptions != nil {
				if queryInParens, ok := syntaxOptions["queryInParens"].(bool); ok && queryInParens {
					if p.parser.parserInput.Re(regexp.MustCompile(`^[0-9a-z-]*\s*([<>]=|<=|>=|[<>]|=)`)) != nil {
						p.parser.parserInput.Restore("")
						prop = p.Condition(false)

						p.parser.parserInput.Save()
						if prop != nil {
							if condition, ok := prop.(*Condition); ok {
								rangeProp = p.AtomicCondition(false, condition.Rvalue)
							}
						}
						if rangeProp == nil {
							p.parser.parserInput.Restore("")
						}
						conditionMatched = true
					}
				}
			}

			// If no property and no condition matched, or if property was found, try parsing a value
			if !conditionMatched {
				p.parser.parserInput.Restore("")
				e = p.Value()
			}

			if p.parser.parserInput.Char(')') != nil {
				if prop != nil && e == nil {
					// Create QueryInParens node
					var queryInParens any
					if condition, ok := prop.(*Condition); ok {
						var rangeOp string
						var rangeValue any
						if rangeProp != nil {
							if rangeCond, ok := rangeProp.(*Condition); ok {
								rangeOp = rangeCond.Op
								rangeValue = rangeCond.Rvalue
							}
						}
						queryInParens = NewQueryInParens(condition.Op, condition.Lvalue, condition.Rvalue, rangeOp, rangeValue, condition.Index)
					}
					nodes = append(nodes, NewParen(queryInParens))
					e = prop
				} else if prop != nil && e != nil {
					decl, _ := NewDeclaration(prop, e, nil, false, p.parser.parserInput.GetIndex()+p.parser.currentIndex, p.parser.fileInfo, true, false)
					nodes = append(nodes, NewParen(decl))
				} else if e != nil {
					nodes = append(nodes, NewParen(e))
				} else {
					p.parser.error("badly formed media feature definition", "")
				}
			} else {
				p.parser.error("Missing closing ')'", "Parse")
			}
		}

		if e == nil {
			break
		}
	}

	p.parser.parserInput.Forget()
	if len(nodes) > 0 {
		expr, err := NewExpression(nodes, false)
		if err != nil {
			return nil
		}
		return expr
	}
	return nil
}

// MediaFeatures parses media features
func (p *Parsers) MediaFeatures(syntaxOptions map[string]any) any {
	entities := p.entities
	features := make([]any, 0)
	var e any

	for {
		e = p.MediaFeature(syntaxOptions)
		if e != nil {
			features = append(features, e)
			if p.parser.parserInput.Char(',') == nil {
				break
			}
		} else {
			e = entities.Variable()
			if e == nil {
				e = entities.MixinLookup()
			}
			if e != nil {
				features = append(features, e)
				if p.parser.parserInput.Char(',') == nil {
					break
				}
			} else {
				break
			}
		}
	}

	if len(features) > 0 {
		return features
	}
	return nil
}

// Plugin parses @plugin directives
func (p *Parsers) Plugin() any {
	var path any
	var args string
	var options map[string]any
	index := p.parser.parserInput.GetIndex()

	dir := p.parser.parserInput.Re(regexp.MustCompile(`^@plugin\s+`))
	if dir == nil {
		return nil
	}
	
	args = p.PluginArgs()
	if args != "" {
		options = map[string]any{
			"pluginArgs": args,
			"isPlugin":   true,
		}
	} else {
		options = map[string]any{"isPlugin": true}
	}

	path = p.entities.Quoted(false)
	if path == nil {
		path = p.entities.URL()
	}

	if path != nil {
		if p.parser.parserInput.Char(';') == nil {
			p.parser.parserInput.SetIndex(index)
			p.parser.error("missing semi-colon on @plugin", "")
		}
		return NewImport(path, nil, options, index+p.parser.currentIndex, p.parser.fileInfo, nil)
	} else {
		p.parser.parserInput.SetIndex(index)
		p.parser.error("malformed @plugin statement", "")
	}
	return nil
}

// PluginArgs parses plugin arguments
func (p *Parsers) PluginArgs() string {
	p.parser.parserInput.Save()
	if p.parser.parserInput.Char('(') == nil {
		p.parser.parserInput.Restore("")
		return ""
	}

	args := p.parser.parserInput.Re(regexp.MustCompile(`^\s*([^);]+)\)\s*`))
	if args != nil {
		if matches, ok := args.([]string); ok && len(matches) > 1 {
			p.parser.parserInput.Forget()
			return strings.TrimSpace(matches[1])
		}
	}

	p.parser.parserInput.Restore("")
	return ""
}

// Sub parses parenthetical expressions
func (p *Parsers) Sub() any {
	var a any
	var e any

	p.parser.parserInput.Save()
	if p.parser.parserInput.Char('(') != nil {
		// Try Addition first for mathematical expressions like (2 + 3)
		a = p.Addition()
		if a != nil && p.parser.parserInput.Char(')') != nil {
			p.parser.parserInput.Forget()
			// Create Expression with Parens=true (like JavaScript)
			// This allows math operations to collapse during evaluation
			expr, err := NewExpression([]any{a}, false)
			if err == nil {
				expr.Parens = true
				e = expr
			}
			return e
		}

		// If Addition failed, try parsing as a general expression with colon support
		// for media queries like (min-width: 480px)
		p.parser.parserInput.Restore("")
		p.parser.parserInput.Save()
		if p.parser.parserInput.Char('(') != nil {
			entities := make([]any, 0)
			index := p.parser.parserInput.GetIndex()
			hasColon := false

			// Parse entities until we hit ')'
			for p.parser.parserInput.CurrentChar() != ')' && p.parser.parserInput.CurrentChar() != 0 {
				// Try to parse an entity
				ent := p.Addition()
				if ent == nil {
					ent = p.Entity()
				}
				if ent != nil {
					entities = append(entities, ent)
					// Check for colon after entity (for media query features)
					if p.parser.parserInput.Char(':') != nil {
						entities = append(entities, NewAnonymous(":", index+p.parser.currentIndex, p.parser.fileInfo, false, false, nil))
						hasColon = true
					}
				} else {
					// Couldn't parse, bail out
					break
				}
			}

			if len(entities) > 0 && p.parser.parserInput.Char(')') != nil {
				p.parser.parserInput.Forget()
				expr, err := NewExpression(entities, false)
				if err == nil {
					// Only wrap in Paren if it contains a colon (media query feature)
					// Otherwise use Expression with Parens=true (for math)
					if hasColon {
						return NewParen(expr)
					} else {
						expr.Parens = true
						return expr
					}
				}
			}
		}

		p.parser.parserInput.Restore("Expected ')'")
		return nil
	}
	p.parser.parserInput.Restore("")
	return nil
}

// Multiplication parses multiplication and division operations
func (p *Parsers) Multiplication() any {
	var m any
	var a any
	var op string
	var operation any
	isSpaced := false

	m = p.Operand()
	if m == nil {
		return nil
	}

	isSpaced = p.parser.parserInput.IsWhitespace(-1)

	for {
		if p.parser.parserInput.Peek(regexp.MustCompile(`^\/[*/]`)) {
			break
		}

		p.parser.parserInput.Save()

		// Skip leading whitespace before looking for operator
		for p.parser.parserInput.IsWhitespace(0) {
			p.parser.parserInput.SetIndex(p.parser.parserInput.GetIndex() + 1)
		}

		if p.parser.parserInput.Char('/') != nil {
			op = "/"
		} else if p.parser.parserInput.Char('*') != nil {
			op = "*"
		} else {
			index := p.parser.parserInput.GetIndex()
			if p.parser.parserInput.Str("./") != nil {
				p.parser.warn("./ operator is deprecated", index, "DEPRECATED")
				op = "./"
			}
		}

		if op == "" {
			p.parser.parserInput.Forget()
			break
		}

		a = p.Operand()
		if a == nil {
			p.parser.parserInput.Restore("")
			break
		}
		p.parser.parserInput.Forget()

		// Set parens flags
		if mNode, ok := m.(interface{ SetParensInOp(bool) }); ok {
			mNode.SetParensInOp(true)
		}
		if aNode, ok := a.(interface{ SetParensInOp(bool) }); ok {
			aNode.SetParensInOp(true)
		}

		operands := []any{m, a}
		if operation != nil {
			operands[0] = operation
		}
		operation = NewOperation(op, operands, isSpaced)
		isSpaced = p.parser.parserInput.IsWhitespace(-1)
		op = ""
	}

	if operation != nil {
		return operation
	}
	return m
}

// Addition parses addition and subtraction operations
func (p *Parsers) Addition() any {
	var m any
	var a any
	var op string
	var operation any
	isSpaced := false

	m = p.Multiplication()
	if m == nil {
		return nil
	}

	isSpaced = p.parser.parserInput.IsWhitespace(-1)

	for {
		// Match JavaScript: op = parserInput.$re(/^[-+]\s+/) || (!isSpaced && (parserInput.$char('+') || parserInput.$char('-')));
		// The regex requires at least one space AFTER the operator
		// If there was space before (isSpaced), we need space after too
		// If no space before, we can match bare operator
		opMatch := p.parser.parserInput.Re(regexp.MustCompile(`^[-+]\s+`))
		if opMatch != nil {
			// Handle both string and []string return types from parserInput.Re()
			if matches, ok := opMatch.([]string); ok && len(matches) > 0 {
				op = strings.TrimSpace(matches[0])
			} else if matchStr, ok := opMatch.(string); ok {
				op = strings.TrimSpace(matchStr)
			}
		} else if !isSpaced {
			// Only match bare operator if there was no space before
			if p.parser.parserInput.Char('+') != nil {
				op = "+"
			} else if p.parser.parserInput.Char('-') != nil {
				op = "-"
			}
		}

		if op == "" {
			break
		}

		a = p.Multiplication()
		if a == nil {
			break
		}

		// Set parens flags
		if mNode, ok := m.(interface{ SetParensInOp(bool) }); ok {
			mNode.SetParensInOp(true)
		}
		if aNode, ok := a.(interface{ SetParensInOp(bool) }); ok {
			aNode.SetParensInOp(true)
		}

		operands := []any{m, a}
		if operation != nil {
			operands[0] = operation
		}
		operation = NewOperation(op, operands, isSpaced)
		isSpaced = p.parser.parserInput.IsWhitespace(-1)
		op = ""
	}

	if operation != nil {
		return operation
	}
	return m
}

// Operand parses operands for operations
func (p *Parsers) Operand() any {
	entities := p.entities
	var negate bool
	var o any

	if p.parser.parserInput.Peek(regexp.MustCompile(`^-[@$(]`)) {
		negate = p.parser.parserInput.Char('-') != nil
	}

	o = p.Sub()
	if o == nil {
		o = entities.Dimension()
	}
	if o == nil {
		o = entities.Color()
	}
	if o == nil {
		o = entities.Variable()
	}
	if o == nil {
		o = entities.Property()
	}
	if o == nil {
		o = entities.Call()
	}
	if o == nil {
		o = entities.Quoted(true)
	}
	if o == nil {
		o = entities.ColorKeyword()
	}
	if o == nil {
		o = entities.MixinLookup()
	}

	if negate && o != nil {
		if oNode, ok := o.(interface{ SetParensInOp(bool) }); ok {
			oNode.SetParensInOp(true)
		}
		o = NewNegative(o)
	}

	return o
}

// Conditions parses condition lists
func (p *Parsers) Conditions() any {
	var a any
	var b any
	index := p.parser.parserInput.GetIndex()
	var condition any

	a = p.Condition(true)
	if a == nil {
		return nil
	}

	for {
		if !p.parser.parserInput.Peek(regexp.MustCompile(`^,\s*(not\s*)?\(`)) || p.parser.parserInput.Char(',') == nil {
			break
		}
		b = p.Condition(true)
		if b == nil {
			break
		}
		// Build OR condition: use 'a' for first iteration, then accumulated 'condition'
		if condition != nil {
			condition = NewCondition("or", condition, b, index+p.parser.currentIndex, false)
		} else {
			condition = NewCondition("or", a, b, index+p.parser.currentIndex, false)
		}
	}

	if condition != nil {
		return condition
	}
	return a
}

// Condition parses conditions
func (p *Parsers) Condition(needsParens bool) any {
	var result any
	var logical string
	var next any

	result = p.ConditionAnd(needsParens)
	if result == nil {
		return nil
	}

	if p.parser.parserInput.Str("or") != nil {
		logical = "or"
	}

	if logical != "" {
		next = p.Condition(needsParens)
		if next != nil {
			result = NewCondition(logical, result, next, p.parser.parserInput.GetIndex()+p.parser.currentIndex, false)
		} else {
			return nil
		}
	}
	return result
}

// ConditionAnd parses AND conditions
func (p *Parsers) ConditionAnd(needsParens bool) any {
	var result any
	var logical string
	var next any

	insideCondition := func() any {
		cond := p.NegatedCondition(needsParens)
		if cond == nil {
			cond = p.ParenthesisCondition(needsParens)
		}
		if cond == nil && !needsParens {
			return p.AtomicCondition(needsParens, nil)
		}
		return cond
	}

	result = insideCondition()
	if result == nil {
		return nil
	}

	if p.parser.parserInput.Str("and") != nil {
		logical = "and"
	}

	if logical != "" {
		next = p.ConditionAnd(needsParens)
		if next != nil {
			result = NewCondition(logical, result, next, p.parser.parserInput.GetIndex()+p.parser.currentIndex, false)
		} else {
			return nil
		}
	}
	return result
}

// NegatedCondition parses negated conditions
func (p *Parsers) NegatedCondition(needsParens bool) any {
	if p.parser.parserInput.Str("not") != nil {
		result := p.ParenthesisCondition(needsParens)
		if result != nil {
			if condition, ok := result.(*Condition); ok {
				condition.Negate = !condition.Negate
			}
		}
		return result
	}
	return nil
}

// ParenthesisCondition parses conditions in parentheses
func (p *Parsers) ParenthesisCondition(needsParens bool) any {
	tryConditionFollowedByParenthesis := func() any {
		var body any
		p.parser.parserInput.Save()
		body = p.Condition(needsParens)
		if body == nil {
			p.parser.parserInput.Restore("")
			return nil
		}
		if p.parser.parserInput.Char(')') == nil {
			p.parser.parserInput.Restore("")
			return nil
		}
		p.parser.parserInput.Forget()
		return body
	}

	var body any
	p.parser.parserInput.Save()
	if p.parser.parserInput.Str("(") == nil {
		p.parser.parserInput.Restore("")
		return nil
	}

	body = tryConditionFollowedByParenthesis()
	if body != nil {
		p.parser.parserInput.Forget()
		return body
	}

	body = p.AtomicCondition(needsParens, nil)
	if body == nil {
		p.parser.parserInput.Restore("")
		return nil
	}
	if p.parser.parserInput.Char(')') == nil {
		p.parser.parserInput.Restore(fmt.Sprintf("expected ')' got '%c'", p.parser.parserInput.CurrentChar()))
		return nil
	}
	p.parser.parserInput.Forget()
	return body
}

// AtomicCondition parses atomic conditions
func (p *Parsers) AtomicCondition(needsParens bool, preparsedCond any) any {
	entities := p.entities
	index := p.parser.parserInput.GetIndex()
	var a any
	var b any
	var c any
	var op string

	cond := func() any {
		result := p.Addition()
		if result == nil {
			result = entities.Keyword()
		}
		if result == nil {
			result = entities.Quoted(false)
		}
		if result == nil {
			result = entities.MixinLookup()
		}
		return result
	}

	if preparsedCond != nil {
		a = preparsedCond
	} else {
		a = cond()
	}

	if a != nil {
		if p.parser.parserInput.Char('>') != nil {
			if p.parser.parserInput.Char('=') != nil {
				op = ">="
			} else {
				op = ">"
			}
		} else if p.parser.parserInput.Char('<') != nil {
			if p.parser.parserInput.Char('=') != nil {
				op = "<="
			} else {
				op = "<"
			}
		} else if p.parser.parserInput.Char('=') != nil {
			if p.parser.parserInput.Char('>') != nil {
				op = "=>"
			} else if p.parser.parserInput.Char('<') != nil {
				op = "=<"
			} else {
				op = "="
			}
		}

		if op != "" {
			b = cond()
			if b != nil {
				c = NewCondition(op, a, b, index+p.parser.currentIndex, false)
			} else {
				p.parser.error("expected expression", "")
			}
		} else if preparsedCond == nil {
			c = NewCondition("=", a, NewKeyword("true"), index+p.parser.currentIndex, false)
		}
		return c
	}
	return nil
}

// Property parses property names
func (p *Parsers) Property() any {
	name := p.parser.parserInput.Re(regexp.MustCompile(`^(\*?-?[_a-zA-Z0-9-]+)\s*:`))
	if name != nil {
		if matches, ok := name.([]string); ok && len(matches) > 1 {
			return matches[1]
		}
	}
	return nil
}

// Call parses mixin calls
func (m *MixinParsers) Call(inValue bool, getLookup bool) any {
	s := m.parsers.parser.parserInput.CurrentChar()
	var important bool
	var lookups []string
	index := m.parsers.parser.parserInput.GetIndex()
	var elements []*Element
	var args []any
	var hasParens bool
	var parensIndex int
	var parensWS bool

	if s != '.' && s != '#' {
		return nil
	}

	m.parsers.parser.parserInput.Save()

	elements = m.Elements()
	if elements != nil {
		parensIndex = m.parsers.parser.parserInput.GetIndex()
		if m.parsers.parser.parserInput.Char('(') != nil {
			parensWS = m.parsers.parser.parserInput.IsWhitespace(-2)
			argInfo := m.Args(true)
			if argsSlice, ok := argInfo["args"].([]any); ok {
				args = argsSlice
			}
			m.parsers.parser.expectChar(')', "")
			hasParens = true
			if parensWS {
				m.parsers.parser.warn("Whitespace between a mixin name and parentheses for a mixin call is deprecated", parensIndex, "DEPRECATED")
			}
		}

		if getLookup {
			lookups = m.RuleLookups()
		}
		if getLookup && len(lookups) == 0 {
			m.parsers.parser.parserInput.Restore("")
			return nil
		}

		if inValue && len(lookups) == 0 && !hasParens {
			m.parsers.parser.parserInput.Restore("")
			return nil
		}

		if !inValue && m.parsers.Important() != nil {
			important = true
		}

		if inValue || m.parsers.End() {
			m.parsers.parser.parserInput.Forget()
			mixin, err := NewMixinCall(elements, args, index+m.parsers.parser.currentIndex, m.parsers.parser.fileInfo, !getLookup && important)
			if err != nil {
				m.parsers.parser.error(fmt.Sprintf("Failed to create mixin call: %v", err), "Parse")
				return nil
			}
			if len(lookups) > 0 {
				return NewNamespaceValue(mixin, lookups, index+m.parsers.parser.currentIndex, m.parsers.parser.fileInfo)
			} else {
				if !hasParens {
					m.parsers.parser.warn("Calling a mixin without parentheses is deprecated", parensIndex, "DEPRECATED")
				}
				return mixin
			}
		}
	}

	m.parsers.parser.parserInput.Restore("")
	return nil
}

// Elements parses mixin elements
func (m *MixinParsers) Elements() []*Element {
	var elements []*Element
	var e string
	var c byte
	var elem *Element
	var elemIndex int
	re := regexp.MustCompile(`^[#.](?:[\w-]|\\(?:[A-Fa-f0-9]{1,6} ?|[^A-Fa-f0-9]))+`)

	for {
		elemIndex = m.parsers.parser.parserInput.GetIndex()
		eMatch := m.parsers.parser.parserInput.Re(re)
		if eMatch == nil {
			break
		}

		if matches, ok := eMatch.([]string); ok && len(matches) > 0 {
			e = matches[0]
		} else if match, ok := eMatch.(string); ok {
			e = match
		} else {
			break
		}

		var combinator *Combinator
		if c != 0 {
			combinator = NewCombinator(string(c))
		}
		elem = NewElement(combinator, e, false, elemIndex+m.parsers.parser.currentIndex, m.parsers.parser.fileInfo, nil)

		if elements != nil {
			elements = append(elements, elem)
		} else {
			elements = []*Element{elem}
		}

		c = 0
		if m.parsers.parser.parserInput.Char('>') != nil {
			c = '>'
		}
	}

	return elements
}

// Expression parses expressions
func (p *Parsers) Expression() any {
	entities := make([]any, 0)
	var e any
	index := p.parser.parserInput.GetIndex()

	for {
		// Try to parse comment first
		e = p.Comment()
		if e != nil && !isLineComment(e) {
			entities = append(entities, e)
			continue
		}

		// Try to parse an entity (number, color, etc.)
		e = p.Addition()
		if e == nil {
			e = p.Entity()
		}

		if isComment(e) {
			e = nil
		}

		if e != nil {
			entities = append(entities, e)

			// Check for slash delimiter (for operations like font: 12px/1.5)
			if !p.parser.parserInput.Peek(regexp.MustCompile(`^\/[*/]`)) {
				if p.parser.parserInput.Char('/') != nil {
					entities = append(entities, NewAnonymous("/", index+p.parser.currentIndex, p.parser.fileInfo, false, false, nil))
				}
			}
		} else {
			break
		}
	}

	if len(entities) > 0 {
		expr, err := NewExpression(entities, false)
		if err == nil {
			return expr
		}
	}

	return nil
}

// Helper functions for expression parsing
func isLineComment(node any) bool {
	if comment, ok := node.(*Comment); ok {
		return comment.IsLineComment
	}
	return false
}

func isComment(node any) bool {
	_, ok := node.(*Comment)
	return ok
}

// Import parses @import rules
func (p *Parsers) Import() any {
	var path any
	var features any
	index := p.parser.parserInput.GetIndex()

	dir := p.parser.parserInput.Re(regexp.MustCompile(`^@import\s+`))
	if dir == nil {
		return nil
	}

	options := p.ImportOptions()
	if options == nil {
		options = make(map[string]any)
	}

	path = p.entities.Quoted(false)
	if path == nil {
		path = p.entities.URL()
	}

	if path != nil {
		features = p.MediaFeatures(nil)

		if p.parser.parserInput.Char(';') == nil {
			p.parser.parserInput.SetIndex(index)
			p.parser.error("missing semi-colon or unrecognised media features on import", "")
		}

		var featuresValue any
		if features != nil {
			featuresValue, _ = NewValue(features.([]any))
		}
		return NewImport(path, featuresValue, options, index+p.parser.currentIndex, p.parser.fileInfo, nil)
	} else {
		p.parser.parserInput.SetIndex(index)
		p.parser.error("malformed import statement", "")
	}
	return nil
}

// NestableAtRule parses nestable at-rules like @media
func (p *Parsers) NestableAtRule() any {
	var debugInfo map[string]any
	index := p.parser.parserInput.GetIndex()

	if p.parser.context["dumpLineNumbers"] != nil {
		debugInfo = p.parser.getDebugInfo(index)
	}

	p.parser.parserInput.Save()

	if p.parser.parserInput.PeekChar('@') != 0 {
		if p.parser.parserInput.Str("@media") != nil {
			return p.PrepareAndGetNestableAtRule("Media", index, debugInfo)
		}

		if p.parser.parserInput.Str("@container") != nil {
			return p.PrepareAndGetNestableAtRule("Container", index, debugInfo)
		}
	}

	p.parser.parserInput.Restore("")
	return nil
}

// Element parses selector elements
func (p *Parsers) Element() any {
	var e any
	var c any
	var v any
	index := p.parser.parserInput.GetIndex()

	c = p.Combinator()

	// Parse element value using patterns from JavaScript parser
	e = p.parser.parserInput.Re(regexp.MustCompile(`^(?:\d+\.\d+|\d+)%`))
	if e == nil {
		// Match the JavaScript regex pattern, including @{} for variable interpolation
		e = p.parser.parserInput.Re(regexp.MustCompile(`^(?:[.#]?|:*)(?:[\w-]|@\{[\w-]+\}|[^\x00-\x9f]|\\(?:[A-Fa-f0-9]{1,6} ?|[^A-Fa-f0-9]))+`))
	}
	if e == nil {
		e = p.parser.parserInput.Char('*')
	}
	if e == nil {
		e = p.parser.parserInput.Char('&')
	}
	if e == nil {
		e = p.Attribute()
	}
	if e == nil {
		e = p.parser.parserInput.Re(regexp.MustCompile(`^\([^&()@]+\)`))
	}
	if e == nil {
		// Handle [.#:] followed by @ (for variable interpolation)
		// Note: Go regexp doesn't support lookaheads, so we'll check manually
		if p.parser.parserInput.CurrentChar() == '.' || p.parser.parserInput.CurrentChar() == '#' || p.parser.parserInput.CurrentChar() == ':' {
			nextChar := p.parser.parserInput.PeekChar(1)
			if nextChar == '@' {
				e = p.parser.parserInput.Re(regexp.MustCompile(`^[.#:]`))
			}
		}
	}
	if e == nil {
		e = p.entities.VariableCurly()
	}

	// If no simple element found, try parenthesized selectors (simplified version)
	if e == nil {
		p.parser.parserInput.Save()
		if p.parser.parserInput.Char('(') != nil {
			if v = p.Selector(false); v != nil {
				var selectors []any
				selectors = append(selectors, v)
				
				// Handle comma-separated selectors in parentheses
				for p.parser.parserInput.Char(',') != nil {
					selectors = append(selectors, NewAnonymous(",", index+p.parser.currentIndex, p.parser.fileInfo, false, false, nil))
					if v = p.Selector(false); v != nil {
						selectors = append(selectors, v)
					}
				}
				
				if p.parser.parserInput.Char(')') != nil {
					if len(selectors) > 1 {
						// Create a selector with multiple elements
						if selector, err := NewSelector(selectors, []any{}, nil, index+p.parser.currentIndex, p.parser.fileInfo, nil); err == nil {
							e = NewParen(selector)
						}
					} else {
						e = NewParen(selectors[0])
					}
					p.parser.parserInput.Forget()
				} else {
					p.parser.parserInput.Restore("")
				}
			} else {
				p.parser.parserInput.Restore("")
			}
		} else {
			p.parser.parserInput.Forget()
		}
	}

	if e != nil {
		combinator, _ := c.(*Combinator)
		// Match JavaScript: isVariable is true if e is a Variable node
		isVariable := false
		if _, ok := e.(*Variable); ok {
			isVariable = true
		}
		if os.Getenv("LESS_GO_DEBUG") == "1" && isVariable {
			fmt.Printf("[DEBUG Parser Element] Created element with isVariable=true, value type=%T\n", e)
		}
		return NewElement(combinator, e, isVariable, index+p.parser.currentIndex, p.parser.fileInfo, nil)
	}
	return nil
}

// MixinParsers methods

// Definition parses mixin definitions
func (m *MixinParsers) Definition() any {
	var name string
	params := make([]any, 0)
	var match any
	var ruleset any
	var cond any
	variadic := false

	if (m.parsers.parser.parserInput.CurrentChar() != '.' && m.parsers.parser.parserInput.CurrentChar() != '#') ||
		m.parsers.parser.parserInput.Peek(regexp.MustCompile(`^[^{]*\}`)) {
		return nil
	}

	m.parsers.parser.parserInput.Save()

	match = m.parsers.parser.parserInput.Re(regexp.MustCompile(`^([#.](?:[\w-]|\\(?:[A-Fa-f0-9]{1,6} ?|[^A-Fa-f0-9]))+)\s*\(`))
	if match != nil {
		if matches, ok := match.([]string); ok && len(matches) > 1 {
			name = matches[1]
		}

		argInfo := m.Args(false)
		if args, ok := argInfo["args"].([]any); ok {
			params = args
		}
		if v, ok := argInfo["variadic"].(bool); ok {
			variadic = v
		}

		if m.parsers.parser.parserInput.Char(')') == nil {
			m.parsers.parser.parserInput.Restore("Missing closing ')'")
			return nil
		}

		m.parsers.parser.parserInput.CommentsReset()

		if m.parsers.parser.parserInput.Str("when") != nil {
			cond = m.parsers.parser.expect(m.parsers.Conditions, "expected condition")
		}

		ruleset = m.parsers.Block()

		if ruleset != nil {
			m.parsers.parser.parserInput.Forget()
			rules := ruleset.([]any)
			mixinDef, err := NewMixinDefinition(name, params, rules, cond, variadic, nil, nil)
			if err != nil {
				return nil
			}

			// Mark all nested rulesets as being inside a mixin definition
			// This prevents them from being output directly - they should only be output when the mixin is called
			for _, rule := range rules {
				if nestedRuleset, ok := rule.(*Ruleset); ok {
					nestedRuleset.InsideMixinDefinition = true
				}
			}

			return mixinDef
		} else {
			m.parsers.parser.parserInput.Restore("")
		}
	} else {
		m.parsers.parser.parserInput.Restore("")
	}

	return nil
}

// RuleLookups parses rule lookups like [ruleProperty]
func (m *MixinParsers) RuleLookups() []string {
	lookups := make([]string, 0)

	if m.parsers.parser.parserInput.CurrentChar() != '[' {
		return lookups
	}

	for {
		m.parsers.parser.parserInput.Save()
		rule := m.LookupValue()
		if rule == nil { // If LookupValue returns nil, it means no match found
			m.parsers.parser.parserInput.Restore("")
			break
		}
		lookups = append(lookups, *rule)
		m.parsers.parser.parserInput.Forget()
	}
	return lookups
}

// EntityParsers methods

// Literal parses literal entities
func (e *EntityParsers) Literal() any {
	result := e.Dimension()
	if result != nil {
		return result
	}
	result = e.Color()
	if result != nil {
		return result
	}
	result = e.Quoted(false)
	if result != nil {
		return result
	}
	return e.UnicodeDescriptor()
}

// Call parses function calls - rgb(255, 0, 255)
func (e *EntityParsers) Call() any {
	tracer := GetParserTracer()
	if tracer.IsEnabled() {
		defer tracer.TraceEnter("Call", e.parsers.parser)()
	}

	var name string
	var args []any
	var function any
	index := e.parsers.parser.parserInput.GetIndex()

	// Skip url() calls as they are handled separately - case insensitive
	if e.parsers.parser.parserInput.Peek(regexp.MustCompile(`(?i)^url\(`)) {
		if tracer.IsEnabled() {
			tracer.TraceResult("Call", nil, "skipped url()")
		}
		return nil
	}

	e.parsers.parser.parserInput.Save()
	if tracer.IsEnabled() {
		tracer.TraceSaveRestore("Save", "Call", e.parsers.parser)
	}

	nameMatch := e.parsers.parser.parserInput.Re(regexp.MustCompile(`^([\w-]+|%|~|progid:[\w.]+)\(`))
	if tracer.IsEnabled() {
		tracer.TraceRegex("Call", "^([\\w-]+|%|~|progid:[\\w.]+)\\(", nameMatch != nil, nameMatch)
	}
	if nameMatch == nil {
		e.parsers.parser.parserInput.Forget()
		if tracer.IsEnabled() {
			tracer.TraceSaveRestore("Forget", "Call", e.parsers.parser)
			tracer.TraceResult("Call", nil, "no function name matched")
		}
		return nil
	}

	// Extract the function name from the captured group
	if matches, ok := nameMatch.([]string); ok && len(matches) > 1 {
		name = matches[1]
	} else {
		e.parsers.parser.parserInput.Forget()
		if tracer.IsEnabled() {
			tracer.TraceSaveRestore("Forget", "Call", e.parsers.parser)
			tracer.TraceResult("Call", nil, "failed to extract function name")
		}
		return nil
	}

	function = e.CustomFuncCall(name)
	if funcMap, ok := function.(map[string]any); ok {
		if parseFunc, ok := funcMap["parse"].(func() []any); ok {
			args = parseFunc()
			if args != nil && funcMap["stop"].(bool) {
				e.parsers.parser.parserInput.Forget()
				if tracer.IsEnabled() {
					tracer.TraceSaveRestore("Forget", "Call", e.parsers.parser)
					tracer.TraceResult("Call", args[0], "custom function: "+name)
				}
				return args[0] // Return the result directly for custom functions
			}
		}
	}

	args = e.Arguments(args)

	if e.parsers.parser.parserInput.Char(')') == nil {
		e.parsers.parser.parserInput.Restore("Could not parse call arguments or missing ')'")
		if tracer.IsEnabled() {
			tracer.TraceSaveRestore("Restore", "Call", e.parsers.parser)
			tracer.TraceResult("Call", nil, "missing closing paren")
		}
		return nil
	}

	e.parsers.parser.parserInput.Forget()
	if tracer.IsEnabled() {
		tracer.TraceSaveRestore("Forget", "Call", e.parsers.parser)
	}

	result := NewCall(name, args, index+e.parsers.parser.currentIndex, e.parsers.parser.fileInfo)
	if tracer.IsEnabled() {
		tracer.TraceResult("Call", result, "function: "+name)
	}
	return result
}

// DeclarationCall parses declaration-like function calls
// This is used in media features where we can have syntax like: supports(display: grid)
func (e *EntityParsers) DeclarationCall() any {
	var validCall string
	var args []any
	index := e.parsers.parser.parserInput.GetIndex()

	e.parsers.parser.parserInput.Save()

	validCallMatch := e.parsers.parser.parserInput.Re(regexp.MustCompile(`^[\w]+\(`))
	if validCallMatch == nil {
		e.parsers.parser.parserInput.Forget()
		return nil
	}

	// Extract function name by removing the opening parenthesis
	if matches, ok := validCallMatch.([]string); ok && len(matches) > 0 {
		validCall = matches[0][:len(matches[0])-1] // Remove the '(' at the end
	} else if match, ok := validCallMatch.(string); ok {
		validCall = match[:len(match)-1] // Remove the '(' at the end
	} else {
		e.parsers.parser.parserInput.Forget()
		return nil
	}

	rule := e.parsers.RuleProperty()
	var value any

	if rule != nil {
		value = e.parsers.Value()
	}

	if rule != nil && value != nil {
		// Create a declaration with the inline flag set to true
		decl, err := NewDeclaration(rule, value, nil, false, e.parsers.parser.parserInput.GetIndex()+e.parsers.parser.currentIndex, e.parsers.parser.fileInfo, true, false)
		if err != nil {
			e.parsers.parser.parserInput.Restore("Could not create declaration for declaration call")
			return nil
		}
		args = []any{decl}
	}

	if e.parsers.parser.parserInput.Char(')') == nil {
		e.parsers.parser.parserInput.Restore("Could not parse call arguments or missing ')'")
		return nil
	}

	e.parsers.parser.parserInput.Forget()

	return NewCall(validCall, args, index+e.parsers.parser.currentIndex, e.parsers.parser.fileInfo)
}

// URL parses url() tokens
func (e *EntityParsers) URL() any {
	var value any
	index := e.parsers.parser.parserInput.GetIndex()

	// Disable comment absorption during URL parsing (matches JavaScript behavior)
	oldAutoCommentAbsorb := e.parsers.parser.parserInput.GetAutoCommentAbsorb()
	e.parsers.parser.parserInput.SetAutoCommentAbsorb(false)

	if e.parsers.parser.parserInput.Str("url(") == nil {
		e.parsers.parser.parserInput.SetAutoCommentAbsorb(oldAutoCommentAbsorb)
		return nil
	}

	value = e.Quoted(false)
	if value == nil {
		value = e.Variable()
	}
	if value == nil {
		value = e.Property()
	}
	if value == nil {
		urlMatch := e.parsers.parser.parserInput.Re(regexp.MustCompile(`^(?:(?:\\[()'""])|[^()'""])+`))
		if urlMatch != nil {
			if matches, ok := urlMatch.([]string); ok {
				value = matches[0]
			} else if match, ok := urlMatch.(string); ok {
				value = match
			}
		} else {
			value = ""
		}
	}

	// Re-enable comment absorption before expecting closing paren
	e.parsers.parser.parserInput.SetAutoCommentAbsorb(oldAutoCommentAbsorb)

	e.parsers.parser.expectChar(')', "")

	// Handle different value types
	var urlValue any
	if variable, ok := value.(*Variable); ok {
		urlValue = variable
	} else if property, ok := value.(*Property); ok {
		urlValue = property
	} else {
		urlValue = NewAnonymous(value, index, e.parsers.parser.fileInfo, false, false, nil)
	}

	return NewURL(urlValue, index+e.parsers.parser.currentIndex, e.parsers.parser.fileInfo, false)
}

// MixinLookup parses mixin lookups
func (e *EntityParsers) MixinLookup() any {
	return e.parsers.mixin.Call(true, true)
}

// ImportOptions parses import options
func (p *Parsers) ImportOptions() map[string]any {
	if p.parser.parserInput.Char('(') == nil {
		return nil
	}

	options := make(map[string]any)

	for {
		opt := p.parser.parserInput.Re(regexp.MustCompile(`^(less|css|multiple|once|inline|reference|optional)`))
		if opt != nil {
			optionName := ""
			value := true
			if matches, ok := opt.([]string); ok && len(matches) > 1 {
				optionName = matches[1]
			}

			switch optionName {
			case "css":
				optionName = "less"
				value = false
			case "once":
				optionName = "multiple"
				value = false
			}
			options[optionName] = value

			if p.parser.parserInput.Char(',') == nil {
				break
			}
		} else {
			break
		}
	}

	p.parser.expectChar(')', "")
	return options
}

// PrepareAndGetNestableAtRule handles @media, @container rules
func (p *Parsers) PrepareAndGetNestableAtRule(atRuleType string, index int, debugInfo map[string]any) any {
	// Use appropriate syntax options based on at-rule type
	var syntaxOptions map[string]any
	switch atRuleType {
	case "Media":
		syntaxOptions = map[string]any{"queryInParens": true}
	case "Container":
		syntaxOptions = map[string]any{"queryInParens": true}
	}

	features := p.MediaFeatures(syntaxOptions)
	rules := p.Block()

	if rules == nil {
		p.parser.error("media definitions require block statements after any features", "")
	}

	p.parser.parserInput.Forget()

	switch atRuleType {
	case "Media":
		var featuresValue any
		if features != nil {
			featuresValue, _ = NewValue(features.([]any))
		}
		return NewMedia(rules.([]any), featuresValue, index+p.parser.currentIndex, p.parser.fileInfo, debugInfo)
	case "Container":
		var featuresValue any
		if features != nil {
			featuresValue, _ = NewValue(features.([]any))
		}
		container, err := NewContainer(rules.([]any), featuresValue, index+p.parser.currentIndex, p.parser.fileInfo, debugInfo)
		if err != nil {
			return nil
		}
		return container
	}
	return nil
}

// Combinator parses selector combinators
func (p *Parsers) Combinator() *Combinator {
	c := p.parser.parserInput.CurrentChar()

	if c == '/' {
		p.parser.parserInput.Save()
		slashedCombinator := p.parser.parserInput.Re(regexp.MustCompile(`^\/[a-z]+\/`))
		if slashedCombinator != nil {
			p.parser.parserInput.Forget()
			if matches, ok := slashedCombinator.([]string); ok {
				return NewCombinator(matches[0])
			}
		}
		p.parser.parserInput.Restore("")
	}

	if c == '>' || c == '+' || c == '~' || c == '|' || c == '^' {
		p.parser.parserInput.SetIndex(p.parser.parserInput.GetIndex() + 1)
		combinator := string(c)
		if c == '^' && p.parser.parserInput.CurrentChar() == '^' {
			combinator = "^^"
			p.parser.parserInput.SetIndex(p.parser.parserInput.GetIndex() + 1)
		}
		// Skip whitespace after combinator
		for {
			if !p.parser.parserInput.IsWhitespace(0) {
				break
			}
			p.parser.parserInput.SetIndex(p.parser.parserInput.GetIndex() + 1)
		}
		return NewCombinator(combinator)
	} else {
		// Check for whitespace combinator (descendant selector)
		// Match JavaScript: check if previous character was whitespace
		if p.parser.parserInput.IsWhitespace(-1) {
			return NewCombinator(" ")
		} else {
			return NewCombinator("")
		}
	}
}

// Attribute parses attribute selectors
func (p *Parsers) Attribute() any {
	if p.parser.parserInput.Char('[') == nil {
		return nil
	}

	entities := p.entities
	var key any
	var val any
	var op any
	var cif string

	key = entities.VariableCurly()
	if key == nil {
		keyMatch := p.parser.parserInput.Re(regexp.MustCompile(`^(?:[_A-Za-z0-9-*]*\|)?(?:[_A-Za-z0-9-]|\\.)+`))
		if keyMatch != nil {
			if matches, ok := keyMatch.([]string); ok && len(matches) > 0 {
				key = matches[0]
			} else if match, ok := keyMatch.(string); ok {
				key = match
			}
		}
	}

	opMatch := p.parser.parserInput.Re(regexp.MustCompile(`^[|~*$^]?=`))
	if opMatch != nil {
		if matches, ok := opMatch.([]string); ok && len(matches) > 0 {
			op = matches[0]
		} else if match, ok := opMatch.(string); ok {
			op = match
		}
		val = entities.Quoted(false)
		if val == nil {
			val = p.parser.parserInput.Re(regexp.MustCompile(`^[0-9]+%`))
		}
		if val == nil {
			val = p.parser.parserInput.Re(regexp.MustCompile(`^[\w-]+`))
		}
		if val == nil {
			val = entities.VariableCurly()
		}
		if val != nil {
			cifMatch := p.parser.parserInput.Re(regexp.MustCompile(`^[iIsS]`))
			if cifMatch != nil {
				if matches, ok := cifMatch.([]string); ok && len(matches) > 0 {
					cif = matches[0]
				} else if match, ok := cifMatch.(string); ok {
					cif = match
				}
			}
		}
	}

	p.parser.expectChar(']', "")

	var opStr string
	if op != nil {
		if str, ok := op.(string); ok {
			opStr = str
		}
	}

	return NewAttribute(key, opStr, val, cif)
}

// Args parses mixin arguments
func (m *MixinParsers) Args(isCall bool) map[string]any {
	returner := map[string]any{
		"args":     make([]any, 0),
		"variadic": false,
	}

	expressions := make([]any, 0)
	argsSemiColon := make([]any, 0)
	argsComma := make([]any, 0)
	isSemiColonSeparated := false
	expressionContainsNamed := false
	var name string
	var nameLoop string
	var value any
	var arg any
	var expand bool
	hasSep := true

	m.parsers.parser.parserInput.Save()

	for {
		if isCall {
			arg = m.parsers.DetachedRuleset()
			if arg == nil {
				arg = m.parsers.Expression()
			}
		} else {
			m.parsers.parser.parserInput.CommentsReset()
			if m.parsers.parser.parserInput.Str("...") != nil {
				returner["variadic"] = true
				if m.parsers.parser.parserInput.Char(';') != nil && !isSemiColonSeparated {
					isSemiColonSeparated = true
				}
				if isSemiColonSeparated {
					argsSemiColon = append(argsSemiColon, map[string]any{"variadic": true})
				} else {
					argsComma = append(argsComma, map[string]any{"variadic": true})
				}
				break
			}
			arg = m.parsers.entities.Variable()
			if arg == nil {
				arg = m.parsers.entities.Property()
			}
			if arg == nil {
				arg = m.parsers.entities.Literal()
			}
			if arg == nil {
				arg = m.parsers.entities.Keyword()
			}
			if arg == nil {
				arg = m.Call(true, false)
			}
		}

		if arg == nil || !hasSep {
			break
		}

		nameLoop = ""
		value = arg
		var val any

		if isCall {
			if expr, ok := arg.(*Expression); ok && len(expr.Value) == 1 {
				val = expr.Value[0]
			}
		} else {
			val = arg
		}

		if variable, ok := val.(*Variable); ok {
			if m.parsers.parser.parserInput.Char(':') != nil {
				if len(expressions) > 0 {
					if isSemiColonSeparated {
						m.parsers.parser.error("Cannot mix ; and , as delimiter types", "")
					}
					expressionContainsNamed = true
				}

				value = m.parsers.DetachedRuleset()
				if value == nil {
					value = m.parsers.Expression()
				}

				if value == nil {
					if isCall {
						m.parsers.parser.error("could not understand value for named argument", "")
					} else {
						m.parsers.parser.parserInput.Restore("")
						returner["args"] = []any{}
						return returner
					}
				}
				nameLoop = variable.GetName()
				name = variable.GetName()
			} else if m.parsers.parser.parserInput.Str("...") != nil {
				if !isCall {
					returner["variadic"] = true
					if m.parsers.parser.parserInput.Char(';') != nil && !isSemiColonSeparated {
						isSemiColonSeparated = true
					}
					if isSemiColonSeparated {
						argsSemiColon = append(argsSemiColon, map[string]any{"name": variable.GetName(), "variadic": true})
					} else {
						argsComma = append(argsComma, map[string]any{"name": variable.GetName(), "variadic": true})
					}
					break
				} else {
					expand = true
				}
			} else if !isCall {
				name = variable.GetName()
				nameLoop = variable.GetName()
				value = nil
			}
		} else if property, ok := val.(*Property); ok {
			if m.parsers.parser.parserInput.Char(':') != nil {
				if len(expressions) > 0 {
					if isSemiColonSeparated {
						m.parsers.parser.error("Cannot mix ; and , as delimiter types", "")
					}
					expressionContainsNamed = true
				}

				value = m.parsers.DetachedRuleset()
				if value == nil {
					value = m.parsers.Expression()
				}

				if value == nil {
					if isCall {
						m.parsers.parser.error("could not understand value for named argument", "")
					} else {
						m.parsers.parser.parserInput.Restore("")
						returner["args"] = []any{}
						return returner
					}
				}
				nameLoop = property.GetName()
				name = property.GetName()
			} else if m.parsers.parser.parserInput.Str("...") != nil {
				if !isCall {
					returner["variadic"] = true
					if m.parsers.parser.parserInput.Char(';') != nil && !isSemiColonSeparated {
						isSemiColonSeparated = true
					}
					if isSemiColonSeparated {
						argsSemiColon = append(argsSemiColon, map[string]any{"name": property.GetName(), "variadic": true})
					} else {
						argsComma = append(argsComma, map[string]any{"name": property.GetName(), "variadic": true})
					}
					break
				} else {
					expand = true
				}
			} else if !isCall {
				name = property.GetName()
				nameLoop = property.GetName()
				value = nil
			}
		}

		if value != nil {
			expressions = append(expressions, value)
		}

		argsComma = append(argsComma, map[string]any{
			"name":   nameLoop,
			"value":  value,
			"expand": expand,
		})

		if m.parsers.parser.parserInput.Char(',') != nil {
			hasSep = true
			continue
		}

		hasSepChar := m.parsers.parser.parserInput.Char(';')
		hasSep = hasSepChar != nil

		if hasSep || isSemiColonSeparated {
			if expressionContainsNamed {
				m.parsers.parser.error("Cannot mix ; and , as delimiter types", "")
			}

			isSemiColonSeparated = true

			if len(expressions) > 1 {
				value, _ = NewValue(expressions)
			}
			argsSemiColon = append(argsSemiColon, map[string]any{
				"name":   name,
				"value":  value,
				"expand": expand,
			})

			name = ""
			expressions = make([]any, 0)
			expressionContainsNamed = false
		}
	}

	m.parsers.parser.parserInput.Forget()
	if isSemiColonSeparated {
		returner["args"] = argsSemiColon
	} else {
		returner["args"] = argsComma
	}
	return returner
}

// LookupValue parses lookup values like [ruleProperty]
// Returns nil if parsing fails, or a pointer to the matched string if successful
func (m *MixinParsers) LookupValue() *string {
	m.parsers.parser.parserInput.Save()

	if m.parsers.parser.parserInput.Char('[') == nil {
		m.parsers.parser.parserInput.Restore("")
		return nil
	}

	nameMatch := m.parsers.parser.parserInput.Re(regexp.MustCompile(`^(?:[@$]{0,2})[_a-zA-Z0-9-]*`))
	name := ""
	if nameMatch != nil {
		// Re() returns a string when there's only one match (no capture groups)
		// or []string when there are multiple matches
		if str, ok := nameMatch.(string); ok {
			name = str
		} else if matches, ok := nameMatch.([]string); ok && len(matches) > 0 {
			name = matches[0]
		}
	}

	if m.parsers.parser.parserInput.Char(']') == nil {
		m.parsers.parser.parserInput.Restore("")
		return nil
	}

	m.parsers.parser.parserInput.Forget()
	return &name
}

// CustomFuncCall handles custom function calls
func (e *EntityParsers) CustomFuncCall(name string) map[string]any {
	lowerName := strings.ToLower(name)

	switch lowerName {
	case "alpha":
		return map[string]any{
			"parse": func() []any {
				result := e.parsers.IeAlpha()
				if result != nil {
					return result
				}
				return nil
			},
			"stop": true,
		}
	case "boolean":
		return map[string]any{
			"parse": func() []any {
				condition := e.parsers.parser.expect(func() any { return e.parsers.Condition(false) }, "expected condition")
				return []any{condition}
			},
			"stop": false,
		}
	case "if":
		return map[string]any{
			"parse": func() []any {
				condition := e.parsers.parser.expect(func() any { return e.parsers.Condition(false) }, "expected condition")
				return []any{condition}
			},
			"stop": false,
		}
	}
	return nil
}

// Arguments parses function arguments
func (e *EntityParsers) Arguments(prevArgs []any) []any {
	argsComma := prevArgs
	if argsComma == nil {
		argsComma = make([]any, 0)
	}
	argsSemiColon := make([]any, 0)
	isSemiColonSeparated := false
	var value any

	e.parsers.parser.parserInput.Save()

	for {
		if prevArgs != nil {
			prevArgs = nil
		} else {
			value = e.parsers.DetachedRuleset()
			if value == nil {
				value = e.Assignment()
			}
			if value == nil {
				value = e.parsers.Expression()
			}
			if value == nil {
				break
			}

			if expr, ok := value.(*Expression); ok && len(expr.Value) == 1 {
				value = expr.Value[0]
			}

			argsComma = append(argsComma, value)
		}

		if e.parsers.parser.parserInput.Char(',') != nil {
			continue
		}

		if e.parsers.parser.parserInput.Char(';') != nil || isSemiColonSeparated {
			isSemiColonSeparated = true
			var argValue any
			if len(argsComma) <= 1 {
				if len(argsComma) == 1 {
					argValue = argsComma[0]
				} else {
					argValue = nil // Empty array case
				}
			} else {
				argValue, _ = NewValue(argsComma)
			}
			argsSemiColon = append(argsSemiColon, argValue)
			argsComma = make([]any, 0)
		}
	}

	e.parsers.parser.parserInput.Forget()
	if isSemiColonSeparated {
		return argsSemiColon
	}
	return argsComma
}

// Assignment parses assignments
func (e *EntityParsers) Assignment() any {
	e.parsers.parser.parserInput.Save()

	// Instead of using positive lookahead (?=\s?=), parse the word and check for = separately
	key := e.parsers.parser.parserInput.Re(regexp.MustCompile(`^\w+`))
	if key == nil {
		e.parsers.parser.parserInput.Restore("")
		return nil
	}

	// Skip optional whitespace and check for equals sign
	e.parsers.parser.parserInput.Re(regexp.MustCompile(`^\s*`)) // Skip whitespace
	if e.parsers.parser.parserInput.Char('=') == nil {
		e.parsers.parser.parserInput.Restore("")
		return nil
	}

	value := e.parsers.Entity()
	if value != nil {
		e.parsers.parser.parserInput.Forget()
		if matches, ok := key.([]string); ok && len(matches) > 0 {
			return NewAssignment(matches[0], value)
		} else if keyStr, ok := key.(string); ok {
			return NewAssignment(keyStr, value)
		}
	} else {
		e.parsers.parser.parserInput.Restore("")
	}
	return nil
}

// IeAlpha parses IE alpha function
func (p *Parsers) IeAlpha() []any {
	if p.parser.parserInput.Re(regexp.MustCompile(`^opacity=`)) == nil {
		return nil
	}
	
	// First try to parse a number
	value := p.parser.parserInput.Re(regexp.MustCompile(`^\d+`))
	var valueStr string
	
	if value != nil {
		// We have a numeric value
		if matches, ok := value.([]string); ok && len(matches) > 0 {
			valueStr = matches[0]
		} else if str, ok := value.(string); ok {
			valueStr = str
		}
	} else {
		// Try to parse a variable
		variable := p.parser.expect(p.entities.Variable, "Could not parse alpha")
		if variable != nil {
			if v, ok := variable.(*Variable); ok {
				// Create variable interpolation syntax like JavaScript
				valueStr = fmt.Sprintf("@{%s}", v.GetName()[1:]) // Remove @ prefix
			}
		}
	}
	
	p.parser.expectChar(')', "")

	// Return a Quoted node with the full alpha function string
	// The escaped flag should be true to ensure the quoted string is evaluated
	quoted := NewQuoted("", fmt.Sprintf("alpha(opacity=%s)", valueStr), true, p.parser.parserInput.GetIndex()+p.parser.currentIndex, p.parser.fileInfo)
	return []any{quoted}
}
