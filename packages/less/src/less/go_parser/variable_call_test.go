package go_parser

import (
	"fmt"
	"strings"
	"testing"
)

// testFileInfo creates a test file info for testing
func testFileInfo() map[string]any {
	return map[string]any{
		"filename": "test.less",
	}
}

// Mock Frame for testing
type mockVariableCallFrame struct {
	vars map[string]map[string]any
}

func (m *mockVariableCallFrame) Variable(name string) map[string]any {
	return m.vars[name]
}

// Mock EvalContext for testing
type mockVariableCallContext struct {
	frames         []Frame
	importantScope []map[string]bool
	inCalc         bool
	mathOn         bool
}

func (m *mockVariableCallContext) GetFrames() []Frame {
	return m.frames
}

func (m *mockVariableCallContext) GetImportantScope() []map[string]bool {
	return m.importantScope
}

func (m *mockVariableCallContext) IsInCalc() bool {
	return m.inCalc
}

func (m *mockVariableCallContext) IsMathOn() bool {
	return m.mathOn
}

func (m *mockVariableCallContext) SetMathOn(on bool) {
	m.mathOn = on
}

func (m *mockVariableCallContext) EnterCalc() {
	m.inCalc = true
}

func (m *mockVariableCallContext) ExitCalc() {
	m.inCalc = false
}

// Mock detached ruleset for testing successful cases
type mockDetachedRuleset struct {
	ruleset   any
	callResult any
	getRuleset func() any
	callEval  func(any) any
}

func (m *mockDetachedRuleset) GetRuleset() any {
	if m.getRuleset != nil {
		return m.getRuleset()
	}
	return m.ruleset
}

func (m *mockDetachedRuleset) CallEval(context any) any {
	if m.callEval != nil {
		return m.callEval(context)
	}
	return m.callResult
}

// Mock evaluable value that returns a detached ruleset
type mockEvaluableValue struct {
	result any
	err    error
}

func (m *mockEvaluableValue) Eval(context EvalContext) (any, error) {
	return m.result, m.err
}

// Mock object with GetRules method
type mockRulesObject struct {
	rules []any
}

func (m *mockRulesObject) GetRules() []any {
	return m.rules
}

func TestVariableCall_Creation(t *testing.T) {
	t.Run("should create a VariableCall instance with correct properties", func(t *testing.T) {
		fileInfo := testFileInfo()
		variableCall := NewVariableCall("@mixin", 10, fileInfo)

		if variableCall.variable != "@mixin" {
			t.Errorf("expected variable to be '@mixin', got %s", variableCall.variable)
		}
		if variableCall._index != 10 {
			t.Errorf("expected _index to be 10, got %d", variableCall._index)
		}
		// Check filename instead of comparing maps directly
		if variableCall._fileInfo == nil || variableCall._fileInfo["filename"] != "test.less" {
			t.Errorf("expected _fileInfo to contain correct filename, got %v", variableCall._fileInfo)
		}
		if variableCall.GetType() != "VariableCall" {
			t.Errorf("expected type to be 'VariableCall', got %s", variableCall.GetType())
		}
		if !variableCall.allowRoot {
			t.Errorf("expected allowRoot to be true, got %t", variableCall.allowRoot)
		}
	})

	t.Run("should handle nil parameters", func(t *testing.T) {
		variableCall := NewVariableCall("@mixin", 0, nil)

		if variableCall.variable != "@mixin" {
			t.Errorf("expected variable to be '@mixin', got %s", variableCall.variable)
		}
		if variableCall._index != 0 {
			t.Errorf("expected _index to be 0, got %d", variableCall._index)
		}
		if variableCall._fileInfo != nil {
			t.Errorf("expected _fileInfo to be nil, got %v", variableCall._fileInfo)
		}
		if variableCall.GetType() != "VariableCall" {
			t.Errorf("expected type to be 'VariableCall', got %s", variableCall.GetType())
		}
		if !variableCall.allowRoot {
			t.Errorf("expected allowRoot to be true, got %t", variableCall.allowRoot)
		}
	})

	t.Run("should inherit from Node", func(t *testing.T) {
		variableCall := NewVariableCall("@mixin", 10, testFileInfo())
		if variableCall.Node == nil {
			t.Error("expected VariableCall to contain a Node")
		}
	})
}

