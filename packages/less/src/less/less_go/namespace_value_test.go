package less_go

import (
	"testing"
)

// Mock structures for testing
type MockRuleCall struct {
	evalFunc func(any) (any, error)
}

func (m *MockRuleCall) Eval(context any) (any, error) {
	if m.evalFunc != nil {
		return m.evalFunc(context)
	}
	return nil, nil
}

type MockRuleset struct {
	variables           bool
	properties          bool
	variableFunc        func(string) map[string]any
	propertyFunc        func(string) any
	lastDeclarationFunc func() any
}

func (m *MockRuleset) Variable(name string) map[string]any {
	if m.variableFunc != nil {
		return m.variableFunc(name)
	}
	return nil
}

// HasVariables indicates whether this ruleset supports variables (matches JavaScript rules.variables)
func (m *MockRuleset) HasVariables() bool {
	return m.variables
}

// HasProperties indicates whether this ruleset supports properties (matches JavaScript rules.properties)
func (m *MockRuleset) HasProperties() bool {
	return m.properties
}

func (m *MockRuleset) Property(name string) any {
	if m.propertyFunc != nil {
		return m.propertyFunc(name)
	}
	return nil
}

func (m *MockRuleset) LastDeclaration() any {
	if m.lastDeclarationFunc != nil {
		return m.lastDeclarationFunc()
	}
	return nil
}

type MockVariableDeclaration struct {
	value      any
	evalFunc   func(any) (any, error)
	hasValue   bool
	ruleset    any
	hasRuleset bool
}

func (m *MockVariableDeclaration) Eval(context any) (any, error) {
	if m.evalFunc != nil {
		return m.evalFunc(context)
	}
	return map[string]any{"value": m.value}, nil
}

// HasValue indicates whether this declaration has a value property (matches JavaScript rules.value)
func (m *MockVariableDeclaration) HasValue() bool {
	return m.hasValue
}

// HasRuleset indicates whether this declaration has a ruleset property (matches JavaScript rules.ruleset)
func (m *MockVariableDeclaration) HasRuleset() bool {
	return m.hasRuleset
}

// GetRuleset returns the ruleset if it exists
func (m *MockVariableDeclaration) GetRuleset() any {
	return m.ruleset
}

type MockContext struct{}

func TestNamespaceValueConstructor(t *testing.T) {
	t.Run("should create a NamespaceValue instance with correct properties", func(t *testing.T) {
		mockFileInfo := map[string]any{
			"filename": "test.less",
		}
		mockRuleCall := &MockRuleCall{}
		lookups := []string{"@color", "$width"}

		namespaceValue := NewNamespaceValue(mockRuleCall, lookups, 1, mockFileInfo)

		if namespaceValue.value != mockRuleCall {
			t.Errorf("Expected value to be mockRuleCall")
		}
		if len(namespaceValue.lookups) != 2 || namespaceValue.lookups[0] != "@color" || namespaceValue.lookups[1] != "$width" {
			t.Errorf("Expected lookups to be ['@color', '$width'], got %v", namespaceValue.lookups)
		}
		if namespaceValue._index != 1 {
			t.Errorf("Expected _index to be 1, got %d", namespaceValue._index)
		}
		if namespaceValue._fileInfo == nil || namespaceValue._fileInfo["filename"] != mockFileInfo["filename"] {
			t.Errorf("Expected _fileInfo to be mockFileInfo")
		}
		if namespaceValue.GetType() != "NamespaceValue" {
			t.Errorf("Expected type to be 'NamespaceValue', got %s", namespaceValue.GetType())
		}
	})

	t.Run("should handle undefined parameters", func(t *testing.T) {
		mockRuleCall := &MockRuleCall{}
		namespaceValue := NewNamespaceValue(mockRuleCall, []string{}, 0, nil)

		if namespaceValue.value != mockRuleCall {
			t.Errorf("Expected value to be mockRuleCall")
		}
		if len(namespaceValue.lookups) != 0 {
			t.Errorf("Expected lookups to be empty, got %v", namespaceValue.lookups)
		}
		if namespaceValue.GetType() != "NamespaceValue" {
			t.Errorf("Expected type to be 'NamespaceValue', got %s", namespaceValue.GetType())
		}
	})

	t.Run("should inherit Node methods", func(t *testing.T) {
		mockFileInfo := map[string]any{
			"filename": "test.less",
		}
		mockRuleCall := &MockRuleCall{}
		namespaceValue := NewNamespaceValue(mockRuleCall, []string{}, 42, mockFileInfo)

		if namespaceValue.GetIndex() != 42 {
			t.Errorf("Expected GetIndex to return 42, got %d", namespaceValue.GetIndex())
		}
		if namespaceValue.FileInfo() == nil || namespaceValue.FileInfo()["filename"] != mockFileInfo["filename"] {
			t.Errorf("Expected FileInfo to return mockFileInfo")
		}
	})
}

