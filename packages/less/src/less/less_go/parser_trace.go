package less_go

import (
	"fmt"
	"os"
	"runtime"
	"strings"
	"sync"
)

// ParserTracer provides runtime debugging and execution tracing for the parser
type ParserTracer struct {
	enabled      bool
	filterFuncs  map[string]bool // nil means trace all, otherwise only trace these functions
	depthMap     sync.Map        // goroutine ID -> call depth
	callStackMap sync.Map        // goroutine ID -> []string (call stack)
	showPosition bool            // Show line/column position
	showContext  bool            // Show surrounding input context
}

var globalTracer *ParserTracer
var tracerOnce sync.Once

// InitParserTracer initializes the global parser tracer based on environment variables
func InitParserTracer() *ParserTracer {
	tracerOnce.Do(func() {
		traceEnv := os.Getenv("LESS_GO_TRACE")
		globalTracer = &ParserTracer{
			enabled:      traceEnv != "" && traceEnv != "0",
			showPosition: true,
			showContext:  true,
		}

		if globalTracer.enabled {
			// Parse selective function tracing
			// LESS_GO_TRACE=1 means trace all
			// LESS_GO_TRACE=Call,DetachedRuleset means trace only these functions
			if traceEnv != "1" && traceEnv != "true" {
				globalTracer.filterFuncs = make(map[string]bool)
				funcs := strings.Split(traceEnv, ",")
				for _, f := range funcs {
					f = strings.TrimSpace(f)
					if f != "" {
						globalTracer.filterFuncs[f] = true
					}
				}
			}
		}
	})
	return globalTracer
}

// GetParserTracer returns the global tracer instance
func GetParserTracer() *ParserTracer {
	if globalTracer == nil {
		InitParserTracer()
	}
	return globalTracer
}

// IsEnabled returns whether tracing is enabled
func (t *ParserTracer) IsEnabled() bool {
	return t.enabled
}

// ShouldTrace returns whether a specific function should be traced
func (t *ParserTracer) ShouldTrace(funcName string) bool {
	if !t.enabled {
		return false
	}
	// If no filter, trace all
	if t.filterFuncs == nil {
		return true
	}
	// Otherwise only trace if in filter list
	return t.filterFuncs[funcName]
}

// getGoroutineID returns the current goroutine ID
func getGoroutineID() uint64 {
	var buf [64]byte
	n := runtime.Stack(buf[:], false)
	// Parse "goroutine 123 [running]:"
	idField := strings.Fields(strings.TrimPrefix(string(buf[:n]), "goroutine "))[0]
	var id uint64
	fmt.Sscanf(idField, "%d", &id)
	return id
}

// getDepth returns the current call depth for this goroutine
func (t *ParserTracer) getDepth() int {
	gid := getGoroutineID()
	if val, ok := t.depthMap.Load(gid); ok {
		return val.(int)
	}
	return 0
}

// incDepth increments the call depth for this goroutine
func (t *ParserTracer) incDepth() {
	gid := getGoroutineID()
	depth := t.getDepth()
	t.depthMap.Store(gid, depth+1)
}

// decDepth decrements the call depth for this goroutine
func (t *ParserTracer) decDepth() {
	gid := getGoroutineID()
	depth := t.getDepth()
	if depth > 0 {
		t.depthMap.Store(gid, depth-1)
	}
}

// getCallStack returns the current call stack for this goroutine
func (t *ParserTracer) getCallStack() []string {
	gid := getGoroutineID()
	if val, ok := t.callStackMap.Load(gid); ok {
		return val.([]string)
	}
	return []string{}
}

// pushCallStack adds a function to the call stack
func (t *ParserTracer) pushCallStack(funcName string) {
	gid := getGoroutineID()
	stack := t.getCallStack()
	stack = append(stack, funcName)
	t.callStackMap.Store(gid, stack)
}

// popCallStack removes the top function from the call stack
func (t *ParserTracer) popCallStack() {
	gid := getGoroutineID()
	stack := t.getCallStack()
	if len(stack) > 0 {
		stack = stack[:len(stack)-1]
		t.callStackMap.Store(gid, stack)
	}
}

// indent returns the indentation string for the current depth
func (t *ParserTracer) indent() string {
	depth := t.getDepth()
	return strings.Repeat("  ", depth)
}

