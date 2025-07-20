package less_go

import (
	"strings"
	"testing"
)

// jsTestFrame implements Frame interface for testing
type jsTestFrame struct {
	vars map[string]map[string]any
}

func (m *jsTestFrame) Variable(name string) map[string]any {
	return m.vars[name]
}

func (m *jsTestFrame) Property(name string) []any {
	// Return empty array for now - tests don't use properties
	return nil
}

func (m *jsTestFrame) Variables() map[string]any {
	// Convert map[string]map[string]any to map[string]any
	result := make(map[string]any)
	for k, v := range m.vars {
		result[k] = v
	}
	return result
}

// jsTestContext implements a minimal context for testing
type jsTestContext struct {
	javascriptEnabled bool
	frames            []ParserFrame
	importantScope    []map[string]bool
	inCalc            bool
	mathOn            bool
}

func (m *jsTestContext) IsJavaScriptEnabled() bool {
	return m.javascriptEnabled
}

func (m *jsTestContext) GetFrames() []ParserFrame {
	return m.frames
}

func (m *jsTestContext) GetImportantScope() []map[string]bool {
	return m.importantScope
}

func (m *jsTestContext) IsInCalc() bool {
	return m.inCalc
}

func (m *jsTestContext) IsMathOn() bool {
	return m.mathOn
}

func (m *jsTestContext) SetMathOn(on bool) {
	m.mathOn = on
}

func (m *jsTestContext) EnterCalc() {
	m.inCalc = true
}

func (m *jsTestContext) ExitCalc() {
	m.inCalc = false
}

func (m *jsTestContext) GetDefaultFunc() *DefaultFunc {
	return nil
}

// jsTestEvalValue implements the Eval method returning both a value and error
type jsTestEvalValue struct {
	value any
	err   error
}

func (m *jsTestEvalValue) Eval(ctx EvalContext) (any, error) {
	return m.value, m.err
}

// jsTestCSSable is a mock implementation for values with ToCSS
type jsTestCSSable struct {
	css string
}

func (m *jsTestCSSable) ToCSS() string {
	return m.css
}

func TestJsEvalNode(t *testing.T) {
	var jsEvalNode *JsEvalNode
	var mockCtx *jsTestContext

	setup := func() {
		jsEvalNode = NewJsEvalNode()
		
		// Create mock values for variables
		colorValue := &jsTestEvalValue{
			value: map[string]any{
				"value": &jsTestCSSable{css: "#ff0000"},
			},
		}
		
		sizeValue := &jsTestEvalValue{
			value: map[string]any{
				"value": &jsTestCSSable{css: "16px"},
			},
		}
		
		// Create a basic mock context
		mockCtx = &jsTestContext{
			javascriptEnabled: true,
			frames: []ParserFrame{
				&jsTestFrame{
					vars: map[string]map[string]any{
						"@color": {
							"value": colorValue,
						},
						"@size": {
							"value": sizeValue,
						},
					},
				},
			},
			importantScope: []map[string]bool{
				{"important": false},
			},
		}
	}

	t.Run("evaluateJavaScript", func(t *testing.T) {
		t.Run("throws error when JavaScript is not enabled", func(t *testing.T) {
			setup()
			mockCtx.javascriptEnabled = false
			jsEvalNode.SetFileInfo(map[string]any{"filename": "test.less"})
			
			_, err := jsEvalNode.EvaluateJavaScript("1 + 1", mockCtx)
			if err == nil {
				t.Error("Expected error when JavaScript is not enabled")
			}
			if !strings.Contains(err.Error(), "inline JavaScript is not enabled") {
				t.Errorf("Unexpected error message: %s", err.Error())
			}
		})

		t.Run("returns not supported error when JavaScript is enabled", func(t *testing.T) {
			setup()
			jsEvalNode.SetFileInfo(map[string]any{"filename": "test.less"})
			
			_, err := jsEvalNode.EvaluateJavaScript("1 + 1", mockCtx)
			if err == nil {
				t.Error("Expected error indicating JS evaluation is not supported")
			}
			if !strings.Contains(err.Error(), "JavaScript evaluation is not supported") {
				t.Errorf("Expected error about JS evaluation not supported, got: %s", err.Error())
			}
		})

		t.Run("interpolates variables in error message", func(t *testing.T) {
			setup()
			jsEvalNode.SetFileInfo(map[string]any{"filename": "test.less"})
			
			_, err := jsEvalNode.EvaluateJavaScript("@{color} + @{size}", mockCtx)
			if err == nil {
				t.Error("Expected error indicating JS evaluation is not supported")
			}
			errMsg := err.Error()
			if !strings.Contains(errMsg, "#ff0000") || !strings.Contains(errMsg, "16px") {
				t.Errorf("Expected error message to contain interpolated values, got: %s", errMsg)
			}
		})
	})

	t.Run("jsify", func(t *testing.T) {
		t.Run("converts single value to CSS string", func(t *testing.T) {
			setup()
			obj := &jsTestCSSable{css: "test"}
			result := jsEvalNode.jsify(obj)
			if result != "test" {
				t.Errorf("Expected 'test', got '%s'", result)
			}
		})

		t.Run("converts array values to CSS array string", func(t *testing.T) {
			setup()
			obj := []any{
				&jsTestCSSable{css: "red"},
				&jsTestCSSable{css: "blue"},
			}
			result := jsEvalNode.jsify(obj)
			if result != "[red, blue]" {
				t.Errorf("Expected '[red, blue]', got '%s'", result)
			}
		})

		t.Run("handles nil values", func(t *testing.T) {
			setup()
			result := jsEvalNode.jsify(nil)
			if result != "null" {
				t.Errorf("Expected 'null', got '%s'", result)
			}
		})

		t.Run("extracts value from result object", func(t *testing.T) {
			setup()
			obj := map[string]any{
				"value": &jsTestCSSable{css: "extracted"},
			}
			result := jsEvalNode.jsify(obj)
			if result != "extracted" {
				t.Errorf("Expected 'extracted', got '%s'", result)
			}
		})
	})

	t.Run("node integration", func(t *testing.T) {
		t.Run("inherits from Node", func(t *testing.T) {
			jsEvalNode := NewJsEvalNode()
			if jsEvalNode.Node == nil {
				t.Error("Expected JsEvalNode to inherit from Node")
			}
		})

		t.Run("has correct type", func(t *testing.T) {
			jsEvalNode := NewJsEvalNode()
			if jsEvalNode.GetType() != "JsEvalNode" {
				t.Errorf("Expected type 'JsEvalNode', got '%s'", jsEvalNode.GetType())
			}
		})
	})
} 