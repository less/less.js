package less_go

import (
	"errors"
	"fmt"
	"strings"
	"testing"
)

// Mock EvalContext implementation
type mockEvalContext struct {
	mathOn bool
	inCalc bool
	enterCalcCalled int
	exitCalcCalled  int
	frames []ParserFrame
	importantScope []map[string]bool
}

func newMockEvalContext() *mockEvalContext {
	return &mockEvalContext{
		mathOn: true,
		inCalc: false,
		frames: make([]ParserFrame, 0),
		importantScope: make([]map[string]bool, 0),
	}
}

func (m *mockEvalContext) IsMathOn() bool {
	return m.mathOn
}

func (m *mockEvalContext) SetMathOn(val bool) {
	m.mathOn = val
}

func (m *mockEvalContext) IsInCalc() bool {
	return m.inCalc
}

func (m *mockEvalContext) EnterCalc() {
	m.enterCalcCalled++
	m.inCalc = true
}

func (m *mockEvalContext) ExitCalc() {
	m.exitCalcCalled++
	m.inCalc = false
}

func (m *mockEvalContext) GetFrames() []ParserFrame {
	return m.frames
}

func (m *mockEvalContext) GetImportantScope() []map[string]bool {
	return m.importantScope
}

func (m *mockEvalContext) GetDefaultFunc() *DefaultFunc {
	return nil
}

// Mock ParserFunctionCaller implementation
type mockParserFunctionCaller struct {
	valid  bool
	callFn func([]any) (any, error)
}

func (m *mockParserFunctionCaller) IsValid() bool {
	return m.valid
}

func (m *mockParserFunctionCaller) Call(args []any) (any, error) {
	if m.callFn != nil {
		return m.callFn(args)
	}
	return nil, nil
}

// Mock ParserFunctionCallerFactory implementation
type mockParserFunctionCallerFactory struct {
	caller ParserFunctionCaller
	err    error
}

func (m *mockParserFunctionCallerFactory) NewFunctionCaller(name string, context EvalContext, index int, fileInfo map[string]any) (ParserFunctionCaller, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.caller, nil
}

// Mock implementation for a node with Eval
type mockEvalNode struct {
	value any
	err   error
}

func (n *mockEvalNode) Eval(context any) (any, error) {
	if n.err != nil {
		return nil, n.err
	}
	return n.value, nil
}

func (n *mockEvalNode) GenCSS(context any, output *CSSOutput) {
	output.Add(fmt.Sprintf("%v", n.value), nil, nil)
}

// Mock visitor that implements VisitArray
type callMockVisitor struct {
	visitArrayFn func([]any) []any
}

func (v *callMockVisitor) VisitArray(arr []any) []any {
	if v.visitArrayFn != nil {
		return v.visitArrayFn(arr)
	}
	return arr
}

// Helper function to create an error with line and column info
type errorWithPosition struct {
	msg    string
	line   int
	column int
	typ    string
}

func (e *errorWithPosition) Error() string {
	return e.msg
}

func (e *errorWithPosition) LineNumber() int {
	return e.line
}

func (e *errorWithPosition) ColumnNumber() int {
	return e.column
}

func (e *errorWithPosition) Type() string {
	return e.typ
}

// Tests start here
func TestCallConstructor(t *testing.T) {
	mockFileInfo := map[string]any{"filename": "test.less"}
	mockIndex := 1

	t.Run("should create a Call node with correct properties", func(t *testing.T) {
		args := []any{NewAnonymous("10px", 0, nil, false, false, nil)}
		call := NewCall("rgb", args, mockIndex, mockFileInfo)

		if call.Name != "rgb" {
			t.Errorf("expected name to be 'rgb', got '%s'", call.Name)
		}
		if len(call.Args) != 1 {
			t.Errorf("expected 1 argument, got %d", len(call.Args))
		}
		if call.GetIndex() != mockIndex {
			t.Errorf("expected index to be %d, got %d", mockIndex, call.GetIndex())
		}
		if call.FileInfo()["filename"] != mockFileInfo["filename"] {
			t.Errorf("expected fileInfo to be %v, got %v", mockFileInfo, call.FileInfo())
		}
		if call.GetType() != "Call" {
			t.Errorf("expected type to be 'Call', got '%s'", call.GetType())
		}
		if call.Calc {
			t.Error("expected calc to be false")
		}
	})

	t.Run("should handle undefined fileInfo and index", func(t *testing.T) {
		call := NewCall("rgb", []any{}, 0, nil)
		if call.GetIndex() != 0 {
			t.Errorf("expected index to be 0, got %d", call.GetIndex())
		}
		if call.FileInfo() != nil && len(call.FileInfo()) != 0 {
			t.Errorf("expected fileInfo to be empty, got %v", call.FileInfo())
		}
	})

	t.Run("should handle empty args array", func(t *testing.T) {
		call := NewCall("rgb", []any{}, mockIndex, mockFileInfo)
		if len(call.Args) != 0 {
			t.Errorf("expected empty args array, got %v", call.Args)
		}
	})

	t.Run("should set calc property to true for calc function", func(t *testing.T) {
		call := NewCall("calc", []any{}, mockIndex, mockFileInfo)
		if !call.Calc {
			t.Error("expected calc to be true")
		}
	})
}