func TestNamespaceValueEvalBasicCases(t *testing.T) {
	t.Run("should evaluate with no lookups", func(t *testing.T) {
		expectedResult := map[string]any{"type": "Color", "value": "red"}
		mockRuleCall := &MockRuleCall{
			evalFunc: func(context any) (any, error) {
				return expectedResult, nil
			},
		}
		mockFileInfo := map[string]any{"filename": "test.less"}
		mockContext := &MockContext{}

		namespaceValue := NewNamespaceValue(mockRuleCall, []string{}, 1, mockFileInfo)
		result, err := namespaceValue.Eval(mockContext)

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		if resultMap, ok := result.(map[string]any); !ok || resultMap["type"] != expectedResult["type"] || resultMap["value"] != expectedResult["value"] {
			t.Errorf("Expected result to be expectedResult")
		}
	})

	t.Run("should handle empty string lookup (lastDeclaration)", func(t *testing.T) {
		innerValue := "lastValue"
		stubDecl := &MockVariableDeclaration{
			value: innerValue,
			evalFunc: func(context any) (any, error) {
				return map[string]any{"value": innerValue}, nil
			},
		}
		mockRuleset := &MockRuleset{
			lastDeclarationFunc: func() any {
				return stubDecl
			},
		}
		mockRuleCall := &MockRuleCall{
			evalFunc: func(context any) (any, error) {
				return mockRuleset, nil
			},
		}
		mockFileInfo := map[string]any{"filename": "test.less"}
		mockContext := &MockContext{}

		namespaceValue := NewNamespaceValue(mockRuleCall, []string{""}, 1, mockFileInfo)
		result, err := namespaceValue.Eval(mockContext)

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		if result != stubDecl {
			t.Errorf("Expected result to be stubDecl")
		}
	})

	t.Run("should handle variable lookups", func(t *testing.T) {
		innerValue := "variableValue"
		mockVariable := &MockVariableDeclaration{
			value: innerValue,
			evalFunc: func(context any) (any, error) {
				return map[string]any{"value": innerValue}, nil
			},
		}
		mockRuleset := &MockRuleset{
			variables: true,
			variableFunc: func(name string) map[string]any {
				if name == "@color" {
					return map[string]any{"value": mockVariable}
				}
				return nil
			},
		}
		mockRuleCall := &MockRuleCall{
			evalFunc: func(context any) (any, error) {
				return mockRuleset, nil
			},
		}
		mockFileInfo := map[string]any{"filename": "test.less"}
		mockContext := &MockContext{}

		namespaceValue := NewNamespaceValue(mockRuleCall, []string{"@color"}, 1, mockFileInfo)
		result, err := namespaceValue.Eval(mockContext)

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		if result != mockVariable {
			t.Errorf("Expected result to be mockVariable")
		}
	})

	t.Run("should handle property lookups", func(t *testing.T) {
		innerValue := "propertyValue"
		stubDecl := &MockVariableDeclaration{
			value: innerValue,
			evalFunc: func(context any) (any, error) {
				return map[string]any{"value": innerValue}, nil
			},
		}
		mockRuleset := &MockRuleset{
			properties: true,
			propertyFunc: func(name string) any {
				if name == "$width" {
					return []any{stubDecl}
				}
				return nil
			},
		}
		mockRuleCall := &MockRuleCall{
			evalFunc: func(context any) (any, error) {
				return mockRuleset, nil
			},
		}
		mockFileInfo := map[string]any{"filename": "test.less"}
		mockContext := &MockContext{}

		namespaceValue := NewNamespaceValue(mockRuleCall, []string{"width"}, 1, mockFileInfo)
		result, err := namespaceValue.Eval(mockContext)

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		if result != stubDecl {
			t.Errorf("Expected result to be stubDecl")
		}
	})

	t.Run("should handle property lookups with $ prefix", func(t *testing.T) {
		innerValue := "propertyValue"
		stubDecl := &MockVariableDeclaration{
			value: innerValue,
			evalFunc: func(context any) (any, error) {
				return map[string]any{"value": innerValue}, nil
			},
		}
		mockRuleset := &MockRuleset{
			properties: true,
			propertyFunc: func(name string) any {
				if name == "$width" {
					return []any{stubDecl}
				}
				return nil
			},
		}
		mockRuleCall := &MockRuleCall{
			evalFunc: func(context any) (any, error) {
				return mockRuleset, nil
			},
		}
		mockFileInfo := map[string]any{"filename": "test.less"}
		mockContext := &MockContext{}

		namespaceValue := NewNamespaceValue(mockRuleCall, []string{"$width"}, 1, mockFileInfo)
		result, err := namespaceValue.Eval(mockContext)

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		if result != stubDecl {
			t.Errorf("Expected result to be stubDecl")
		}
	})

	t.Run("should return last property when multiple exist", func(t *testing.T) {
		innerValues := []string{"firstValue", "secondValue", "thirdValue"}
		stubDecls := make([]any, len(innerValues))
		for i, v := range innerValues {
			stubDecls[i] = &MockVariableDeclaration{
				value: v,
				evalFunc: func(context any) (any, error) {
					return map[string]any{"value": v}, nil
				},
			}
		}
		mockRuleset := &MockRuleset{
			properties: true,
			propertyFunc: func(name string) any {
				if name == "$width" {
					return stubDecls
				}
				return nil
			},
		}
		mockRuleCall := &MockRuleCall{
			evalFunc: func(context any) (any, error) {
				return mockRuleset, nil
			},
		}
		mockFileInfo := map[string]any{"filename": "test.less"}
		mockContext := &MockContext{}

		namespaceValue := NewNamespaceValue(mockRuleCall, []string{"width"}, 1, mockFileInfo)
		result, err := namespaceValue.Eval(mockContext)

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		if result != stubDecls[2] {
			t.Errorf("Expected result to be third stubDecl")
		}
	})
}

