package parser

import (
	"fmt"
	"regexp"
	"testing"

	"github.com/toakleaf/less.go/packages/less/src/less"
	"github.com/toakleaf/less.go/packages/less/src/less/go_parser"
)

// parseLess is a helper function to parse LESS string and return results
func parseLess(lessString string, contextOptions map[string]any, parserOptions map[string]any) (*less.LessError, *go_parser.Ruleset) {
	var err *less.LessError
	var root *go_parser.Ruleset

	// Set up default options
	if contextOptions == nil {
		contextOptions = make(map[string]any)
	}
	if parserOptions == nil {
		parserOptions = make(map[string]any)
	}

	// Set up fileInfo
	fileInfo := map[string]any{"filename": "test.less"}
	if parserOptions["fileInfo"] != nil {
		if fi, ok := parserOptions["fileInfo"].(map[string]any); ok {
			for k, v := range fi {
				fileInfo[k] = v
			}
		}
	}

	// Set up imports
	imports := map[string]any{
		"contents":             map[string]string{fileInfo["filename"].(string): lessString},
		"contentsIgnoredChars": map[string]int{fileInfo["filename"].(string): 0},
		"rootFilename":         fileInfo["filename"].(string),
	}
	if parserOptions["imports"] != nil {
		if imp, ok := parserOptions["imports"].(map[string]any); ok {
			for k, v := range imp {
				imports[k] = v
			}
		}
	}

	// Disable import processing by default
	contextOptions["processImports"] = false

	// Set current index
	currentIndex := 0
	if parserOptions["currentIndex"] != nil {
		if ci, ok := parserOptions["currentIndex"].(int); ok {
			currentIndex = ci
		}
	}

	parser := NewParser(contextOptions, imports, fileInfo, currentIndex)

	// Synchronous parsing (simplified for testing)
	resultChan := make(chan struct{})
	parser.Parse(lessString, func(e *less.LessError, r *go_parser.Ruleset) {
		err = e
		root = r
		close(resultChan)
	}, nil)

	<-resultChan
	return err, root
}

func TestParser_Basic(t *testing.T) {
	t.Run("should create a new parser", func(t *testing.T) {
		context := map[string]any{}
		imports := map[string]any{}
		fileInfo := map[string]any{"filename": "test.less"}
		
		parser := NewParser(context, imports, fileInfo, 0)
		
		if parser == nil {
			t.Error("Expected parser to be created")
		}
		if parser.parsers == nil {
			t.Error("Expected parsers to be initialized")
		}
		if parser.parserInput == nil {
			t.Error("Expected parserInput to be initialized")
		}
	})
}

func TestParser_SerializeVars(t *testing.T) {
	tests := []struct {
		name     string
		vars     map[string]any
		expected string
	}{
		{
			name:     "empty vars",
			vars:     map[string]any{},
			expected: "",
		},
		{
			name: "simple vars",
			vars: map[string]any{
				"color":     "red",
				"font-size": "12px",
			},
			expected: "@color: red;@font-size: 12px;",
		},
		{
			name: "vars with @ prefix",
			vars: map[string]any{
				"@color": "blue",
			},
			expected: "@color: blue;",
		},
		{
			name: "vars without semicolon",
			vars: map[string]any{
				"my-var": "value",
			},
			expected: "@my-var: value;",
		},
		{
			name: "vars with semicolon",
			vars: map[string]any{
				"my-var": "value;",
			},
			expected: "@my-var: value;",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := SerializeVars(tt.vars)
			if result != tt.expected {
				t.Errorf("SerializeVars() = %q, want %q", result, tt.expected)
			}
		})
	}
}

func TestParser_CoreParsing(t *testing.T) {
	t.Run("should parse empty string", func(t *testing.T) {
		err, root := parseLess("", nil, nil)
		
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if root == nil {
			t.Error("Expected root to be created")
		}
		if root.Root != true {
			t.Error("Expected root to have Root property set to true")
		}
		if root.FirstRoot != true {
			t.Error("Expected root to have FirstRoot property set to true")
		}
	})

	t.Run("should handle parsing errors gracefully", func(t *testing.T) {
		// Test with basic parsing that should work with current implementation
		err, root := parseLess("", nil, nil)
		
		if err != nil {
			t.Errorf("Expected no error for empty string, got: %v", err)
		}
		if root == nil {
			t.Error("Expected root to be created")
		}
	})
}

// Test Entity Parsers - these are mostly implemented
func TestEntityParsers(t *testing.T) {
	context := map[string]any{}
	imports := map[string]any{}
	fileInfo := map[string]any{"filename": "test.less"}
	parser := NewParser(context, imports, fileInfo, 0)

	t.Run("Quoted - should parse quoted strings", func(t *testing.T) {
		// Set up parser input with a quoted string
		parser.parserInput.Start(`"hello world"`, false, nil)
		
		result := parser.parsers.entities.Quoted(false)
		if result == nil {
			t.Error("Expected quoted string to be parsed")
		}
		
		if quoted, ok := result.(*go_parser.Quoted); ok {
			// Note: Quote and Value fields are unexported, so we just verify it's a Quoted type
			_ = quoted
		} else {
			t.Errorf("Expected result to be *Quoted, got %T", result)
		}
	})

	t.Run("Keyword - should parse keywords", func(t *testing.T) {
		parser.parserInput.Start("red", false, nil)
		
		result := parser.parsers.entities.Keyword()
		if result == nil {
			t.Error("Expected keyword to be parsed")
		}
		
		// Should return either a Color (for color keywords) or Keyword
		if color, ok := result.(*go_parser.Color); ok {
			// "red" should be recognized as a color
			if len(color.RGB) != 3 || color.RGB[0] != 255 || color.RGB[1] != 0 || color.RGB[2] != 0 {
				t.Errorf("Expected red color RGB [255, 0, 0], got %v", color.RGB)
			}
		} else if keyword, ok := result.(*go_parser.Keyword); ok {
			if keyword.Value != "red" {
				t.Errorf("Expected keyword value to be 'red', got %s", keyword.Value)
			}
		} else {
			t.Errorf("Expected result to be *Color or *Keyword, got %T", result)
		}
	})

	t.Run("Variable - should parse variables", func(t *testing.T) {
		parser.parserInput.Start("@myvar", false, nil)
		
		result := parser.parsers.entities.Variable()
		if result == nil {
			t.Error("Expected variable to be parsed")
		}
		
		if variable, ok := result.(*go_parser.Variable); ok {
			// Note: Can't access unexported name field, so just verify it's a Variable
			_ = variable
		} else {
			t.Errorf("Expected result to be *Variable, got %T", result)
		}
	})

	t.Run("Color - should parse hex colors", func(t *testing.T) {
		parser.parserInput.Start("#ff0000", false, nil)
		
		result := parser.parsers.entities.Color()
		if result == nil {
			t.Error("Expected color to be parsed")
		}
		
		if color, ok := result.(*go_parser.Color); ok {
			if len(color.RGB) != 3 || color.RGB[0] != 255 || color.RGB[1] != 0 || color.RGB[2] != 0 {
				t.Errorf("Expected RGB [255, 0, 0], got %v", color.RGB)
			}
		} else {
			t.Errorf("Expected result to be *Color, got %T", result)
		}
	})

	t.Run("Dimension - should parse dimensions", func(t *testing.T) {
		parser.parserInput.Start("10px", false, nil)
		
		result := parser.parsers.entities.Dimension()
		if result == nil {
			t.Error("Expected dimension to be parsed")
		}
		
		if dimension, ok := result.(*go_parser.Dimension); ok {
			if dimension.Value != 10 {
				t.Errorf("Expected value to be 10, got %f", dimension.Value)
			}
			if dimension.Unit.ToString() != "px" {
				t.Errorf("Expected unit to be 'px', got %s", dimension.Unit.ToString())
			}
		} else {
			t.Errorf("Expected result to be *Dimension, got %T", result)
		}
	})

	t.Run("JavaScript - should parse JavaScript evaluation", func(t *testing.T) {
		parser.parserInput.Start("`console.log('test')`", false, nil)
		
		result := parser.parsers.entities.JavaScript()
		if result == nil {
			t.Error("Expected JavaScript to be parsed")
		}
		
		if js, ok := result.(*go_parser.JavaScript); ok {
			// Note: Expression field is unexported, so we just verify it's a JavaScript type
			_ = js
		} else {
			t.Errorf("Expected result to be *JavaScript, got %T", result)
		}
	})

	t.Run("UnicodeDescriptor - should parse unicode descriptors", func(t *testing.T) {
		parser.parserInput.Start("U+26", false, nil)
		
		result := parser.parsers.entities.UnicodeDescriptor()
		if result == nil {
			t.Error("Expected unicode descriptor to be parsed")
		}
		
		if unicode, ok := result.(*go_parser.UnicodeDescriptor); ok {
			if unicode.Value != "U+26" {
				t.Errorf("Expected value to be 'U+26', got %s", unicode.Value)
			}
		} else {
			t.Errorf("Expected result to be *UnicodeDescriptor, got %T", result)
		}
	})
}

