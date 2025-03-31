package tree

import (
	"errors"
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"

	"github.com/toakleaf/less.go/packages/less/src/less/data"
)

// Dimension represents a number with a unit
// It embeds Node and holds a numeric value and a unit.
type Dimension struct {
	*Node
	Value float64
	Unit  *Unit
}

// NewDimension creates a new Dimension instance.
// value can be a number (int, float64) or a numeric string. unit can be a string or *Unit. If unit is nil or empty string, an empty Unit is used.
func NewDimension(value interface{}, unit interface{}) (*Dimension, error) {
	var v float64
	switch t := value.(type) {
	case float64:
		v = t
	case int:
		v = float64(t)
	case string:
		var err error
		v, err = strconv.ParseFloat(t, 64)
		if err != nil {
			return nil, errors.New("Dimension is not a number.")
		}
	default:
		return nil, errors.New("Dimension is not a number.")
	}
	if math.IsNaN(v) {
		return nil, errors.New("Dimension is not a number.")
	}

	var u *Unit
	if unit == nil {
		u = NewUnit(nil, nil, "")
	} else {
		switch t := unit.(type) {
		case string:
			if t != "" {
				u = NewUnit([]string{t}, nil, t)
			} else {
				u = NewUnit(nil, nil, "")
			}
		case *Unit:
			u = t
		default:
			str := fmt.Sprintf("%v", t)
			if str != "" {
				u = NewUnit([]string{str}, nil, str)
			} else {
				u = NewUnit(nil, nil, "")
			}
		}
	}

	d := &Dimension{
		Node:  NewNode(),
		Value: v,
		Unit:  u,
	}
	d.SetParent(d.Unit, d.Node)
	return d, nil
}

// NewDimensionFrom is a helper constructor that creates a Dimension from a float64 value and *Unit without error handling.
func NewDimensionFrom(value float64, unit *Unit) *Dimension {
	d := &Dimension{
		Node:  NewNode(),
		Value: value,
		Unit:  unit,
	}
	d.SetParent(d.Unit, d.Node)
	return d
}

// Accept accepts a visitor and updates the unit.
func (d *Dimension) Accept(visitor Visitor) {
	result := visitor.Visit(d.Unit)
	if u, ok := result.(*Unit); ok {
		d.Unit = u
	}
}

// Eval returns the dimension itself.
func (d *Dimension) Eval(context interface{}) *Dimension {
	return d
}

// ToColor converts the Dimension to a grayscale Color.
func (d *Dimension) ToColor() *Color {
	return NewColor([]float64{d.Value, d.Value, d.Value}, 1, "")
}

// GenCSS generates the CSS representation for the Dimension.
func (d *Dimension) GenCSS(context interface{}, output *CSSOutput) {
	var strictUnits bool
	var compress bool
	if ctx, ok := context.(map[string]interface{}); ok {
		if val, exists := ctx["strictUnits"].(bool); exists {
			strictUnits = val
		}
		if comp, exists := ctx["compress"].(bool); exists {
			compress = comp
		}
	}
	if strictUnits && !d.Unit.IsSingular() {
		panic(fmt.Sprintf("Multiple units in dimension. Correct the units or use the unit function. Bad unit: %s", d.Unit.ToString()))
	}

	roundedValue := d.Fround(context, d.Value)
	strValue := fmt.Sprintf("%v", roundedValue)
	if roundedValue != 0 && math.Abs(roundedValue) < 0.000001 {
		// Mimic JavaScript's toFixed(20) and trim trailing zeros
		strValue = strings.TrimRight(fmt.Sprintf("%.20f", roundedValue), "0")
		strValue = strings.TrimRight(strValue, ".")
	}
	if compress {
		if roundedValue == 0 && d.Unit.IsLength() {
			output.Add(strValue, nil, nil)
			return
		}
		if roundedValue > 0 && roundedValue < 1 {
			if strings.HasPrefix(strValue, "0") {
				strValue = strValue[1:]
			}
		}
	}
	output.Add(strValue, nil, nil)
	d.Unit.GenCSS(context, output)
}

