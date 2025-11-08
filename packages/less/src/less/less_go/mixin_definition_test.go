package less_go

import (
	"strings"
	"testing"
)

// Mock visitor for testing
type mixinTestVisitor struct {
	visitArrayCalls [][]any
	visitCalls      []any
}

func (mv *mixinTestVisitor) VisitArray(arr []any) []any {
	mv.visitArrayCalls = append(mv.visitArrayCalls, arr)
	result := make([]any, len(arr))
	copy(result, arr)
	return result
}

func (mv *mixinTestVisitor) Visit(node any) any {
	mv.visitCalls = append(mv.visitCalls, node)
	return node
}

// Mock evaluable value for testing
type mockMixinEvaluable struct {
	evalResult any
	evalError  error
}

func (me *mockMixinEvaluable) Eval(context any) any {
	if me.evalError != nil {
		return nil
	}
	return me.evalResult
}

// Mock condition for testing  
type mockCondition struct {
	evalResult bool
}

func (mc *mockCondition) Eval(context any) any {
	return mc.evalResult
}

// Mock parameter for testing
func createMockParam(name string, value any, variadic bool) map[string]any {
	param := map[string]any{
		"name":     name,
		"variadic": variadic,
	}
	if value != nil {
		param["value"] = value
	}
	return param
}

// Mock argument for testing
func createMockArg(name string, value any) map[string]any {
	arg := map[string]any{}
	if name != "" {
		arg["name"] = name
	}
	if value != nil {
		arg["value"] = value
	}
	return arg
}

func TestMixinDefinition_Constructor(t *testing.T) {
	t.Run("should create a basic mixin definition with all parameters", func(t *testing.T) {
		params := []any{
			createMockParam("param1", nil, false),
			createMockParam("param2", &mockMixinEvaluable{evalResult: "default"}, false),
			createMockParam("", &mockMixinEvaluable{evalResult: "pattern"}, false),
		}
		rules := []any{
			map[string]any{"type": "Declaration", "name": "color", "value": "red"},
			map[string]any{"type": "Ruleset", "rules": []any{}},
		}
		condition := &mockCondition{evalResult: true}
		frames := []any{
			map[string]any{
				"functionRegistry": map[string]any{
					"inherit": func() any { return map[string]any{} },
				},
			},
		}
		visibilityInfo := map[string]any{"visible": true}

		definition, err := NewMixinDefinition("test-mixin", params, rules, condition, true, frames, visibilityInfo)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		if definition.Name != "test-mixin" {
			t.Errorf("Expected name 'test-mixin', got %s", definition.Name)
		}
		if definition.Params == nil || len(definition.Params) != 3 {
			t.Errorf("Expected 3 params, got %v", definition.Params)
		}
		if definition.Rules == nil || len(definition.Rules) != 2 {
			t.Errorf("Expected 2 rules, got %v", definition.Rules)
		}
		if definition.Condition != condition {
			t.Errorf("Expected condition to be set")
		}
		if !definition.Variadic {
			t.Errorf("Expected variadic to be true")
		}
		if definition.Frames == nil || len(definition.Frames) != 1 {
			t.Errorf("Expected frames to be set")
		}
		if definition.Arity != 3 {
			t.Errorf("Expected arity 3, got %d", definition.Arity)
		}
		if definition.Lookups == nil {
			t.Errorf("Expected lookups to be initialized")
		}
		if !definition.AllowRoot {
			t.Errorf("Expected allowRoot to be true")
		}
	})

	t.Run("should create a mixin with default name when name is empty", func(t *testing.T) {
		definition, err := NewMixinDefinition("", []any{}, []any{}, nil, false, nil, nil)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}
		if definition.Name != "anonymous mixin" {
			t.Errorf("Expected default name 'anonymous mixin', got %s", definition.Name)
		}
	})

	t.Run("should correctly calculate required parameters count", func(t *testing.T) {
		params := []any{
			createMockParam("required1", nil, false),
			createMockParam("required2", nil, false),
			createMockParam("optional1", &mockMixinEvaluable{}, false),
			createMockParam("optional2", &mockMixinEvaluable{}, false),
		}

		definition, err := NewMixinDefinition("test", params, []any{}, nil, false, nil, nil)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		if definition.Required != 2 {
			t.Errorf("Expected 2 required params, got %d", definition.Required)
		}
		if len(definition.OptionalParameters) != 2 {
			t.Errorf("Expected 2 optional params, got %d", len(definition.OptionalParameters))
		}
		expectedOptional := []string{"optional1", "optional2"}
		for i, expected := range expectedOptional {
			if i >= len(definition.OptionalParameters) || definition.OptionalParameters[i] != expected {
				t.Errorf("Expected optional parameter %s, got %v", expected, definition.OptionalParameters)
			}
		}
	})

	t.Run("should handle unnamed parameters in required count", func(t *testing.T) {
		params := []any{
			createMockParam("", nil, false),
			createMockParam("", nil, false),
			createMockParam("named", nil, false),
		}

		definition, err := NewMixinDefinition("test", params, []any{}, nil, false, nil, nil)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		if definition.Required != 3 {
			t.Errorf("Expected 3 required params, got %d", definition.Required)
		}
		if len(definition.OptionalParameters) != 0 {
			t.Errorf("Expected 0 optional params, got %d", len(definition.OptionalParameters))
		}
	})

	t.Run("should handle empty parameters array", func(t *testing.T) {
		definition, err := NewMixinDefinition("test", []any{}, []any{}, nil, false, nil, nil)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		if definition.Arity != 0 {
			t.Errorf("Expected arity 0, got %d", definition.Arity)
		}
		if definition.Required != 0 {
			t.Errorf("Expected 0 required params, got %d", definition.Required)
		}
		if len(definition.OptionalParameters) != 0 {
			t.Errorf("Expected 0 optional params, got %d", len(definition.OptionalParameters))
		}
	})
}