// TraceEnter logs function entry and returns a cleanup function
// Usage: defer tracer.TraceEnter("FunctionName", parser)()
func (t *ParserTracer) TraceEnter(funcName string, p *Parser) func() {
	if !t.ShouldTrace(funcName) {
		return func() {} // No-op cleanup
	}

	t.incDepth()
	t.pushCallStack(funcName)
	indent := t.indent()

	// Get current position and context
	var posInfo string
	if t.showPosition && p != nil && p.parserInput != nil {
		index := p.parserInput.GetIndex()
		input := p.parserInput.GetInput()
		location := GetLocation(index, input)

		line := 0
		col := 0
		if location.Line != nil {
			line = *location.Line + 1
		}
		col = location.Column

		posInfo = fmt.Sprintf(" at line %d, col %d", line, col)

		// Show surrounding context
		if t.showContext {
			contextStr := getInputContext(input, index, 20)
			if contextStr != "" {
				posInfo += fmt.Sprintf(": %q", contextStr)
			}
		}
	}

	fmt.Fprintf(os.Stderr, "%s[TRACE] %s() entered%s\n", indent, funcName, posInfo)

	// Return cleanup function that logs exit
	return func() {
		result := recover()
		indent := t.indent() // Get indent before decrementing

		if result != nil {
			// Function exited via panic/error
			fmt.Fprintf(os.Stderr, "%s[TRACE] %s() -> ERROR: %v\n", indent, funcName, result)
			t.popCallStack()
			t.decDepth()
			panic(result) // Re-panic to preserve error handling
		} else {
			// Normal exit
			fmt.Fprintf(os.Stderr, "%s[TRACE] %s() exited\n", indent, funcName)
			t.popCallStack()
			t.decDepth()
		}
	}
}

// TraceResult logs a parse result (success or nil)
func (t *ParserTracer) TraceResult(funcName string, result any, msg string) {
	if !t.ShouldTrace(funcName) {
		return
	}

	indent := t.indent()
	if result == nil {
		fmt.Fprintf(os.Stderr, "%s[TRACE] %s() -> nil%s\n", indent, funcName,
			func() string {
				if msg != "" {
					return " (" + msg + ")"
				}
				return ""
			}())
	} else {
		resultType := fmt.Sprintf("%T", result)
		fmt.Fprintf(os.Stderr, "%s[TRACE] %s() -> %s%s\n", indent, funcName, resultType,
			func() string {
				if msg != "" {
					return " (" + msg + ")"
				}
				return ""
			}())
	}
}

// TraceRegex logs a regex match attempt
func (t *ParserTracer) TraceRegex(funcName string, pattern string, matched bool, result any) {
	if !t.ShouldTrace(funcName) {
		return
	}

	indent := t.indent()
	if matched {
		fmt.Fprintf(os.Stderr, "%s[TRACE] Re(%s) -> %q\n", indent, pattern, result)
	} else {
		fmt.Fprintf(os.Stderr, "%s[TRACE] Re(%s) -> nil\n", indent, pattern)
	}
}

// TraceChar logs a character match attempt
func (t *ParserTracer) TraceChar(funcName string, char byte, matched bool) {
	if !t.ShouldTrace(funcName) {
		return
	}

	indent := t.indent()
	if matched {
		fmt.Fprintf(os.Stderr, "%s[TRACE] Char('%c') -> '%c'\n", indent, char, char)
	} else {
		fmt.Fprintf(os.Stderr, "%s[TRACE] Char('%c') -> nil\n", indent, char)
	}
}

// TraceSaveRestore logs parser state operations
func (t *ParserTracer) TraceSaveRestore(operation string, funcName string, p *Parser) {
	if !t.ShouldTrace(funcName) {
		return
	}

	indent := t.indent()
	var index int
	if p != nil && p.parserInput != nil {
		index = p.parserInput.GetIndex()
	}

	fmt.Fprintf(os.Stderr, "%s[TRACE] %s (index=%d)\n", indent, operation, index)
}

// TraceError logs a parser error with stack trace
func (t *ParserTracer) TraceError(funcName string, errMsg string, p *Parser) {
	if !t.enabled {
		return
	}

	indent := t.indent()

	// Get position info
	var posInfo string
	if p != nil && p.parserInput != nil {
		index := p.parserInput.GetIndex()
		input := p.parserInput.GetInput()
		location := GetLocation(index, input)

		line := 0
		col := 0
		if location.Line != nil {
			line = *location.Line + 1
		}
		col = location.Column

		contextStr := getInputContext(input, index, 30)
		posInfo = fmt.Sprintf(" at line %d, col %d: %q", line, col, contextStr)
	}

	fmt.Fprintf(os.Stderr, "%s[ERROR] %s%s\n", indent, errMsg, posInfo)

	// Print call stack
	fmt.Fprintf(os.Stderr, "%s[STACK] ", indent)
	t.printCallStack()
}