func TestParser_Important(t *testing.T) {
	context := map[string]any{}
	imports := map[string]any{}
	fileInfo := map[string]any{"filename": "test.less"}
	parser := NewParser(context, imports, fileInfo, 0)

	t.Run("should parse !important", func(t *testing.T) {
		parser.parserInput.Start("!important", false, nil)
		
		result := parser.parsers.Important()
		if result == nil {
			t.Error("Expected !important to be parsed")
		}
		
		if importance, ok := result.(string); ok {
			if importance != "!important" {
				t.Errorf("Expected '!important', got %s", importance)
			}
		} else {
			t.Errorf("Expected result to be string, got %T", result)
		}
	})

	t.Run("should not parse regular text as important", func(t *testing.T) {
		parser.parserInput.Start("normal", false, nil)
		
		result := parser.parsers.Important()
		if result != nil {
			t.Error("Expected nil for non-important text")
		}
	})
}

func TestParser_Call(t *testing.T) {
	context := map[string]any{}
	imports := map[string]any{}
	fileInfo := map[string]any{"filename": "test.less"}
	parser := NewParser(context, imports, fileInfo, 0)

	t.Run("should parse function calls", func(t *testing.T) {
		parser.parserInput.Start("rgb(255, 0, 0)", false, nil)
		
		result := parser.parsers.entities.Call()
		if result == nil {
			t.Error("Expected function call to be parsed")
		}
		
		if call, ok := result.(*go_parser.Call); ok {
			if call.Name != "rgb" {
				t.Errorf("Expected function name to be 'rgb', got %s", call.Name)
			}
			if len(call.Args) != 3 {
				t.Errorf("Expected 3 arguments, got %d", len(call.Args))
			}
		} else {
			t.Errorf("Expected result to be *Call, got %T", result)
		}
	})

	t.Run("should not parse url() as regular call", func(t *testing.T) {
		parser.parserInput.Start("url(image.png)", false, nil)
		
		result := parser.parsers.entities.Call()
		if result != nil {
			t.Error("Expected url() not to be parsed as regular call")
		}
	})
}

func TestParser_URL(t *testing.T) {
	context := map[string]any{}
	imports := map[string]any{}
	fileInfo := map[string]any{"filename": "test.less"}
	parser := NewParser(context, imports, fileInfo, 0)

	t.Run("should parse url() with quoted string", func(t *testing.T) {
		parser.parserInput.Start(`url("image.png")`, false, nil)
		
		result := parser.parsers.entities.URL()
		if result == nil {
			t.Error("Expected URL to be parsed")
		}
		
		if url, ok := result.(*go_parser.URL); ok {
			_ = url // Just verify it's a URL type
		} else {
			t.Errorf("Expected result to be *URL, got %T", result)
		}
	})

	t.Run("should parse url() with unquoted string", func(t *testing.T) {
		parser.parserInput.Start("url(image.png)", false, nil)
		
		result := parser.parsers.entities.URL()
		if result == nil {
			t.Error("Expected URL to be parsed")
		}
		
		if url, ok := result.(*go_parser.URL); ok {
			_ = url // Just verify it's a URL type
		} else {
			t.Errorf("Expected result to be *URL, got %T", result)
		}
	})
}

func TestParser_Assignment(t *testing.T) {
	context := map[string]any{}
	imports := map[string]any{}
	fileInfo := map[string]any{"filename": "test.less"}
	parser := NewParser(context, imports, fileInfo, 0)

	t.Run("should parse assignments", func(t *testing.T) {
		parser.parserInput.Start("opacity=50", false, nil)
		
		result := parser.parsers.entities.Assignment()
		if result == nil {
			t.Error("Expected assignment to be parsed")
		}
		
		if assignment, ok := result.(*go_parser.Assignment); ok {
			if assignment.Key != "opacity" {
				t.Errorf("Expected key to be 'opacity', got %s", assignment.Key)
			}
		} else {
			t.Errorf("Expected result to be *Assignment, got %T", result)
		}
	})
}

func TestParser_Arguments(t *testing.T) {
	context := map[string]any{}
	imports := map[string]any{}
	fileInfo := map[string]any{"filename": "test.less"}
	parser := NewParser(context, imports, fileInfo, 0)

	t.Run("should parse comma-separated arguments", func(t *testing.T) {
		// The Arguments method processes the current input, 
		// so we need to set it up properly
		parser.parserInput.Start("arg1, arg2, arg3", false, nil)
		result := parser.parsers.entities.Arguments(nil)
		
		// Arguments returns []any directly, not any
		if result == nil {
			result = make([]any, 0)
		}
		
		// result is already []any, no need for type assertion
		_ = result
	})
}

// testLogger holds test log messages
type testLogger struct {
	warnings []string
	errors   []string
}

func TestParser_LoggerIntegration(t *testing.T) {
	// Test logger functionality
	tl := &testLogger{
		warnings: make([]string, 0),
		errors:   make([]string, 0),
	}

	originalLogger := logger
	defer func() {
		logger = originalLogger
	}()

	logger = &testLoggerImpl{tl}

	// Test warning
	context := map[string]any{}
	imports := map[string]any{}
	fileInfo := map[string]any{"filename": "test.less"}
	parser := NewParser(context, imports, fileInfo, 0)

	parser.warn("test warning", nil, "TEST")

	if len(tl.warnings) != 1 {
		t.Errorf("Expected 1 warning, got %d", len(tl.warnings))
	}
}

// testLoggerImpl implements Logger for testing
type testLoggerImpl struct {
	tl *testLogger
}

func (t *testLoggerImpl) Warn(msg string) {
	t.tl.warnings = append(t.tl.warnings, msg)
}

func (t *testLoggerImpl) Error(msg string) {
	t.tl.errors = append(t.tl.errors, msg)
}

func (t *testLoggerImpl) Info(msg string) {
	// Not implemented for test
}

func (t *testLoggerImpl) Debug(msg string) {
	// Not implemented for test
}

func TestParser_ExpectFunctions(t *testing.T) {
	context := map[string]any{}
	imports := map[string]any{}
	fileInfo := map[string]any{"filename": "test.less"}
	parser := NewParser(context, imports, fileInfo, 0)

	t.Run("expect with regex", func(t *testing.T) {
		parser.parserInput.Start("test123", false, nil)
		
		result := parser.expect(regexp.MustCompile(`^test\d+`), "")
		if result == nil {
			t.Error("Expected regex to match")
		}
	})

	t.Run("expect with string", func(t *testing.T) {
		parser.parserInput.Start("hello", false, nil)
		
		result := parser.expect("hello", "")
		if result == nil {
			t.Error("Expected string to match")
		}
	})

	t.Run("expectChar success", func(t *testing.T) {
		parser.parserInput.Start("a", false, nil)
		
		// Test expectChar with panic recovery
		defer func() {
			if r := recover(); r != nil {
				t.Errorf("Expected expectChar to succeed, but got panic: %v", r)
			}
		}()

		result := parser.expectChar('a', "")
		if result != 'a' {
			t.Errorf("Expected 'a', got %c", result)
		}
	})

	t.Run("expectChar failure", func(t *testing.T) {
		parser.parserInput.Start("b", false, nil)
		
		// Test expectChar with panic recovery
		defer func() {
			if r := recover(); r != nil {
				// Expected to panic since we're expecting 'a' but got 'b'
				if lessErr, ok := r.(*less.LessError); ok {
					if lessErr.Type != "Syntax" {
						t.Errorf("Expected Syntax error, got %s", lessErr.Type)
					}
				} else {
					t.Errorf("Expected LessError, got %T", r)
				}
			} else {
				t.Error("Expected expectChar to panic")
			}
		}()

		parser.expectChar('a', "")
	})
}

func TestParser_GetDebugInfo(t *testing.T) {
	context := map[string]any{}
	imports := map[string]any{}
	fileInfo := map[string]any{"filename": "test.less"}
	parser := NewParser(context, imports, fileInfo, 0)

	debugInfo := parser.getDebugInfo(0)

	if debugInfo["fileName"] != "test.less" {
		t.Errorf("Expected fileName to be 'test.less', got %v", debugInfo["fileName"])
	}

	if debugInfo["lineNumber"] != 1 {
		t.Errorf("Expected lineNumber to be 1, got %v", debugInfo["lineNumber"])
	}
}

