package less_go

import (
	"fmt"
)

// StyleFunctions provides all the style-related functions
var StyleFunctions = map[string]interface{}{
	"style": Style,
}

// GetWrappedStyleFunctions returns style functions for registry
func GetWrappedStyleFunctions() map[string]interface{} {
	return StyleFunctions
}

// StyleContext represents the context needed for style function execution
type StyleContext struct {
	Index           int
	CurrentFileInfo map[string]any
	Context         EvalContext
}

// Style implements the style() function which creates a Variable from the argument's value and evaluates it
func Style(ctx StyleContext, args ...interface{}) (*Variable, error) {
	if len(args) == 0 {
		return nil, fmt.Errorf("one or more arguments required")
	}

	// Get the first argument's value to create a Variable
	var argValue string
	if quoted, ok := args[0].(*Quoted); ok {
		argValue = quoted.value
	} else if valuer, ok := args[0].(interface{ GetValue() interface{} }); ok {
		if strVal, ok := valuer.GetValue().(string); ok {
			argValue = strVal
		} else {
			argValue = ""
		}
	} else {
		argValue = ""
	}

	// Create a Variable with the argument value and evaluate it
	variable := NewVariable("@"+argValue, ctx.Index, ctx.CurrentFileInfo)
	result, err := variable.Eval(ctx.Context)
	if err != nil {
		return nil, err
	}

	// Convert the result to CSS representation
	var cssValue string
	if cssable, ok := result.(interface{ ToCSS(interface{}) string }); ok {
		cssValue = cssable.ToCSS(ctx.Context)
	} else {
		cssValue = fmt.Sprintf("%v", result)
	}

	// The JavaScript version has a bug where it imports Anonymous from wrong file,
	// so it actually creates a Variable with name = style(...) 
	// We reproduce this behavior by creating a Variable with the style() result as name
	resultVariable := NewVariable(fmt.Sprintf("style(%s)", cssValue), 0, nil)
	return resultVariable, nil
}

// StyleWithCatch implements the style function with error handling like the JavaScript version
func StyleWithCatch(ctx StyleContext, args ...interface{}) *Variable {
	result, err := Style(ctx, args...)
	if err != nil {
		return nil // Return nil on error, like JavaScript version returns undefined
	}
	return result
}