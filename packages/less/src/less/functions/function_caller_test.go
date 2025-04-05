package functions

import (
	"fmt"
	"reflect"
	"strings"
	"testing"

	"github.com/toakleaf/less.go/packages/less/src/less/tree"
)

// --- Mocks --- //

type mockFunctionRegistry struct {
	mockGet func(name string) FunctionDefinition
}

func (m *mockFunctionRegistry) Get(name string) FunctionDefinition {
	if m.mockGet != nil {
		return m.mockGet(name)
	}
	return nil
}

type mockFunctionDefinition struct {
	name         string
	needsEval    bool
	callFn       func(args ...any) (any, error)
	callCtxFn    func(ctx *Context, args ...any) (any, error)
	CalledWith   []any
	CalledCtx    *Context
	CallCount    int
}

func newMockFunctionDefinition(name string, needsEval bool) *mockFunctionDefinition {
	return &mockFunctionDefinition{name: name, needsEval: needsEval}
}

func (m *mockFunctionDefinition) Call(args ...any) (any, error) {
	m.CallCount++
	m.CalledWith = args
	if m.callFn != nil {
		return m.callFn(args...)
	}
	// Default behavior: return the args for inspection
	return args, nil
}

func (m *mockFunctionDefinition) CallCtx(ctx *Context, args ...any) (any, error) {
	m.CallCount++
	m.CalledCtx = ctx
	m.CalledWith = args
	if m.callCtxFn != nil {
		return m.callCtxFn(ctx, args...)
	}
	// Default behavior: return the args for inspection
	return args, nil
}

func (m *mockFunctionDefinition) NeedsEvalArgs() bool {
	return m.needsEval
}


type mockEvaluable struct {
	Value any
	EvalErr error
	EvalFn  func(ctx *Context) (any, error)
}

func (m *mockEvaluable) Eval(ctx *Context) (any, error) {
	if m.EvalFn != nil {
		return m.EvalFn(ctx)
	}
	if m.EvalErr != nil {
		return nil, m.EvalErr
	}
	return m.Value, nil
}

type mockNode struct {
	NodeType string
	Op       string
	Parens   bool
}

func (m *mockNode) GetType() string {
	return m.NodeType
}

func (m *mockNode) GetOp() string {
	return m.Op
}

func (m *mockNode) GetParens() bool {
    return m.Parens
}

// --- Test Helper --- //

func assertEqual(t *testing.T, expected, actual any, msg string) {
	t.Helper()
	if !reflect.DeepEqual(expected, actual) {
		t.Errorf("%s: Expected %v (type %T), got %v (type %T)", msg, expected, expected, actual, actual)
	}
}

func assertNotNil(t *testing.T, actual any, msg string) {
	t.Helper()
	if actual == nil {
		t.Errorf("%s: Expected not nil, got nil", msg)
	}
}

func assertErrorContains(t *testing.T, err error, substr string, msg string) {
    t.Helper()
    if err == nil {
        t.Errorf("%s: Expected error containing '%s', but got nil error", msg, substr)
        return
    }
    if !strings.Contains(err.Error(), substr) {
        t.Errorf("%s: Expected error containing '%s', but got: %v", msg, substr, err)
    }
}


// --- Tests --- //