func TestVariableCall_Eval_SuccessfulCases(t *testing.T) {
	t.Run("should evaluate variable call with detached ruleset", func(t *testing.T) {
		variableCall := NewVariableCall("@mixin", 10, testFileInfo())
		
		mockResult := map[string]any{"result": "success"}
		detachedRuleset := &mockDetachedRuleset{
			ruleset: map[string]any{"some": "ruleset"},
			callResult: mockResult,
		}

		context := &mockVariableCallContext{
			frames: []Frame{
				&mockVariableCallFrame{
					vars: map[string]map[string]any{
						"@mixin": {
							"value": &mockEvaluableValue{
								result: detachedRuleset,
								err:    nil,
							},
						},
					},
				},
			},
			importantScope: []map[string]bool{{"important": false}},
		}

		result, err := variableCall.Eval(context)

		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
		if result == nil {
			t.Error("expected result, got nil")
		}
		// Check that result matches what mockDetached.CallEval returns
		if resultMap, ok := result.(map[string]any); ok {
			if resultMap["result"] != "success" {
				t.Errorf("expected result to be 'success', got %v", resultMap["result"])
			}
		}
	})

	t.Run("should create DetachedRuleset from rules property", func(t *testing.T) {
		variableCall := NewVariableCall("@mixin", 10, testFileInfo())
		
		mockRules := map[string]any{
			"rules": []any{
				map[string]any{"rule": 1},
				map[string]any{"rule": 2},
			},
		}

		context := &mockVariableCallContext{
			frames: []Frame{
				&mockVariableCallFrame{
					vars: map[string]map[string]any{
						"@mixin": {
							"value": &mockEvaluableValue{
								result: mockRules,
								err:    nil,
							},
						},
					},
				},
			},
			importantScope: []map[string]bool{{"important": false}},
		}

		result, err := variableCall.Eval(context)

		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
		if result == nil {
			t.Error("expected result, got nil")
		}
	})

	t.Run("should create DetachedRuleset from array result", func(t *testing.T) {
		variableCall := NewVariableCall("@mixin", 10, testFileInfo())
		
		mockArray := []any{
			map[string]any{"rule": 1},
			map[string]any{"rule": 2},
		}

		context := &mockVariableCallContext{
			frames: []Frame{
				&mockVariableCallFrame{
					vars: map[string]map[string]any{
						"@mixin": {
							"value": &mockEvaluableValue{
								result: mockArray,
								err:    nil,
							},
						},
					},
				},
			},
			importantScope: []map[string]bool{{"important": false}},
		}

		result, err := variableCall.Eval(context)

		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
		if result == nil {
			t.Error("expected result, got nil")
		}
	})

	t.Run("should create DetachedRuleset from value array", func(t *testing.T) {
		variableCall := NewVariableCall("@mixin", 10, testFileInfo())
		
		mockValueArray := map[string]any{
			"value": []any{
				map[string]any{"rule": 1},
				map[string]any{"rule": 2},
			},
		}

		context := &mockVariableCallContext{
			frames: []Frame{
				&mockVariableCallFrame{
					vars: map[string]map[string]any{
						"@mixin": {
							"value": &mockEvaluableValue{
								result: mockValueArray,
								err:    nil,
							},
						},
					},
				},
			},
			importantScope: []map[string]bool{{"important": false}},
		}

		result, err := variableCall.Eval(context)

		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
		if result == nil {
			t.Error("expected result, got nil")
		}
	})

	t.Run("should handle object with GetRules method", func(t *testing.T) {
		variableCall := NewVariableCall("@mixin", 10, testFileInfo())
		
		mockRulesObj := &mockRulesObject{
			rules: []any{
				map[string]any{"rule": 1},
			},
		}

		context := &mockVariableCallContext{
			frames: []Frame{
				&mockVariableCallFrame{
					vars: map[string]map[string]any{
						"@mixin": {
							"value": &mockEvaluableValue{
								result: mockRulesObj,
								err:    nil,
							},
						},
					},
				},
			},
			importantScope: []map[string]bool{{"important": false}},
		}

		result, err := variableCall.Eval(context)

		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
		if result == nil {
			t.Error("expected result, got nil")
		}
	})
}

