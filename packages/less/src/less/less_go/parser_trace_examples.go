package less_go

// This file contains examples of how to instrument parser functions with tracing.
// Copy these patterns into parser.go to add tracing to specific functions.
//
// IMPORTANT: This is a reference file. The actual instrumentation should be added
// to the real parser functions in parser.go.

/*
// Example 1: Instrumenting a simple parser function
// Original function:
func (e *EntityParsers) Call() any {
	var name string
	var args []any
	index := e.parsers.parser.parserInput.GetIndex()

	if e.parsers.parser.parserInput.Peek(regexp.MustCompile(`(?i)^url\(`)) {
		return nil
	}
	// ... rest of function
}

// Instrumented version:
func (e *EntityParsers) Call() any {
	tracer := GetParserTracer()
	if tracer.IsEnabled() {
		defer tracer.TraceEnter("Call", e.parsers.parser)()
	}

	var name string
	var args []any
	index := e.parsers.parser.parserInput.GetIndex()

	// Trace regex checks
	if e.parsers.parser.parserInput.Peek(regexp.MustCompile(`(?i)^url\(`)) {
		tracer.TraceResult("Call", nil, "skipped url()")
		return nil
	}

	// ... rest of function

	// Before returning, trace the result
	result := someParseResult
	tracer.TraceResult("Call", result, "")
	return result
}

// Example 2: Instrumenting with Save/Restore tracking
// Original function:
func (p *Parsers) DetachedRuleset() any {
	p.parser.parserInput.Save()

	if result := p.parser.parserInput.Re(regexp.MustCompile(`^[.#]\\(`)); result != nil {
		// ... handle mixin case
		p.parser.parserInput.Forget()
		return mixinDef
	}

	p.parser.parserInput.Restore("")
	return nil
}

// Instrumented version:
func (p *Parsers) DetachedRuleset() any {
	tracer := GetParserTracer()
	if tracer.IsEnabled() {
		defer tracer.TraceEnter("DetachedRuleset", p.parser)()
	}

	p.parser.parserInput.Save()
	tracer.TraceSaveRestore("Save", "DetachedRuleset", p.parser)

	if result := p.parser.parserInput.Re(regexp.MustCompile(`^[.#]\\(`)); result != nil {
		tracer.TraceRegex("DetachedRuleset", "^[.#]\\(", true, result)
		// ... handle mixin case
		p.parser.parserInput.Forget()
		tracer.TraceSaveRestore("Forget", "DetachedRuleset", p.parser)
		tracer.TraceResult("DetachedRuleset", mixinDef, "mixin definition")
		return mixinDef
	}
	tracer.TraceRegex("DetachedRuleset", "^[.#]\\(", false, nil)

	p.parser.parserInput.Restore("")
	tracer.TraceSaveRestore("Restore", "DetachedRuleset", p.parser)
	tracer.TraceResult("DetachedRuleset", nil, "no match")
	return nil
}

// Example 3: Instrumenting nested parser calls
func (e *EntityParsers) Arguments(prevArgs []any) any {
	tracer := GetParserTracer()
	if tracer.IsEnabled() {
		defer tracer.TraceEnter("Arguments", e.parsers.parser)()
	}

	// Trace char matches
	if e.parsers.parser.parserInput.Char('(') == nil {
		tracer.TraceChar("Arguments", '(', false)
		tracer.TraceResult("Arguments", nil, "no opening paren")
		return nil
	}
	tracer.TraceChar("Arguments", '(', true)

	// When calling nested parsers, they will auto-trace if enabled
	value := e.parsers.DetachedRuleset() // This will show indented trace
	if value == nil {
		value = e.Assignment()
	}

	// ... rest of function

	tracer.TraceResult("Arguments", args, fmt.Sprintf("%d args", len(args)))
	return args
}

// Example 4: Tracing errors
func (p *Parser) error(msg string, errorType string) {
	tracer := GetParserTracer()
	if tracer.IsEnabled() {
		tracer.TraceError("Parser.error", msg, p)
	}

	// ... rest of error function (original code)
	if errorType == "" {
		errorType = "Syntax"
	}
	panic(NewLessError(...))
}

// Example 5: Minimal instrumentation (just entry/exit)
func (e *EntityParsers) Dimension() any {
	tracer := GetParserTracer()
	if tracer.IsEnabled() {
		defer tracer.TraceEnter("Dimension", e.parsers.parser)()
	}

	// Original function body unchanged
	// The defer will automatically log exit and result
	return result
}
*/

// Usage Examples:

// 1. Trace everything:
//    LESS_GO_TRACE=1 go test -run "TestIntegrationSuite/main/detached-rulesets" -v

// 2. Trace specific functions only:
//    LESS_GO_TRACE=Call,DetachedRuleset,Arguments go test -run "TestIntegrationSuite/main/functions" -v

// 3. Combined with existing debug:
//    LESS_GO_DEBUG=1 LESS_GO_TRACE=1 go test -run "TestIntegrationSuite/main/comments2" -v

// 4. Trace with diff:
//    LESS_GO_TRACE=Call LESS_GO_DIFF=1 go test -run "TestIntegrationSuite/main/functions" -v

// Expected output format:
//
// [TRACE] Call() entered at line 15, col 3: "each(@list, {"
//   [TRACE] CustomFuncCall() entered at line 15, col 3: "each"
//   [TRACE] CustomFuncCall() -> nil (not a special function)
//   [TRACE] CustomFuncCall() exited
//   [TRACE] Arguments() entered at line 15, col 8: "(@list, {"
//     [TRACE] Char('(') -> '('
//     [TRACE] DetachedRuleset() entered at line 15, col 16: "{"
//       [TRACE] Save (index=123)
//       [TRACE] Re(^[.#]\() -> nil
//       [TRACE] Restore (index=123)
//       [TRACE] DetachedRuleset() -> nil (no match)
//     [TRACE] DetachedRuleset() exited
//     [TRACE] Expression() entered at line 15, col 16: "{..."
//     [ERROR] Parse: Missing closing ')' at line 15, col 16: "{ .item { ... }⟪})"
//     [STACK] (call stack)
//   [TRACE] Arguments() exited
// [TRACE] Call() exited