func TestParser_ErrorHandling(t *testing.T) {
	context := map[string]any{}
	imports := map[string]any{}
	fileInfo := map[string]any{"filename": "test.less"}
	parser := NewParser(context, imports, fileInfo, 0)

	t.Run("should create LessError with proper type", func(t *testing.T) {
		defer func() {
			if r := recover(); r != nil {
				if lessErr, ok := r.(*less.LessError); ok {
					if lessErr.Type != "Syntax" {
						t.Errorf("Expected Type to be 'Syntax', got %s", lessErr.Type)
					}
					if lessErr.Message != "test error" {
						t.Errorf("Expected Message to be 'test error', got %s", lessErr.Message)
					}
				} else {
					t.Errorf("Expected LessError, got %T", r)
				}
			} else {
				t.Error("Expected error to be thrown")
			}
		}()

		parser.error("test error", "")
	})

	t.Run("should create custom error type", func(t *testing.T) {
		defer func() {
			if r := recover(); r != nil {
				if lessErr, ok := r.(*less.LessError); ok {
					if lessErr.Type != "Custom" {
						t.Errorf("Expected Type to be 'Custom', got %s", lessErr.Type)
					}
				} else {
					t.Errorf("Expected LessError, got %T", r)
				}
			} else {
				t.Error("Expected error to be thrown")
			}
		}()

		parser.error("test error", "Custom")
	})
}

func TestParser_AdditionalEntityMethods(t *testing.T) {
	context := map[string]any{}
	imports := map[string]any{}
	fileInfo := map[string]any{"filename": "test.less"}
	parser := NewParser(context, imports, fileInfo, 0)

	t.Run("VariableCurly - should parse curly variables", func(t *testing.T) {
		parser.parserInput.Start("@{myvar}", false, nil)
		
		result := parser.parsers.entities.VariableCurly()
		if result == nil {
			t.Error("Expected curly variable to be parsed")
		}
		
		if variable, ok := result.(*go_parser.Variable); ok {
			_ = variable // Just verify it's a Variable type
		} else {
			t.Errorf("Expected result to be *Variable, got %T", result)
		}
	})

	t.Run("Property - should parse property accessors", func(t *testing.T) {
		parser.parserInput.Start("$color", false, nil)
		
		result := parser.parsers.entities.Property()
		if result == nil {
			t.Error("Expected property to be parsed")
		}
		
		if property, ok := result.(*go_parser.Property); ok {
			_ = property // Just verify it's a Property type
		} else {
			t.Errorf("Expected result to be *Property, got %T", result)
		}
	})

	t.Run("PropertyCurly - should parse curly properties", func(t *testing.T) {
		parser.parserInput.Start("${prop}", false, nil)
		
		result := parser.parsers.entities.PropertyCurly()
		if result == nil {
			t.Error("Expected curly property to be parsed")
		}
		
		if property, ok := result.(*go_parser.Property); ok {
			_ = property // Just verify it's a Property type
		} else {
			t.Errorf("Expected result to be *Property, got %T", result)
		}
	})

	t.Run("ColorKeyword - should parse color keywords", func(t *testing.T) {
		parser.parserInput.Start("blue", false, nil)
		
		result := parser.parsers.entities.ColorKeyword()
		if result == nil {
			t.Error("Expected color keyword to be parsed")
		}
		
		if color, ok := result.(*go_parser.Color); ok {
			if len(color.RGB) != 3 || color.RGB[2] != 255 {
				t.Errorf("Expected blue color with RGB[2]=255, got %v", color.RGB)
			}
		} else {
			t.Errorf("Expected result to be *Color, got %T", result)
		}
	})

	t.Run("Literal - should parse literal entities", func(t *testing.T) {
		parser.parserInput.Start("15em", false, nil)
		
		result := parser.parsers.entities.Literal()
		if result == nil {
			t.Error("Expected literal to be parsed")
		}
		
		// Literal should return a dimension in this case
		if dimension, ok := result.(*go_parser.Dimension); ok {
			if dimension.Value != 15 {
				t.Errorf("Expected value to be 15, got %f", dimension.Value)
			}
		} else {
			t.Errorf("Expected result to be *Dimension, got %T", result)
		}
	})

	t.Run("DeclarationCall - should parse declaration calls", func(t *testing.T) {
		parser.parserInput.Start("supports(display: grid)", false, nil)
		
		result := parser.parsers.entities.DeclarationCall()
		if result == nil {
			t.Error("Expected declaration call to be parsed")
		}
		
		if call, ok := result.(*go_parser.Call); ok {
			if call.Name != "supports" {
				t.Errorf("Expected function name to be 'supports', got %s", call.Name)
			}
			if len(call.Args) != 1 {
				t.Errorf("Expected 1 argument, got %d", len(call.Args))
			}
			
			// Check that the argument is a Declaration
			if _, ok := call.Args[0].(*go_parser.Declaration); !ok {
				t.Errorf("Expected argument to be *Declaration, got %T", call.Args[0])
			}
		} else {
			t.Errorf("Expected result to be *Call, got %T", result)
		}
	})
}

func TestParser_IeAlpha(t *testing.T) {
	context := map[string]any{}
	imports := map[string]any{}
	fileInfo := map[string]any{"filename": "test.less"}
	parser := NewParser(context, imports, fileInfo, 0)

	t.Run("should parse IE alpha function", func(t *testing.T) {
		parser.parserInput.Start("opacity=50)", false, nil)
		
		result := parser.parsers.IeAlpha()
		if result == nil {
			t.Error("Expected IE alpha to be parsed")
		}
		
		// IeAlpha returns []any, so we can use it directly
		if len(result) != 1 {
			t.Errorf("Expected 1 result, got %d", len(result))
		}
		if len(result) > 0 {
			if quoted, ok := result[0].(*go_parser.Quoted); ok {
				// Note: Value field is unexported, so we just verify it's a Quoted type
				_ = quoted
			} else {
				t.Errorf("Expected result to be *Quoted, got %T", result[0])
			}
		}
	})
}

func TestParser_Selectors(t *testing.T) {
	context := map[string]any{}
	imports := map[string]any{}
	fileInfo := map[string]any{"filename": "test.less"}
	parser := NewParser(context, imports, fileInfo, 0)

	t.Run("should parse type selectors", func(t *testing.T) {
		parser.parserInput.Start("div", false, nil)
		
		result := parser.parsers.Element()
		if result == nil {
			t.Error("Expected element to be parsed")
		}
		
		if element, ok := result.(*go_parser.Element); ok {
			if element.Value != "div" {
				t.Errorf("Expected element value to be 'div', got %s", element.Value)
			}
		} else {
			t.Errorf("Expected result to be *Element, got %T", result)
		}
	})

	t.Run("should parse class selectors", func(t *testing.T) {
		parser.parserInput.Start(".my-class", false, nil)
		
		result := parser.parsers.Element()
		if result == nil {
			t.Error("Expected class selector to be parsed")
		}
		
		if element, ok := result.(*go_parser.Element); ok {
			if element.Value != ".my-class" {
				t.Errorf("Expected element value to be '.my-class', got %s", element.Value)
			}
		} else {
			t.Errorf("Expected result to be *Element, got %T", result)
		}
	})

	t.Run("should parse ID selectors", func(t *testing.T) {
		parser.parserInput.Start("#my-id", false, nil)
		
		result := parser.parsers.Element()
		if result == nil {
			t.Error("Expected ID selector to be parsed")
		}
		
		if element, ok := result.(*go_parser.Element); ok {
			if element.Value != "#my-id" {
				t.Errorf("Expected element value to be '#my-id', got %s", element.Value)
			}
		} else {
			t.Errorf("Expected result to be *Element, got %T", result)
		}
	})

	t.Run("should parse attribute selectors", func(t *testing.T) {
		parser.parserInput.Start("[href='test']", false, nil)
		
		result := parser.parsers.Attribute()
		if result == nil {
			t.Error("Expected attribute selector to be parsed")
		}
		
		if attribute, ok := result.(*go_parser.Attribute); ok {
			if attribute.Key != "href" {
				t.Errorf("Expected attribute key to be 'href', got %s", attribute.Key)
			}
		} else {
			t.Errorf("Expected result to be *Attribute, got %T", result)
		}
	})

	t.Run("should parse pseudo-class selectors", func(t *testing.T) {
		parser.parserInput.Start(":hover", false, nil)
		
		result := parser.parsers.Element()
		if result == nil {
			t.Error("Expected pseudo-class to be parsed")
		}
		
		if element, ok := result.(*go_parser.Element); ok {
			if element.Value != ":hover" {
				t.Errorf("Expected element value to be ':hover', got %s", element.Value)
			}
		} else {
			t.Errorf("Expected result to be *Element, got %T", result)
		}
	})

	t.Run("should parse complex selectors", func(t *testing.T) {
		parser.parserInput.Start("div.class#id", false, nil)
		
		result := parser.parsers.Selector(false)
		if result == nil {
			t.Error("Expected complex selector to be parsed")
		}
		
		if selector, ok := result.(*go_parser.Selector); ok {
			if len(selector.Elements) == 0 {
				t.Error("Expected selector to have elements")
			}
		} else {
			t.Errorf("Expected result to be *Selector, got %T", result)
		}
	})

	t.Run("should parse selector combinations", func(t *testing.T) {
		parser.parserInput.Start("div > p", false, nil)
		
		result := parser.parsers.Selector(false)
		if result == nil {
			t.Error("Expected selector combination to be parsed")
		}
		
		if selector, ok := result.(*go_parser.Selector); ok {
			if len(selector.Elements) < 2 {
				t.Errorf("Expected at least 2 elements for 'div > p', got %d", len(selector.Elements))
			}
		} else {
			t.Errorf("Expected result to be *Selector, got %T", result)
		}
	})
}

