package less_go

import (
	"sort"
	"strings"
)

// Unit represents a unit in the Less AST
type Unit struct {
	*Node
	Numerator   []string
	Denominator []string
	BackupUnit  string
}

// NewUnit creates a new Unit instance
func NewUnit(numerator []string, denominator []string, backupUnit string) *Unit {
	u := &Unit{
		Node:        NewNode(),
		Numerator:   make([]string, 0),
		Denominator: make([]string, 0),
	}

	if numerator != nil {
		// Convert []string to []any for CopyArray
		numInterface := make([]any, len(numerator))
		for i, v := range numerator {
			numInterface[i] = v
		}
		u.Numerator = make([]string, len(numerator))
		copy(u.Numerator, numerator)
		sort.Strings(u.Numerator)
	}

	if denominator != nil {
		// Convert []string to []any for CopyArray
		denInterface := make([]any, len(denominator))
		for i, v := range denominator {
			denInterface[i] = v
		}
		u.Denominator = make([]string, len(denominator))
		copy(u.Denominator, denominator)
		sort.Strings(u.Denominator)
	}

	if backupUnit != "" {
		u.BackupUnit = backupUnit
	} else if len(numerator) > 0 {
		u.BackupUnit = numerator[0]
	}

	return u
}

// Type returns the type of the node for visitor pattern consistency
func (u *Unit) Type() string {
	return "Unit"
}

// Clone creates a deep copy of the unit
func (u *Unit) Clone() *Unit {
	// Create new slices and copy values
	newNum := make([]string, len(u.Numerator))
	copy(newNum, u.Numerator)
	newDen := make([]string, len(u.Denominator))
	copy(newDen, u.Denominator)

	return NewUnit(newNum, newDen, u.BackupUnit)
}

// GenCSS generates CSS representation
func (u *Unit) GenCSS(context any, output *CSSOutput) {
	strictUnits := false
	if ctx, ok := context.(map[string]any); ok {
		if strict, ok := ctx["strictUnits"].(bool); ok {
			strictUnits = strict
		}
	}

	if len(u.Numerator) == 1 {
		output.Add(u.Numerator[0], nil, nil)
	} else if !strictUnits && u.BackupUnit != "" {
		output.Add(u.BackupUnit, nil, nil)
	} else if !strictUnits && len(u.Denominator) > 0 {
		output.Add(u.Denominator[0], nil, nil)
	}
}

// ToString returns the string representation of the unit
func (u *Unit) ToString() string {
	returnStr := strings.Join(u.Numerator, "*")
	for i := 0; i < len(u.Denominator); i++ {
		returnStr += "/" + u.Denominator[i]
	}
	return returnStr
}

// Compare compares this unit with another unit.
func (u *Unit) Compare(other *Unit) int {
	if other == nil {
		return 999 // undefined equivalent in JavaScript
	}

	if u.Is(other.ToString()) {
		return 0 // Units are equal by string representation
	}

	// Units are not equal
	return 999 // undefined equivalent in JavaScript
}

// Is checks if the unit matches a given unit string
func (u *Unit) Is(unitString string) bool {
	return strings.EqualFold(u.ToString(), unitString)
}

// IsLength checks if the unit is a valid length unit
func (u *Unit) IsLength() bool {
	// Match JavaScript: RegExp('^(px|em|ex|ch|rem|in|cm|mm|pc|pt|ex|vw|vh|vmin|vmax)$', 'gi').test(this.toCSS())
	// Note: JavaScript has 'ex' twice in the regex
	css := u.ToCSS(nil)
	lengthUnits := []string{
		"px", "em", "ex", "ch", "rem", "in", "cm", "mm", "pc", "pt",
		"vw", "vh", "vmin", "vmax",
	}
	
	for _, lengthUnit := range lengthUnits {
		if strings.EqualFold(css, lengthUnit) {
			return true
		}
	}
	return false
}

// ToCSS generates the CSS representation of the unit
func (u *Unit) ToCSS(context any) string {
	// Use GenCSS to generate the CSS output
	var chunks []string
	output := &CSSOutput{
		Add: func(chunk any, fileInfo any, index any) {
			if chunk != nil {
				chunks = append(chunks, chunk.(string))
			}
		},
		IsEmpty: func() bool {
			return len(chunks) == 0
		},
	}
	
	u.GenCSS(context, output)
	return strings.Join(chunks, "")
}

// IsEmpty checks if the unit has no numerators or denominators
func (u *Unit) IsEmpty() bool {
	return len(u.Numerator) == 0 && len(u.Denominator) == 0
}

// IsSingular checks if the unit has exactly one numerator and no denominators
func (u *Unit) IsSingular() bool {
	return len(u.Numerator) <= 1 && len(u.Denominator) == 0
}

// Map applies a callback function to each unit in numerator and denominator
func (u *Unit) Map(callback func(string, bool) string) {
	// Create new slices to store results
	newNum := make([]string, len(u.Numerator))
	newDen := make([]string, len(u.Denominator))

	// Apply callback to numerator
	for i := range u.Numerator {
		newNum[i] = callback(u.Numerator[i], false)
	}

	// Apply callback to denominator
	for i := range u.Denominator {
		newDen[i] = callback(u.Denominator[i], true)
	}

	// Update the unit with new values
	u.Numerator = newNum
	u.Denominator = newDen

	// Sort to maintain consistent order
	sort.Strings(u.Numerator)
	sort.Strings(u.Denominator)
}

// UsedUnits returns a map of used unit types
func (u *Unit) UsedUnits() map[string]string {
	result := make(map[string]string)

	// Map unit conversions
	conversions := map[string]map[string]float64{
		"length":   UnitConversionsLength,
		"duration": UnitConversionsDuration,
		"angle":    UnitConversionsAngle,
	}

	for groupName, group := range conversions {
		u.Map(func(atomicUnit string, isDenominator bool) string {
			if _, exists := group[atomicUnit]; exists {
				if _, hasResult := result[groupName]; !hasResult {
					result[groupName] = atomicUnit
				}
			}
			return atomicUnit
		})
	}

	return result
}

// Cancel cancels matching units between numerator and denominator
func (u *Unit) Cancel() {
	counter := make(map[string]int)

	// Count numerators
	for _, unit := range u.Numerator {
		counter[unit]++
	}

	// Subtract denominators
	for _, unit := range u.Denominator {
		counter[unit]--
	}

	// Reset arrays
	u.Numerator = make([]string, 0)
	u.Denominator = make([]string, 0)

	// Rebuild arrays based on counter
	for unit, count := range counter {
		if count > 0 {
			for i := 0; i < count; i++ {
				u.Numerator = append(u.Numerator, unit)
			}
		} else if count < 0 {
			for i := 0; i < -count; i++ {
				u.Denominator = append(u.Denominator, unit)
			}
		}
	}

	sort.Strings(u.Numerator)
	sort.Strings(u.Denominator)
} 