func TestFunctionCaller_New(t *testing.T) {
	mockRegistry := &mockFunctionRegistry{}
	mockContext := &Context{
		Frames: []*Frame{{FunctionRegistry: mockRegistry}},
	}
	mockFileInfo := "mockFileInfo"
	mockFunc := newMockFunctionDefinition("testfunction", true)

	mockRegistry.mockGet = func(name string) FunctionDefinition {
		if name == "testfunction" {
			return mockFunc
		}
		return nil
	}

	t.Run("should create a functionCaller instance with lowercase name", func(t *testing.T) {
		caller, err := NewFunctionCaller("TestFunction", mockContext, 0, mockFileInfo)
		assertNilError(t, err, "NewFunctionCaller should succeed")
		assertNotNil(t, caller, "Caller should not be nil")
		assertEqual(t, "testfunction", caller.Name, "Name should be lowercase")
		assertEqual(t, 0, caller.Index, "Index should match")
		assertEqual(t, mockContext, caller.Context, "Context should match")
		assertEqual(t, mockFileInfo, caller.CurrentFileInfo, "FileInfo should match")
	})

	t.Run("should return true for isValid when function exists", func(t *testing.T) {
		caller, err := NewFunctionCaller("TestFunction", mockContext, 0, mockFileInfo)
		assertNilError(t, err, "NewFunctionCaller should succeed")
		assertNotNil(t, caller, "Caller should not be nil")
		assertEqual(t, true, caller.IsValid(), "IsValid should be true")
		assertEqual(t, mockFunc, caller.Func, "Func should be set")
	})

	t.Run("should return false for isValid when function does not exist", func(t *testing.T) {
		caller, err := NewFunctionCaller("NonExistent", mockContext, 0, mockFileInfo)
		assertNilError(t, err, "NewFunctionCaller should succeed even if func not found")
		assertNotNil(t, caller, "Caller should not be nil")
		assertEqual(t, false, caller.IsValid(), "IsValid should be false")
		assertEqual(t, nil, caller.Func, "Func should be nil")
	})

	t.Run("should return error when name is missing", func(t *testing.T) {
		_, err := NewFunctionCaller("", mockContext, 0, mockFileInfo)
		assertNotNil(t, err, "Expected error for missing name")
        assertErrorContains(t, err, "function name is required", "Error message mismatch")
	})

	t.Run("should return error for invalid context structure (nil context)", func(t *testing.T) {
		_, err := NewFunctionCaller("test", nil, 0, mockFileInfo)
		assertNotNil(t, err, "Expected error for nil context")
        assertErrorContains(t, err, "invalid context structure", "Error message mismatch")
	})

	t.Run("should return error for invalid context structure (empty frames)", func(t *testing.T) {
		invalidContext := &Context{Frames: []*Frame{}}
		_, err := NewFunctionCaller("test", invalidContext, 0, mockFileInfo)
		assertNotNil(t, err, "Expected error for empty frames")
        assertErrorContains(t, err, "invalid context structure", "Error message mismatch")
	})

	t.Run("should return error for invalid context structure (nil registry)", func(t *testing.T) {
		contextWithoutRegistry := &Context{Frames: []*Frame{{FunctionRegistry: nil}}}
		_, err := NewFunctionCaller("test", contextWithoutRegistry, 0, mockFileInfo)
		assertNotNil(t, err, "Expected error for nil registry")
        assertErrorContains(t, err, "invalid context structure", "Error message mismatch")
	})
}