// printCallStack prints the current call stack
func (t *ParserTracer) printCallStack() {
	stack := t.getCallStack()
	if len(stack) == 0 {
		fmt.Fprintf(os.Stderr, "(empty call stack)\n")
		return
	}

	// Print call stack from bottom to top
	for i, funcName := range stack {
		if i > 0 {
			fmt.Fprintf(os.Stderr, " -> ")
		}
		fmt.Fprintf(os.Stderr, "%s", funcName)
	}
	fmt.Fprintf(os.Stderr, "\n")
}

// GetCallStackString returns the current call stack as a string
func (t *ParserTracer) GetCallStackString() string {
	stack := t.getCallStack()
	if len(stack) == 0 {
		return "(empty)"
	}
	return strings.Join(stack, " -> ")
}

// TraceCheckpoint logs a checkpoint with the current call stack
// Use this after successfully parsing major constructs
func (t *ParserTracer) TraceCheckpoint(checkpointName string, p *Parser) {
	if !t.enabled {
		return
	}

	indent := t.indent()

	// Get current position
	var posInfo string
	if p != nil && p.parserInput != nil {
		index := p.parserInput.GetIndex()
		input := p.parserInput.GetInput()
		location := GetLocation(index, input)

		line := 0
		col := 0
		if location.Line != nil {
			line = *location.Line + 1
		}
		col = location.Column

		posInfo = fmt.Sprintf(" at line %d, col %d", line, col)
	}

	// Get call stack
	stack := t.GetCallStackString()

	fmt.Fprintf(os.Stderr, "%s[CHECKPOINT] %s%s (stack: %s)\n", indent, checkpointName, posInfo, stack)
}

// TraceMode logs parser mode/state information
func (t *ParserTracer) TraceMode(modeName string, details string, p *Parser) {
	if !t.enabled {
		return
	}

	indent := t.indent()

	// Get current position
	var posInfo string
	if p != nil && p.parserInput != nil {
		index := p.parserInput.GetIndex()
		input := p.parserInput.GetInput()
		location := GetLocation(index, input)

		line := 0
		col := 0
		if location.Line != nil {
			line = *location.Line + 1
		}
		col = location.Column

		posInfo = fmt.Sprintf(" at line %d, col %d", line, col)
	}

	detailsStr := ""
	if details != "" {
		detailsStr = fmt.Sprintf(" (%s)", details)
	}

	fmt.Fprintf(os.Stderr, "%s[MODE] %s%s%s\n", indent, modeName, detailsStr, posInfo)
}

// TraceCallStackAt logs the call stack at a specific point
// Use this when you encounter unexpected behavior
func (t *ParserTracer) TraceCallStackAt(label string, p *Parser) {
	if !t.enabled {
		return
	}

	indent := t.indent()

	// Get current position
	var posInfo string
	if p != nil && p.parserInput != nil {
		index := p.parserInput.GetIndex()
		input := p.parserInput.GetInput()
		location := GetLocation(index, input)

		line := 0
		col := 0
		if location.Line != nil {
			line = *location.Line + 1
		}
		col = location.Column

		contextStr := getInputContext(input, index, 30)
		posInfo = fmt.Sprintf(" at line %d, col %d: %q", line, col, contextStr)
	}

	fmt.Fprintf(os.Stderr, "%s[CALLSTACK] %s%s\n", indent, label, posInfo)
	fmt.Fprintf(os.Stderr, "%s[CALLSTACK] ", indent)
	t.printCallStack()
}

// getInputContext returns a snippet of input around the given index
func getInputContext(input string, index int, radius int) string {
	if index < 0 || index >= len(input) {
		return ""
	}

	start := index - radius
	if start < 0 {
		start = 0
	}

	end := index + radius
	if end > len(input) {
		end = len(input)
	}

	// Truncate at newlines for readability
	context := input[start:end]
	context = strings.ReplaceAll(context, "\n", "\\n")
	context = strings.ReplaceAll(context, "\r", "\\r")
	context = strings.ReplaceAll(context, "\t", "\\t")

	// Mark the current position
	markerPos := index - start
	if markerPos >= 0 && markerPos < len(context) {
		// Insert a marker at the current position
		return context[:markerPos] + "⟪" + context[markerPos:]
	}

	return context
}

// Helper function to instrument parser methods
// Usage in parser functions:
//
//   func (e *EntityParsers) Call() any {
//       tracer := GetParserTracer()
//       if tracer.IsEnabled() {
//           defer tracer.TraceEnter("Call", e.parsers.parser)()
//       }
//
//       // ... rest of function
//   }