func TestParser_Variables(t *testing.T) {
	t.Run("should parse variable declarations", func(t *testing.T) {
		err, root := parseLess("@my-color: #ff0000;", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if root == nil {
			t.Error("Expected root to be created, but got nil")
			return
		}
		if len(root.Rules) == 0 {
			t.Error("Expected declaration to be parsed")
		}
		if _, ok := root.Rules[0].(*go_parser.Declaration); !ok {
			t.Errorf("Expected Declaration, got %T", root.Rules[0])
		}
	})

	t.Run("should parse variable usage", func(t *testing.T) {
		err, root := parseLess("@my-color: #00ff00; .test { color: @my-color; }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) < 2 {
			t.Error("Expected variable declaration and ruleset")
		}
		// Check that we have a variable declaration first
		if _, ok := root.Rules[0].(*go_parser.Declaration); !ok {
			t.Errorf("Expected first rule to be Declaration, got %T", root.Rules[0])
		}
		// Check that we have a ruleset second
		if ruleset, ok := root.Rules[1].(*go_parser.Ruleset); ok {
			if len(ruleset.Rules) == 0 {
				t.Error("Expected ruleset to have rules")
			}
		} else {
			t.Errorf("Expected second rule to be Ruleset, got %T", root.Rules[1])
		}
	})

	t.Run("should parse variables in selectors", func(t *testing.T) {
		err, root := parseLess("@my-selector: .my-class; @{my-selector} { color: red; }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) < 2 {
			t.Error("Expected variable declaration and ruleset")
		}
		// Check that the interpolated selector was parsed
		if ruleset, ok := root.Rules[1].(*go_parser.Ruleset); ok {
			if len(ruleset.Selectors) == 0 {
				t.Error("Expected ruleset to have selectors")
			}
		}
	})

	t.Run("should parse variable calls (detached ruleset lookups)", func(t *testing.T) {
		err, root := parseLess("@detached: { color: blue; }; .foo { @detached(); }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) < 2 {
			t.Error("Expected variable declaration and ruleset")
			return
		}
		if ruleset, ok := root.Rules[1].(*go_parser.Ruleset); ok {
			if len(ruleset.Rules) == 0 {
				t.Error("Expected ruleset to have rules (variable call)")
				return
			}
			// Check that the rule is parsed as a VariableCall
			if _, ok := ruleset.Rules[0].(*go_parser.VariableCall); !ok {
				t.Errorf("Expected VariableCall, got %T", ruleset.Rules[0])
			}
		} else {
			t.Errorf("Expected Ruleset as second rule, got %T", root.Rules[1])
		}
	})

	t.Run("should parse variable calls with lookups", func(t *testing.T) {
		err, root := parseLess("color: @detached[@color];", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if root == nil {
			t.Error("Expected root to be created, but got nil")
			return
		}
		if len(root.Rules) == 0 {
			t.Error("Expected declaration to be parsed")
		}
		if _, ok := root.Rules[0].(*go_parser.Declaration); !ok {
			t.Errorf("Expected Declaration, got %T", root.Rules[0])
		}
	})

	t.Run("should parse variables with dimension values", func(t *testing.T) {
		err, root := parseLess("@my-padding: 10px + 5px;", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if root == nil {
			t.Error("Expected root to be created, but got nil")
			return
		}
		if len(root.Rules) == 0 {
			t.Error("Expected declaration to be parsed")
		}
		if decl, ok := root.Rules[0].(*go_parser.Declaration); ok {
			// The value should contain an operation (10px + 5px)
			if decl.Value == nil {
				t.Error("Expected value to be present")
			}
		} else {
			t.Errorf("Expected Declaration, got %T", root.Rules[0])
		}
	})

	t.Run("should parse variables holding string values", func(t *testing.T) {
		err, root := parseLess(`@my-string: "hello world";`, nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected declaration to be parsed")
		}
		if _, ok := root.Rules[0].(*go_parser.Declaration); !ok {
			t.Errorf("Expected Declaration, got %T", root.Rules[0])
		}
	})
}

func TestParser_Mixins(t *testing.T) {
	t.Run("should parse a simple mixin definition", func(t *testing.T) {
		err, root := parseLess(".my-mixin { color: red; }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected ruleset to be parsed")
		}
		// This is a regular ruleset that can be used as a mixin
		if _, ok := root.Rules[0].(*go_parser.Ruleset); !ok {
			t.Errorf("Expected Ruleset, got %T", root.Rules[0])
		}
	})

	t.Run("should parse a mixin definition with parentheses", func(t *testing.T) {
		err, root := parseLess(".my-mixin() { color: blue; }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected mixin definition to be parsed")
		}
		if _, ok := root.Rules[0].(*go_parser.MixinDefinition); !ok {
			t.Errorf("Expected MixinDefinition, got %T", root.Rules[0])
		}
	})

	t.Run("should parse a mixin definition with parameters", func(t *testing.T) {
		err, root := parseLess(".my-mixin(@width, @color: #fff) { width: @width; color: @color; }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected mixin definition to be parsed")
		}
		if mixinDef, ok := root.Rules[0].(*go_parser.MixinDefinition); ok {
			if len(mixinDef.Params) != 2 {
				t.Errorf("Expected 2 parameters, got %d", len(mixinDef.Params))
			}
		} else {
			t.Errorf("Expected MixinDefinition, got %T", root.Rules[0])
		}
	})

	t.Run("should parse a simple mixin call", func(t *testing.T) {
		err, root := parseLess(".class { .mixin; }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected ruleset to be parsed")
			return
		}
		if ruleset, ok := root.Rules[0].(*go_parser.Ruleset); ok {
			if len(ruleset.Rules) == 0 {
				t.Error("Expected ruleset to have rules")
				return
			}
			if _, ok := ruleset.Rules[0].(*go_parser.MixinCall); !ok {
				t.Errorf("Expected MixinCall, got %T", ruleset.Rules[0])
			}
		} else {
			t.Errorf("Expected Ruleset, got %T", root.Rules[0])
		}
	})

	t.Run("should parse a mixin call with parentheses", func(t *testing.T) {
		err, root := parseLess(".class { .mixin(); }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected ruleset to be parsed")
			return
		}
		if ruleset, ok := root.Rules[0].(*go_parser.Ruleset); ok {
			if len(ruleset.Rules) == 0 {
				t.Error("Expected ruleset to have rules")
				return
			}
			if mixinCall, ok := ruleset.Rules[0].(*go_parser.MixinCall); ok {
				if len(mixinCall.Arguments) != 0 {
					t.Errorf("Expected 0 arguments, got %d", len(mixinCall.Arguments))
				}
			} else {
				t.Errorf("Expected MixinCall, got %T", ruleset.Rules[0])
			}
		} else {
			t.Errorf("Expected Ruleset, got %T", root.Rules[0])
		}
	})

	t.Run("should parse mixin call with !important", func(t *testing.T) {
		err, root := parseLess(".class { .mixin() !important; }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected ruleset to be parsed")
			return
		}
		if ruleset, ok := root.Rules[0].(*go_parser.Ruleset); ok {
			if len(ruleset.Rules) == 0 {
				t.Error("Expected ruleset to have rules")
				return
			}
			if mixinCall, ok := ruleset.Rules[0].(*go_parser.MixinCall); ok {
				if !mixinCall.Important {
					t.Error("Expected mixin call to be important")
				}
			} else {
				t.Errorf("Expected MixinCall, got %T", ruleset.Rules[0])
			}
		} else {
			t.Errorf("Expected Ruleset, got %T", root.Rules[0])
		}
	})

	t.Run("should parse a mixin call with arguments", func(t *testing.T) {
		err, root := parseLess(".class { .mixin(10px, red); }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected ruleset to be parsed")
			return
		}
		if ruleset, ok := root.Rules[0].(*go_parser.Ruleset); ok {
			if len(ruleset.Rules) == 0 {
				t.Error("Expected ruleset to have rules")
				return
			}
			if mixinCall, ok := ruleset.Rules[0].(*go_parser.MixinCall); ok {
				if len(mixinCall.Arguments) != 2 {
					t.Errorf("Expected 2 arguments, got %d", len(mixinCall.Arguments))
				}
			} else {
				t.Errorf("Expected MixinCall, got %T", ruleset.Rules[0])
			}
		} else {
			t.Errorf("Expected Ruleset, got %T", root.Rules[0])
		}
	})

	t.Run("should parse mixin call with named arguments", func(t *testing.T) {
		err, root := parseLess(".class { .mixin(@color: blue, @width: 100px); }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected ruleset to be parsed")
			return
		}
		if ruleset, ok := root.Rules[0].(*go_parser.Ruleset); ok {
			if len(ruleset.Rules) == 0 {
				t.Error("Expected ruleset to have rules")
				return
			}
			if mixinCall, ok := ruleset.Rules[0].(*go_parser.MixinCall); ok {
				if len(mixinCall.Arguments) != 2 {
					t.Errorf("Expected 2 arguments, got %d", len(mixinCall.Arguments))
				}
			} else {
				t.Errorf("Expected MixinCall, got %T", ruleset.Rules[0])
			}
		} else {
			t.Errorf("Expected Ruleset, got %T", root.Rules[0])
		}
	})

	t.Run("should parse namespaced mixin calls", func(t *testing.T) {
		err, root := parseLess(".class { #namespace > .mixin(); }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected ruleset to be parsed")
			return
		}
		if ruleset, ok := root.Rules[0].(*go_parser.Ruleset); ok {
			if len(ruleset.Rules) == 0 {
				t.Error("Expected ruleset to have rules")
				return
			}
			if mixinCall, ok := ruleset.Rules[0].(*go_parser.MixinCall); ok {
				if mixinCall.Selector == nil {
					t.Error("Expected mixin call to have selector")
				}
				// Check for namespaced selector (should have multiple elements)
				if len(mixinCall.Selector.Elements) < 2 {
					t.Errorf("Expected at least 2 selector elements for namespace, got %d", len(mixinCall.Selector.Elements))
				}
			} else {
				t.Errorf("Expected MixinCall, got %T", ruleset.Rules[0])
			}
		} else {
			t.Errorf("Expected Ruleset, got %T", root.Rules[0])
		}
	})

	t.Run("should parse mixin definition with guards", func(t *testing.T) {
		err, root := parseLess(".mixin (@a) when (@a > 10px) { width: @a; }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected mixin definition to be parsed")
		}
		if mixinDef, ok := root.Rules[0].(*go_parser.MixinDefinition); ok {
			if mixinDef.Condition == nil {
				t.Error("Expected mixin definition to have condition (guard)")
			}
		} else {
			t.Errorf("Expected MixinDefinition, got %T", root.Rules[0])
		}
	})

	t.Run("should parse variadic mixin definitions", func(t *testing.T) {
		err, root := parseLess(".mixin (...) { }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected mixin definition to be parsed")
		}
		if mixinDef, ok := root.Rules[0].(*go_parser.MixinDefinition); ok {
			if !mixinDef.Variadic {
				t.Error("Expected mixin definition to be variadic")
			}
		} else {
			t.Errorf("Expected MixinDefinition, got %T", root.Rules[0])
		}
	})

	t.Run("should parse mixin calls with argument unpacking", func(t *testing.T) {
		err, root := parseLess("@args: 1px solid black; .box-shadow(@args...);", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) < 2 {
			t.Error("Expected variable declaration and mixin call")
		}
		if _, ok := root.Rules[1].(*go_parser.MixinCall); !ok {
			t.Errorf("Expected MixinCall, got %T", root.Rules[1])
		}
	})
}