// Operate performs an arithmetic operation between two Dimensions and returns a new Dimension.
func (d *Dimension) Operate(context interface{}, op string, other *Dimension) *Dimension {
	value := d.OperateArithmetic(context, op, d.Value, other.Value)
	unit := d.Unit.Clone()

	if op == "+" || op == "-" {
		if len(unit.Numerator) == 0 && len(unit.Denominator) == 0 {
			unit = other.Unit.Clone()
			if d.Unit.BackupUnit != "" {
				unit.BackupUnit = d.Unit.BackupUnit
			}
		} else if len(other.Unit.Numerator) == 0 && len(unit.Denominator) == 0 {
			// do nothing
		} else {
			otherConverted := other.ConvertTo(d.Unit.UsedUnits())
			if ctx, ok := context.(map[string]interface{}); ok {
				if strict, exists := ctx["strictUnits"].(bool); exists && strict {
					if otherConverted.Unit.ToString() != unit.ToString() {
						panic(fmt.Sprintf("Incompatible units. Change the units or use the unit function. Bad units: '%s' and '%s'.", unit.ToString(), otherConverted.Unit.ToString()))
					}
				}
			}
			value = d.OperateArithmetic(context, op, d.Value, otherConverted.Value)
		}
	} else if op == "*" {
		unit.Numerator = append(unit.Numerator, other.Unit.Numerator...)
		unit.Denominator = append(unit.Denominator, other.Unit.Denominator...)
		sort.Strings(unit.Numerator)
		sort.Strings(unit.Denominator)
		unit.Cancel()
	} else if op == "/" {
		unit.Numerator = append(unit.Numerator, other.Unit.Denominator...)
		unit.Denominator = append(unit.Denominator, other.Unit.Numerator...)
		sort.Strings(unit.Numerator)
		sort.Strings(unit.Denominator)
		unit.Cancel()
	}
	return NewDimensionFrom(value, unit)
}

// OperateArithmetic wraps Node.Operate for performing arithmetic operations.
func (d *Dimension) OperateArithmetic(context interface{}, op string, a, b float64) float64 {
	return d.Node.Operate(context, op, a, b)
}

// Compare compares the Dimension with another. It returns a pointer to int if comparable, or nil if not (simulating undefined in JS).
func (d *Dimension) Compare(other interface{}) *int {
	o, ok := other.(*Dimension)
	if !ok || o == nil {
		return nil
	}
	var a, b *Dimension
	if d.Unit.IsEmpty() || o.Unit.IsEmpty() {
		a = d
		b = o
	} else {
		a = d.Unify()
		b = o.Unify()
		if a.Unit.Compare(b.Unit) != 0 {
			return nil
		}
	}
	cmp := NumericCompare(a.Value, b.Value)
	return &cmp
}

// Unify converts the Dimension to standard units.
func (d *Dimension) Unify() *Dimension {
	conv := map[string]interface{}{ "length": "px", "duration": "s", "angle": "rad" }
	return d.ConvertTo(conv)
}

// ConvertTo converts the Dimension to specified units. 'conversions' may be a string or a map from group to target unit.
func (d *Dimension) ConvertTo(conversions interface{}) *Dimension {
	value := d.Value
	unit := d.Unit.Clone()
	var convMap map[string]string

	switch t := conversions.(type) {
	case string:
		convMap = make(map[string]string)
		if _, ok := data.UnitConversionsLength[t]; ok {
			convMap["length"] = t
		}
		if _, ok := data.UnitConversionsDuration[t]; ok {
			convMap["duration"] = t
		}
		if _, ok := data.UnitConversionsAngle[t]; ok {
			convMap["angle"] = t
		}
	case map[string]interface{}:
		convMap = make(map[string]string)
		for key, val := range t {
			if s, ok := val.(string); ok {
				convMap[key] = s
			}
		}
	default:
		return d
	}

	for groupName, targetUnit := range convMap {
		var group map[string]float64
		switch groupName {
		case "length":
			group = data.UnitConversionsLength
		case "duration":
			group = data.UnitConversionsDuration
		case "angle":
			group = data.UnitConversionsAngle
		default:
			continue
		}
		unit.Map(func(atomicUnit string, denominator bool) string {
			if factor, exists := group[atomicUnit]; exists {
				if targetFactor, ok := group[targetUnit]; ok {
					if denominator {
						value = value / (factor / targetFactor)
					} else {
						value = value * (factor / targetFactor)
					}
					return targetUnit
				}
			}
			return atomicUnit
		})
	}

	unit.Cancel()
	return NewDimensionFrom(value, unit)
} 