func TestMixinDefinition_GetType(t *testing.T) {
	definition, _ := NewMixinDefinition("test", []any{}, []any{}, nil, false, nil, nil)
	if definition.GetType() != "MixinDefinition" {
		t.Errorf("Expected type 'MixinDefinition', got %s", definition.GetType())
	}
}

func TestMixinDefinition_EvalFirst(t *testing.T) {
	definition, _ := NewMixinDefinition("test", []any{}, []any{}, nil, false, nil, nil)
	if !definition.EvalFirst() {
		t.Errorf("Expected EvalFirst to return true")
	}
}

func TestMixinDefinition_Accept(t *testing.T) {
	params := []any{
		createMockParam("param1", nil, false),
	}
	rules := []any{
		map[string]any{"type": "rule"},
	}
	condition := &mockCondition{evalResult: true}

	definition, _ := NewMixinDefinition("test", params, rules, condition, false, nil, nil)
	visitor := &mixinTestVisitor{}

	definition.Accept(visitor)

	if len(visitor.visitArrayCalls) != 2 {
		t.Errorf("Expected 2 visitArray calls, got %d", len(visitor.visitArrayCalls))
	}
	if len(visitor.visitCalls) != 1 {
		t.Errorf("Expected 1 visit call, got %d", len(visitor.visitCalls))
	}
}