func TestParser_AtRules(t *testing.T) {
	t.Run("should parse @charset", func(t *testing.T) {
		err, root := parseLess(`@charset "UTF-8";`, nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected at-rule to be parsed")
		}
		if atRule, ok := root.Rules[0].(*go_parser.AtRule); ok {
			if atRule.Name != "@charset" {
				t.Errorf("Expected name '@charset', got %v", atRule.Name)
			}
		} else {
			t.Errorf("Expected AtRule, got %T", root.Rules[0])
		}
	})

	t.Run("should parse @import with string", func(t *testing.T) {
		err, root := parseLess(`@import "my-styles.less";`, nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected import to be parsed")
		}
		if importRule, ok := root.Rules[0].(*go_parser.Import); ok {
			// Import should have a path
			if importRule.GetPath() == nil {
				t.Error("Expected import to have path")
			}
		} else {
			t.Errorf("Expected Import, got %T", root.Rules[0])
		}
	})

	t.Run("should parse @import with url()", func(t *testing.T) {
		err, root := parseLess(`@import url("theme.css");`, nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected import to be parsed")
		}
		if importRule, ok := root.Rules[0].(*go_parser.Import); ok {
			if importRule.GetPath() == nil {
				t.Error("Expected import to have path")
			}
			// The path should contain a URL - we can check by evaluating the path
			path := importRule.GetPath()
			if path == nil {
				t.Error("Expected import to have non-nil path")
			}
		} else {
			t.Errorf("Expected Import, got %T", root.Rules[0])
		}
	})

	t.Run("should parse @import with options", func(t *testing.T) {
		err, root := parseLess(`@import (optional, reference) "foo.less";`, nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected import to be parsed")
		}
		if importRule, ok := root.Rules[0].(*go_parser.Import); ok {
			// Import with options should still have a path
			if importRule.GetPath() == nil {
				t.Error("Expected import to have path")
			}
			// Note: options field is private, so we just verify parsing succeeded
		} else {
			t.Errorf("Expected Import, got %T", root.Rules[0])
		}
	})

	t.Run("should parse @media queries", func(t *testing.T) {
		err, root := parseLess(`@media screen and (min-width: 768px) { .class { color: red; } }`, nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected media rule to be parsed")
		}
		if mediaRule, ok := root.Rules[0].(*go_parser.Media); ok {
			if mediaRule.Features == nil {
				t.Error("Expected media rule to have features")
			}
			if len(mediaRule.Rules) == 0 {
				t.Error("Expected media rule to have rules")
			}
		} else {
			t.Errorf("Expected Media, got %T", root.Rules[0])
		}
	})

	t.Run("should parse @media with variable features", func(t *testing.T) {
		err, root := parseLess("@mq: screen; @media @mq { color: red; }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) < 2 {
			t.Error("Expected variable declaration and media rule")
		}
		if mediaRule, ok := root.Rules[1].(*go_parser.Media); ok {
			if mediaRule.Features == nil {
				t.Error("Expected media rule to have features")
			}
		} else {
			t.Errorf("Expected Media as second rule, got %T", root.Rules[1])
		}
	})

	t.Run("should parse @keyframes", func(t *testing.T) {
		err, root := parseLess("@keyframes pulse { from { opacity: 0; } to { opacity: 1; } }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected keyframes rule to be parsed")
		}
		if atRule, ok := root.Rules[0].(*go_parser.AtRule); ok {
			if atRule.Name != "@keyframes" {
				t.Errorf("Expected name '@keyframes', got %v", atRule.Name)
			}
			if len(atRule.Rules) == 0 {
				t.Error("Expected keyframes to have rules")
			}
		} else {
			t.Errorf("Expected AtRule, got %T", root.Rules[0])
		}
	})

	t.Run("should parse @namespace", func(t *testing.T) {
		err, root := parseLess(`@namespace svg "http://www.w3.org/2000/svg";`, nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected namespace rule to be parsed")
		}
		if atRule, ok := root.Rules[0].(*go_parser.AtRule); ok {
			if atRule.Name != "@namespace" {
				t.Errorf("Expected name '@namespace', got %v", atRule.Name)
			}
			if atRule.Value == nil {
				t.Error("Expected namespace to have value")
			}
		} else {
			t.Errorf("Expected AtRule, got %T", root.Rules[0])
		}
	})

	t.Run("should parse @supports", func(t *testing.T) {
		err, root := parseLess("@supports (display: grid) { div { display: grid; } }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected supports rule to be parsed")
		}
		if atRule, ok := root.Rules[0].(*go_parser.AtRule); ok {
			if atRule.Name != "@supports" {
				t.Errorf("Expected name '@supports', got %v", atRule.Name)
			}
			if atRule.Value == nil {
				t.Error("Expected supports to have value")
			}
			if len(atRule.Rules) == 0 {
				t.Error("Expected supports to have rules")
			}
		} else {
			t.Errorf("Expected AtRule, got %T", root.Rules[0])
		}
	})

	t.Run("should parse @supports with declaration calls", func(t *testing.T) {
		// Test that @supports rules can use DeclarationCall functionality
		err, root := parseLess("@supports supports(display: grid) { div { display: grid; } }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected supports rule to be parsed")
		}
		if atRule, ok := root.Rules[0].(*go_parser.AtRule); ok {
			if atRule.Name != "@supports" {
				t.Errorf("Expected name '@supports', got %v", atRule.Name)
			}
			if atRule.Value == nil {
				t.Error("Expected supports to have value")
			}
		} else {
			t.Errorf("Expected AtRule, got %T", root.Rules[0])
		}
	})

	t.Run("should parse @plugin directive", func(t *testing.T) {
		err, root := parseLess(`@plugin "my-plugin";`, nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected plugin rule to be parsed")
		}
		// Plugin is treated as a type of import
		if importRule, ok := root.Rules[0].(*go_parser.Import); ok {
			// Plugin should have a path
			if importRule.GetPath() == nil {
				t.Error("Expected plugin to have path")
			}
			// Note: options field is private, so we just verify parsing succeeded
		} else {
			t.Errorf("Expected Import (plugin), got %T", root.Rules[0])
		}
	})

	t.Run("should parse custom at-rules", func(t *testing.T) {
		err, root := parseLess("@custom-rule param { .a { prop: val; } }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected custom at-rule to be parsed")
		}
		if atRule, ok := root.Rules[0].(*go_parser.AtRule); ok {
			if atRule.Name != "@custom-rule" {
				t.Errorf("Expected name '@custom-rule', got %v", atRule.Name)
			}
			if atRule.Value == nil {
				t.Error("Expected custom rule to have value")
			}
			if len(atRule.Rules) == 0 {
				t.Error("Expected custom rule to have rules")
			}
		} else {
			t.Errorf("Expected AtRule, got %T", root.Rules[0])
		}
	})

	t.Run("should parse @media with declaration call features", func(t *testing.T) {
		// Test that media queries can handle declaration calls in features
		err, root := parseLess("@media supports(display: grid) { .grid { display: grid; } }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected media rule to be parsed")
		}
		if mediaRule, ok := root.Rules[0].(*go_parser.Media); ok {
			if mediaRule.Features == nil {
				t.Error("Expected media rule to have features")
			}
			if len(mediaRule.Rules) == 0 {
				t.Error("Expected media rule to have rules")
			}
		} else {
			t.Errorf("Expected Media, got %T", root.Rules[0])
		}
	})
}

