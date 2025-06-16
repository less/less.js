package go_parser

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
type mockEvaluable struct {
	evalResult any
	evalError  error
}

func (me *mockEvaluable) Eval(context any) any {
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
			createMockParam("param2", &mockEvaluable{evalResult: "default"}, false),
			createMockParam("", &mockEvaluable{evalResult: "pattern"}, false),
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
			createMockParam("optional1", &mockEvaluable{}, false),
			createMockParam("optional2", &mockEvaluable{}, false),
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
			createMockArg("", &mockEvaluable{evalResult: "value1"}),
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
			createMockArg("param1", &mockEvaluable{evalResult: "named-value"}),
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
			createMockArg("unknown-param", &mockEvaluable{}),
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

		result := definition.MakeImportant()
		if result == nil {
			t.Errorf("Expected result to be a MixinDefinition")
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
			createMockArg("", &mockEvaluable{}),
			createMockArg("", &mockEvaluable{}),
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
			createMockArg("", &mockEvaluable{}),
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
			createMockArg("", &mockEvaluable{}),
			createMockArg("", &mockEvaluable{}),
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
			createMockArg("", &mockEvaluable{}),
			createMockArg("", &mockEvaluable{}),
			createMockArg("", &mockEvaluable{}),
		}
		context := map[string]any{"frames": []any{}}

		result := definition.MatchArgs(args, context)
		if !result {
			t.Errorf("Expected true for variadic mixin with extra arguments")
		}
	})

	t.Run("should handle null args", func(t *testing.T) {
		params := []any{
			createMockParam("optional", &mockEvaluable{}, false),
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
			createMockParam("optional", &mockEvaluable{}, false),
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
			createMockParam("size", &mockEvaluable{evalResult: "10px"}, false),
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
			createMockArg("", &mockEvaluable{evalResult: "red"}),
			createMockArg("", &mockEvaluable{evalResult: "bold"}),
		}
		context := map[string]any{"frames": []any{}}
		matches := definition.MatchArgs(args, context)
		if !matches {
			t.Errorf("Expected args to match")
		}
	})
} 