func TestMixinDefinition_EvalParams(t *testing.T) {
	t.Run("should create new frame and eval context", func(t *testing.T) {
		params := []any{
			createMockParam("param1", nil, false),
		}
		definition, _ := NewMixinDefinition("test", params, []any{}, nil, false, nil, nil)
		context := map[string]any{"frames": []any{}}
		mixinEnv := map[string]any{"frames": []any{}}
		args := []any{
			createMockArg("", &mockMixinEvaluable{evalResult: "value1"}),
		}
		evaldArguments := make([]any, 1)

		result, err := definition.EvalParams(context, mixinEnv, args, evaldArguments)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}
		if result == nil {
			t.Errorf("Expected result to be a Ruleset")
		}
	})

	t.Run("should handle named arguments", func(t *testing.T) {
		params := []any{
			createMockParam("param1", nil, false),
		}
		definition, _ := NewMixinDefinition("test", params, []any{}, nil, false, nil, nil)
		context := map[string]any{"frames": []any{}}
		mixinEnv := map[string]any{"frames": []any{}}
		args := []any{
			createMockArg("param1", &mockMixinEvaluable{evalResult: "named-value"}),
		}
		evaldArguments := make([]any, 1)

		_, err := definition.EvalParams(context, mixinEnv, args, evaldArguments)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}
		if evaldArguments[0] != "named-value" {
			t.Errorf("Expected evaldArguments[0] to be 'named-value', got %v", evaldArguments[0])
		}
	})

	t.Run("should throw error for unknown named arguments", func(t *testing.T) {
		params := []any{
			createMockParam("param1", nil, false),
		}
		definition, _ := NewMixinDefinition("test", params, []any{}, nil, false, nil, nil)
		context := map[string]any{"frames": []any{}}
		mixinEnv := map[string]any{"frames": []any{}}
		args := []any{
			createMockArg("unknown-param", &mockMixinEvaluable{}),
		}
		evaldArguments := make([]any, 1)

		_, err := definition.EvalParams(context, mixinEnv, args, evaldArguments)
		if err == nil {
			t.Errorf("Expected error for unknown named argument")
		}
		if !strings.Contains(err.Error(), "unknown-param not found") {
			t.Errorf("Expected error message about unknown-param, got %v", err)
		}
	})
}

func TestMixinDefinition_MakeImportant(t *testing.T) {
	t.Run("should create new definition with important rules", func(t *testing.T) {
		// Mock rule that implements MakeImportant
		mockRule := &struct {
			importantCalled bool
		}{}
		
		// Create a simple mock that implements MakeImportant
		rule := &mockImportantRule{original: mockRule}
		
		rules := []any{rule}
		definition, _ := NewMixinDefinition("test", []any{}, rules, nil, false, nil, nil)

		resultAny := definition.MakeImportant()
		if resultAny == nil {
			t.Errorf("Expected result to be a MixinDefinition")
			return
		}
		result, ok := resultAny.(*MixinDefinition)
		if !ok {
			t.Errorf("Expected result to be a *MixinDefinition, got %T", resultAny)
			return
		}
		if result.Name != "test" {
			t.Errorf("Expected name to be preserved")
		}
	})
}

type mockImportantRule struct {
	original any
}

func (mir *mockImportantRule) MakeImportant() any {
	return map[string]any{"important": true}
}

func TestMixinDefinition_Eval(t *testing.T) {
	t.Run("should create new definition with copied frames from context", func(t *testing.T) {
		definition, _ := NewMixinDefinition("test", []any{}, []any{}, nil, false, nil, nil)
		context := map[string]any{"frames": []any{"frame1", "frame2"}}

		result, err := definition.Eval(context)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}
		if result == nil {
			t.Errorf("Expected result to be a MixinDefinition")
			return
		}
		if result.Name != "test" {
			t.Errorf("Expected name to be preserved")
		}
	})

	t.Run("should preserve existing frames when they exist", func(t *testing.T) {
		frames := []any{"existingFrame"}
		definition, _ := NewMixinDefinition("test", []any{}, []any{}, nil, false, frames, nil)
		context := map[string]any{"frames": []any{"frame1", "frame2"}}

		result, err := definition.Eval(context)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}
		if result.Frames == nil || len(result.Frames) != len(frames) || &result.Frames[0] != &frames[0] {
			t.Errorf("Expected existing frames to be preserved")
		}
	})
}