func TestCallAccept(t *testing.T) {
	mockFileInfo := map[string]any{"filename": "test.less"}
	mockIndex := 1

	t.Run("should visit args array if present", func(t *testing.T) {
		args := []any{NewAnonymous("10px", 0, nil, false, false, nil)}
		call := NewCall("rgb", args, mockIndex, mockFileInfo)
		mockVisitorInstance := &callMockVisitor{
			visitArrayFn: func(arr []any) []any {
				return []any{"visited"}
			},
		}

		call.Accept(mockVisitorInstance)

		if len(call.Args) != 1 || call.Args[0] != "visited" {
			t.Errorf("expected args to be ['visited'], got %v", call.Args)
		}
	})

	t.Run("should not panic if args is undefined", func(t *testing.T) {
		call := NewCall("rgb", nil, mockIndex, mockFileInfo)
		mockVisitorInstance := &callMockVisitor{}

		// Should not panic
		call.Accept(mockVisitorInstance)
	})
}

func TestCallEval(t *testing.T) {
	mockFileInfo := map[string]any{"filename": "test.less"}
	mockIndex := 1

	t.Run("should handle calc functions correctly", func(t *testing.T) {
		call := NewCall("calc", []any{}, mockIndex, mockFileInfo)
		mockContext := newMockEvalContext()
		
		_, err := call.Eval(mockContext)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		if mockContext.enterCalcCalled != 1 {
			t.Errorf("expected enterCalc to be called once, got %d", mockContext.enterCalcCalled)
		}
		if mockContext.exitCalcCalled != 1 {
			t.Errorf("expected exitCalc to be called once, got %d", mockContext.exitCalcCalled)
		}
		if !mockContext.IsMathOn() {
			t.Error("expected mathOn to be restored to true")
		}
	})

	t.Run("should enter calc mode when context.inCalc is true", func(t *testing.T) {
		call := NewCall("unknownfunction", []any{}, mockIndex, mockFileInfo)
		mockContext := newMockEvalContext()
		mockContext.inCalc = true

		_, err := call.Eval(mockContext)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		if mockContext.enterCalcCalled != 1 {
			t.Errorf("expected enterCalc to be called once, got %d", mockContext.enterCalcCalled)
		}
		if mockContext.exitCalcCalled != 1 {
			t.Errorf("expected exitCalc to be called once, got %d", mockContext.exitCalcCalled)
		}
	})

	t.Run("should temporarily toggle mathOn for non-calc functions", func(t *testing.T) {
		call := NewCall("unknownfunction", []any{}, mockIndex, mockFileInfo)
		mockContext := newMockEvalContext()
		
		var mathOnDuringExecution bool
		mockCaller := &mockParserFunctionCaller{
			valid: true,
			callFn: func(args []any) (any, error) {
				mathOnDuringExecution = mockContext.IsMathOn()
				return NewAnonymous("result", 0, nil, false, false, nil), nil
			},
		}
		
		mockFactory := &mockParserFunctionCallerFactory{
			caller: mockCaller,
		}
		
		call.CallerFactory = mockFactory
		
		originalMathOn := mockContext.IsMathOn()
		_, err := call.Eval(mockContext)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		// During execution, mathOn should be true (!this.calc)
		if !mathOnDuringExecution {
			t.Error("expected mathOn to be true during execution")
		}
		// After execution, mathOn should be restored
		if mockContext.IsMathOn() != originalMathOn {
			t.Error("expected mathOn to be restored to original value")
		}
	})

	t.Run("should evaluate args when creating new Call node", func(t *testing.T) {
		mockArg := &mockEvalNode{
			value: "evaluated",
		}
		
		call := NewCall("unknown", []any{mockArg}, mockIndex, mockFileInfo)
		mockContext := newMockEvalContext()
		
		call.CallerFactory = &mockParserFunctionCallerFactory{
			caller: &mockParserFunctionCaller{
				valid: false,
			},
		}

		result, err := call.Eval(mockContext)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		
		resultCall, ok := result.(*Call)
		if !ok {
			t.Fatalf("expected result to be *Call, got %T", result)
		}
		
		if len(resultCall.Args) != 1 || resultCall.Args[0] != "evaluated" {
			t.Errorf("expected evaluated args to be ['evaluated'], got %v", resultCall.Args)
		}
	})

	t.Run("should handle errors with custom type", func(t *testing.T) {
		call := NewCall("rgb", []any{}, mockIndex, mockFileInfo)
		mockContext := newMockEvalContext()
		
		customErr := &errorWithPosition{
			msg:    "test error",
			line:   1,
			column: 1,
			typ:    "CustomError",
		}
		
		call.CallerFactory = &mockParserFunctionCallerFactory{
			caller: &mockParserFunctionCaller{
				valid: true,
				callFn: func(args []any) (any, error) {
					return nil, customErr
				},
			},
		}

		_, err := call.Eval(mockContext)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		
		if !strings.Contains(err.Error(), "CustomError") {
			t.Errorf("expected error to contain 'CustomError', got '%s'", err.Error())
		}
		if !strings.Contains(err.Error(), "Error evaluating function `rgb`: test error") {
			t.Errorf("expected error to contain error message, got '%s'", err.Error())
		}
	})

	t.Run("should handle successful function calls", func(t *testing.T) {
		args := []any{NewAnonymous("10px", 0, nil, false, false, nil)}
		call := NewCall("rgb", args, mockIndex, mockFileInfo)
		mockContext := newMockEvalContext()
		
		mockResult := NewAnonymous("result", 0, nil, false, false, nil)
		
		call.CallerFactory = &mockParserFunctionCallerFactory{
			caller: &mockParserFunctionCaller{
				valid: true,
				callFn: func(args []any) (any, error) {
					return mockResult, nil
				},
			},
		}

		result, err := call.Eval(mockContext)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		
		// Check that it's an Anonymous node with "result" value
		anonResult, ok := result.(*Anonymous)
		if !ok {
			t.Fatalf("expected result to be *Anonymous, got %T", result)
		}
		
		// The Anonymous node should have a value of "result" or
		// at least contain "result" somewhere in its string representation
		valueStr := fmt.Sprintf("%v", anonResult.Value)
		if !strings.Contains(valueStr, "result") {
			t.Errorf("expected result value to contain 'result', got '%v'", anonResult.Value)
		}
	})

	t.Run("should handle function call errors", func(t *testing.T) {
		call := NewCall("rgb", []any{}, mockIndex, mockFileInfo)
		mockContext := newMockEvalContext()
		
		mockError := &errorWithPosition{
			msg:    "test error",
			line:   1,
			column: 1,
		}
		
		call.CallerFactory = &mockParserFunctionCallerFactory{
			caller: &mockParserFunctionCaller{
				valid: true,
				callFn: func(args []any) (any, error) {
					return nil, mockError
				},
			},
		}

		_, err := call.Eval(mockContext)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		
		errMsg := err.Error()
		// Just make sure it contains the necessary information, not the exact format
		if !strings.Contains(errMsg, "test error") {
			t.Errorf("expected error to contain original error message, got '%s'", errMsg)
		}
		if !strings.Contains(errMsg, "rgb") {
			t.Errorf("expected error to contain function name, got '%s'", errMsg)
		}
		if !strings.Contains(errMsg, fmt.Sprintf("%d", mockIndex)) {
			t.Errorf("expected error to contain index info, got '%s'", errMsg)
		}
		if !strings.Contains(errMsg, fmt.Sprintf("%s", mockFileInfo["filename"])) {
			t.Errorf("expected error to contain filename info, got '%s'", errMsg)
		}
	})

	t.Run("should handle errors without line/column numbers", func(t *testing.T) {
		call := NewCall("rgb", []any{}, mockIndex, mockFileInfo)
		mockContext := newMockEvalContext()
		
		call.CallerFactory = &mockParserFunctionCallerFactory{
			caller: &mockParserFunctionCaller{
				valid: true,
				callFn: func(args []any) (any, error) {
					return nil, errors.New("test error")
				},
			},
		}

		_, err := call.Eval(mockContext)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		
		if !strings.Contains(err.Error(), "Runtime") {
			t.Errorf("expected error to contain 'Runtime', got '%s'", err.Error())
		}
		if !strings.Contains(err.Error(), "Error evaluating function `rgb`: test error") {
			t.Errorf("expected error to contain error message, got '%s'", err.Error())
		}
	})

	t.Run("should wrap non-Node results in Anonymous nodes", func(t *testing.T) {
		call := NewCall("test", []any{}, mockIndex, mockFileInfo)
		mockContext := newMockEvalContext()
		
		call.CallerFactory = &mockParserFunctionCallerFactory{
			caller: &mockParserFunctionCaller{
				valid: true,
				callFn: func(args []any) (any, error) {
					return "string result", nil
				},
			},
		}

		result, err := call.Eval(mockContext)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		
		anonResult, ok := result.(*Anonymous)
		if !ok {
			t.Fatalf("expected result to be *Anonymous, got %T", result)
		}
		if fmt.Sprintf("%v", anonResult.Value) != "string result" {
			t.Errorf("expected result value to be 'string result', got '%v'", anonResult.Value)
		}
	})

	t.Run("should handle falsy results as empty Anonymous nodes", func(t *testing.T) {
		call := NewCall("test", []any{}, mockIndex, mockFileInfo)
		mockContext := newMockEvalContext()
		
		call.CallerFactory = &mockParserFunctionCallerFactory{
			caller: &mockParserFunctionCaller{
				valid: true,
				callFn: func(args []any) (any, error) {
					return false, nil
				},
			},
		}

		result, err := call.Eval(mockContext)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		
		anonResult, ok := result.(*Anonymous)
		if !ok {
			t.Fatalf("expected result to be *Anonymous, got %T", result)
		}
		if anonResult.Value != nil {
			t.Errorf("expected result value to be nil, got '%v'", anonResult.Value)
		}
	})

	t.Run("should handle undefined function results by creating new Call", func(t *testing.T) {
		args := []any{NewAnonymous("10px", 0, nil, false, false, nil)}
		call := NewCall("test", args, mockIndex, mockFileInfo)
		mockContext := newMockEvalContext()
		
		call.CallerFactory = &mockParserFunctionCallerFactory{
			caller: &mockParserFunctionCaller{
				valid: true,
				callFn: func(args []any) (any, error) {
					return nil, nil
				},
			},
		}

		result, err := call.Eval(mockContext)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		
		resultCall, ok := result.(*Call)
		if !ok {
			t.Fatalf("expected result to be *Call, got %T", result)
		}
		if resultCall.Name != "test" {
			t.Errorf("expected name to be 'test', got '%s'", resultCall.Name)
		}
		if len(resultCall.Args) != 1 {
			t.Errorf("expected 1 argument, got %d", len(resultCall.Args))
		}
	})

	t.Run("should create new Call node when function is not found", func(t *testing.T) {
		args := []any{NewAnonymous("10px", 0, nil, false, false, nil)}
		call := NewCall("unknown", args, mockIndex, mockFileInfo)
		mockContext := newMockEvalContext()
		
		call.CallerFactory = &mockParserFunctionCallerFactory{
			caller: &mockParserFunctionCaller{
				valid: false,
			},
		}

		result, err := call.Eval(mockContext)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		
		resultCall, ok := result.(*Call)
		if !ok {
			t.Fatalf("expected result to be *Call, got %T", result)
		}
		if resultCall.Name != "unknown" {
			t.Errorf("expected name to be 'unknown', got '%s'", resultCall.Name)
		}
		if len(resultCall.Args) != 1 {
			t.Errorf("expected 1 argument, got %d", len(resultCall.Args))
		}
		if resultCall.GetIndex() != mockIndex {
			t.Errorf("expected index to be %d, got %d", mockIndex, resultCall.GetIndex())
		}
	})
}