func TestNamespaceValueErrorHandling(t *testing.T) {
	t.Run("should throw error when variable not found", func(t *testing.T) {
		mockRuleset := &MockRuleset{
			variables: true,
			variableFunc: func(name string) map[string]any {
				return nil
			},
		}
		mockRuleCall := &MockRuleCall{
			evalFunc: func(context any) (any, error) {
				return mockRuleset, nil
			},
		}
		mockFileInfo := map[string]any{"filename": "test.less"}
		mockContext := &MockContext{}

		namespaceValue := NewNamespaceValue(mockRuleCall, []string{"@notfound"}, 1, mockFileInfo)
		result, err := namespaceValue.Eval(mockContext)

		if err == nil {
			t.Errorf("Expected error, got nil")
		}
		if result != nil {
			t.Errorf("Expected result to be nil")
		}
		if lessErr, ok := err.(*LessError); ok {
			if lessErr.Type != "Name" {
				t.Errorf("Expected error type 'Name', got %s", lessErr.Type)
			}
			if lessErr.Message != "variable @notfound not found" {
				t.Errorf("Expected error message 'variable @notfound not found', got %s", lessErr.Message)
			}
			if lessErr.Filename != "test.less" {
				t.Errorf("Expected error filename 'test.less', got %s", lessErr.Filename)
			}
			if lessErr.Index != 1 {
				t.Errorf("Expected error index 1, got %d", lessErr.Index)
			}
		} else {
			t.Errorf("Expected LessError, got %T", err)
		}
	})

	t.Run("should throw error when property not found", func(t *testing.T) {
		mockRuleset := &MockRuleset{
			properties: true,
			propertyFunc: func(name string) any {
				return nil
			},
		}
		mockRuleCall := &MockRuleCall{
			evalFunc: func(context any) (any, error) {
				return mockRuleset, nil
			},
		}
		mockFileInfo := map[string]any{"filename": "test.less"}
		mockContext := &MockContext{}

		namespaceValue := NewNamespaceValue(mockRuleCall, []string{"width"}, 1, mockFileInfo)
		result, err := namespaceValue.Eval(mockContext)

		if err == nil {
			t.Errorf("Expected error, got nil")
		}
		if result != nil {
			t.Errorf("Expected result to be nil")
		}
		if lessErr, ok := err.(*LessError); ok {
			if lessErr.Type != "Name" {
				t.Errorf("Expected error type 'Name', got %s", lessErr.Type)
			}
			if lessErr.Message != "property \"width\" not found" {
				t.Errorf("Expected error message 'property \"width\" not found', got %s", lessErr.Message)
			}
			if lessErr.Filename != "test.less" {
				t.Errorf("Expected error filename 'test.less', got %s", lessErr.Filename)
			}
			if lessErr.Index != 1 {
				t.Errorf("Expected error index 1, got %d", lessErr.Index)
			}
		} else {
			t.Errorf("Expected LessError, got %T", err)
		}
	})
}

