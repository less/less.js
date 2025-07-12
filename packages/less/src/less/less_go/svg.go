package less_go

import (
	"fmt"
	"net/url"
	"strings"
)

// SvgFunctions provides all the svg-related functions
var SvgFunctions = map[string]interface{}{
	"svg-gradient": SvgGradient,
}

// SvgContext represents the context needed for svg function execution
type SvgContext struct {
	Index           int
	CurrentFileInfo map[string]any
	Context         EvalContext
}

// SvgGradient implements the svg-gradient() function which creates SVG gradient data URIs
func SvgGradient(ctx SvgContext, args ...interface{}) (*URL, error) {
	if len(args) == 0 {
		return nil, fmt.Errorf("svg-gradient expects direction, start_color [start_position], [color position,]..., end_color [end_position] or direction, color list")
	}

	direction, ok := args[0].(*Quoted)
	if !ok {
		return nil, fmt.Errorf("svg-gradient first argument must be a direction")
	}

	directionValue := direction.value // Access private field directly since we're in same package

	var stops []interface{}

	if len(args) == 2 {
		// Check if second argument is an Expression (color list)
		if expr, ok := args[1].(*Expression); ok {
			if len(expr.Value) < 2 {
				return nil, fmt.Errorf("svg-gradient expects direction, start_color [start_position], [color position,]..., end_color [end_position] or direction, color list")
			}
			stops = expr.Value
		} else {
			return nil, fmt.Errorf("svg-gradient expects direction, start_color [start_position], [color position,]..., end_color [end_position] or direction, color list")
		}
	} else if len(args) < 3 {
		return nil, fmt.Errorf("svg-gradient expects direction, start_color [start_position], [color position,]..., end_color [end_position] or direction, color list")
	} else {
		stops = args[1:]
	}

	var gradientDirectionSvg string
	var gradientType string = "linear"
	var rectangleDimension string = `x="0" y="0" width="1" height="1"`

	switch directionValue {
	case "to bottom":
		gradientDirectionSvg = `x1="0%" y1="0%" x2="0%" y2="100%"`
	case "to right":
		gradientDirectionSvg = `x1="0%" y1="0%" x2="100%" y2="0%"`
	case "to bottom right":
		gradientDirectionSvg = `x1="0%" y1="0%" x2="100%" y2="100%"`
	case "to top right":
		gradientDirectionSvg = `x1="0%" y1="100%" x2="100%" y2="0%"`
	case "ellipse", "ellipse at center":
		gradientType = "radial"
		gradientDirectionSvg = `cx="50%" cy="50%" r="75%"`
		rectangleDimension = `x="-50" y="-50" width="101" height="101"`
	default:
		return nil, fmt.Errorf("svg-gradient direction must be 'to bottom', 'to right', 'to bottom right', 'to top right' or 'ellipse at center'")
	}

	returner := fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><%sGradient id="g" %s>`, gradientType, gradientDirectionSvg)

	for i, stop := range stops {
		var color interface{}
		var position interface{}

		if expr, ok := stop.(*Expression); ok {
			if len(expr.Value) > 0 {
				color = expr.Value[0]
			}
			if len(expr.Value) > 1 {
				position = expr.Value[1]
			}
		} else {
			color = stop
			position = nil
		}

		// Validate color
		colorNode, isColor := color.(*Color)
		if !isColor {
			return nil, fmt.Errorf("svg-gradient expects direction, start_color [start_position], [color position,]..., end_color [end_position] or direction, color list")
		}

		// Validate position requirements
		isFirst := i == 0
		isLast := i+1 == len(stops)
		isMiddle := !isFirst && !isLast

		if isFirst || isLast {
			// First and last colors can have position undefined
			if position != nil {
				if _, isDimension := position.(*Dimension); !isDimension {
					return nil, fmt.Errorf("svg-gradient expects direction, start_color [start_position], [color position,]..., end_color [end_position] or direction, color list")
				}
			}
		} else if isMiddle {
			// Middle colors must have position
			if position == nil {
				return nil, fmt.Errorf("svg-gradient expects direction, start_color [start_position], [color position,]..., end_color [end_position] or direction, color list")
			}
			if _, isDimension := position.(*Dimension); !isDimension {
				return nil, fmt.Errorf("svg-gradient expects direction, start_color [start_position], [color position,]..., end_color [end_position] or direction, color list")
			}
		}

		var positionValue string
		if position != nil {
			if dim, ok := position.(*Dimension); ok {
				// Access fields directly since ToCSS doesn't work properly
				unit := ""
				if dim.Unit != nil && len(dim.Unit.Numerator) > 0 {
					unit = dim.Unit.Numerator[0]
				} else if dim.Unit != nil && dim.Unit.BackupUnit != "" {
					unit = dim.Unit.BackupUnit
				}
				positionValue = fmt.Sprintf("%.0f%s", dim.Value, unit)
			}
		} else {
			if isFirst {
				positionValue = "0%"
			} else {
				positionValue = "100%"
			}
		}

		alpha := colorNode.Alpha
		toRGB := colorNode.ToRGB()

		stopOpacity := ""
		if alpha < 1 {
			stopOpacity = fmt.Sprintf(` stop-opacity="%g"`, alpha)
		}

		returner += fmt.Sprintf(`<stop offset="%s" stop-color="%s"%s/>`, positionValue, toRGB, stopOpacity)
	}

	returner += fmt.Sprintf(`</%sGradient><rect %s fill="url(#g)" /></svg>`, gradientType, rectangleDimension)

	// URL encode the SVG using JavaScript encodeURIComponent behavior
	encodedSVG := url.QueryEscape(returner)
	// Convert to match JavaScript encodeURIComponent: spaces should be %20 not +
	encodedSVG = strings.ReplaceAll(encodedSVG, "+", "%20")

	// Create data URI
	dataURI := fmt.Sprintf("data:image/svg+xml,%s", encodedSVG)

	// Return as URL node
	quotedURI := NewQuoted("'", dataURI, false, ctx.Index, ctx.CurrentFileInfo)
	return NewURL(quotedURI, ctx.Index, ctx.CurrentFileInfo, false), nil
}

// SvgGradientWithCatch implements svg-gradient with error handling like the JavaScript version
func SvgGradientWithCatch(ctx SvgContext, args ...interface{}) *URL {
	result, err := SvgGradient(ctx, args...)
	if err != nil {
		return nil // Return nil on error, like JavaScript version returns undefined
	}
	return result
}