func TestVariableCall_Eval_ErrorCases(t *testing.T) {
	t.Run("should return error when variable evaluation fails", func(t *testing.T) {
		variableCall := NewVariableCall("@nonexistent", 10, testFileInfo())

		context := &mockVariableCallContext{
			frames: []Frame{
				&mockVariableCallFrame{
					vars: map[string]map[string]any{
						"@mixin": {
							"value": &mockEvaluableValue{
								result: nil,
								err:    nil,
							},
						},
					},
				},
			},
			importantScope: []map[string]bool{{"important": false}},
		}

		result, err := variableCall.Eval(context)

		if err == nil {
			t.Error("expected error when variable evaluation fails")
		}
		if result != nil {
			t.Errorf("expected result to be nil when error occurs, got %v", result)
		}
	})

	t.Run("should return error when variable returns unrecognized type", func(t *testing.T) {
		variableCall := NewVariableCall("@invalid", 10, testFileInfo())

		context := &mockVariableCallContext{
			frames: []Frame{
				&mockVariableCallFrame{
					vars: map[string]map[string]any{
						"@invalid": {
							"value": &mockEvaluableValue{
								// Return something that doesn't match any expected pattern
								result: map[string]any{"someOther": "value"},
								err:    nil,
							},
						},
					},
				},
			},
			importantScope: []map[string]bool{{"important": false}},
		}

		result, err := variableCall.Eval(context)

		if err == nil {
			t.Error("expected error when variable returns unrecognized type")
		}
		if result != nil {
			t.Errorf("expected result to be nil when error occurs, got %v", result)
		}
		if !strings.Contains(err.Error(), "Could not evaluate variable call @invalid") {
			t.Errorf("expected error to mention variable name, got: %s", err.Error())
		}
	})

	t.Run("should handle Variable evaluation throwing an error", func(t *testing.T) {
		variableCall := NewVariableCall("@error", 10, testFileInfo())

		context := &mockVariableCallContext{
			frames: []Frame{
				&mockVariableCallFrame{
					vars: map[string]map[string]any{
						"@error": {
							"value": &mockEvaluableValue{
								result: nil,
								err:    fmt.Errorf("Variable evaluation failed"),
							},
						},
					},
				},
			},
			importantScope: []map[string]bool{{"important": false}},
		}

		result, err := variableCall.Eval(context)

		if err == nil {
			t.Error("expected error when Variable.Eval throws")
		}
		if result != nil {
			t.Errorf("expected result to be nil when error occurs, got %v", result)
		}
	})
}

func TestVariableCall_Eval_DetachedRulesetCreationScenarios(t *testing.T) {
	t.Run("should handle empty rules array", func(t *testing.T) {
		variableCall := NewVariableCall("@empty", 10, testFileInfo())

		mockEmptyRules := map[string]any{
			"rules": []any{},
		}

		context := &mockVariableCallContext{
			frames: []Frame{
				&mockVariableCallFrame{
					vars: map[string]map[string]any{
						"@empty": {
							"value": &mockEvaluableValue{
								result: mockEmptyRules,
								err:    nil,
							},
						},
					},
				},
			},
			importantScope: []map[string]bool{{"important": false}},
		}

		result, err := variableCall.Eval(context)

		if err != nil {
			t.Errorf("expected no error with empty rules, got %v", err)
		}
		if result == nil {
			t.Error("expected result with empty rules, got nil")
		}
	})

	t.Run("should handle empty array result", func(t *testing.T) {
		variableCall := NewVariableCall("@empty-array", 10, testFileInfo())

		context := &mockVariableCallContext{
			frames: []Frame{
				&mockVariableCallFrame{
					vars: map[string]map[string]any{
						"@empty-array": {
							"value": &mockEvaluableValue{
								result: []any{},
								err:    nil,
							},
						},
					},
				},
			},
			importantScope: []map[string]bool{{"important": false}},
		}

		result, err := variableCall.Eval(context)

		if err != nil {
			t.Errorf("expected no error with empty array, got %v", err)
		}
		if result == nil {
			t.Error("expected result with empty array, got nil")
		}
	})

	t.Run("should handle empty value array", func(t *testing.T) {
		variableCall := NewVariableCall("@empty-value", 10, testFileInfo())

		context := &mockVariableCallContext{
			frames: []Frame{
				&mockVariableCallFrame{
					vars: map[string]map[string]any{
						"@empty-value": {
							"value": &mockEvaluableValue{
								result: map[string]any{"value": []any{}},
								err:    nil,
							},
						},
					},
				},
			},
			importantScope: []map[string]bool{{"important": false}},
		}

		result, err := variableCall.Eval(context)

		if err != nil {
			t.Errorf("expected no error with empty value array, got %v", err)
		}
		if result == nil {
			t.Error("expected result with empty value array, got nil")
		}
	})
}

