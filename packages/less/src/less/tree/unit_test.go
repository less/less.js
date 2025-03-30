package tree

import (
	"strings"
	"testing"
)

func TestUnit(t *testing.T) {
	t.Run("constructor", func(t *testing.T) {
		t.Run("creates a unit with numerator only", func(t *testing.T) {
			unit := NewUnit([]string{"px"}, nil, "")
			if len(unit.Numerator) != 1 || unit.Numerator[0] != "px" {
				t.Errorf("Expected numerator ['px'], got %v", unit.Numerator)
			}
			if len(unit.Denominator) != 0 {
				t.Errorf("Expected empty denominator, got %v", unit.Denominator)
			}
			if unit.BackupUnit != "px" {
				t.Errorf("Expected backupUnit 'px', got %s", unit.BackupUnit)
			}
		})

		t.Run("creates a unit with numerator and denominator", func(t *testing.T) {
			unit := NewUnit([]string{"px"}, []string{"s"}, "")
			if len(unit.Numerator) != 1 || unit.Numerator[0] != "px" {
				t.Errorf("Expected numerator ['px'], got %v", unit.Numerator)
			}
			if len(unit.Denominator) != 1 || unit.Denominator[0] != "s" {
				t.Errorf("Expected denominator ['s'], got %v", unit.Denominator)
			}
			if unit.BackupUnit != "px" {
				t.Errorf("Expected backupUnit 'px', got %s", unit.BackupUnit)
			}
		})

		t.Run("creates a unit with explicit backup unit", func(t *testing.T) {
			unit := NewUnit([]string{"px"}, []string{"s"}, "em")
			if len(unit.Numerator) != 1 || unit.Numerator[0] != "px" {
				t.Errorf("Expected numerator ['px'], got %v", unit.Numerator)
			}
			if len(unit.Denominator) != 1 || unit.Denominator[0] != "s" {
				t.Errorf("Expected denominator ['s'], got %v", unit.Denominator)
			}
			if unit.BackupUnit != "em" {
				t.Errorf("Expected backupUnit 'em', got %s", unit.BackupUnit)
			}
		})

		t.Run("creates an empty unit", func(t *testing.T) {
			unit := NewUnit(nil, nil, "")
			if len(unit.Numerator) != 0 {
				t.Errorf("Expected empty numerator, got %v", unit.Numerator)
			}
			if len(unit.Denominator) != 0 {
				t.Errorf("Expected empty denominator, got %v", unit.Denominator)
			}
			if unit.BackupUnit != "" {
				t.Errorf("Expected empty backupUnit, got %s", unit.BackupUnit)
			}
		})

		t.Run("handles empty arrays", func(t *testing.T) {
			unit := NewUnit([]string{}, []string{}, "")
			if len(unit.Numerator) != 0 {
				t.Errorf("Expected empty numerator, got %v", unit.Numerator)
			}
			if len(unit.Denominator) != 0 {
				t.Errorf("Expected empty denominator, got %v", unit.Denominator)
			}
			if unit.BackupUnit != "" {
				t.Errorf("Expected empty backupUnit, got %s", unit.BackupUnit)
			}
		})

		t.Run("handles null/undefined parameters", func(t *testing.T) {
			unit1 := NewUnit(nil, []string{"s"}, "")
			if len(unit1.Numerator) != 0 {
				t.Errorf("Expected empty numerator, got %v", unit1.Numerator)
			}
			if len(unit1.Denominator) != 1 || unit1.Denominator[0] != "s" {
				t.Errorf("Expected denominator ['s'], got %v", unit1.Denominator)
			}
			if unit1.BackupUnit != "" {
				t.Errorf("Expected empty backupUnit, got %s", unit1.BackupUnit)
			}

			unit2 := NewUnit([]string{"px"}, nil, "")
			if len(unit2.Numerator) != 1 || unit2.Numerator[0] != "px" {
				t.Errorf("Expected numerator ['px'], got %v", unit2.Numerator)
			}
			if len(unit2.Denominator) != 0 {
				t.Errorf("Expected empty denominator, got %v", unit2.Denominator)
			}
			if unit2.BackupUnit != "px" {
				t.Errorf("Expected backupUnit 'px', got %s", unit2.BackupUnit)
			}

			unit3 := NewUnit(nil, nil, "em")
			if len(unit3.Numerator) != 0 {
				t.Errorf("Expected empty numerator, got %v", unit3.Numerator)
			}
			if len(unit3.Denominator) != 0 {
				t.Errorf("Expected empty denominator, got %v", unit3.Denominator)
			}
			if unit3.BackupUnit != "em" {
				t.Errorf("Expected backupUnit 'em', got %s", unit3.BackupUnit)
			}
		})
	})

	t.Run("clone", func(t *testing.T) {
		t.Run("creates a deep copy of the unit", func(t *testing.T) {
			original := NewUnit([]string{"px"}, []string{"s"}, "")
			cloned := original.Clone()

			if len(cloned.Numerator) != len(original.Numerator) {
				t.Errorf("Expected numerator length %d, got %d", len(original.Numerator), len(cloned.Numerator))
			}
			if len(cloned.Denominator) != len(original.Denominator) {
				t.Errorf("Expected denominator length %d, got %d", len(original.Denominator), len(cloned.Denominator))
			}
			if cloned.BackupUnit != original.BackupUnit {
				t.Errorf("Expected backupUnit %s, got %s", original.BackupUnit, cloned.BackupUnit)
			}
		})
	})

	t.Run("genCSS", func(t *testing.T) {
		t.Run("outputs single numerator unit", func(t *testing.T) {
			unit := NewUnit([]string{"px"}, nil, "")
			var output []string
			outputFn := func(chunk interface{}, fileInfo interface{}, index interface{}) {
				output = append(output, chunk.(string))
			}
			unit.GenCSS(nil, &CSSOutput{Add: outputFn})
			if len(output) != 1 || output[0] != "px" {
				t.Errorf("Expected output ['px'], got %v", output)
			}
		})

		t.Run("outputs backup unit when no strict units and no single numerator", func(t *testing.T) {
			unit := NewUnit([]string{"px", "em"}, nil, "em")
			var output []string
			outputFn := func(chunk interface{}, fileInfo interface{}, index interface{}) {
				output = append(output, chunk.(string))
			}
			unit.GenCSS(nil, &CSSOutput{Add: outputFn})
			if len(output) != 1 || output[0] != "em" {
				t.Errorf("Expected output ['em'], got %v", output)
			}
		})

		t.Run("handles strict units mode", func(t *testing.T) {
			unit := NewUnit([]string{"px", "em"}, nil, "")
			var output []string
			outputFn := func(chunk interface{}, fileInfo interface{}, index interface{}) {
				output = append(output, chunk.(string))
			}
			unit.GenCSS(map[string]interface{}{"strictUnits": true}, &CSSOutput{Add: outputFn})
			if len(output) != 0 {
				t.Errorf("Expected empty output, got %v", output)
			}
		})

		t.Run("handles null context", func(t *testing.T) {
			unit := NewUnit([]string{"px"}, nil, "")
			var output []string
			outputFn := func(chunk interface{}, fileInfo interface{}, index interface{}) {
				output = append(output, chunk.(string))
			}
			unit.GenCSS(nil, &CSSOutput{Add: outputFn})
			if len(output) != 1 || output[0] != "px" {
				t.Errorf("Expected output ['px'], got %v", output)
			}
		})

		t.Run("handles undefined context", func(t *testing.T) {
			unit := NewUnit([]string{"px"}, nil, "")
			var output []string
			outputFn := func(chunk interface{}, fileInfo interface{}, index interface{}) {
				output = append(output, chunk.(string))
			}
			unit.GenCSS(nil, &CSSOutput{Add: outputFn})
			if len(output) != 1 || output[0] != "px" {
				t.Errorf("Expected output ['px'], got %v", output)
			}
		})

		t.Run("handles empty backupUnit", func(t *testing.T) {
			unit := NewUnit([]string{"px", "em"}, nil, "")
			var output []string
			outputFn := func(chunk interface{}, fileInfo interface{}, index interface{}) {
				output = append(output, chunk.(string))
			}
			unit.GenCSS(nil, &CSSOutput{Add: outputFn})
			if len(output) != 1 || output[0] != "px" {
				t.Errorf("Expected output ['px'], got %v", output)
			}
		})

		t.Run("handles multiple backup units", func(t *testing.T) {
			unit := NewUnit([]string{"px", "em"}, []string{"s"}, "em")
			var output []string
			outputFn := func(chunk interface{}, fileInfo interface{}, index interface{}) {
				output = append(output, chunk.(string))
			}
			unit.GenCSS(nil, &CSSOutput{Add: outputFn})
			if len(output) != 1 || output[0] != "em" {
				t.Errorf("Expected output ['em'], got %v", output)
			}
		})
	})

	t.Run("toString", func(t *testing.T) {
		t.Run("returns empty string for empty unit", func(t *testing.T) {
			unit := NewUnit(nil, nil, "")
			if unit.ToString() != "" {
				t.Errorf("Expected empty string, got %s", unit.ToString())
			}
		})

		t.Run("returns single numerator unit", func(t *testing.T) {
			unit := NewUnit([]string{"px"}, nil, "")
			if unit.ToString() != "px" {
				t.Errorf("Expected 'px', got %s", unit.ToString())
			}
		})

		t.Run("returns unit with numerator and denominator", func(t *testing.T) {
			unit := NewUnit([]string{"px"}, []string{"s"}, "")
			if unit.ToString() != "px/s" {
				t.Errorf("Expected 'px/s', got %s", unit.ToString())
			}
		})

		t.Run("handles multiple numerators and denominators", func(t *testing.T) {
			unit := NewUnit([]string{"px", "em"}, []string{"s", "ms"}, "")
			result := unit.ToString()
			if !strings.Contains(result, "px") || !strings.Contains(result, "em") || !strings.Contains(result, "s") || !strings.Contains(result, "ms") {
				t.Errorf("Expected string containing px, em, s, and ms, got %s", result)
			}
		})

		t.Run("handles very long unit names", func(t *testing.T) {
			longUnit := strings.Repeat("a", 1000)
			unit := NewUnit([]string{longUnit}, nil, "")
			if unit.ToString() != longUnit {
				t.Errorf("Expected %s, got %s", longUnit, unit.ToString())
			}
		})

		t.Run("handles special characters in unit names", func(t *testing.T) {
			unit := NewUnit([]string{"unit-with-special-chars!@#$%^&*()"}, nil, "")
			expected := "unit-with-special-chars!@#$%^&*()"
			if unit.ToString() != expected {
				t.Errorf("Expected %s, got %s", expected, unit.ToString())
			}
		})

		t.Run("handles empty strings in arrays", func(t *testing.T) {
			unit := NewUnit([]string{"", "px"}, []string{""}, "")
			if unit.ToString() != "*px/" {
				t.Errorf("Expected '*px/', got %s", unit.ToString())
			}
		})

		t.Run("handles empty numerator with denominator", func(t *testing.T) {
			unit := NewUnit(nil, []string{"s"}, "")
			if unit.ToString() != "/s" {
				t.Errorf("Expected '/s', got %s", unit.ToString())
			}
		})

		t.Run("handles large number of units", func(t *testing.T) {
			numerators := make([]string, 10)
			denominators := make([]string, 5)
			for i := range numerators {
				numerators[i] = "px"
			}
			for i := range denominators {
				denominators[i] = "s"
			}
			unit := NewUnit(numerators, denominators, "")
			result := unit.ToString()
			parts := strings.Split(result, "*")
			if len(parts) != 10 {
				t.Errorf("Expected 10 numerator parts, got %d", len(parts))
			}
			denomParts := strings.Split(result, "/")
			if len(denomParts) != 6 { // 5 denominators + 1 numerator part
				t.Errorf("Expected 6 parts total, got %d", len(denomParts))
			}
		})
	})

	t.Run("compare", func(t *testing.T) {
		t.Run("returns 0 for identical units", func(t *testing.T) {
			unit1 := NewUnit([]string{"px"}, nil, "")
			unit2 := NewUnit([]string{"px"}, nil, "")
			if unit1.Compare(&Node{Value: unit2}) != 0 {
				t.Error("Expected comparison to return 0")
			}
		})

		t.Run("returns 0 for different units", func(t *testing.T) {
			unit1 := NewUnit([]string{"px"}, nil, "")
			unit2 := NewUnit([]string{"em"}, nil, "")
			if unit1.Compare(&Node{Value: unit2}) != 0 {
				t.Error("Expected comparison to return 0")
			}
		})
	})

	t.Run("is", func(t *testing.T) {
		t.Run("returns true for matching unit string", func(t *testing.T) {
			unit := NewUnit([]string{"px"}, nil, "")
			if !unit.Is("px") {
				t.Error("Expected Is('px') to return true")
			}
		})

		t.Run("returns true for matching unit string case insensitive", func(t *testing.T) {
			unit := NewUnit([]string{"px"}, nil, "")
			if !unit.Is("PX") {
				t.Error("Expected Is('PX') to return true")
			}
		})

		t.Run("returns false for non-matching unit string", func(t *testing.T) {
			unit := NewUnit([]string{"px"}, nil, "")
			if unit.Is("em") {
				t.Error("Expected Is('em') to return false")
			}
		})
	})

	t.Run("isLength", func(t *testing.T) {
		t.Run("returns true for valid length units", func(t *testing.T) {
			lengthUnits := []string{
				"px", "em", "ex", "ch", "rem", "in", "cm", "mm", "pc", "pt",
				"vw", "vh", "vmin", "vmax",
			}
			for _, unitStr := range lengthUnits {
				unit := NewUnit([]string{unitStr}, nil, "")
				if !unit.IsLength() {
					t.Errorf("Expected IsLength() to return true for %s", unitStr)
				}
			}
		})

		t.Run("returns false for non-length units", func(t *testing.T) {
			nonLengthUnits := []string{"s", "ms", "deg", "rad", "grad", "turn"}
			for _, unitStr := range nonLengthUnits {
				unit := NewUnit([]string{unitStr}, nil, "")
				if unit.IsLength() {
					t.Errorf("Expected IsLength() to return false for %s", unitStr)
				}
			}
		})

		t.Run("handles combined units", func(t *testing.T) {
			unit := NewUnit([]string{"px"}, []string{"s"}, "")
			if !unit.IsLength() {
				t.Error("Expected IsLength() to return true for combined units")
			}
		})

		t.Run("handles invalid unit combinations", func(t *testing.T) {
			unit := NewUnit([]string{"invalid-unit"}, nil, "")
			if unit.IsLength() {
				t.Error("Expected IsLength() to return false for invalid unit")
			}
		})

		t.Run("handles case sensitivity", func(t *testing.T) {
			unit := NewUnit([]string{"PX"}, nil, "")
			if !unit.IsLength() {
				t.Error("Expected IsLength() to return true for uppercase unit")
			}
		})

		t.Run("handles multiple length units in numerator", func(t *testing.T) {
			unit := NewUnit([]string{"px", "em"}, nil, "")
			if !unit.IsLength() {
				t.Error("Expected IsLength() to return true for multiple length units")
			}
		})
	})

	t.Run("isEmpty", func(t *testing.T) {
		t.Run("returns true for empty unit", func(t *testing.T) {
			unit := NewUnit(nil, nil, "")
			if !unit.IsEmpty() {
				t.Error("Expected IsEmpty() to return true")
			}
		})

		t.Run("returns false for unit with numerator", func(t *testing.T) {
			unit := NewUnit([]string{"px"}, nil, "")
			if unit.IsEmpty() {
				t.Error("Expected IsEmpty() to return false")
			}
		})

		t.Run("returns false for unit with denominator", func(t *testing.T) {
			unit := NewUnit(nil, []string{"s"}, "")
			if unit.IsEmpty() {
				t.Error("Expected IsEmpty() to return false")
			}
		})
	})

	t.Run("isSingular", func(t *testing.T) {
		t.Run("returns true for single numerator unit", func(t *testing.T) {
			unit := NewUnit([]string{"px"}, nil, "")
			if !unit.IsSingular() {
				t.Error("Expected IsSingular() to return true")
			}
		})

		t.Run("returns false for multiple numerators", func(t *testing.T) {
			unit := NewUnit([]string{"px", "em"}, nil, "")
			if unit.IsSingular() {
				t.Error("Expected IsSingular() to return false")
			}
		})

		t.Run("returns false for unit with denominator", func(t *testing.T) {
			unit := NewUnit([]string{"px"}, []string{"s"}, "")
			if unit.IsSingular() {
				t.Error("Expected IsSingular() to return false")
			}
		})
	})

	t.Run("map", func(t *testing.T) {
		t.Run("applies callback to numerator and denominator", func(t *testing.T) {
			unit := NewUnit([]string{"px"}, []string{"s"}, "")
			unit.Map(func(u string, isDenominator bool) string {
				return strings.ToUpper(u)
			})
			if len(unit.Numerator) != 1 || unit.Numerator[0] != "PX" {
				t.Errorf("Expected numerator ['PX'], got %v", unit.Numerator)
			}
			if len(unit.Denominator) != 1 || unit.Denominator[0] != "S" {
				t.Errorf("Expected denominator ['S'], got %v", unit.Denominator)
			}
		})

		t.Run("handles callback throwing errors", func(t *testing.T) {
			unit := NewUnit([]string{"px"}, nil, "")
			defer func() {
				if r := recover(); r == nil {
					t.Error("Expected panic, got none")
				}
			}()
			unit.Map(func(u string, isDenominator bool) string {
				panic("Test error")
			})
		})

		t.Run("handles callback returning different types", func(t *testing.T) {
			unit := NewUnit([]string{"px", "em"}, nil, "")
			unit.Map(func(u string, isDenominator bool) string {
				if u == "px" {
					return "123"
				}
				return u
			})
			if len(unit.Numerator) != 2 || unit.Numerator[0] != "123" || unit.Numerator[1] != "em" {
				t.Errorf("Expected numerator ['123', 'em'], got %v", unit.Numerator)
			}
		})

		t.Run("handles callback modifying unit name", func(t *testing.T) {
			unit := NewUnit([]string{"px"}, nil, "")
			unit.Map(func(u string, isDenominator bool) string {
				return u + "-modified"
			})
			if len(unit.Numerator) != 1 || unit.Numerator[0] != "px-modified" {
				t.Errorf("Expected numerator ['px-modified'], got %v", unit.Numerator)
			}
		})
	})

	t.Run("usedUnits", func(t *testing.T) {
		t.Run("returns object with used units from unitConversions", func(t *testing.T) {
			unit := NewUnit([]string{"px", "cm"}, []string{"s"}, "")
			result := unit.UsedUnits()
			if result["length"] != "cm" {
				t.Errorf("Expected length unit 'cm', got %s", result["length"])
			}
		})

		t.Run("handles multiple unit conversion groups", func(t *testing.T) {
			unit := NewUnit([]string{"px", "s", "deg"}, []string{"ms"}, "")
			result := unit.UsedUnits()
			if result["length"] != "px" {
				t.Errorf("Expected length unit 'px', got %s", result["length"])
			}
			if result["duration"] != "s" {
				t.Errorf("Expected duration unit 's', got %s", result["duration"])
			}
			if result["angle"] != "deg" {
				t.Errorf("Expected angle unit 'deg', got %s", result["angle"])
			}
		})

		t.Run("returns empty object when no units match conversion groups", func(t *testing.T) {
			unit := NewUnit([]string{"invalid-unit"}, []string{"another-invalid"}, "")
			result := unit.UsedUnits()
			if len(result) != 0 {
				t.Errorf("Expected empty result, got %v", result)
			}
		})
	})

	t.Run("cancel", func(t *testing.T) {
		t.Run("cancels matching units between numerator and denominator", func(t *testing.T) {
			unit := NewUnit([]string{"px", "em"}, []string{"px", "s"}, "")
			unit.Cancel()
			if len(unit.Numerator) != 1 || unit.Numerator[0] != "em" {
				t.Errorf("Expected numerator ['em'], got %v", unit.Numerator)
			}
			if len(unit.Denominator) != 1 || unit.Denominator[0] != "s" {
				t.Errorf("Expected denominator ['s'], got %v", unit.Denominator)
			}
		})

		t.Run("handles multiple occurrences of same unit", func(t *testing.T) {
			unit := NewUnit([]string{"px", "px"}, []string{"px"}, "")
			unit.Cancel()
			if len(unit.Numerator) != 1 || unit.Numerator[0] != "px" {
				t.Errorf("Expected numerator ['px'], got %v", unit.Numerator)
			}
			if len(unit.Denominator) != 0 {
				t.Errorf("Expected empty denominator, got %v", unit.Denominator)
			}
		})

		t.Run("handles empty unit", func(t *testing.T) {
			unit := NewUnit(nil, nil, "")
			unit.Cancel()
			if len(unit.Numerator) != 0 {
				t.Errorf("Expected empty numerator, got %v", unit.Numerator)
			}
			if len(unit.Denominator) != 0 {
				t.Errorf("Expected empty denominator, got %v", unit.Denominator)
			}
		})

		t.Run("handles multiple occurrences in both numerator and denominator", func(t *testing.T) {
			unit := NewUnit([]string{"px", "px", "em"}, []string{"px", "px", "s"}, "")
			unit.Cancel()
			if len(unit.Numerator) != 1 || unit.Numerator[0] != "em" {
				t.Errorf("Expected numerator ['em'], got %v", unit.Numerator)
			}
			if len(unit.Denominator) != 1 || unit.Denominator[0] != "s" {
				t.Errorf("Expected denominator ['s'], got %v", unit.Denominator)
			}
		})

		t.Run("handles case-sensitive unit names", func(t *testing.T) {
			unit := NewUnit([]string{"px", "PX"}, []string{"Px"}, "")
			unit.Cancel()
			if len(unit.Numerator) != 2 || unit.Numerator[0] != "PX" || unit.Numerator[1] != "px" {
				t.Errorf("Expected numerator ['PX', 'px'], got %v", unit.Numerator)
			}
			if len(unit.Denominator) != 1 || unit.Denominator[0] != "Px" {
				t.Errorf("Expected denominator ['Px'], got %v", unit.Denominator)
			}
		})

		t.Run("handles empty arrays after cancellation", func(t *testing.T) {
			unit := NewUnit([]string{"px"}, []string{"px"}, "")
			unit.Cancel()
			if len(unit.Numerator) != 0 {
				t.Errorf("Expected empty numerator, got %v", unit.Numerator)
			}
			if len(unit.Denominator) != 0 {
				t.Errorf("Expected empty denominator, got %v", unit.Denominator)
			}
		})
	})
} 