func TestCallGenCSS(t *testing.T) {
	mockFileInfo := map[string]any{"filename": "test.less"}
	mockIndex := 1

	t.Run("should generate correct CSS output", func(t *testing.T) {
		args := []any{
			NewAnonymous("10px", 0, nil, false, false, nil),
			NewAnonymous("20px", 0, nil, false, false, nil),
			NewAnonymous("30px", 0, nil, false, false, nil),
		}
		call := NewCall("rgb", args, mockIndex, mockFileInfo)
		
		// Capture output
		var output strings.Builder
		outputArgs := []string{}
		mockOutput := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				outputArgs = append(outputArgs, fmt.Sprintf("%v", chunk))
				output.WriteString(fmt.Sprintf("%v", chunk))
			},
		}

		call.GenCSS(nil, mockOutput)

		if !strings.Contains(output.String(), "rgb(") {
			t.Errorf("expected output to contain 'rgb(', got '%s'", output.String())
		}
		if !strings.Contains(output.String(), ")") {
			t.Errorf("expected output to contain ')', got '%s'", output.String())
		}
		
		// Check all necessary parts were added
		expectedOutputArgs := []string{"rgb(", "10px", ", ", "20px", ", ", "30px", ")"}
		if len(outputArgs) != len(expectedOutputArgs) {
			t.Fatalf("expected %d outputs, got %d: %v", len(expectedOutputArgs), len(outputArgs), outputArgs)
		}
		for i, expected := range expectedOutputArgs {
			if outputArgs[i] != expected {
				t.Errorf("expected output[%d] to be '%s', got '%s'", i, expected, outputArgs[i])
			}
		}
	})

	t.Run("should handle single argument without comma", func(t *testing.T) {
		args := []any{NewAnonymous("10px", 0, nil, false, false, nil)}
		call := NewCall("func", args, mockIndex, mockFileInfo)
		
		// Capture output
		var outputArgs []string
		mockOutput := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				outputArgs = append(outputArgs, fmt.Sprintf("%v", chunk))
			},
		}

		call.GenCSS(nil, mockOutput)
		
		// Check all necessary parts were added and no comma
		if len(outputArgs) != 3 {
			t.Fatalf("expected 3 outputs, got %d: %v", len(outputArgs), outputArgs)
		}
		if outputArgs[0] != "func(" || outputArgs[1] != "10px" || outputArgs[2] != ")" {
			t.Errorf("expected outputs to be ['func(', '10px', ')'], got %v", outputArgs)
		}
	})

	t.Run("should handle empty args array", func(t *testing.T) {
		call := NewCall("func", []any{}, mockIndex, mockFileInfo)
		
		// Capture output
		var outputArgs []string
		mockOutput := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				outputArgs = append(outputArgs, fmt.Sprintf("%v", chunk))
			},
		}

		call.GenCSS(nil, mockOutput)
		
		// Check only function name and parentheses
		if len(outputArgs) != 2 {
			t.Fatalf("expected 2 outputs, got %d: %v", len(outputArgs), outputArgs)
		}
		if outputArgs[0] != "func(" || outputArgs[1] != ")" {
			t.Errorf("expected outputs to be ['func(', ')'], got %v", outputArgs)
		}
	})

	t.Run("should handle nested function calls in arguments", func(t *testing.T) {
		innerCall := NewCall("rgba", []any{NewAnonymous("255", 0, nil, false, false, nil)}, mockIndex, mockFileInfo)
		call := NewCall("darken", []any{innerCall}, mockIndex, mockFileInfo)
		
		// Capture output
		var output strings.Builder
		mockOutput := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				output.WriteString(fmt.Sprintf("%v", chunk))
			},
		}

		call.GenCSS(nil, mockOutput)
		
		// Check output contains both function calls properly nested
		expectedOutput := "darken(rgba(255))"
		if output.String() != expectedOutput {
			t.Errorf("expected output to be '%s', got '%s'", expectedOutput, output.String())
		}
	})
} 