func TestFunctionCaller_Call(t *testing.T) {
	mockRegistry := &mockFunctionRegistry{}
	mockContext := &Context{
		Frames: []*Frame{{FunctionRegistry: mockRegistry}},
	}
	mockFileInfo := "mockFileInfo"

	t.Run("should wrap single argument and evaluate", func(t *testing.T) {
		mockFunc := newMockFunctionDefinition("test", true)
		mockRegistry.mockGet = func(name string) FunctionDefinition { return mockFunc }
		caller, _ := NewFunctionCaller("test", mockContext, 0, mockFileInfo)
		arg := &mockEvaluable{Value: "evaluated"}

		_, err := caller.Call([]any{arg})
		assertNilError(t, err, "Call should succeed")
		assertEqual(t, 1, mockFunc.CallCount, "Function should be called once")
		assertEqual(t, []any{"evaluated"}, mockFunc.CalledWith, "Function called with evaluated arg")
	})

	t.Run("should handle array of arguments and evaluate", func(t *testing.T) {
		mockFunc := newMockFunctionDefinition("test", true)
		mockRegistry.mockGet = func(name string) FunctionDefinition { return mockFunc }
		caller, _ := NewFunctionCaller("test", mockContext, 0, mockFileInfo)
		args := []any{
			&mockEvaluable{Value: "first"},
			&mockEvaluable{Value: "second"},
		}

		_, err := caller.Call(args)
		assertNilError(t, err, "Call should succeed")
		assertEqual(t, 1, mockFunc.CallCount, "Function should be called once")
		assertEqual(t, []any{"first", "second"}, mockFunc.CalledWith, "Function called with evaluated args")
	})

	t.Run("should handle empty array of arguments", func(t *testing.T) {
		mockFunc := newMockFunctionDefinition("test", true)
		mockRegistry.mockGet = func(name string) FunctionDefinition { return mockFunc }
		caller, _ := NewFunctionCaller("test", mockContext, 0, mockFileInfo)

		_, err := caller.Call([]any{})
		assertNilError(t, err, "Call should succeed")
		assertEqual(t, 1, mockFunc.CallCount, "Function should be called once")
		assertEqual(t, 0, len(mockFunc.CalledWith), "Function called with no args")
	})

	t.Run("should filter out Comment nodes", func(t *testing.T) {
		mockFunc := newMockFunctionDefinition("test", true)
		mockRegistry.mockGet = func(name string) FunctionDefinition { return mockFunc }
		caller, _ := NewFunctionCaller("test", mockContext, 0, mockFileInfo)
		args := []any{
			&mockEvaluable{Value: &mockNode{NodeType: "Comment"}},
			&mockEvaluable{Value: "valid"},
		}

		_, err := caller.Call(args)
		assertNilError(t, err, "Call should succeed")
		assertEqual(t, 1, mockFunc.CallCount, "Function should be called once")
		assertEqual(t, []any{"valid"}, mockFunc.CalledWith, "Function called with non-comment arg")
	})

	t.Run("should handle Expression containing only Comment nodes", func(t *testing.T) {
		mockFunc := newMockFunctionDefinition("test", true)
		mockRegistry.mockGet = func(name string) FunctionDefinition { return mockFunc }
		caller, _ := NewFunctionCaller("test", mockContext, 0, mockFileInfo)

		exprValue := []any{&mockNode{NodeType: "Comment"}}
		// Note: Need a proper *tree.Expression here
		origExpr, _ := tree.NewExpression(exprValue, false)
		arg := &mockEvaluable{Value: origExpr}

		_, err := caller.Call([]any{arg})
		assertNilError(t, err, "Call should succeed")
		assertEqual(t, 1, mockFunc.CallCount, "Function should be called once")
		assertEqual(t, 1, len(mockFunc.CalledWith), "Should have one arg passed")

		passedArg := mockFunc.CalledWith[0]
		passedExpr, ok := passedArg.(*tree.Expression)
		if !ok {
			t.Fatalf("Expected arg to be *tree.Expression, got %T", passedArg)
		}
		assertEqual(t, 0, len(passedExpr.Value), "Expression value should be empty after filtering")
	})

	t.Run("should handle Expression nodes with single non-comment item", func(t *testing.T) {
		mockFunc := newMockFunctionDefinition("test", true)
		mockRegistry.mockGet = func(name string) FunctionDefinition { return mockFunc }
		caller, _ := NewFunctionCaller("test", mockContext, 0, mockFileInfo)

		singleItem := &mockNode{NodeType: "Value"} // Using mockNode for simplicity
		exprValue := []any{singleItem}
		origExpr, _ := tree.NewExpression(exprValue, false)
		arg := &mockEvaluable{Value: origExpr}

		_, err := caller.Call([]any{arg})
		assertNilError(t, err, "Call should succeed")
		assertEqual(t, 1, mockFunc.CallCount, "Function should be called once")
		assertEqual(t, 1, len(mockFunc.CalledWith), "Should have one arg passed")
		assertEqual(t, singleItem, mockFunc.CalledWith[0], "Single item should be extracted")
	})

	t.Run("should preserve Expression with parens when op is division", func(t *testing.T) {
		mockFunc := newMockFunctionDefinition("test", true)
		mockRegistry.mockGet = func(name string) FunctionDefinition { return mockFunc }
		caller, _ := NewFunctionCaller("test", mockContext, 0, mockFileInfo)

		divNode := &mockNode{NodeType: "Operation", Op: "/"}
		exprValue := []any{divNode}
		origExpr, _ := tree.NewExpression(exprValue, false)
		origExpr.Parens = true // Set Parens on the Expression node itself
		arg := &mockEvaluable{Value: origExpr}

		_, err := caller.Call([]any{arg})
		assertNilError(t, err, "Call should succeed")
		assertEqual(t, 1, mockFunc.CallCount, "Function should be called once")
		assertEqual(t, 1, len(mockFunc.CalledWith), "Should have one arg passed")
		assertEqual(t, origExpr, mockFunc.CalledWith[0], "Original expression should be preserved")
	})

	t.Run("should create new Expression for multiple filtered nodes", func(t *testing.T) {
		mockFunc := newMockFunctionDefinition("test", true)
		mockRegistry.mockGet = func(name string) FunctionDefinition { return mockFunc }
		caller, _ := NewFunctionCaller("test", mockContext, 0, mockFileInfo)

		val1 := &mockNode{NodeType: "Value"}
		val2 := &mockNode{NodeType: "Value"}
		exprValue := []any{val1, &mockNode{NodeType: "Comment"}, val2}
		origExpr, _ := tree.NewExpression(exprValue, true) // NoSpacing = true
		arg := &mockEvaluable{Value: origExpr}

		_, err := caller.Call([]any{arg})
		assertNilError(t, err, "Call should succeed")
		assertEqual(t, 1, mockFunc.CallCount, "Function should be called once")
		assertEqual(t, 1, len(mockFunc.CalledWith), "Should have one arg passed")

		passedArg := mockFunc.CalledWith[0]
		passedExpr, ok := passedArg.(*tree.Expression)
		if !ok {
			t.Fatalf("Expected arg to be *tree.Expression, got %T", passedArg)
		}
		assertEqual(t, []any{val1, val2}, passedExpr.Value, "New expression has filtered values")
		assertEqual(t, true, passedExpr.NoSpacing, "New expression should inherit NoSpacing")
	})

	t.Run("should handle functions with evalArgs: false", func(t *testing.T) {
		mockFunc := newMockFunctionDefinition("test", false) // NeedsEvalArgs = false
		mockRegistry.mockGet = func(name string) FunctionDefinition { return mockFunc }
		caller, _ := NewFunctionCaller("test", mockContext, 0, mockFileInfo)
		rawArg := map[string]any{"raw": "value"} // Non-Evaluable argument
		args := []any{rawArg}

		_, err := caller.Call(args)
		assertNilError(t, err, "Call should succeed")
		assertEqual(t, 1, mockFunc.CallCount, "Function should be called once")
		assertEqual(t, mockContext, mockFunc.CalledCtx, "Context should be passed")
		assertEqual(t, []any{rawArg}, mockFunc.CalledWith, "Function called with raw args")
	})

	t.Run("should return error if evalArgs is true and arg is not Evaluable", func(t *testing.T) {
		mockFunc := newMockFunctionDefinition("test", true)
		mockRegistry.mockGet = func(name string) FunctionDefinition { return mockFunc }
		caller, _ := NewFunctionCaller("test", mockContext, 0, mockFileInfo)
		args := []any{map[string]any{"value": "no-eval"}}

		_, err := caller.Call(args)
		assertNotNil(t, err, "Expected error when arg is not Evaluable")
        assertErrorContains(t, err, "cannot be evaluated", "Error message mismatch")
	})

	t.Run("should return error if Eval fails", func(t *testing.T) {
		mockFunc := newMockFunctionDefinition("test", true)
		mockRegistry.mockGet = func(name string) FunctionDefinition { return mockFunc }
		caller, _ := NewFunctionCaller("test", mockContext, 0, mockFileInfo)
		evalError := fmt.Errorf("Eval failed")
		args := []any{&mockEvaluable{EvalErr: evalError}}

		_, err := caller.Call(args)
		assertNotNil(t, err, "Expected error when Eval fails")
        assertErrorContains(t, err, "Eval failed", "Error message mismatch")
	})

	t.Run("should return error if function call fails (evalArgs true)", func(t *testing.T) {
		mockFunc := newMockFunctionDefinition("test", true)
		callError := fmt.Errorf("Func call failed")
		mockFunc.callFn = func(args ...any) (any, error) {
			return nil, callError
		}
		mockRegistry.mockGet = func(name string) FunctionDefinition { return mockFunc }
		caller, _ := NewFunctionCaller("test", mockContext, 0, mockFileInfo)
		args := []any{&mockEvaluable{Value: "ok"}}

		_, err := caller.Call(args)
		assertNotNil(t, err, "Expected error when function call fails")
        assertErrorContains(t, err, "Func call failed", "Error message mismatch")
	})

	t.Run("should return error if function call fails (evalArgs false)", func(t *testing.T) {
		mockFunc := newMockFunctionDefinition("test", false)
		callError := fmt.Errorf("Func callCtx failed")
		mockFunc.callCtxFn = func(ctx *Context, args ...any) (any, error) {
			return nil, callError
		}
		mockRegistry.mockGet = func(name string) FunctionDefinition { return mockFunc }
		caller, _ := NewFunctionCaller("test", mockContext, 0, mockFileInfo)
		args := []any{"raw"}

		_, err := caller.Call(args)
		assertNotNil(t, err, "Expected error when function call fails")
        assertErrorContains(t, err, "Func callCtx failed", "Error message mismatch")
	})

    t.Run("should return error if Call is invoked on invalid caller", func(t *testing.T) {
        mockRegistry.mockGet = func(name string) FunctionDefinition { return nil } // Force invalid
        caller, _ := NewFunctionCaller("nonexistent", mockContext, 0, mockFileInfo)
        assertEqual(t, false, caller.IsValid(), "Caller should be invalid")

        _, err := caller.Call([]any{})
        assertNotNil(t, err, "Expected error calling invalid function")
        assertErrorContains(t, err, "is not registered", "Error message mismatch")
    })

}

// assertNilError checks if an error is nil
func assertNilError(t *testing.T, err error, msg string) {
	t.Helper()
	if err != nil {
		t.Errorf("%s: Unexpected error: %v", msg, err)
	}
} 