func TestVariableCall_InheritedNodeMethods(t *testing.T) {
	t.Run("should have correct GetIndex behavior", func(t *testing.T) {
		variableCall := NewVariableCall("@test", 42, testFileInfo())
		if variableCall.GetIndex() != 42 {
			t.Errorf("expected GetIndex() to return 42, got %d", variableCall.GetIndex())
		}
	})

	t.Run("should have correct FileInfo behavior", func(t *testing.T) {
		fileInfo := testFileInfo()
		variableCall := NewVariableCall("@test", 42, fileInfo)
		returnedInfo := variableCall.FileInfo()
		if returnedInfo == nil || returnedInfo["filename"] != "test.less" {
			t.Errorf("expected FileInfo() to return correct filename, got %v", returnedInfo)
		}
	})

	t.Run("should handle missing index and fileInfo", func(t *testing.T) {
		variableCall := NewVariableCall("@test", 0, nil)
		if variableCall.GetIndex() != 0 {
			t.Errorf("expected GetIndex() to return 0, got %d", variableCall.GetIndex())
		}
		if variableCall.FileInfo() != nil {
			t.Errorf("expected FileInfo() to return nil, got %v", variableCall.FileInfo())
		}
	})
}

func TestVariableCall_VariableNames(t *testing.T) {
	t.Run("should handle variable names with special characters", func(t *testing.T) {
		variableCall := NewVariableCall("@special-name_123", 10, testFileInfo())
		
		if variableCall.variable != "@special-name_123" {
			t.Errorf("expected variable name to be preserved, got %s", variableCall.variable)
		}
	})

	t.Run("should handle empty variable name", func(t *testing.T) {
		variableCall := NewVariableCall("", 10, testFileInfo())
		
		if variableCall.variable != "" {
			t.Errorf("expected empty variable name to be preserved, got %s", variableCall.variable)
		}
	})

	t.Run("should handle very long variable names", func(t *testing.T) {
		longName := "@" + strings.Repeat("a", 1000)
		variableCall := NewVariableCall(longName, 10, testFileInfo())
		
		if variableCall.variable != longName {
			t.Errorf("expected long variable name to be preserved")
		}
	})
}

func TestVariableCall_ComplexEvaluationScenarios(t *testing.T) {
	t.Run("should handle complex rules object with multiple properties", func(t *testing.T) {
		variableCall := NewVariableCall("@complex", 10, testFileInfo())

		complexRules := map[string]any{
			"rules": []any{
				map[string]any{"type": "Declaration", "name": "color", "value": "red"},
				map[string]any{"type": "Declaration", "name": "margin", "value": "10px"},
				map[string]any{"type": "Ruleset", "selectors": []any{".nested"}},
			},
		}

		context := &mockVariableCallContext{
			frames: []Frame{
				&mockVariableCallFrame{
					vars: map[string]map[string]any{
						"@complex": {
							"value": &mockEvaluableValue{
								result: complexRules,
								err:    nil,
							},
						},
					},
				},
			},
			importantScope: []map[string]bool{{"important": false}},
		}

		result, err := variableCall.Eval(context)

		if err != nil {
			t.Errorf("expected no error with complex rules, got %v", err)
		}
		if result == nil {
			t.Error("expected result with complex rules, got nil")
		}
	})

	t.Run("should handle context with no frames", func(t *testing.T) {
		variableCall := NewVariableCall("@test", 10, testFileInfo())

		context := &mockVariableCallContext{
			frames:         []Frame{},
			importantScope: []map[string]bool{{"important": false}},
		}

		result, err := variableCall.Eval(context)

		if err == nil {
			t.Error("expected error with no frames containing the variable")
		}
		if result != nil {
			t.Errorf("expected result to be nil with no frames, got %v", result)
		}
	})
}

func TestVariableCall_Eval_ErrorCase(t *testing.T) {
	t.Run("should handle context that leads to error", func(t *testing.T) {
		variableCall := NewVariableCall("@nonexistent", 10, testFileInfo())
		
		// Use a simple context that will likely cause Variable.Eval to fail
		context := map[string]any{
			"frames": []any{},
		}

		result, err := variableCall.Eval(context)
		
		// We expect an error because there are no variables defined in the empty frames
		if err == nil {
			t.Error("expected error when evaluating undefined variable, got nil")
		}
		
		if result != nil {
			t.Errorf("expected result to be nil when error occurs, got %v", result)
		}
		
		// Check that error message contains the variable name
		if err != nil && !strings.Contains(err.Error(), "@nonexistent") {
			t.Errorf("expected error to mention variable name, got: %s", err.Error())
		}
	})
} 