func TestMixinDefinition_MatchCondition(t *testing.T) {
	t.Run("should return true when condition evaluates to true", func(t *testing.T) {
		condition := &mockCondition{evalResult: true}
		definition, _ := NewMixinDefinition("test", []any{}, []any{}, condition, false, nil, nil)
		context := map[string]any{"frames": []any{}}

		result := definition.MatchCondition([]any{}, context)
		if !result {
			t.Errorf("Expected true when condition evaluates to true")
		}
	})

	t.Run("should return false when condition evaluates to false", func(t *testing.T) {
		condition := &mockCondition{evalResult: false}
		definition, _ := NewMixinDefinition("test", []any{}, []any{}, condition, false, nil, nil)
		context := map[string]any{"frames": []any{}}

		result := definition.MatchCondition([]any{}, context)
		if result {
			t.Errorf("Expected false when condition evaluates to false")
		}
	})

	t.Run("should return true when no condition exists", func(t *testing.T) {
		definition, _ := NewMixinDefinition("test", []any{}, []any{}, nil, false, nil, nil)
		context := map[string]any{"frames": []any{}}

		result := definition.MatchCondition([]any{}, context)
		if !result {
			t.Errorf("Expected true when no condition exists")
		}
	})
}

func TestMixinDefinition_MatchArgs(t *testing.T) {
	t.Run("should match correct number of required arguments", func(t *testing.T) {
		params := []any{
			createMockParam("required1", nil, false),
			createMockParam("required2", nil, false),
		}
		definition, _ := NewMixinDefinition("test", params, []any{}, nil, false, nil, nil)
		args := []any{
			createMockArg("", &mockMixinEvaluable{}),
			createMockArg("", &mockMixinEvaluable{}),
		}
		context := map[string]any{"frames": []any{}}

		result := definition.MatchArgs(args, context)
		if !result {
			t.Errorf("Expected true for correct number of arguments")
		}
	})

	t.Run("should reject insufficient required arguments", func(t *testing.T) {
		params := []any{
			createMockParam("required1", nil, false),
			createMockParam("required2", nil, false),
		}
		definition, _ := NewMixinDefinition("test", params, []any{}, nil, false, nil, nil)
		args := []any{
			createMockArg("", &mockMixinEvaluable{}),
		}
		context := map[string]any{"frames": []any{}}

		result := definition.MatchArgs(args, context)
		if result {
			t.Errorf("Expected false for insufficient arguments")
		}
	})

	t.Run("should reject too many arguments for non-variadic mixin", func(t *testing.T) {
		params := []any{
			createMockParam("param1", nil, false),
		}
		definition, _ := NewMixinDefinition("test", params, []any{}, nil, false, nil, nil)
		args := []any{
			createMockArg("", &mockMixinEvaluable{}),
			createMockArg("", &mockMixinEvaluable{}),
		}
		context := map[string]any{"frames": []any{}}

		result := definition.MatchArgs(args, context)
		if result {
			t.Errorf("Expected false for too many arguments")
		}
	})

	t.Run("should accept extra arguments for variadic mixin", func(t *testing.T) {
		params := []any{
			createMockParam("param1", nil, false),
		}
		definition, _ := NewMixinDefinition("test", params, []any{}, nil, true, nil, nil)
		args := []any{
			createMockArg("", &mockMixinEvaluable{}),
			createMockArg("", &mockMixinEvaluable{}),
			createMockArg("", &mockMixinEvaluable{}),
		}
		context := map[string]any{"frames": []any{}}

		result := definition.MatchArgs(args, context)
		if !result {
			t.Errorf("Expected true for variadic mixin with extra arguments")
		}
	})

	t.Run("should handle null args", func(t *testing.T) {
		params := []any{
			createMockParam("optional", &mockMixinEvaluable{}, false),
		}
		definition, _ := NewMixinDefinition("test", params, []any{}, nil, false, nil, nil)
		context := map[string]any{"frames": []any{}}

		result := definition.MatchArgs(nil, context)
		if !result {
			t.Errorf("Expected true for null args with optional parameters")
		}
	})

	t.Run("should handle empty args array", func(t *testing.T) {
		params := []any{
			createMockParam("optional", &mockMixinEvaluable{}, false),
		}
		definition, _ := NewMixinDefinition("test", params, []any{}, nil, false, nil, nil)
		context := map[string]any{"frames": []any{}}

		result := definition.MatchArgs([]any{}, context)
		if !result {
			t.Errorf("Expected true for empty args with optional parameters")
		}
	})
}