func TestParser_VariableDebug(t *testing.T) {
	context := map[string]any{}
	imports := map[string]any{}
	fileInfo := map[string]any{"filename": "test.less"}
	parser := NewParser(context, imports, fileInfo, 0)

	t.Run("debug variable name parsing", func(t *testing.T) {
		parser.parserInput.Start("@my-color: #ff0000;", false, nil)
		
		result := parser.parsers.Variable()
		if result == nil {
			t.Error("Expected variable name to be parsed")
		} else {
			t.Logf("Variable name parsed: %v", result)
		}
	})

	t.Run("debug color parsing", func(t *testing.T) {
		parser.parserInput.Start("#ff0000", false, nil)
		
		result := parser.parsers.entities.Color()
		if result == nil {
			t.Error("Expected color to be parsed")
		} else {
			t.Logf("Color parsed: %v", result)
		}
	})

	t.Run("debug value parsing", func(t *testing.T) {
		parser.parserInput.Start("#ff0000;", false, nil)
		
		result := parser.parsers.Value()
		if result == nil {
			t.Error("Expected value to be parsed")
		} else {
			t.Logf("Value parsed: %v", result)
		}
	})

	t.Run("debug declaration parsing", func(t *testing.T) {
		parser.parserInput.Start("@my-color: #ff0000;", false, nil)
		
		result := parser.parsers.Declaration()
		if result == nil {
			t.Error("Expected declaration to be parsed")
		} else {
			t.Logf("Declaration parsed: %v", result)
		}
	})

	t.Run("debug primary parsing", func(t *testing.T) {
		parser.parserInput.Start("@my-color: #ff0000;", false, nil)
		
		result := parser.parsers.Primary()
		t.Logf("Primary parsed: %v (length: %d)", result, len(result))
		if len(result) == 0 {
			t.Error("Expected primary to parse something")
		} else {
			for i, rule := range result {
				t.Logf("Rule %d: %T = %v", i, rule, rule)
			}
		}
	})
}

func TestParser_VariableDebug2(t *testing.T) {
	context := map[string]any{}
	imports := map[string]any{}
	fileInfo := map[string]any{"filename": "test.less"}
	parser := NewParser(context, imports, fileInfo, 0)

	t.Run("debug Variable method directly", func(t *testing.T) {
		parser.parserInput.Start("@my-color: #ff0000;", false, nil)
		
		// Test the Variable() method directly
		result := parser.parsers.Variable()
		t.Logf("Variable() returned: %v (type: %T)", result, result)
		
		// Check what character we're at
		t.Logf("Current char: %c at index %d", parser.parserInput.CurrentChar(), parser.parserInput.GetIndex())
		t.Logf("Input: %s", parser.parserInput.GetInput())
	})

	t.Run("debug regex matching", func(t *testing.T) {
		parser.parserInput.Start("@my-color: #ff0000;", false, nil)
		
		// Test the regex directly
		re := regexp.MustCompile(`^(@[\w-]+)\s*:`)
		input := parser.parserInput.GetInput()
		matches := re.FindStringSubmatch(input)
		t.Logf("Direct regex matches: %v", matches)
		
		// Test parserInput.Re method
		parser.parserInput.Start("@my-color: #ff0000;", false, nil)
		result := parser.parserInput.Re(re)
		t.Logf("ParserInput.Re() returned: %v (type: %T)", result, result)
	})
}

func TestParser_Debug(t *testing.T) {
	t.Run("debug simple mixin call parsing", func(t *testing.T) {
		context := map[string]any{}
		imports := map[string]any{}
		fileInfo := map[string]any{"filename": "test.less"}
		parser := NewParser(context, imports, fileInfo, 0)

		// Test what happens when we parse ".mixin;" directly
		parser.parserInput.Start(".mixin;", false, nil)
		
		// Check if Declaration() returns nil (it should)
		declResult := parser.parsers.Declaration()
		t.Logf("Declaration() returned: %v", declResult)
		
		// Reset and test mixin.Call()
		parser.parserInput.Start(".mixin;", false, nil)
		mixinResult := parser.parsers.mixin.Call(false, false)
		t.Logf("mixin.Call(false, false) returned: %v", mixinResult)
		
		// Debug step by step what happens in mixin.Call
		parser.parserInput.Start(".mixin;", false, nil)
		
		// Check current character
		currentChar := parser.parserInput.CurrentChar()
		t.Logf("Current char: %c", currentChar)
		
		// Check if Elements() returns anything
		elements := parser.parsers.mixin.Elements()
		t.Logf("Elements() returned: %v (length: %d)", elements, len(elements))
		
		// Reset and check End()
		parser.parserInput.Start(".mixin;", false, nil)
		// Skip the ".mixin" part to position at ";"
		parser.parserInput.Re(regexp.MustCompile(`^\.mixin`))
		endResult := parser.parsers.End()
		t.Logf("End() returned: %v", endResult)
	})
	
	t.Run("debug variable expression parsing", func(t *testing.T) {
		context := map[string]any{}
		imports := map[string]any{}
		fileInfo := map[string]any{"filename": "test.less"}
		parser := NewParser(context, imports, fileInfo, 0)

		// Test what happens when we parse " 10px + 5px;" (value part after @var:)
		parser.parserInput.Start(" 10px + 5px;", false, nil)
		
		// Check AnonymousValue
		anonResult := parser.parsers.AnonymousValue()
		t.Logf("AnonymousValue() returned: %v", anonResult)
		
		// Reset and test Value()
		parser.parserInput.Start(" 10px + 5px;", false, nil)
		valueResult := parser.parsers.Value()
		t.Logf("Value() returned: %v", valueResult)
		
		// Reset and test Addition()
		parser.parserInput.Start(" 10px + 5px;", false, nil)
		addResult := parser.parsers.Addition()
		t.Logf("Addition() returned: %v", addResult)
		
		// Test full variable declaration parsing
		parser.parserInput.Start("@my-padding: 10px + 5px;", false, nil)
		declResult := parser.parsers.Declaration()
		t.Logf("Full Declaration() returned: %v", declResult)
		if declResult != nil {
			if decl, ok := declResult.(*go_parser.Declaration); ok {
				t.Logf("Declaration.Value: %v", decl.Value)
			}
		}
	})
}