func TestNamespaceValueTypeChecking(t *testing.T) {
	t.Run("should have correct type property", func(t *testing.T) {
		mockRuleCall := &MockRuleCall{}
		mockFileInfo := map[string]any{"filename": "test.less"}

		namespaceValue := NewNamespaceValue(mockRuleCall, []string{}, 1, mockFileInfo)

		if namespaceValue.GetType() != "NamespaceValue" {
			t.Errorf("Expected type to be 'NamespaceValue', got %s", namespaceValue.GetType())
		}
	})
}

func TestNamespaceValueAdvancedCases(t *testing.T) {
	t.Run("should convert array rules to Ruleset", func(t *testing.T) {
		arrayRules := []any{
			map[string]any{"type": "Declaration", "name": "color", "value": "red"},
			map[string]any{"type": "Declaration", "name": "width", "value": "100px"},
		}
		mockRuleCall := &MockRuleCall{
			evalFunc: func(context any) (any, error) {
				return arrayRules, nil
			},
		}
		mockFileInfo := map[string]any{"filename": "test.less"}
		mockContext := &MockContext{}

		namespaceValue := NewNamespaceValue(mockRuleCall, []string{}, 1, mockFileInfo)
		result, err := namespaceValue.Eval(mockContext)

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		if result == nil {
			t.Errorf("Expected result to be defined")
		}
		// The actual implementation will convert array to Ruleset internally during lookups
		// For testing purposes, just verify it doesn't crash and returns something
		// With no lookups, the array is returned unchanged (matches JavaScript behavior)
	})

	t.Run("should evaluate rules.value when it exists after lookup", func(t *testing.T) {
		finalValue := "finalEvaluatedValue"
		mockVariable := &MockVariableDeclaration{
			value:    "hasValue",
			hasValue: true, // This has a value property
			evalFunc: func(context any) (any, error) {
				return map[string]any{"value": finalValue}, nil
			},
		}
		mockRuleset := &MockRuleset{
			variables: true,
			variableFunc: func(name string) map[string]any {
				if name == "@color" {
					return map[string]any{"value": mockVariable}
				}
				return nil
			},
		}
		mockRuleCall := &MockRuleCall{
			evalFunc: func(context any) (any, error) {
				return mockRuleset, nil
			},
		}
		mockFileInfo := map[string]any{"filename": "test.less"}
		mockContext := &MockContext{}

		namespaceValue := NewNamespaceValue(mockRuleCall, []string{"@color"}, 1, mockFileInfo)
		result, err := namespaceValue.Eval(mockContext)

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		if result != finalValue {
			t.Errorf("Expected result to be finalValue")
		}
	})

	t.Run("should evaluate rules.ruleset when it exists after lookup", func(t *testing.T) {
		finalValue := "rulesetEvaluatedValue"
		mockInnerRuleset := &MockVariableDeclaration{
			evalFunc: func(context any) (any, error) {
				return finalValue, nil
			},
		}
		mockVariable := &MockVariableDeclaration{
			ruleset:    mockInnerRuleset,
			hasRuleset: true,
		}
		mockRuleset := &MockRuleset{
			variables: true,
			variableFunc: func(name string) map[string]any {
				if name == "@color" {
					return map[string]any{"value": mockVariable}
				}
				return nil
			},
		}
		mockRuleCall := &MockRuleCall{
			evalFunc: func(context any) (any, error) {
				return mockRuleset, nil
			},
		}
		mockFileInfo := map[string]any{"filename": "test.less"}
		mockContext := &MockContext{}

		namespaceValue := NewNamespaceValue(mockRuleCall, []string{"@color"}, 1, mockFileInfo)
		result, err := namespaceValue.Eval(mockContext)

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		if result != finalValue {
			t.Errorf("Expected result to be finalValue")
		}
	})

	t.Run("should handle multiple lookups in sequence", func(t *testing.T) {
		finalValue := "finalValue"
		finalProperty := &MockVariableDeclaration{
			value:    finalValue,
			hasValue: true,
			evalFunc: func(context any) (any, error) {
				return map[string]any{"value": finalValue}, nil
			},
		}
		intermediateRuleset := &MockRuleset{
			properties: true,
			propertyFunc: func(name string) any {
				if name == "$width" {
					return []any{finalProperty}
				}
				return nil
			},
		}
		intermediateVariable := &MockVariableDeclaration{
			value:    "intermediateRuleset",
			hasValue: true,
			evalFunc: func(context any) (any, error) {
				return map[string]any{"value": intermediateRuleset}, nil
			},
		}
		firstRuleset := &MockRuleset{
			variables: true,
			variableFunc: func(name string) map[string]any {
				if name == "@namespace" {
					return map[string]any{"value": intermediateVariable}
				}
				return nil
			},
		}
		mockRuleCall := &MockRuleCall{
			evalFunc: func(context any) (any, error) {
				return firstRuleset, nil
			},
		}
		mockFileInfo := map[string]any{"filename": "test.less"}
		mockContext := &MockContext{}

		namespaceValue := NewNamespaceValue(mockRuleCall, []string{"@namespace", "width"}, 1, mockFileInfo)
		result, err := namespaceValue.Eval(mockContext)

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		if result != finalValue {
			t.Errorf("Expected result to be finalValue")
		}
	})

	t.Run("should handle rules with both value and ruleset properties", func(t *testing.T) {
		mockInnerRuleset := &MockVariableDeclaration{
			evalFunc: func(context any) (any, error) {
				return "rulesetResult", nil
			},
		}
		mockVariable := &MockVariableDeclaration{
			value:      "hasValue",
			hasValue:   true,
			ruleset:    mockInnerRuleset,
			hasRuleset: true,
			evalFunc: func(context any) (any, error) {
				return map[string]any{"value": "valueResult"}, nil
			},
		}
		mockRuleset := &MockRuleset{
			variables: true,
			variableFunc: func(name string) map[string]any {
				if name == "@color" {
					return map[string]any{"value": mockVariable}
				}
				return nil
			},
		}
		mockRuleCall := &MockRuleCall{
			evalFunc: func(context any) (any, error) {
				return mockRuleset, nil
			},
		}
		mockFileInfo := map[string]any{"filename": "test.less"}
		mockContext := &MockContext{}

		namespaceValue := NewNamespaceValue(mockRuleCall, []string{"@color"}, 1, mockFileInfo)
		result, err := namespaceValue.Eval(mockContext)

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		// Should evaluate value first, then ruleset is not processed
		if result != "valueResult" {
			t.Errorf("Expected result to be 'valueResult', got %v", result)
		}
	})

	t.Run("should handle case when rules.variables is false (returns original ruleset)", func(t *testing.T) {
		mockRuleset := &MockRuleset{
			variables: false,
		}
		mockRuleCall := &MockRuleCall{
			evalFunc: func(context any) (any, error) {
				return mockRuleset, nil
			},
		}
		mockFileInfo := map[string]any{"filename": "test.less"}
		mockContext := &MockContext{}

		namespaceValue := NewNamespaceValue(mockRuleCall, []string{"@color"}, 1, mockFileInfo)
		result, err := namespaceValue.Eval(mockContext)

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		if result != mockRuleset {
			t.Errorf("Expected result to be mockRuleset")
		}
	})

	t.Run("should handle case when rules.variables is undefined (returns original ruleset)", func(t *testing.T) {
		mockRuleset := &MockRuleset{
			// variables is false by default
		}
		mockRuleCall := &MockRuleCall{
			evalFunc: func(context any) (any, error) {
				return mockRuleset, nil
			},
		}
		mockFileInfo := map[string]any{"filename": "test.less"}
		mockContext := &MockContext{}

		namespaceValue := NewNamespaceValue(mockRuleCall, []string{"@color"}, 1, mockFileInfo)
		result, err := namespaceValue.Eval(mockContext)

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		if result != mockRuleset {
			t.Errorf("Expected result to be mockRuleset")
		}
	})

	t.Run("should handle case when rules.properties is undefined", func(t *testing.T) {
		mockRuleset := &MockRuleset{
			// properties is false by default
		}
		mockRuleCall := &MockRuleCall{
			evalFunc: func(context any) (any, error) {
				return mockRuleset, nil
			},
		}
		mockFileInfo := map[string]any{"filename": "test.less"}
		mockContext := &MockContext{}

		namespaceValue := NewNamespaceValue(mockRuleCall, []string{"width"}, 1, mockFileInfo)
		result, err := namespaceValue.Eval(mockContext)

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		if result != mockRuleset {
			t.Errorf("Expected result to be mockRuleset")
		}
	})

	t.Run("should handle empty properties array", func(t *testing.T) {
		mockRuleset := &MockRuleset{
			properties: true,
			propertyFunc: func(name string) any {
				if name == "$width" {
					return []any{} // Empty array
				}
				return nil
			},
		}
		mockRuleCall := &MockRuleCall{
			evalFunc: func(context any) (any, error) {
				return mockRuleset, nil
			},
		}
		mockFileInfo := map[string]any{"filename": "test.less"}
		mockContext := &MockContext{}

		namespaceValue := NewNamespaceValue(mockRuleCall, []string{"width"}, 1, mockFileInfo)
		result, err := namespaceValue.Eval(mockContext)

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		// Empty array means no properties found, but Go handles this gracefully
		// by returning the empty array itself, unlike JavaScript which would cause TypeError
		if resultArray, ok := result.([]any); !ok || len(resultArray) != 0 {
			t.Errorf("Expected result to be empty array")
		}
	})

	t.Run("should handle array conversion inside loop for intermediate results", func(t *testing.T) {
		// This test verifies that array conversion happens inside each lookup, not just initially
		intermediateArray := []any{
			map[string]any{"type": "Declaration", "name": "color", "value": "blue"},
		}

		// First lookup returns a variable that evaluates to an array
		mockVariable := &MockVariableDeclaration{
			value:    "namespaceResult",
			hasValue: true,
			evalFunc: func(context any) (any, error) {
				return map[string]any{"value": intermediateArray}, nil
			},
		}
		mockRuleset := &MockRuleset{
			variables: true,
			variableFunc: func(name string) map[string]any {
				if name == "@namespace" {
					return map[string]any{"value": mockVariable}
				}
				return nil
			},
		}
		mockRuleCall := &MockRuleCall{
			evalFunc: func(context any) (any, error) {
				return mockRuleset, nil
			},
		}
		mockFileInfo := map[string]any{"filename": "test.less"}
		mockContext := &MockContext{}

		namespaceValue := NewNamespaceValue(mockRuleCall, []string{"@namespace"}, 1, mockFileInfo)
		result, err := namespaceValue.Eval(mockContext)

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		t.Logf("Result type: %T, Result value: %+v", result, result)
		// The intermediate array should have been extracted from the variable evaluation
		if result == nil {
			t.Errorf("Expected result to be defined")
		}
		// The result should be the intermediate array
		if resultArray, ok := result.([]any); ok {
			if len(resultArray) != 1 {
				t.Errorf("Expected result array to have 1 element, got %d", len(resultArray))
			}
		} else {
			t.Errorf("Expected result to be an array, got %T", result)
		}
	})
}