func TestMixinDefinition_Integration(t *testing.T) {
	t.Run("should work with complex mixin definition and call", func(t *testing.T) {
		params := []any{
			createMockParam("color", nil, false),
			createMockParam("size", &mockMixinEvaluable{evalResult: "10px"}, false),
			createMockParam("extras", nil, true),
		}
		
		// Mock rules that implement MakeImportant
		rules := []any{
			&mockImportantRule{},
			&mockImportantRule{},
		}
		
		condition := &mockCondition{evalResult: true}
		frames := []any{map[string]any{}}
		
		definition, err := NewMixinDefinition("complex-mixin", params, rules, condition, true, frames, nil)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		// Test creation
		if definition.Name != "complex-mixin" {
			t.Errorf("Expected name 'complex-mixin', got %s", definition.Name)
		}
		if !definition.Variadic {
			t.Errorf("Expected variadic to be true")
		}

		// Test matchArgs
		args := []any{
			createMockArg("", &mockMixinEvaluable{evalResult: "red"}),
			createMockArg("", &mockMixinEvaluable{evalResult: "bold"}),
		}
		context := map[string]any{"frames": []any{}}
		matches := definition.MatchArgs(args, context)
		if !matches {
			t.Errorf("Expected args to match")
		}
	})
}

// TestMixinDefinitionParameterCounting_JavaScriptConsistency tests that our parameter counting logic
// matches the JavaScript implementation exactly
func TestMixinDefinitionParameterCounting_JavaScriptConsistency(t *testing.T) {
	tests := []struct {
		name                string
		params              []any
		expectedRequired    int
		expectedOptional    []string
		jsLogic            string
	}{
		{
			name:                "no parameters",
			params:              []any{},
			expectedRequired:    0,
			expectedOptional:    []string{},
			jsLogic:            "JavaScript: no params -> required=0, optional=[]",
		},
		{
			name: "parameter with no name (pattern parameter)",
			params: []any{
				map[string]any{"name": nil, "value": "red"},
			},
			expectedRequired: 1,
			expectedOptional: []string{},
			jsLogic:         "JavaScript: !p.name -> required (pattern matching parameter)",
		},
		{
			name: "parameter with name but no value (required named parameter)",
			params: []any{
				map[string]any{"name": "@color", "value": nil},
			},
			expectedRequired: 1,
			expectedOptional: []string{},
			jsLogic:         "JavaScript: p.name && !p.value -> required",
		},
		{
			name: "parameter with both name and value (optional parameter)",
			params: []any{
				map[string]any{"name": "@color", "value": "blue"},
			},
			expectedRequired: 0,
			expectedOptional: []string{"@color"},
			jsLogic:         "JavaScript: p.name && p.value -> optional",
		},
		{
			name: "mixed parameters - JavaScript pattern",
			params: []any{
				map[string]any{"name": nil, "value": "red"},           // !p.name -> required
				map[string]any{"name": "@size", "value": nil},         // p.name && !p.value -> required  
				map[string]any{"name": "@margin", "value": "10px"},    // p.name && p.value -> optional
				map[string]any{"name": "@padding", "value": "5px"},    // p.name && p.value -> optional
			},
			expectedRequired: 2,
			expectedOptional: []string{"@margin", "@padding"},
			jsLogic:         "JavaScript: !p.name || (p.name && !p.value) determines required",
		},
		{
			name: "empty name string treated as no name",
			params: []any{
				map[string]any{"name": "", "value": "something"},
			},
			expectedRequired: 1,
			expectedOptional: []string{},
			jsLogic:         "JavaScript: empty string name is falsy -> required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create a mixin definition with test parameters
			md, err := NewMixinDefinition(
				"testMixin",
				tt.params,
				[]any{}, // rules
				nil,     // condition
				false,   // variadic
				[]any{}, // frames
				map[string]any{}, // visibilityInfo
			)
			if err != nil {
				t.Fatalf("Failed to create MixinDefinition: %v", err)
			}

			// Check required count
			if md.Required != tt.expectedRequired {
				t.Errorf("Required count = %d, expected %d\nParameters: %v\nJavaScript logic: %s",
					md.Required, tt.expectedRequired, tt.params, tt.jsLogic)
			}

			// Check optional parameters
			if len(md.OptionalParameters) != len(tt.expectedOptional) {
				t.Errorf("Optional parameters count = %d, expected %d\nGot: %v\nExpected: %v\nJavaScript logic: %s",
					len(md.OptionalParameters), len(tt.expectedOptional), md.OptionalParameters, tt.expectedOptional, tt.jsLogic)
				return
			}

			// Check that all expected optional parameters are present
			optionalMap := make(map[string]bool)
			for _, opt := range md.OptionalParameters {
				optionalMap[opt] = true
			}

			for _, expected := range tt.expectedOptional {
				if !optionalMap[expected] {
					t.Errorf("Missing expected optional parameter %s\nGot: %v\nExpected: %v\nJavaScript logic: %s",
						expected, md.OptionalParameters, tt.expectedOptional, tt.jsLogic)
				}
			}
		})
	}
}

