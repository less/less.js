package less_go

// Boolean function implementation
func Boolean(condition any) *Keyword {
	if isTruthy(condition) {
		return KeywordTrue
	}
	return KeywordFalse
}

// If function implementation - takes unevaluated nodes
func If(context *Context, condition any, trueValue any, falseValue any) any {
	// Evaluate condition first
	var conditionResult any
	if evaluable, ok := condition.(interface{ Eval(*Context) (any, error) }); ok {
		result, _ := evaluable.Eval(context)
		conditionResult = result
	} else {
		conditionResult = condition
	}

	if isTruthy(conditionResult) {
		// Evaluate and return true value
		if evaluable, ok := trueValue.(interface{ Eval(*Context) (any, error) }); ok {
			result, _ := evaluable.Eval(context)
			return result
		}
		return trueValue
	}
	
	if falseValue != nil {
		// Evaluate and return false value
		if evaluable, ok := falseValue.(interface{ Eval(*Context) (any, error) }); ok {
			result, _ := evaluable.Eval(context)
			return result
		}
		return falseValue
	}
	
	return NewAnonymous("", 0, nil, false, false, nil)
}

// IsDefined function implementation - checks if a variable can be evaluated
func IsDefined(context *Context, variable any) *Keyword {
	defer func() {
		if recover() != nil {
			// If eval panics, variable is not defined
		}
	}()
	
	if evaluable, ok := variable.(interface{ Eval(*Context) (any, error) }); ok {
		_, err := evaluable.Eval(context)
		if err != nil {
			return KeywordFalse
		}
		return KeywordTrue
	}
	
	// If it's not evaluable, it's defined by default
	return KeywordTrue
}


// GetBooleanFunctions returns the boolean function registry
func GetBooleanFunctions() map[string]any {
	return map[string]any{
		"boolean":   Boolean,
		"if":        If,
		"isdefined": IsDefined,
	}
}