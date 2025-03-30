package data

import "math"

// UnitConversionsLength maps length units to their base unit (meters)
var UnitConversionsLength = map[string]float64{
	"m":  1,
	"cm": 0.01,
	"mm": 0.001,
	"in": 0.0254,
	"px": 0.0254 / 96,
	"pt": 0.0254 / 72,
	"pc": 0.0254 / 72 * 12,
}

// UnitConversionsDuration maps duration units to their base unit (seconds)
var UnitConversionsDuration = map[string]float64{
	"s":  1,
	"ms": 0.001,
}

// UnitConversionsAngle maps angle units to their base unit (turns)
var UnitConversionsAngle = map[string]float64{
	"rad":  1 / (2 * math.Pi),
	"deg":  1 / 360.0,
	"grad": 1 / 400.0,
	"turn": 1,
} 