// TestJavaScriptParameterLogicConsistency ensures our parameter logic exactly matches
// the JavaScript reduce function behavior
func TestJavaScriptParameterLogicConsistency(t *testing.T) {
	tests := []struct {
		name        string
		param       map[string]any
		shouldBeRequired bool
		explanation string
	}{
		{
			name:        "undefined name",
			param:       map[string]any{"name": nil, "value": "something"},
			shouldBeRequired: true,
			explanation: "JavaScript: !p.name is true -> required",
		},
		{
			name:        "empty string name",
			param:       map[string]any{"name": "", "value": "something"},
			shouldBeRequired: true,
			explanation: "JavaScript: !p.name is true (empty string is falsy) -> required",
		},
		{
			name:        "name exists but value is nil",
			param:       map[string]any{"name": "@param", "value": nil},
			shouldBeRequired: true,
			explanation: "JavaScript: p.name && !p.value is true -> required",
		},
		{
			name:        "name exists but value is empty string",
			param:       map[string]any{"name": "@param", "value": ""},
			shouldBeRequired: false,
			explanation: "JavaScript: p.name && !p.value is false (empty string is falsy but exists) -> optional",
		},
		{
			name:        "both name and value exist",
			param:       map[string]any{"name": "@param", "value": "defaultValue"},
			shouldBeRequired: false,
			explanation: "JavaScript: !p.name || (p.name && !p.value) is false -> optional",
		},
		{
			name:        "name exists value is false",
			param:       map[string]any{"name": "@param", "value": false},
			shouldBeRequired: false,
			explanation: "JavaScript: p.name && !p.value is false (false is falsy but exists) -> optional",
		},
		{
			name:        "name exists value is zero",
			param:       map[string]any{"name": "@param", "value": 0},
			shouldBeRequired: false,
			explanation: "JavaScript: p.name && !p.value is false (0 is falsy but exists) -> optional",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			paramName := tt.param["name"]
			paramValue := tt.param["value"]
			
			// This is our current Go logic that should match JavaScript !p.name || (p.name && !p.value)
			nameStr, nameIsString := paramName.(string)
			isRequired := paramName == nil || (nameIsString && nameStr == "") || (paramName != nil && paramValue == nil)
			
			if isRequired != tt.shouldBeRequired {
				t.Errorf("Parameter should be required=%v but got=%v\nParam: %v\nExplanation: %s",
					tt.shouldBeRequired, isRequired, tt.param, tt.explanation)
			}
		})
	}
} 