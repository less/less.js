package less_go

// RegisterTestFunctions adds the custom test functions used in integration tests
// These functions are defined in the JavaScript test setup in less-test.js
func RegisterTestFunctions(registry *Registry) {
	if registry == nil {
		return
	}

	// add function: adds two numbers
	// JavaScript: add: function (a, b) { return new(less.tree.Dimension)(a.value + b.value); }
	registry.Add("add", func(args ...any) any {
		if len(args) < 2 {
			return nil
		}
		
		// Extract numeric values from the arguments
		var aVal, bVal float64
		var aUnit, bUnit any
		
		if a, ok := args[0].(*Dimension); ok {
			aVal = a.Value
			aUnit = a.Unit
		} else if n, ok := args[0].(map[string]any); ok {
			if val, exists := n["value"]; exists {
				if v, ok := val.(float64); ok {
					aVal = v
				}
			}
			if unit, exists := n["unit"]; exists {
				aUnit = unit
			}
		}
		
		if b, ok := args[1].(*Dimension); ok {
			bVal = b.Value
			bUnit = b.Unit
		} else if n, ok := args[1].(map[string]any); ok {
			if val, exists := n["value"]; exists {
				if v, ok := val.(float64); ok {
					bVal = v
				}
			}
			if unit, exists := n["unit"]; exists {
				bUnit = unit
			}
		}
		
		// Use the first unit or default to the second
		resultUnit := aUnit
		if resultUnit == nil {
			resultUnit = bUnit
		}
		
		result, err := NewDimension(aVal+bVal, resultUnit)
		if err != nil {
			return nil
		}
		return result
	})

	// increment function: adds 1 to a number
	// JavaScript: increment: function (a) { return new(less.tree.Dimension)(a.value + 1); }
	registry.Add("increment", func(args ...any) any {
		if len(args) < 1 {
			return nil
		}
		
		var val float64
		var unit any
		
		if a, ok := args[0].(*Dimension); ok {
			val = a.Value
			unit = a.Unit
		} else if n, ok := args[0].(map[string]any); ok {
			if v, exists := n["value"]; exists {
				if value, ok := v.(float64); ok {
					val = value
				}
			}
			if u, exists := n["unit"]; exists {
				unit = u
			}
		}
		
		result, err := NewDimension(val+1, unit)
		if err != nil {
			return nil
		}
		return result
	})

	// _color function: converts "evil red" to #660000
	// JavaScript: _color: function (str) { if (str.value === 'evil red') { return new(less.tree.Color)('600'); } }
	registry.Add("_color", func(args ...any) any {
		if len(args) < 1 {
			return nil
		}
		
		var strVal string
		if s, ok := args[0].(*Quoted); ok {
			strVal = s.value
		} else if s, ok := args[0].(string); ok {
			strVal = s
		} else if q, ok := args[0].(map[string]any); ok {
			if val, exists := q["value"]; exists {
				if str, ok := val.(string); ok {
					strVal = str
				}
			}
		}
		
		if strVal == "evil red" {
			// Return Color with hex value 600 (which becomes #660000)
			return NewColor("600", 1.0, "")
		}
		
		return nil
	})
}