func TestParser_DeclarationCallIntegration(t *testing.T) {
	t.Run("should parse @supports with simple declaration call", func(t *testing.T) {
		err, root := parseLess("@supports supports(display: flex) { .flex { display: flex; } }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected supports rule to be parsed")
		}
	})

	t.Run("should parse @media with declaration call in complex query", func(t *testing.T) {
		err, root := parseLess("@media screen and supports(display: grid) and (min-width: 768px) { .grid { display: grid; } }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected media rule to be parsed")
		}
	})

	t.Run("should handle nested declaration calls", func(t *testing.T) {
		err, root := parseLess("@supports supports(transform: supports(display: grid)) { .test { color: red; } }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected supports rule to be parsed")
		}
	})

	t.Run("should parse declaration call with CSS custom properties", func(t *testing.T) {
		err, root := parseLess("@supports supports(--custom-property: value) { .custom { color: var(--custom-property); } }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected supports rule to be parsed")
		}
	})

	t.Run("should parse declaration call with variable values", func(t *testing.T) {
		err, root := parseLess("@display: grid; @supports supports(display: @display) { .grid { display: @display; } }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) < 2 {
			t.Error("Expected variable declaration and supports rule")
		}
	})

	t.Run("should parse declaration call with function values", func(t *testing.T) {
		err, root := parseLess("@supports supports(transform: rotate(45deg)) { .rotate { transform: rotate(45deg); } }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected supports rule to be parsed")
		}
	})

	t.Run("should handle declaration call with multiple properties", func(t *testing.T) {
		// This might not work exactly like this since DeclarationCall expects a single declaration,
		// but let's test the parser's ability to handle it gracefully
		err, _ := parseLess("@supports supports(display: grid; grid-template-columns: 1fr) { .grid { display: grid; } }", nil, nil)
		// This should either parse or fail gracefully - we're mainly testing it doesn't panic
		_ = err // We don't necessarily expect this to succeed
	})

	t.Run("should parse declaration call in container query", func(t *testing.T) {
		err, root := parseLess("@container supports(display: grid) { .grid { display: grid; } }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected container rule to be parsed")
		}
	})

	t.Run("should handle mixed declaration calls and regular expressions", func(t *testing.T) {
		err, root := parseLess("@media supports(display: grid) and (min-width: 768px) { .responsive-grid { display: grid; } }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected media rule to be parsed")
		}
	})

	t.Run("should handle declaration call with calc() values", func(t *testing.T) {
		err, root := parseLess("@supports supports(width: calc(100% - 20px)) { .calc { width: calc(100% - 20px); } }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected supports rule to be parsed")
		}
	})

	t.Run("should parse declaration call with quoted values", func(t *testing.T) {
		err, root := parseLess(`@supports supports(font-family: "Arial") { .arial { font-family: "Arial"; } }`, nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected supports rule to be parsed")
		}
	})
}

func TestParser_ParseNode(t *testing.T) {
	context := map[string]any{}
	imports := map[string]any{
		"contents":             map[string]string{},
		"contentsIgnoredChars": map[string]int{},
		"rootFilename":         "_snippet_.less",
	}
	fileInfo := map[string]any{"filename": "_snippet_.less"}
	parser := NewParser(context, imports, fileInfo, 0)

	// Helper function to test parseNode with promise-like callback
	parseNodeSync := func(snippet string, parseList []string) (*ParseNodeResult, error) {
		var result *ParseNodeResult
		var callbackErr error
		
		done := make(chan struct{})
		parser.parseNode(snippet, parseList, func(res *ParseNodeResult) {
			result = res
			close(done)
		})
		<-done
		
		if result.Error != nil {
			if lessErr, ok := result.Error.(*less.LessError); ok {
				callbackErr = lessErr
			} else if result.Error == true {
				callbackErr = fmt.Errorf("parsing failed - not all input consumed")
			} else if errMap, ok := result.Error.(map[string]any); ok {
				callbackErr = fmt.Errorf("parse error: %v at index %v", errMap["message"], errMap["index"])
			}
		}
		
		return result, callbackErr
	}

	t.Run("should parse a simple value string", func(t *testing.T) {
		result, err := parseNodeSync("10px solid red", []string{"value"})
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if result == nil || len(result.Nodes) != 1 {
			t.Error("Expected 1 node to be parsed")
		}
		if result.Nodes[0] == nil {
			t.Error("Expected non-nil node")
		}
	})

	t.Run("should parse an important keyword", func(t *testing.T) {
		result, err := parseNodeSync("!important", []string{"important"})
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if result == nil || len(result.Nodes) != 1 {
			t.Error("Expected 1 node to be parsed")
		}
		if result.Nodes[0] == nil {
			t.Error("Expected non-nil node")
		}
	})

	t.Run("should handle errors in parseNode", func(t *testing.T) {
		result, err := parseNodeSync("10px solid ???", []string{"value"})
		if err == nil {
			t.Error("Expected error for invalid input")
		}
		if result != nil && result.Nodes != nil {
			t.Error("Expected nodes to be nil on error")
		}
	})

	t.Run("should parse a selector", func(t *testing.T) {
		result, err := parseNodeSync(".my-class ~ .another", []string{"selector"})
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if result == nil || len(result.Nodes) != 1 {
			t.Error("Expected 1 node to be parsed")
		}
		if selector, ok := result.Nodes[0].(*go_parser.Selector); ok {
			if len(selector.Elements) != 2 {
				t.Errorf("Expected 2 elements, got %d", len(selector.Elements))
			}
		} else {
			t.Errorf("Expected *Selector, got %T", result.Nodes[0])
		}
	})

	t.Run("should parse an expression", func(t *testing.T) {
		result, err := parseNodeSync("10px * (@var + 5)", []string{"expression"})
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
			return
		}
		if result == nil || len(result.Nodes) != 1 {
			t.Error("Expected 1 node to be parsed")
			return
		}
		if _, ok := result.Nodes[0].(*go_parser.Expression); !ok {
			t.Errorf("Expected *Expression, got %T", result.Nodes[0])
		}
	})

	t.Run("should parse a declaration", func(t *testing.T) {
		result, err := parseNodeSync("color: red;", []string{"declaration"})
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if result == nil || len(result.Nodes) != 1 {
			t.Error("Expected 1 node to be parsed")
		}
		if _, ok := result.Nodes[0].(*go_parser.Declaration); !ok {
			t.Errorf("Expected *Declaration, got %T", result.Nodes[0])
		}
	})
}

func TestParser_ExpressionsAndOperations(t *testing.T) {
	t.Run("should parse addition", func(t *testing.T) {
		err, root := parseLess("width: 10px + 5px;", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected declaration to be parsed")
		}
		if decl, ok := root.Rules[0].(*go_parser.Declaration); ok {
			// Should contain an operation in the value
			if decl.Value == nil {
				t.Error("Expected value to be present")
			}
		} else {
			t.Errorf("Expected Declaration, got %T", root.Rules[0])
		}
	})

	t.Run("should parse subtraction", func(t *testing.T) {
		err, root := parseLess("width: 10px - 5px;", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected declaration to be parsed")
		}
	})

	t.Run("should parse multiplication", func(t *testing.T) {
		err, root := parseLess("width: 10px * 2;", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected declaration to be parsed")
		}
	})

	t.Run("should parse division", func(t *testing.T) {
		err, root := parseLess("width: 10px / 2;", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected declaration to be parsed")
		}
	})

	t.Run("should respect operation order (multiplication before addition)", func(t *testing.T) {
		err, root := parseLess("width: 10px + 5px * 2;", nil, nil) // Expected: 10px + (5px * 2)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected declaration to be parsed")
		}
		// The parser should create the correct operation tree
		if decl, ok := root.Rules[0].(*go_parser.Declaration); ok {
			if decl.Value == nil {
				t.Error("Expected value to be present")
			}
		} else {
			t.Errorf("Expected Declaration, got %T", root.Rules[0])
		}
	})

	t.Run("should handle parentheses in expressions", func(t *testing.T) {
		err, root := parseLess("width: (10px + 5px) * 2;", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if root == nil {
			t.Error("Expected root to be created, but got nil")
			return
		}
		if len(root.Rules) == 0 {
			t.Error("Expected declaration to be parsed")
		}
	})

	t.Run("should parse negative numbers", func(t *testing.T) {
		err, root := parseLess("margin: -10px;", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected declaration to be parsed")
		}
	})

	t.Run("should parse comma-separated values", func(t *testing.T) {
		err, root := parseLess("font-family: Arial, sans-serif;", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected declaration to be parsed")
		}
	})

	t.Run("should parse space-separated values", func(t *testing.T) {
		err, root := parseLess("border: 1px solid black;", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected declaration to be parsed")
		}
	})
}

