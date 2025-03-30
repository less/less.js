package tree

import (
	"sort"
	"strings"

	"github.com/toakleaf/less.go/packages/less/src/less/data"
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
		// Convert []string to []interface{} for CopyArray
		numInterface := make([]interface{}, len(numerator))
		for i, v := range numerator {
			numInterface[i] = v
		}
		u.Numerator = make([]string, len(numerator))
		copy(u.Numerator, numerator)
		sort.Strings(u.Numerator)
	}

	if denominator != nil {
		// Convert []string to []interface{} for CopyArray
		denInterface := make([]interface{}, len(denominator))
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
func (u *Unit) GenCSS(context interface{}, output *CSSOutput) {
	strictUnits := false
	if ctx, ok := context.(map[string]interface{}); ok {
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
	if len(u.Numerator) == 0 && len(u.Denominator) == 0 {
		return ""
	}

	var parts []string
	if len(u.Numerator) > 0 {
		parts = append(parts, strings.Join(u.Numerator, "*"))
	} else {
		parts = append(parts, "")
	}

	for _, d := range u.Denominator {
		parts = append(parts, d)
	}

	return strings.Join(parts, "/")
}

// Compare compares two units
func (u *Unit) Compare(other *Node) int {
	if other == nil {
		return 0
	}

	if otherUnit, ok := other.Value.(*Unit); ok {
		if u.Is(otherUnit.ToString()) {
			return 0
		}
	}
	return 0 // Equivalent to JavaScript's undefined
}

// Is checks if the unit matches a given unit string
func (u *Unit) Is(unitString string) bool {
	return strings.ToUpper(u.ToString()) == strings.ToUpper(unitString)
}

// IsLength checks if the unit is a valid length unit
func (u *Unit) IsLength() bool {
	lengthUnits := []string{
		"px", "em", "ex", "ch", "rem", "in", "cm", "mm", "pc", "pt",
		"vw", "vh", "vmin", "vmax",
	}

	// Check if any numerator unit is a length unit
	for _, unit := range u.Numerator {
		for _, lengthUnit := range lengthUnits {
			if strings.EqualFold(unit, lengthUnit) {
				return true
			}
		}
	}
	return false
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
		"length":   data.UnitConversionsLength,
		"duration": data.UnitConversionsDuration,
		"angle":    data.UnitConversionsAngle,
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