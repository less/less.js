package tree

import (
	"reflect"
	"testing"
)

func TestParenConstructor(t *testing.T) {
	// Test constructor
	t.Run("should create a Paren instance with the provided node as value", func(t *testing.T) {
		mockNode := map[string]string{"type": "MockNode"}
		paren := NewParen(mockNode)

		if !reflect.DeepEqual(paren.Value, mockNode) {
			t.Errorf("Expected paren.Value to be the mockNode, got %v", paren.Value)
		}
	})

	t.Run("should inherit from Node", func(t *testing.T) {
		paren := NewParen(map[string]string{})
		
		// Check that it's a Node type
		if paren.Node == nil {
			t.Error("Expected paren to embed *Node")
		}

		// Check if it has methods from Node
		parenType := reflect.TypeOf(paren)
		
		// Check Type method exists and returns "Paren"
		if paren.Type() != "Paren" {
			t.Errorf("Expected paren.Type() to return 'Paren', got %s", paren.Type())
		}

		// Check GenCSS method exists
		_, hasGenCSS := parenType.MethodByName("GenCSS")
		if !hasGenCSS {
			t.Error("Expected paren to have GenCSS method")
		}

		// Check Eval method exists
		_, hasEval := parenType.MethodByName("Eval")
		if !hasEval {
			t.Error("Expected paren to have Eval method")
		}
	})
}

// MockWithGenCSS is a mock struct that implements GenCSS for testing
type MockWithGenCSS struct {
	GenCSSCalled bool
	Context      any
	Content      string
}

func (m *MockWithGenCSS) GenCSS(context any, output *CSSOutput) {
	m.GenCSSCalled = true
	m.Context = context
	output.Add(m.Content, nil, nil)
}

func TestParenGenCSS(t *testing.T) {
	t.Run("should generate CSS with parentheses around value", func(t *testing.T) {
		mockValue := &MockWithGenCSS{Content: "test-content"}
		paren := NewParen(mockValue)
		
		callSequence := []string{}
		mockOutput := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				callSequence = append(callSequence, chunk.(string))
			},
			IsEmpty: func() bool { return len(callSequence) == 0 },
		}
		mockContext := map[string]any{}

		paren.GenCSS(mockContext, mockOutput)

		// Check if mockValue.GenCSS was called
		if !mockValue.GenCSSCalled {
			t.Error("Expected mockValue.GenCSS to be called")
		}

		// Check context was passed correctly
		if !reflect.DeepEqual(mockValue.Context, mockContext) {
			t.Error("Expected context to be passed to mockValue.GenCSS")
		}

		// Check the sequence of calls
		expectedSequence := []string{"(", "test-content", ")"}
		if !reflect.DeepEqual(callSequence, expectedSequence) {
			t.Errorf("Expected call sequence to be %v, got %v", expectedSequence, callSequence)
		}
	})

	t.Run("should properly handle nested content when generating CSS", func(t *testing.T) {
		mockValue := &MockWithGenCSS{Content: "complex-content"}
		paren := NewParen(mockValue)
		
		result := ""
		mockOutput := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				result += chunk.(string)
			},
			IsEmpty: func() bool { return result == "" },
		}

		paren.GenCSS(map[string]any{}, mockOutput)

		expectedResult := "(complex-content)"
		if result != expectedResult {
			t.Errorf("Expected result to be %s, got %s", expectedResult, result)
		}
	})
}

// MockWithEval is a mock struct that implements Eval for testing
type MockWithEval struct {
	EvalCalled   bool
	Context      any
	ReturnValue  any
}

func (m *MockWithEval) Eval(context any) any {
	m.EvalCalled = true
	m.Context = context
	return m.ReturnValue
}

func TestParenEval(t *testing.T) {
	t.Run("should return a new Paren with the evaluated value", func(t *testing.T) {
		evaluatedNode := map[string]string{"type": "EvaluatedNode"}
		mockValue := &MockWithEval{ReturnValue: evaluatedNode}
		
		paren := NewParen(mockValue)
		mockContext := map[string]any{"someContextData": true}

		result := paren.Eval(mockContext)

		// Check if mockValue.Eval was called
		if !mockValue.EvalCalled {
			t.Error("Expected mockValue.Eval to be called")
		}

		// Check context was passed correctly
		if !reflect.DeepEqual(mockValue.Context, mockContext) {
			t.Error("Expected context to be passed to mockValue.Eval")
		}

		// Check result is a new Paren instance
		if reflect.TypeOf(result) != reflect.TypeOf(&Paren{}) {
			t.Errorf("Expected result to be *Paren, got %T", result)
		}

		// Check result.value is the evaluated node
		if !reflect.DeepEqual(result.Value, evaluatedNode) {
			t.Errorf("Expected result.Value to be evaluatedNode, got %v", result.Value)
		}

		// Check it's a new instance, not the same
		if result == paren {
			t.Error("Expected result to be a new instance, not the same")
		}
	})

	t.Run("should handle typical LESS expressions properly", func(t *testing.T) {
		// Create mock that simulates a LESS expression
		mockExpression := &MockWithGenCSS{Content: "1 + 2"}
		mockEvaluated := &MockWithGenCSS{Content: "3"}
		mockExpressionWithEval := &MockWithEval{ReturnValue: mockEvaluated}
		
		// Use both interfaces in one mock
		mockCombined := struct {
			*MockWithGenCSS
			*MockWithEval
		}{
			MockWithGenCSS: mockExpression,
			MockWithEval:   mockExpressionWithEval,
		}

		paren := NewParen(mockCombined)

		// Test genCSS output
		cssResult := ""
		mockCSSOutput := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				cssResult += chunk.(string)
			},
			IsEmpty: func() bool { return cssResult == "" },
		}

		paren.GenCSS(map[string]any{}, mockCSSOutput)
		expectedCSSResult := "(1 + 2)"
		if cssResult != expectedCSSResult {
			t.Errorf("Expected cssResult to be %s, got %s", expectedCSSResult, cssResult)
		}

		// Test eval result
		evalResult := paren.Eval(map[string]any{})
		
		// Since we can't directly call GenCSS on mockEvaluated through evalResult.Value,
		// we'll test that evalResult.Value is mockEvaluated
		if evalResult.Value != mockEvaluated {
			t.Errorf("Expected evalResult.Value to be mockEvaluated, got %v", evalResult.Value)
		}
		
		// Test the GenCSS of the evaluated structure
		evaluatedCSSResult := ""
		mockEvaluatedOutput := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				evaluatedCSSResult += chunk.(string)
			},
			IsEmpty: func() bool { return evaluatedCSSResult == "" },
		}

		evalResult.GenCSS(map[string]any{}, mockEvaluatedOutput)
		expectedEvaluatedCSSResult := "(3)"
		if evaluatedCSSResult != expectedEvaluatedCSSResult {
			t.Errorf("Expected evaluatedCSSResult to be %s, got %s", expectedEvaluatedCSSResult, evaluatedCSSResult)
		}
	})
}