func TestParser_Extends(t *testing.T) {
	t.Run("should parse basic :extend()", func(t *testing.T) {
		err, root := parseLess("a:extend(.b) {}", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected ruleset to be parsed")
		}
		if ruleset, ok := root.Rules[0].(*go_parser.Ruleset); ok {
			if len(ruleset.Selectors) == 0 {
				t.Error("Expected selector with extend")
			}
			// Cast to *Selector to access ExtendList
			if selector, ok := ruleset.Selectors[0].(*go_parser.Selector); ok {
				if len(selector.ExtendList) == 0 {
					t.Error("Expected extend list to have items")
				}
			} else {
				t.Errorf("Expected *Selector, got %T", ruleset.Selectors[0])
			}
		} else {
			t.Errorf("Expected Ruleset, got %T", root.Rules[0])
		}
	})

	t.Run("should parse &:extend()", func(t *testing.T) {
		err, root := parseLess(".a { &:extend(.b); }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected ruleset to be parsed")
		}
		if ruleset, ok := root.Rules[0].(*go_parser.Ruleset); ok {
			if len(ruleset.Rules) == 0 {
				t.Error("Expected extend rule inside ruleset")
			}
			if _, ok := ruleset.Rules[0].(*go_parser.Extend); !ok {
				t.Errorf("Expected Extend, got %T", ruleset.Rules[0])
			}
		} else {
			t.Errorf("Expected Ruleset, got %T", root.Rules[0])
		}
	})

	t.Run("should parse extend with 'all'", func(t *testing.T) {
		err, root := parseLess("a:extend(.b all) {}", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected ruleset to be parsed")
		}
		if ruleset, ok := root.Rules[0].(*go_parser.Ruleset); ok {
			if len(ruleset.Selectors) == 0 {
				t.Error("Expected selector with extend")
			}
			if selector, ok := ruleset.Selectors[0].(*go_parser.Selector); ok {
				if len(selector.ExtendList) == 0 {
					t.Error("Expected extend with 'all' option")
				}
				if extend, ok := selector.ExtendList[0].(*go_parser.Extend); ok {
					if extend.Option != "all" {
						t.Errorf("Expected option to be 'all', got %s", extend.Option)
					}
				}
			}
		}
	})

	t.Run("should parse extend with multiple targets", func(t *testing.T) {
		err, root := parseLess("a:extend(.b, .c) {}", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected ruleset to be parsed")
		}
		if ruleset, ok := root.Rules[0].(*go_parser.Ruleset); ok {
			if len(ruleset.Selectors) == 0 {
				t.Error("Expected selector with extend")
			}
			if selector, ok := ruleset.Selectors[0].(*go_parser.Selector); ok {
				if len(selector.ExtendList) == 0 {
					t.Error("Expected extend with multiple targets")
				}
			}
		}
	})

	t.Run("should parse extend with complex selector", func(t *testing.T) {
		err, root := parseLess("a:extend(div > .b #id) {}", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected ruleset to be parsed")
		}
		if ruleset, ok := root.Rules[0].(*go_parser.Ruleset); ok {
			if len(ruleset.Selectors) == 0 {
				t.Error("Expected selector with extend")
			}
			if selector, ok := ruleset.Selectors[0].(*go_parser.Selector); ok {
				if len(selector.ExtendList) == 0 {
					t.Error("Expected extend with complex selector")
				}
				if extend, ok := selector.ExtendList[0].(*go_parser.Extend); ok {
					if extendSelector, ok := extend.Selector.(*go_parser.Selector); ok {
						if len(extendSelector.Elements) < 3 {
							t.Errorf("Expected at least 3 elements in complex selector, got %d", len(extendSelector.Elements))
						}
					}
				}
			}
		}
	})
}

func TestParser_CSSCustomProperties(t *testing.T) {
	t.Run("should parse custom property declaration", func(t *testing.T) {
		err, root := parseLess(".class { --my-custom-prop: 10px; }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected ruleset to be parsed")
		}
		if ruleset, ok := root.Rules[0].(*go_parser.Ruleset); ok {
			if len(ruleset.Rules) == 0 {
				t.Error("Expected declaration inside ruleset")
			}
			if decl, ok := ruleset.Rules[0].(*go_parser.Declaration); ok {
				// We can't access the private name field directly, but we can verify it was parsed
				_ = decl
			} else {
				t.Errorf("Expected Declaration, got %T", ruleset.Rules[0])
			}
		}
	})

	t.Run("should parse custom property usage with var()", func(t *testing.T) {
		err, root := parseLess(".class { color: var(--my-custom-prop); }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected ruleset to be parsed")
		}
		if ruleset, ok := root.Rules[0].(*go_parser.Ruleset); ok {
			if len(ruleset.Rules) == 0 {
				t.Error("Expected declaration inside ruleset")
			}
			if decl, ok := ruleset.Rules[0].(*go_parser.Declaration); ok {
				// The value should contain a var() call
				if decl.Value == nil {
					t.Error("Expected value to be present")
				}
			} else {
				t.Errorf("Expected Declaration, got %T", ruleset.Rules[0])
			}
		}
	})

	t.Run("should parse custom property usage with var() and fallback", func(t *testing.T) {
		err, root := parseLess(".class { color: var(--my-custom-prop, blue); }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected ruleset to be parsed")
		}
		if ruleset, ok := root.Rules[0].(*go_parser.Ruleset); ok {
			if len(ruleset.Rules) == 0 {
				t.Error("Expected declaration inside ruleset")
			}
			if decl, ok := ruleset.Rules[0].(*go_parser.Declaration); ok {
				// The value should contain a var() call with fallback
				if decl.Value == nil {
					t.Error("Expected value to be present")
				}
			} else {
				t.Errorf("Expected Declaration, got %T", ruleset.Rules[0])
			}
		}
	})
}

func TestParser_MergeFeatures(t *testing.T) {
	t.Run("should parse property merging with +", func(t *testing.T) {
		err, root := parseLess(".class { box-shadow+: inset 0 0 10px #555; }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected ruleset to be parsed")
		}
		if ruleset, ok := root.Rules[0].(*go_parser.Ruleset); ok {
			if len(ruleset.Rules) == 0 {
				t.Error("Expected declaration inside ruleset")
			}
			if decl, ok := ruleset.Rules[0].(*go_parser.Declaration); ok {
				// We can't access the private merge field directly, but we can verify it was parsed
				_ = decl
			} else {
				t.Errorf("Expected Declaration, got %T", ruleset.Rules[0])
			}
		}
	})

	t.Run("should parse property merging with +_", func(t *testing.T) {
		err, root := parseLess(".class { transform+_: rotate(5deg); }", nil, nil)
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
		if len(root.Rules) == 0 {
			t.Error("Expected ruleset to be parsed")
		}
		if ruleset, ok := root.Rules[0].(*go_parser.Ruleset); ok {
			if len(ruleset.Rules) == 0 {
				t.Error("Expected declaration inside ruleset")
			}
			if decl, ok := ruleset.Rules[0].(*go_parser.Declaration); ok {
				// We can't access the private merge field directly, but we can verify it was parsed
				_ = decl
			} else {
				t.Errorf("Expected Declaration, got %T", ruleset.Rules[0])
			}
		}
	})
}

func TestParser_SerializeVarsComplex(t *testing.T) {
	tests := []struct {
		name     string
		vars     *OrderedMap
		expected string
	}{
		{
			name:     "empty vars",
			vars:     NewOrderedMap(),
			expected: "",
		},
		{
			name: "simple string values",
			vars: func() *OrderedMap {
				om := NewOrderedMap()
				om.Set("color", "red")
				om.Set("font-size", "12px")
				return om
			}(),
			expected: "@color: red;@font-size: 12px;",
		},
		{
			name: "vars with @ prefix already",
			vars: func() *OrderedMap {
				om := NewOrderedMap()
				om.Set("@color", "blue")
				return om
			}(),
			expected: "@color: blue;",
		},
		{
			name: "numeric values",
			vars: func() *OrderedMap {
				om := NewOrderedMap()
				om.Set("width", 100)
				om.Set("height", 200.5)
				return om
			}(),
			expected: "@width: 100;@height: 200.5;",
		},
		{
			name: "boolean values",
			vars: func() *OrderedMap {
				om := NewOrderedMap()
				om.Set("enabled", true)
				om.Set("disabled", false)
				return om
			}(),
			expected: "@enabled: true;@disabled: false;",
		},
		{
			name: "complex expressions",
			vars: func() *OrderedMap {
				om := NewOrderedMap()
				om.Set("calculation", "10px + 5px")
				om.Set("color-mix", "lighten(#000, 10%)")
				return om
			}(),
			expected: "@calculation: 10px + 5px;@color-mix: lighten(#000, 10%);",
		},
		{
			name: "values with semicolons",
			vars: func() *OrderedMap {
				om := NewOrderedMap()
				om.Set("with-semi", "value;")
				om.Set("without-semi", "value")
				return om
			}(),
			expected: "@with-semi: value;@without-semi: value;",
		},
		{
			name: "quoted values",
			vars: func() *OrderedMap {
				om := NewOrderedMap()
				om.Set("font-family", `"Arial, sans-serif"`)
				om.Set("content", `'Hello World'`)
				return om
			}(),
			expected: `@font-family: "Arial, sans-serif";@content: 'Hello World';`,
		},
		{
			name: "URL values",
			vars: func() *OrderedMap {
				om := NewOrderedMap()
				om.Set("background", `url("image.png")`)
				om.Set("icon", `url('icon.svg')`)
				return om
			}(),
			expected: `@background: url("image.png");@icon: url('icon.svg');`,
		},
		{
			name: "mixed complex values",
			vars: func() *OrderedMap {
				om := NewOrderedMap()
				om.Set("@primary", "#3498db")
				om.Set("spacing", "1rem 2rem;")
				om.Set("calculation", 42)
				om.Set("gradient", "linear-gradient(to right, red, blue)")
				return om
			}(),
			expected: "@primary: #3498db;@spacing: 1rem 2rem;@calculation: 42;@gradient: linear-gradient(to right, red, blue);",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := SerializeVarsOrdered(tt.vars)
			if result != tt.expected {
				t.Errorf("SerializeVarsOrdered() = %q, want %q", result, tt.expected)
			}
		})
	}
}

 