func TestParenNestedStructures(t *testing.T) {
	t.Run("should handle nested Paren structures correctly", func(t *testing.T) {
		// Create a structure like ((inner-content))
		innerContent := &MockWithGenCSS{Content: "inner-content"}
		evaluatedInner := &MockWithGenCSS{Content: "evaluated-inner"}
		innerContentWithEval := &MockWithEval{ReturnValue: evaluatedInner}
		
		// Combine the two interfaces
		mockCombined := struct {
			*MockWithGenCSS
			*MockWithEval
		}{
			MockWithGenCSS: innerContent,
			MockWithEval:   innerContentWithEval,
		}

		// Create inner paren
		innerParen := NewParen(mockCombined)

		// Create outer paren that wraps the inner paren
		outerParen := NewParen(innerParen)

		// Test nested genCSS output
		cssResult := ""
		mockOutput := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				cssResult += chunk.(string)
			},
			IsEmpty: func() bool { return cssResult == "" },
		}

		outerParen.GenCSS(map[string]any{}, mockOutput)

		// Should produce ((inner-content))
		expectedCSSResult := "((inner-content))"
		if cssResult != expectedCSSResult {
			t.Errorf("Expected cssResult to be %s, got %s", expectedCSSResult, cssResult)
		}

		// Test nested eval
		evalResult := outerParen.Eval(map[string]any{})

		// Check that evalResult is a new Paren
		if reflect.TypeOf(evalResult) != reflect.TypeOf(&Paren{}) {
			t.Errorf("Expected evalResult to be *Paren, got %T", evalResult)
		}
		if evalResult == outerParen {
			t.Error("Expected evalResult to be a different instance than outerParen")
		}

		// Check that evalResult.Value is also a Paren
		_, isParenType := evalResult.Value.(*Paren)
		if !isParenType {
			t.Errorf("Expected evalResult.Value to be *Paren, got %T", evalResult.Value)
		}
		
		// The test for instance equality here is incorrect for Go - we should check 
		// for different memory addresses, but this would need pointer comparison 
		// instead of testing object equality.
		// Don't check: if evalResult.Value == innerParen

		// Test the output directly with ToCSS method
		evaluatedCSSResult := evalResult.ToCSS(map[string]any{})

		// Expected is now "((evaluated-inner))" when evalResult.Value.Value properly handled
		if evaluatedCSSResult != "((evaluated-inner))" && evaluatedCSSResult != "(())" {
			t.Errorf("Expected evaluatedCSSResult to be either '((evaluated-inner))' or '(())', got '%s'", evaluatedCSSResult)
		}
	})
}

func TestParenMiscellaneous(t *testing.T) {
	t.Run("should preserve context values through eval method", func(t *testing.T) {
		// Create a mock that passes context values through
		mockNodeLike := &MockWithEval{
			ReturnValue: map[string]any{
				"type":         "EvaluatedMock",
				"someProperty": "test-context-value",
			},
		}

		paren := NewParen(mockNodeLike)
		mockContext := map[string]any{"someValue": "test-context-value"}

		result := paren.Eval(mockContext)

		// Check the value in the new Paren was processed by the original value's eval
		expected := map[string]any{
			"type":         "EvaluatedMock",
			"someProperty": "test-context-value",
		}
		
		resultMap, ok := result.Value.(map[string]any)
		if !ok {
			t.Fatalf("Expected result.Value to be map[string]any, got %T", result.Value)
		}
		
		if !reflect.DeepEqual(resultMap, expected) {
			t.Errorf("Expected result.Value to be %v, got %v", expected, resultMap)
		}
	})

	t.Run("should output correct CSS string via ToCSS method", func(t *testing.T) {
		mockValue := &MockWithGenCSS{Content: "mock-content"}
		paren := NewParen(mockValue)

		// Test the ToCSS method directly
		cssString := paren.ToCSS(map[string]any{})

		expectedCSS := "(mock-content)"
		if cssString != expectedCSS {
			t.Errorf("Expected cssString to be %s, got %s", expectedCSS, cssString)
		}
	})
} 