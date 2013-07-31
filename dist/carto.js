
var assert = {
  ok: function(value, message) {
    message = message || '';
    if(!value) throw new Error("assertion failed", message);
  }
}

var carto_initialize = function(carto, uri, callback) {
  callback();
};
window.carto = window.carto || {};

var _mapnik_reference_latest = {
    "version": "2.1.1",
    "style": {
        "filter-mode": {
            "type": [
                "all",
                "first"
            ],
            "doc": "Control the processing behavior of Rule filters within a Style. If 'all' is used then all Rules are processed sequentially independent of whether any previous filters matched. If 'first' is used then it means processing ends after the first match (a positive filter evaluation) and no further Rules in the Style are processed ('first' is usually the default for CSS implementations on top of Mapnik to simplify translation from CSS to Mapnik XML)",
            "default-value": "all",
            "default-meaning": "All Rules in a Style are processed whether they have filters or not and whether or not the filter conditions evaluate to true."
        },
        "image-filters": {
            "css": "image-filters",
            "default-value": "none",
            "default-meaning": "no filters",
            "type": "functions",
            "functions": [
                ["agg-stack-blur", 2],
                ["emboss", 0],
                ["blur", 0],
                ["gray", 0],
                ["sobel", 0],
                ["edge-detect", 0],
                ["x-gradient", 0],
                ["y-gradient", 0],
                ["invert", 0],
                ["sharpen", 0]
            ],
            "doc": "A list of image filters."
        },
        "comp-op": {
            "css": "comp-op",
            "default-value": "src-over",
            "default-meaning": "add the current layer on top of other layers",
            "doc": "Composite operation. This defines how this layer should behave relative to layers atop or below it.",
            "type": ["clear",
                "src",
                "dst",
                "src-over",
                "dst-over",
                "src-in",
                "dst-in",
                "src-out",
                "dst-out",
                "src-atop",
                "dst-atop",
                "xor",
                "plus",
                "minus",
                "multiply",
                "screen",
                "overlay",
                "darken",
                "lighten",
                "color-dodge",
                "color-burn",
                "hard-light",
                "soft-light",
                "difference",
                "exclusion",
                "contrast",
                "invert",
                "invert-rgb",
                "grain-merge",
                "grain-extract",
                "hue",
                "saturation",
                "color",
                "value"
            ]
        },
        "opacity": {
            "css": "opacity",
            "type": "float",
            "doc": "An alpha value for the style (which means an alpha applied to all features in separate buffer and then composited back to main buffer)",
            "default-value": 1,
            "default-meaning": "no separate buffer will be used and no alpha will be applied to the style after rendering"
        }
    },
    "layer" : {
        "name": {
            "default-value": "",
            "type":"string",
            "required" : true,
            "default-meaning": "No layer name has been provided",
            "doc": "The name of a layer. Can be anything you wish and is not strictly validated, but ideally unique  in the map"
        },
        "srs": {
            "default-value": "",
            "type":"string",
            "default-meaning": "No srs value is provided and the value will be inherited from the Map's srs",
            "doc": "The spatial reference system definition for the layer, aka the projection. Can either be a proj4 literal string like '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs' or, if the proper proj4 epsg/nad/etc identifier files are installed, a string that uses an id like: '+init=epsg:4326'"
        },
        "status": {
            "default-value": true,
            "type":"boolean",
            "default-meaning": "This layer will be marked as active and available for processing",
            "doc": "A property that can be set to false to disable this layer from being processed"
        },
        "minzoom": {
            "default-value": "0",
            "type":"float",
            "default-meaning": "The layer will be visible at the minimum possible scale",
            "doc": "The minimum scale denominator that this layer will be visible at. A layer's visibility is determined by whether its status is true and if the Map scale >= minzoom - 1e-6 and scale < maxzoom + 1e-6"
        },
        "maxzoom": {
            "default-value": "1.79769e+308",
            "type":"float",
            "default-meaning": "The layer will be visible at the maximum possible scale",
            "doc": "The maximum scale denominator that this layer will be visible at. The default is the numeric limit of the C++ double type, which may vary slightly by system, but is likely a massive number like 1.79769e+308 and ensures that this layer will always be visible unless the value is reduced. A layer's visibility is determined by whether its status is true and if the Map scale >= minzoom - 1e-6 and scale < maxzoom + 1e-6"
        },
        "queryable": {
            "default-value": false,
            "type":"boolean",
            "default-meaning": "The layer will not be available for the direct querying of data values",
            "doc": "This property was added for GetFeatureInfo/WMS compatibility and is rarely used. It is off by default meaning that in a WMS context the layer will not be able to be queried unless the property is explicitly set to true"
        },
        "clear-label-cache": {
            "default-value": false,
            "type":"boolean",
            "default-meaning": "The renderer's collision detector cache (used for avoiding duplicate labels and overlapping markers) will not be cleared immediately before processing this layer",
            "doc": "This property, by default off, can be enabled to allow a user to clear the collision detector cache before a given layer is processed. This may be desirable to ensure that a given layers data shows up on the map even if it normally would not because of collisions with previously rendered labels or markers"
        },
        "group-by": {
            "default-value": "",
            "type":"string",
            "default-meaning": "No special layer grouping will be used during rendering",
            "doc": "https://github.com/mapnik/mapnik/wiki/Grouped-rendering"
        },
        "buffer-size": {
            "default-value": "0",
            "type":"float",
            "default-meaning": "No buffer will be used",
            "doc": "Extra tolerance around the Layer extent (in pixels) used to when querying and (potentially) clipping the layer data during rendering"
        },
        "maximum-extent": {
            "default-value": "none",
            "type":"bbox",
            "default-meaning": "No clipping extent will be used",
            "doc": "An extent to be used to limit the bounds used to query this specific layer data during rendering. Should be minx, miny, maxx, maxy in the coordinates of the Layer."
        }
    },
    "symbolizers" : {
        "*": {
            "image-filters": {
                "css": "image-filters",
                "default-value": "none",
                "default-meaning": "no filters",
                "type": "functions",
                "functions": [
                    ["agg-stack-blur", 2],
                    ["emboss", 0],
                    ["blur", 0],
                    ["gray", 0],
                    ["sobel", 0],
                    ["edge-detect", 0],
                    ["x-gradient", 0],
                    ["y-gradient", 0],
                    ["invert", 0],
                    ["sharpen", 0]
                ],
                "doc": "A list of image filters."
            },
            "comp-op": {
                "css": "comp-op",
                "default-value": "src-over",
                "default-meaning": "add the current layer on top of other layers",
                "doc": "Composite operation. This defines how this layer should behave relative to layers atop or below it.",
                "type": ["clear",
                    "src",
                    "dst",
                    "src-over",
                    "dst-over",
                    "src-in",
                    "dst-in",
                    "src-out",
                    "dst-out",
                    "src-atop",
                    "dst-atop",
                    "xor",
                    "plus",
                    "minus",
                    "multiply",
                    "screen",
                    "overlay",
                    "darken",
                    "lighten",
                    "color-dodge",
                    "color-burn",
                    "hard-light",
                    "soft-light",
                    "difference",
                    "exclusion",
                    "contrast",
                    "invert",
                    "invert-rgb",
                    "grain-merge",
                    "grain-extract",
                    "hue",
                    "saturation",
                    "color",
                    "value"
                ]
            },
            "opacity": {
                "css": "opacity",
                "type": "float",
                "doc": "An alpha value for the style (which means an alpha applied to all features in separate buffer and then composited back to main buffer)",
                "default-value": 1,
                "default-meaning": "no separate buffer will be used and no alpha will be applied to the style after rendering"
            }
        },
        "map": {
            "background-color": {
                "css": "background-color",
                "default-value": "none",
                "default-meaning": "transparent",
                "type": "color",
                "doc": "Map Background color"
            },
            "background-image": {
                "css": "background-image",
                "type": "uri",
                "default-value": "",
                "default-meaning": "transparent",
                "doc": "An image that is repeated below all features on a map as a background.",
                "description": "Map Background image"
            },
            "srs": {
                "css": "srs",
                "type": "string",
                "default-value": "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs",
                "default-meaning": "The proj4 literal of EPSG:4326 is assumed to be the Map's spatial reference and all data from layers within this map will be plotted using this coordinate system. If any layers do not declare an srs value then they will be assumed to be in the same srs as the Map and not transformations will be needed to plot them in the Map's coordinate space",
                "doc": "Map spatial reference (proj4 string)"
            },
            "buffer-size": {
                "css": "buffer-size",
                "default-value": "0",
                "type":"float",
                "default-meaning": "No buffer will be used",
                "doc": "Extra tolerance around the map (in pixels) used to ensure labels crossing tile boundaries are equally rendered in each tile (e.g. cut in each tile). Not intended to be used in combination with \"avoid-edges\"."
            },
            "maximum-extent": {
                "css": "",
                "default-value": "none",
                "type":"bbox",
                "default-meaning": "No clipping extent will be used",
                "doc": "An extent to be used to limit the bounds used to query all layers during rendering. Should be minx, miny, maxx, maxy in the coordinates of the Map."
            },
            "base": {
                "css": "base",
                "default-value": "",
                "default-meaning": "This base path defaults to an empty string meaning that any relative paths to files referenced in styles or layers will be interpreted relative to the application process.",
                "type": "string",
                "doc": "Any relative paths used to reference files will be understood as relative to this directory path if the map is loaded from an in memory object rather than from the filesystem. If the map is loaded from the filesystem and this option is not provided it will be set to the directory of the stylesheet."
            },
            "paths-from-xml": {
                "css": "",
                "default-value": true,
                "default-meaning": "Paths read from XML will be interpreted from the location of the XML",
                "type": "boolean",
                "doc": "value to control whether paths in the XML will be interpreted from the location of the XML or from the working directory of the program that calls load_map()"
            },
            "minimum-version": {
                "css": "",
                "default-value": "none",
                "default-meaning": "Mapnik version will not be detected and no error will be thrown about compatibility",
                "type": "string",
                "doc": "The minumum Mapnik version (e.g. 0.7.2) needed to use certain functionality in the stylesheet"
            },
            "font-directory": {
                "css": "font-directory",
                "type": "uri",
                "default-value": "none",
                "default-meaning": "No map-specific fonts will be registered",
                "doc": "Path to a directory which holds fonts which should be registered when the Map is loaded (in addition to any fonts that may be automatically registered)."
            }
        },
        "polygon": {
            "fill": {
                "css": "polygon-fill",
                "type": "color",
                "default-value": "rgba(128,128,128,1)",
                "default-meaning": "gray and fully opaque (alpha = 1), same as rgb(128,128,128)",
                "doc": "Fill color to assign to a polygon"
            },
            "fill-opacity": {
                "css": "polygon-opacity",
                "type": "float",
                "doc": "The opacity of the polygon",
                "default-value": 1,
                "default-meaning": "opaque"
            },
            "gamma": {
                "css": "polygon-gamma",
                "type": "float",
                "default-value": 1,
                "default-meaning": "fully antialiased",
                "range": "0-1",
                "doc": "Level of antialiasing of polygon edges"
            },
            "gamma-method": {
                "css": "polygon-gamma-method",
                "type": [
                    "power",
                    "linear",
                    "none",
                    "threshold",
                    "multiply"
                ],
                "default-value": "power",
                "default-meaning": "pow(x,gamma) is used to calculate pixel gamma, which produces slightly smoother line and polygon antialiasing than the 'linear' method, while other methods are usually only used to disable AA",
                "doc": "An Antigrain Geometry specific rendering hint to control the quality of antialiasing. Under the hood in Mapnik this method is used in combination with the 'gamma' value (which defaults to 1). The methods are in the AGG source at https://github.com/mapnik/mapnik/blob/master/deps/agg/include/agg_gamma_functions.h"
            },
            "clip": {
                "css": "polygon-clip",
                "type": "boolean",
                "default-value": true,
                "default-meaning": "geometry will be clipped to map bounds before rendering",
                "doc": "geometries are clipped to map bounds by default for best rendering performance. In some cases users may wish to disable this to avoid rendering artifacts."
            },
            "smooth": {
                "css": "polygon-smooth",
                "type": "float",
                "default-value": 0,
                "default-meaning": "no smoothing",
                "range": "0-1",
                "doc": "Smooths out geometry angles. 0 is no smoothing, 1 is fully smoothed. Values greater than 1 will produce wild, looping geometries."
            },
            "geometry-transform": {
                "css": "polygon-geometry-transform",
                "type": "functions",
                "default-value": "none",
                "default-meaning": "geometry will not be transformed",
                "doc": "Allows transformation functions to be applied to the geometry.",
                "functions": [
                    ["matrix", 6],
                    ["translate", 2],
                    ["scale", 2],
                    ["rotate", 3],
                    ["skewX", 1],
                    ["skewY", 1]
                ]
            },
            "comp-op": {
                "css": "polygon-comp-op",
                "default-value": "src-over",
                "default-meaning": "add the current symbolizer on top of other symbolizer",
                "doc": "Composite operation. This defines how this symbolizer should behave relative to symbolizers atop or below it.",
                "type": ["clear",
                    "src",
                    "dst",
                    "src-over",
                    "dst-over",
                    "src-in",
                    "dst-in",
                    "src-out",
                    "dst-out",
                    "src-atop",
                    "dst-atop",
                    "xor",
                    "plus",
                    "minus",
                    "multiply",
                    "screen",
                    "overlay",
                    "darken",
                    "lighten",
                    "color-dodge",
                    "color-burn",
                    "hard-light",
                    "soft-light",
                    "difference",
                    "exclusion",
                    "contrast",
                    "invert",
                    "invert-rgb",
                    "grain-merge",
                    "grain-extract",
                    "hue",
                    "saturation",
                    "color",
                    "value"
                ]
            }
        },
        "line": {
            "stroke": {
                "css": "line-color",
                "default-value": "rgba(0,0,0,1)",
                "type": "color",
                "default-meaning": "black and fully opaque (alpha = 1), same as rgb(0,0,0)",
                "doc": "The color of a drawn line"
            },
            "stroke-width": {
                "css": "line-width",
                "default-value": 1,
                "type": "float",
                "doc": "The width of a line in pixels"
            },
            "stroke-opacity": {
                "css": "line-opacity",
                "default-value": 1,
                "type": "float",
                "default-meaning": "opaque",
                "doc": "The opacity of a line"
            },
            "stroke-linejoin": {
                "css": "line-join",
                "default-value": "miter",
                "type": [
                    "miter",
                    "round",
                    "bevel"
                ],
                "doc": "The behavior of lines when joining"
            },
            "stroke-linecap": {
                "css": "line-cap",
                "default-value": "butt",
                "type": [
                    "butt",
                    "round",
                    "square"
                ],
                "doc": "The display of line endings"
            },
            "stroke-gamma": {
                "css": "line-gamma",
                "type": "float",
                "default-value": 1,
                "default-meaning": "fully antialiased",
                "range": "0-1",
                "doc": "Level of antialiasing of stroke line"
            },
            "stroke-gamma-method": {
                "css": "line-gamma-method",
                "type": [
                    "power",
                    "linear",
                    "none",
                    "threshold",
                    "multiply"
                ],
                "default-value": "power",
                "default-meaning": "pow(x,gamma) is used to calculate pixel gamma, which produces slightly smoother line and polygon antialiasing than the 'linear' method, while other methods are usually only used to disable AA",
                "doc": "An Antigrain Geometry specific rendering hint to control the quality of antialiasing. Under the hood in Mapnik this method is used in combination with the 'gamma' value (which defaults to 1). The methods are in the AGG source at https://github.com/mapnik/mapnik/blob/master/deps/agg/include/agg_gamma_functions.h"
            },
            "stroke-dasharray": {
                "css": "line-dasharray",
                "type": "numbers",
                "doc": "A pair of length values [a,b], where (a) is the dash length and (b) is the gap length respectively. More than two values are supported for more complex patterns.",
                "default-value": "none",
                "default-meaning": "solid line"
            },
            "stroke-dashoffset": {
                "css": "line-dash-offset",
                "type": "numbers",
                "doc": "valid parameter but not currently used in renderers (only exists for experimental svg support in Mapnik which is not yet enabled)",
                "default-value": "none",
                "default-meaning": "solid line"
            },
            "stroke-miterlimit": {
                "css": "line-miterlimit",
                "type": "float",
                "doc": "The limit on the ratio of the miter length to the stroke-width. Used to automatically convert miter joins to bevel joins for sharp angles to avoid the miter extending beyond the thickness of the stroking path. Normally will not need to be set, but a larger value can sometimes help avoid jaggy artifacts.",
                "default-value": 4.0,
                "default-meaning": "Will auto-convert miters to bevel line joins when theta is less than 29 degrees as per the SVG spec: 'miterLength / stroke-width = 1 / sin ( theta / 2 )'"
            },
            "clip": {
                "css": "line-clip",
                "type": "boolean",
                "default-value": true,
                "default-meaning": "geometry will be clipped to map bounds before rendering",
                "doc": "geometries are clipped to map bounds by default for best rendering performance. In some cases users may wish to disable this to avoid rendering artifacts."
            },
            "smooth": {
                "css": "line-smooth",
                "type": "float",
                "default-value": 0,
                "default-meaning": "no smoothing",
                "range": "0-1",
                "doc": "Smooths out geometry angles. 0 is no smoothing, 1 is fully smoothed. Values greater than 1 will produce wild, looping geometries."
            },
            "offset": {
                "css": "line-offset",
                "type": "float",
                "default-value": 0,
                "default-meaning": "no offset",
                "doc": "Offsets a line a number of pixels parallel to its actual path. Postive values move the line left, negative values move it right (relative to the directionality of the line)."
            },
            "rasterizer": {
                "css": "line-rasterizer",
                "type": [
                    "full",
                    "fast"
                ],
                "default-value": "full",
                "doc": "Exposes an alternate AGG rendering method that sacrifices some accuracy for speed."
            },
            "geometry-transform": {
                "css": "line-geometry-transform",
                "type": "functions",
                "default-value": "none",
                "default-meaning": "geometry will not be transformed",
                "doc": "Allows transformation functions to be applied to the geometry.",
                "functions": [
                    ["matrix", 6],
                    ["translate", 2],
                    ["scale", 2],
                    ["rotate", 3],
                    ["skewX", 1],
                    ["skewY", 1]
                ]
            },
            "comp-op": {
                "css": "line-comp-op",
                "default-value": "src-over",
                "default-meaning": "add the current symbolizer on top of other symbolizer",
                "doc": "Composite operation. This defines how this symbolizer should behave relative to symbolizers atop or below it.",
                "type": ["clear",
                    "src",
                    "dst",
                    "src-over",
                    "dst-over",
                    "src-in",
                    "dst-in",
                    "src-out",
                    "dst-out",
                    "src-atop",
                    "dst-atop",
                    "xor",
                    "plus",
                    "minus",
                    "multiply",
                    "screen",
                    "overlay",
                    "darken",
                    "lighten",
                    "color-dodge",
                    "color-burn",
                    "hard-light",
                    "soft-light",
                    "difference",
                    "exclusion",
                    "contrast",
                    "invert",
                    "invert-rgb",
                    "grain-merge",
                    "grain-extract",
                    "hue",
                    "saturation",
                    "color",
                    "value"
                ]
            }
        },
        "markers": {
            "file": {
                "css": "marker-file",
                "doc": "An SVG file that this marker shows at each placement. If no file is given, the marker will show an ellipse.",
                "default-value": "",
                "default-meaning": "An ellipse or circle, if width equals height",
                "type": "uri"
            },
            "opacity": {
                "css": "marker-opacity",
                "doc": "The overall opacity of the marker, if set, overrides both the opacity of both the fill and stroke",
                "default-value": 1,
                "default-meaning": "The stroke-opacity and fill-opacity will be used",
                "type": "float"
            },
            "fill-opacity": {
                "css": "marker-fill-opacity",
                "doc": "The fill opacity of the marker",
                "default-value": 1,
                "default-meaning": "opaque",
                "type": "float"
            },
            "stroke": {
                "css": "marker-line-color",
                "doc": "The color of the stroke around a marker shape.",
                "default-value": "black",
                "type": "color"
            },
            "stroke-width": {
                "css": "marker-line-width",
                "doc": "The width of the stroke around a marker shape, in pixels. This is positioned on the boundary, so high values can cover the area itself.",
                "type": "float"
            },
            "stroke-opacity": {
                "css": "marker-line-opacity",
                "default-value": 1,
                "default-meaning": "opaque",
                "doc": "The opacity of a line",
                "type": "float"
            },
            "placement": {
                "css": "marker-placement",
                "type": [
                    "point",
                    "line",
                    "interior"
                ],
                "default-value": "point",
                "default-meaning": "Place markers at the center point (centroid) of the geometry",
                "doc": "Attempt to place markers on a point, in the center of a polygon, or if markers-placement:line, then multiple times along a line. 'interior' placement can be used to ensure that points placed on polygons are forced to be inside the polygon interior"
            },
            "multi-policy": {
                "css": "marker-multi-policy",
                "type": [
                    "each",
                    "whole",
                    "largest"
                ],
                "default-value": "each",
                "default-meaning": "If a feature contains multiple geometries and the placement type is either point or interior then a marker will be rendered for each",
                "doc": "A special setting to allow the user to control rendering behavior for 'multi-geometries' (when a feature contains multiple geometries). This setting does not apply to markers placed along lines. The 'each' policy is default and means all geometries will get a marker. The 'whole' policy means that the aggregate centroid between all geometries will be used. The 'largest' policy means that only the largest (by bounding box areas) feature will get a rendered marker (this is how text labeling behaves by default)."
            },
            "marker-type": {
                "css": "marker-type",
                "type": [
                    "arrow",
                    "ellipse"
                ],
                "default-value": "ellipse",
                "doc": "The default marker-type. If a SVG file is not given as the marker-file parameter, the renderer provides either an arrow or an ellipse (a circle if height is equal to width)"
            },
            "width": {
                "css": "marker-width",
                "default-value": 10,
                "doc": "The width of the marker, if using one of the default types.",
                "type": "expression"
            },
            "height": {
                "css": "marker-height",
                "default-value": 10,
                "doc": "The height of the marker, if using one of the default types.",
                "type": "expression"
            },
            "fill": {
                "css": "marker-fill",
                "default-value": "blue",
                "doc": "The color of the area of the marker.",
                "type": "color"
            },
            "allow-overlap": {
                "css": "marker-allow-overlap",
                "type": "boolean",
                "default-value": false,
                "doc": "Control whether overlapping markers are shown or hidden.",
                "default-meaning": "Do not allow makers to overlap with each other - overlapping markers will not be shown."
            },
            "ignore-placement": {
                "css": "marker-ignore-placement",
                "type": "boolean",
                "default-value": false,
                "default-meaning": "do not store the bbox of this geometry in the collision detector cache",
                "doc": "value to control whether the placement of the feature will prevent the placement of other features"
            },
            "spacing": {
                "css": "marker-spacing",
                "doc": "Space between repeated labels",
                "default-value": 100,
                "type": "float"
            },
            "max-error": {
                "css": "marker-max-error",
                "type": "float",
                "default-value": 0.2,
                "doc": "The maximum difference between actual marker placement and the marker-spacing parameter. Setting a high value can allow the renderer to try to resolve placement conflicts with other symbolizers."
            },
            "transform": {
                "css": "marker-transform",
                "type": "functions",
                "functions": [
                    ["matrix", 6],
                    ["translate", 2],
                    ["scale", 2],
                    ["rotate", 3],
                    ["skewX", 1],
                    ["skewY", 1]
                ],
                "default-value": "",
                "default-meaning": "No transformation",
                "doc": "SVG transformation definition"
            },
            "clip": {
                "css": "marker-clip",
                "type": "boolean",
                "default-value": true,
                "default-meaning": "geometry will be clipped to map bounds before rendering",
                "doc": "geometries are clipped to map bounds by default for best rendering performance. In some cases users may wish to disable this to avoid rendering artifacts."
            },
            "smooth": {
                "css": "marker-smooth",
                "type": "float",
                "default-value": 0,
                "default-meaning": "no smoothing",
                "range": "0-1",
                "doc": "Smooths out geometry angles. 0 is no smoothing, 1 is fully smoothed. Values greater than 1 will produce wild, looping geometries."
            },
            "geometry-transform": {
                "css": "marker-geometry-transform",
                "type": "functions",
                "default-value": "none",
                "default-meaning": "geometry will not be transformed",
                "doc": "Allows transformation functions to be applied to the geometry.",
                "functions": [
                    ["matrix", 6],
                    ["translate", 2],
                    ["scale", 2],
                    ["rotate", 3],
                    ["skewX", 1],
                    ["skewY", 1]
                ]
            },
            "comp-op": {
                "css": "marker-comp-op",
                "default-value": "src-over",
                "default-meaning": "add the current symbolizer on top of other symbolizer",
                "doc": "Composite operation. This defines how this symbolizer should behave relative to symbolizers atop or below it.",
                "type": ["clear",
                    "src",
                    "dst",
                    "src-over",
                    "dst-over",
                    "src-in",
                    "dst-in",
                    "src-out",
                    "dst-out",
                    "src-atop",
                    "dst-atop",
                    "xor",
                    "plus",
                    "minus",
                    "multiply",
                    "screen",
                    "overlay",
                    "darken",
                    "lighten",
                    "color-dodge",
                    "color-burn",
                    "hard-light",
                    "soft-light",
                    "difference",
                    "exclusion",
                    "contrast",
                    "invert",
                    "invert-rgb",
                    "grain-merge",
                    "grain-extract",
                    "hue",
                    "saturation",
                    "color",
                    "value"
                ]
            }
        },
        "shield": {
            "name": {
                "css": "shield-name",
                "type": "expression",
                "serialization": "content",
                "doc": "Value to use for a shield\"s text label. Data columns are specified using brackets like [column_name]"
            },
            "file": {
                "css": "shield-file",
                "required": true,
                "type": "uri",
                "default-value": "none",
                "doc": "Image file to render behind the shield text"
            },
            "face-name": {
                "css": "shield-face-name",
                "type": "string",
                "validate": "font",
                "doc": "Font name and style to use for the shield text",
                "default-value": "",
                "required": true
            },
            "unlock-image": {
                "css": "shield-unlock-image",
                "type": "boolean",
                "doc": "This parameter should be set to true if you are trying to position text beside rather than on top of the shield image",
                "default-value": false,
                "default-meaning": "text alignment relative to the shield image uses the center of the image as the anchor for text positioning."
            },
            "size": {
                "css": "shield-size",
                "type": "float",
                "doc": "The size of the shield text in pixels"
            },
            "fill": {
                "css": "shield-fill",
                "type": "color",
                "doc": "The color of the shield text"
            },
            "placement": {
                "css": "shield-placement",
                "type": [
                    "point",
                    "line",
                    "vertex",
                    "interior"
                ],
                "default-value": "point",
                "doc": "How this shield should be placed. Point placement attempts to place it on top of points, line places along lines multiple times per feature, vertex places on the vertexes of polygons, and interior attempts to place inside of polygons."
            },
            "avoid-edges": {
                "css": "shield-avoid-edges",
                "doc": "Tell positioning algorithm to avoid labeling near intersection edges.",
                "type": "boolean",
                "default-value": false
            },
            "allow-overlap": {
                "css": "shield-allow-overlap",
                "type": "boolean",
                "default-value": false,
                "doc": "Control whether overlapping shields are shown or hidden.",
                "default-meaning": "Do not allow shields to overlap with other map elements already placed."
            },
            "minimum-distance": {
                "css": "shield-min-distance",
                "type": "float",
                "default-value": 0,
                "doc": "Minimum distance to the next shield symbol, not necessarily the same shield."
            },
            "spacing": {
                "css": "shield-spacing",
                "type": "float",
                "default-value": 0,
                "doc": "The spacing between repeated occurrences of the same shield on a line"
            },
            "minimum-padding": {
                "css": "shield-min-padding",
                "default-value": 0,
                "doc": "Determines the minimum amount of padding that a shield gets relative to other shields",
                "type": "float"
            },
            "wrap-width": {
                "css": "shield-wrap-width",
                "type": "unsigned",
                "default-value": 0,
                "doc": "Length of a chunk of text in characters before wrapping text"
            },
            "wrap-before": {
                "css": "shield-wrap-before",
                "type": "boolean",
                "default-value": false,
                "doc": "Wrap text before wrap-width is reached. If false, wrapped lines will be a bit longer than wrap-width."
            },
            "wrap-character": {
                "css": "shield-wrap-character",
                "type": "string",
                "default-value": " ",
                "doc": "Use this character instead of a space to wrap long names."
            },
            "halo-fill": {
                "css": "shield-halo-fill",
                "type": "color",
                "default-value": "#FFFFFF",
                "default-meaning": "white",
                "doc": "Specifies the color of the halo around the text."
            },
            "halo-radius": {
                "css": "shield-halo-radius",
                "doc": "Specify the radius of the halo in pixels",
                "default-value": 0,
                "default-meaning": "no halo",
                "type": "float"
            },
            "character-spacing": {
                "css": "shield-character-spacing",
                "type": "unsigned",
                "default-value": 0,
                "doc": "Horizontal spacing between characters (in pixels). Currently works for point placement only, not line placement."
            },
            "line-spacing": {
                "css": "shield-line-spacing",
                "doc": "Vertical spacing between lines of multiline labels (in pixels)",
                "type": "unsigned"
            },
            "dx": {
                "css": "shield-text-dx",
                "type": "float",
                "doc": "Displace text within shield by fixed amount, in pixels, +/- along the X axis.  A positive value will shift the text right",
                "default-value": 0
            },
            "dy": {
                "css": "shield-text-dy",
                "type": "float",
                "doc": "Displace text within shield by fixed amount, in pixels, +/- along the Y axis.  A positive value will shift the text down",
                "default-value": 0
            },
            "shield-dx": {
                "css": "shield-dx",
                "type": "float",
                "doc": "Displace shield by fixed amount, in pixels, +/- along the X axis.  A positive value will shift the text right",
                "default-value": 0
            },
            "shield-dy": {
                "css": "shield-dy",
                "type": "float",
                "doc": "Displace shield by fixed amount, in pixels, +/- along the Y axis.  A positive value will shift the text down",
                "default-value": 0
            },
            "opacity": {
                "css": "shield-opacity",
                "type": "float",
                "doc": "(Default 1.0) - opacity of the image used for the shield",
                "default-value": 1
            },
            "text-opacity": {
                "css": "shield-text-opacity",
                "type": "float",
                "doc": "(Default 1.0) - opacity of the text placed on top of the shield",
                "default-value": 1
            },
            "horizontal-alignment": {
                "css": "shield-horizontal-alignment",
                "type": [
                    "left",
                    "middle",
                    "right",
                    "auto"
                ],
                "doc": "The shield's horizontal alignment from its centerpoint",
                "default-value": "auto"
            },
            "vertical-alignment": {
                "css": "shield-vertical-alignment",
                "type": [
                    "top",
                    "middle",
                    "bottom",
                    "auto"
                ],
                "doc": "The shield's vertical alignment from its centerpoint",
                "default-value": "middle"
            },
            "text-transform": {
                "css": "shield-text-transform",
                "type": [
                    "none",
                    "uppercase",
                    "lowercase",
                    "capitalize"
                ],
                "doc": "Transform the case of the characters",
                "default-value": "none"
            },
            "justify-alignment": {
                "css": "shield-justify-alignment",
                "type": [
                    "left",
                    "center",
                    "right",
                    "auto"
                ],
                "doc": "Define how text in a shield's label is justified",
                "default-value": "auto"
            },
            "clip": {
                "css": "shield-clip",
                "type": "boolean",
                "default-value": true,
                "default-meaning": "geometry will be clipped to map bounds before rendering",
                "doc": "geometries are clipped to map bounds by default for best rendering performance. In some cases users may wish to disable this to avoid rendering artifacts."
            },
            "comp-op": {
                "css": "shield-comp-op",
                "default-value": "src-over",
                "default-meaning": "add the current symbolizer on top of other symbolizer",
                "doc": "Composite operation. This defines how this symbolizer should behave relative to symbolizers atop or below it.",
                "type": ["clear",
                    "src",
                    "dst",
                    "src-over",
                    "dst-over",
                    "src-in",
                    "dst-in",
                    "src-out",
                    "dst-out",
                    "src-atop",
                    "dst-atop",
                    "xor",
                    "plus",
                    "minus",
                    "multiply",
                    "screen",
                    "overlay",
                    "darken",
                    "lighten",
                    "color-dodge",
                    "color-burn",
                    "hard-light",
                    "soft-light",
                    "difference",
                    "exclusion",
                    "contrast",
                    "invert",
                    "invert-rgb",
                    "grain-merge",
                    "grain-extract",
                    "hue",
                    "saturation",
                    "color",
                    "value"
                ]
            }
        },
        "line-pattern": {
            "file": {
                "css": "line-pattern-file",
                "type": "uri",
                "default-value": "none",
                "required": true,
                "doc": "An image file to be repeated and warped along a line"
            },
            "clip": {
                "css": "line-pattern-clip",
                "type": "boolean",
                "default-value": true,
                "default-meaning": "geometry will be clipped to map bounds before rendering",
                "doc": "geometries are clipped to map bounds by default for best rendering performance. In some cases users may wish to disable this to avoid rendering artifacts."
            },
            "smooth": {
                "css": "line-pattern-smooth",
                "type": "float",
                "default-value": 0,
                "default-meaning": "no smoothing",
                "range": "0-1",
                "doc": "Smooths out geometry angles. 0 is no smoothing, 1 is fully smoothed. Values greater than 1 will produce wild, looping geometries."
            },
            "geometry-transform": {
                "css": "line-pattern-geometry-transform",
                "type": "functions",
                "default-value": "none",
                "default-meaning": "geometry will not be transformed",
                "doc": "Allows transformation functions to be applied to the geometry.",
                "functions": [
                    ["matrix", 6],
                    ["translate", 2],
                    ["scale", 2],
                    ["rotate", 3],
                    ["skewX", 1],
                    ["skewY", 1]
                ]
            },
            "comp-op": {
                "css": "line-pattern-comp-op",
                "default-value": "src-over",
                "default-meaning": "add the current symbolizer on top of other symbolizer",
                "doc": "Composite operation. This defines how this symbolizer should behave relative to symbolizers atop or below it.",
                "type": ["clear",
                    "src",
                    "dst",
                    "src-over",
                    "dst-over",
                    "src-in",
                    "dst-in",
                    "src-out",
                    "dst-out",
                    "src-atop",
                    "dst-atop",
                    "xor",
                    "plus",
                    "minus",
                    "multiply",
                    "screen",
                    "overlay",
                    "darken",
                    "lighten",
                    "color-dodge",
                    "color-burn",
                    "hard-light",
                    "soft-light",
                    "difference",
                    "exclusion",
                    "contrast",
                    "invert",
                    "invert-rgb",
                    "grain-merge",
                    "grain-extract",
                    "hue",
                    "saturation",
                    "color",
                    "value"
                ]
            }
        },
        "polygon-pattern": {
            "file": {
                "css": "polygon-pattern-file",
                "type": "uri",
                "default-value": "none",
                "required": true,
                "doc": "Image to use as a repeated pattern fill within a polygon"
            },
            "alignment": {
                "css": "polygon-pattern-alignment",
                "type": [
                    "local",
                    "global"
                ],
                "default-value": "local",
                "doc": "Specify whether to align pattern fills to the layer or to the map."
            },
            "gamma": {
                "css": "polygon-pattern-gamma",
                "type": "float",
                "default-value": 1,
                "default-meaning": "fully antialiased",
                "range": "0-1",
                "doc": "Level of antialiasing of polygon pattern edges"
            },
            "opacity": {
                "css": "polygon-pattern-opacity",
                "type": "float",
                "doc": "(Default 1.0) - Apply an opacity level to the image used for the pattern",
                "default-value": 1,
                "default-meaning": "The image is rendered without modifications"
            },
            "clip": {
                "css": "polygon-pattern-clip",
                "type": "boolean",
                "default-value": true,
                "default-meaning": "geometry will be clipped to map bounds before rendering",
                "doc": "geometries are clipped to map bounds by default for best rendering performance. In some cases users may wish to disable this to avoid rendering artifacts."
            },
            "smooth": {
                "css": "polygon-pattern-smooth",
                "type": "float",
                "default-value": 0,
                "default-meaning": "no smoothing",
                "range": "0-1",
                "doc": "Smooths out geometry angles. 0 is no smoothing, 1 is fully smoothed. Values greater than 1 will produce wild, looping geometries."
            },
            "geometry-transform": {
                "css": "polygon-pattern-geometry-transform",
                "type": "functions",
                "default-value": "none",
                "default-meaning": "geometry will not be transformed",
                "doc": "Allows transformation functions to be applied to the geometry.",
                "functions": [
                    ["matrix", 6],
                    ["translate", 2],
                    ["scale", 2],
                    ["rotate", 3],
                    ["skewX", 1],
                    ["skewY", 1]
                ]
            },
            "comp-op": {
                "css": "polygon-pattern-comp-op",
                "default-value": "src-over",
                "default-meaning": "add the current symbolizer on top of other symbolizer",
                "doc": "Composite operation. This defines how this symbolizer should behave relative to symbolizers atop or below it.",
                "type": ["clear",
                    "src",
                    "dst",
                    "src-over",
                    "dst-over",
                    "src-in",
                    "dst-in",
                    "src-out",
                    "dst-out",
                    "src-atop",
                    "dst-atop",
                    "xor",
                    "plus",
                    "minus",
                    "multiply",
                    "screen",
                    "overlay",
                    "darken",
                    "lighten",
                    "color-dodge",
                    "color-burn",
                    "hard-light",
                    "soft-light",
                    "difference",
                    "exclusion",
                    "contrast",
                    "invert",
                    "invert-rgb",
                    "grain-merge",
                    "grain-extract",
                    "hue",
                    "saturation",
                    "color",
                    "value"
                ]
            }
        },
        "raster": {
            "opacity": {
                "css": "raster-opacity",
                "default-value": 1,
                "default-meaning": "opaque",
                "type": "float",
                "doc": "The opacity of the raster symbolizer on top of other symbolizers."
            },
            "filter-factor": {
                "css": "raster-filter-factor",
                "default-value": -1,
                "default-meaning": "Allow the datasource to choose appropriate downscaling.",
                "type": "float",
                "doc": "This is used by the Raster or Gdal datasources to pre-downscale images using overviews. Higher numbers can sometimes cause much better scaled image output, at the cost of speed."
            },
            "scaling": {
                "css": "raster-scaling",
                "type": [
                    "near",
                    "fast",
                    "bilinear",
                    "bilinear8",
                    "bicubic",
                    "spline16",
                    "spline36",
                    "hanning",
                    "hamming",
                    "hermite",
                    "kaiser",
                    "quadric",
                    "catrom",
                    "gaussian",
                    "bessel",
                    "mitchell",
                    "sinc",
                    "lanczos",
                    "blackman"
                ],
                "default-value": "near",
                "doc": "The scaling algorithm used to making different resolution versions of this raster layer. Bilinear is a good compromise between speed and accuracy, while lanczos gives the highest quality."
            },
            "mesh-size": {
                "css": "raster-mesh-size",
                "default-value": 16,
                "default-meaning": "Reprojection mesh will be 1/16 of the resolution of the source image",
                "type": "unsigned",
                "doc": "A reduced resolution mesh is used for raster reprojection, and the total image size is divided by the mesh-size to determine the quality of that mesh. Values for mesh-size larger than the default will result in faster reprojection but might lead to distortion."
            },
            "comp-op": {
                "css": "raster-comp-op",
                "default-value": "src-over",
                "default-meaning": "add the current symbolizer on top of other symbolizer",
                "doc": "Composite operation. This defines how this symbolizer should behave relative to symbolizers atop or below it.",
                "type": ["clear",
                    "src",
                    "dst",
                    "src-over",
                    "dst-over",
                    "src-in",
                    "dst-in",
                    "src-out",
                    "dst-out",
                    "src-atop",
                    "dst-atop",
                    "xor",
                    "plus",
                    "minus",
                    "multiply",
                    "screen",
                    "overlay",
                    "darken",
                    "lighten",
                    "color-dodge",
                    "color-burn",
                    "hard-light",
                    "soft-light",
                    "difference",
                    "exclusion",
                    "contrast",
                    "invert",
                    "invert-rgb",
                    "grain-merge",
                    "grain-extract",
                    "hue",
                    "saturation",
                    "color",
                    "value"
                ]
            }
        },
        "point": {
            "file": {
                "css": "point-file",
                "type": "uri",
                "required": false,
                "default-value": "none",
                "doc": "Image file to represent a point"
            },
            "allow-overlap": {
                "css": "point-allow-overlap",
                "type": "boolean",
                "default-value": false,
                "doc": "Control whether overlapping points are shown or hidden.",
                "default-meaning": "Do not allow points to overlap with each other - overlapping markers will not be shown."
            },
            "ignore-placement": {
                "css": "point-ignore-placement",
                "type": "boolean",
                "default-value": false,
                "default-meaning": "do not store the bbox of this geometry in the collision detector cache",
                "doc": "value to control whether the placement of the feature will prevent the placement of other features"
            },
            "opacity": {
                "css": "point-opacity",
                "type": "float",
                "default-value": 1.0,
                "default-meaning": "Fully opaque",
                "doc": "A value from 0 to 1 to control the opacity of the point"
            },
            "placement": {
                "css": "point-placement",
                "type": [
                    "centroid",
                    "interior"
                ],
                "doc": "How this point should be placed. Centroid calculates the geometric center of a polygon, which can be outside of it, while interior always places inside of a polygon.",
                "default-value": "centroid"
            },
            "transform": {
                "css": "point-transform",
                "type": "functions",
                "functions": [
                    ["matrix", 6],
                    ["translate", 2],
                    ["scale", 2],
                    ["rotate", 3],
                    ["skewX", 1],
                    ["skewY", 1]
                ],
                "default-value": "",
                "default-meaning": "No transformation",
                "doc": "SVG transformation definition"
            },
            "comp-op": {
                "css": "point-comp-op",
                "default-value": "src-over",
                "default-meaning": "add the current symbolizer on top of other symbolizer",
                "doc": "Composite operation. This defines how this symbolizer should behave relative to symbolizers atop or below it.",
                "type": ["clear",
                    "src",
                    "dst",
                    "src-over",
                    "dst-over",
                    "src-in",
                    "dst-in",
                    "src-out",
                    "dst-out",
                    "src-atop",
                    "dst-atop",
                    "xor",
                    "plus",
                    "minus",
                    "multiply",
                    "screen",
                    "overlay",
                    "darken",
                    "lighten",
                    "color-dodge",
                    "color-burn",
                    "hard-light",
                    "soft-light",
                    "difference",
                    "exclusion",
                    "contrast",
                    "invert",
                    "invert-rgb",
                    "grain-merge",
                    "grain-extract",
                    "hue",
                    "saturation",
                    "color",
                    "value"
                ]
            }
        },
        "text": {
            "name": {
                "css": "text-name",
                "type": "expression",
                "required": true,
                "default-value": "",
                "serialization": "content",
                "doc": "Value to use for a text label. Data columns are specified using brackets like [column_name]"
            },
            "face-name": {
                "css": "text-face-name",
                "type": "string",
                "validate": "font",
                "doc": "Font name and style to render a label in",
                "required": true
            },
            "size": {
                "css": "text-size",
                "type": "float",
                "default-value": 10,
                "doc": "Text size in pixels"
            },
            "text-ratio": {
                "css": "text-ratio",
                "doc": "Define the amount of text (of the total) present on successive lines when wrapping occurs",
                "default-value": 0,
                "type": "unsigned"
            },
            "wrap-width": {
                "css": "text-wrap-width",
                "doc": "Length of a chunk of text in characters before wrapping text",
                "default-value": 0,
                "type": "unsigned"
            },
            "wrap-before": {
                "css": "text-wrap-before",
                "type": "boolean",
                "default-value": false,
                "doc": "Wrap text before wrap-width is reached. If false, wrapped lines will be a bit longer than wrap-width."
            },
            "wrap-character": {
                "css": "text-wrap-character",
                "type": "string",
                "default-value": " ",
                "doc": "Use this character instead of a space to wrap long text."
            },
            "spacing": {
                "css": "text-spacing",
                "type": "unsigned",
                "doc": "Distance between repeated text labels on a line (aka. label-spacing)"
            },
            "character-spacing": {
                "css": "text-character-spacing",
                "type": "float",
                "default-value": 0,
                "doc": "Horizontal spacing adjustment between characters in pixels"
            },
            "line-spacing": {
                "css": "text-line-spacing",
                "default-value": 0,
                "type": "unsigned",
                "doc": "Vertical spacing adjustment between lines in pixels"
            },
            "label-position-tolerance": {
                "css": "text-label-position-tolerance",
                "default-value": 0,
                "type": "unsigned",
                "doc": "Allows the label to be displaced from its ideal position by a number of pixels (only works with placement:line)"
            },
            "max-char-angle-delta": {
                "css": "text-max-char-angle-delta",
                "type": "float",
                "default-value": "22.5",
                "doc": "The maximum angle change, in degrees, allowed between adjacent characters in a label. This value internally is converted to radians to the default is 22.5*math.pi/180.0. The higher the value the fewer labels will be placed around around sharp corners."
            },
            "fill": {
                "css": "text-fill",
                "doc": "Specifies the color for the text",
                "default-value": "#000000",
                "type": "color"
            },
            "opacity": {
                "css": "text-opacity",
                "doc": "A number from 0 to 1 specifying the opacity for the text",
                "default-value": 1.0,
                "default-meaning": "Fully opaque",
                "type": "float"
            },
            "halo-fill": {
                "css": "text-halo-fill",
                "type": "color",
                "default-value": "#FFFFFF",
                "default-meaning": "white",
                "doc": "Specifies the color of the halo around the text."
            },
            "halo-radius": {
                "css": "text-halo-radius",
                "doc": "Specify the radius of the halo in pixels",
                "default-value": 0,
                "default-meaning": "no halo",
                "type": "float"
            },
            "dx": {
                "css": "text-dx",
                "type": "float",
                "doc": "Displace text by fixed amount, in pixels, +/- along the X axis.  A positive value will shift the text right",
                "default-value": 0
            },
            "dy": {
                "css": "text-dy",
                "type": "float",
                "doc": "Displace text by fixed amount, in pixels, +/- along the Y axis.  A positive value will shift the text down",
                "default-value": 0
            },
            "vertical-alignment": {
                "css": "text-vertical-alignment",
                "type": [
                  "top",
                  "middle",
                  "bottom",
                  "auto"
                ],
                "doc": "Position of label relative to point position.",
                "default-value": "auto",
                "default-meaning": "Default affected by value of dy; \"bottom\" for dy>0, \"top\" for dy<0."
            },
            "avoid-edges": {
                "css": "text-avoid-edges",
                "doc": "Tell positioning algorithm to avoid labeling near intersection edges.",
                "default-value": false,
                "type": "boolean"
            },
            "minimum-distance": {
                "css": "text-min-distance",
                "doc": "Minimum permitted distance to the next text symbolizer.",
                "type": "float"
            },
            "minimum-padding": {
                "css": "text-min-padding",
                "doc": "Determines the minimum amount of padding that a text symbolizer gets relative to other text",
                "type": "float"
            },
            "minimum-path-length": {
                "css": "text-min-path-length",
                "type": "float",
                "default-value": 0,
                "default-meaning": "place labels on all paths",
                "doc": "Place labels only on paths longer than this value."
            },
            "allow-overlap": {
                "css": "text-allow-overlap",
                "type": "boolean",
                "default-value": false,
                "doc": "Control whether overlapping text is shown or hidden.",
                "default-meaning": "Do not allow text to overlap with other text - overlapping markers will not be shown."
            },
            "orientation": {
                "css": "text-orientation",
                "type": "expression",
                "doc": "Rotate the text."
            },
            "placement": {
                "css": "text-placement",
                "type": [
                    "point",
                    "line",
                    "vertex",
                    "interior"
                ],
                "default-value": "point",
                "doc": "Control the style of placement of a point versus the geometry it is attached to."
            },
            "placement-type": {
                "css": "text-placement-type",
                "doc": "Re-position and/or re-size text to avoid overlaps. \"simple\" for basic algorithm (using text-placements string,) \"dummy\" to turn this feature off.",
                "type": [
                    "dummy",
                    "simple"
                ],
                "default-value": "dummy"
            },
            "placements": {
                "css": "text-placements",
                "type": "string",
                "default-value": "",
                "doc": "If \"placement-type\" is set to \"simple\", use this \"POSITIONS,[SIZES]\" string. An example is `text-placements: \"E,NE,SE,W,NW,SW\";` "
            },
            "text-transform": {
                "css": "text-transform",
                "type": [
                    "none",
                    "uppercase",
                    "lowercase",
                    "capitalize"
                ],
                "doc": "Transform the case of the characters",
                "default-value": "none"
            },
            "horizontal-alignment": {
                "css": "text-horizontal-alignment",
                "type": [
                    "left",
                    "middle",
                    "right",
                    "auto"
                ],
                "doc": "The text's horizontal alignment from its centerpoint",
                "default-value": "auto"
            },
            "justify-alignment": {
                "css": "text-align",
                "type": [
                    "left",
                    "right",
                    "center",
                    "auto"
                ],
                "doc": "Define how text is justified",
                "default-value": "auto",
                "default-meaning": "Auto alignment means that text will be centered by default except when using the `placement-type` parameter - in that case either right or left justification will be used automatically depending on where the text could be fit given the `text-placements` directives"
            },
            "clip": {
                "css": "text-clip",
                "type": "boolean",
                "default-value": true,
                "default-meaning": "geometry will be clipped to map bounds before rendering",
                "doc": "geometries are clipped to map bounds by default for best rendering performance. In some cases users may wish to disable this to avoid rendering artifacts."
            },
            "comp-op": {
                "css": "text-comp-op",
                "default-value": "src-over",
                "default-meaning": "add the current symbolizer on top of other symbolizer",
                "doc": "Composite operation. This defines how this symbolizer should behave relative to symbolizers atop or below it.",
                "type": ["clear",
                    "src",
                    "dst",
                    "src-over",
                    "dst-over",
                    "src-in",
                    "dst-in",
                    "src-out",
                    "dst-out",
                    "src-atop",
                    "dst-atop",
                    "xor",
                    "plus",
                    "minus",
                    "multiply",
                    "screen",
                    "overlay",
                    "darken",
                    "lighten",
                    "color-dodge",
                    "color-burn",
                    "hard-light",
                    "soft-light",
                    "difference",
                    "exclusion",
                    "contrast",
                    "invert",
                    "invert-rgb",
                    "grain-merge",
                    "grain-extract",
                    "hue",
                    "saturation",
                    "color",
                    "value"
                ]
            }
        },
        "building": {
            "fill": {
                "css": "building-fill",
                "default-value": "#FFFFFF",
                "doc": "The color of the buildings walls.",
                "type": "color"
            },
            "fill-opacity": {
                "css": "building-fill-opacity",
                "type": "float",
                "doc": "The opacity of the building as a whole, including all walls.",
                "default-value": 1
            },
            "height": {
                "css": "building-height",
                "doc": "The height of the building in pixels.",
                "type": "expression",
                "default-value": "0"
            }
        }
    },
    "colors": {
        "aliceblue":  [240, 248, 255],
        "antiquewhite":  [250, 235, 215],
        "aqua":  [0, 255, 255],
        "aquamarine":  [127, 255, 212],
        "azure":  [240, 255, 255],
        "beige":  [245, 245, 220],
        "bisque":  [255, 228, 196],
        "black":  [0, 0, 0],
        "blanchedalmond":  [255,235,205],
        "blue":  [0, 0, 255],
        "blueviolet":  [138, 43, 226],
        "brown":  [165, 42, 42],
        "burlywood":  [222, 184, 135],
        "cadetblue":  [95, 158, 160],
        "chartreuse":  [127, 255, 0],
        "chocolate":  [210, 105, 30],
        "coral":  [255, 127, 80],
        "cornflowerblue":  [100, 149, 237],
        "cornsilk":  [255, 248, 220],
        "crimson":  [220, 20, 60],
        "cyan":  [0, 255, 255],
        "darkblue":  [0, 0, 139],
        "darkcyan":  [0, 139, 139],
        "darkgoldenrod":  [184, 134, 11],
        "darkgray":  [169, 169, 169],
        "darkgreen":  [0, 100, 0],
        "darkgrey":  [169, 169, 169],
        "darkkhaki":  [189, 183, 107],
        "darkmagenta":  [139, 0, 139],
        "darkolivegreen":  [85, 107, 47],
        "darkorange":  [255, 140, 0],
        "darkorchid":  [153, 50, 204],
        "darkred":  [139, 0, 0],
        "darksalmon":  [233, 150, 122],
        "darkseagreen":  [143, 188, 143],
        "darkslateblue":  [72, 61, 139],
        "darkslategrey":  [47, 79, 79],
        "darkturquoise":  [0, 206, 209],
        "darkviolet":  [148, 0, 211],
        "deeppink":  [255, 20, 147],
        "deepskyblue":  [0, 191, 255],
        "dimgray":  [105, 105, 105],
        "dimgrey":  [105, 105, 105],
        "dodgerblue":  [30, 144, 255],
        "firebrick":  [178, 34, 34],
        "floralwhite":  [255, 250, 240],
        "forestgreen":  [34, 139, 34],
        "fuchsia":  [255, 0, 255],
        "gainsboro":  [220, 220, 220],
        "ghostwhite":  [248, 248, 255],
        "gold":  [255, 215, 0],
        "goldenrod":  [218, 165, 32],
        "gray":  [128, 128, 128],
        "grey":  [128, 128, 128],
        "green":  [0, 128, 0],
        "greenyellow":  [173, 255, 47],
        "honeydew":  [240, 255, 240],
        "hotpink":  [255, 105, 180],
        "indianred":  [205, 92, 92],
        "indigo":  [75, 0, 130],
        "ivory":  [255, 255, 240],
        "khaki":  [240, 230, 140],
        "lavender":  [230, 230, 250],
        "lavenderblush":  [255, 240, 245],
        "lawngreen":  [124, 252, 0],
        "lemonchiffon":  [255, 250, 205],
        "lightblue":  [173, 216, 230],
        "lightcoral":  [240, 128, 128],
        "lightcyan":  [224, 255, 255],
        "lightgoldenrodyellow":  [250, 250, 210],
        "lightgray":  [211, 211, 211],
        "lightgreen":  [144, 238, 144],
        "lightgrey":  [211, 211, 211],
        "lightpink":  [255, 182, 193],
        "lightsalmon":  [255, 160, 122],
        "lightseagreen":  [32, 178, 170],
        "lightskyblue":  [135, 206, 250],
        "lightslategray":  [119, 136, 153],
        "lightslategrey":  [119, 136, 153],
        "lightsteelblue":  [176, 196, 222],
        "lightyellow":  [255, 255, 224],
        "lime":  [0, 255, 0],
        "limegreen":  [50, 205, 50],
        "linen":  [250, 240, 230],
        "magenta":  [255, 0, 255],
        "maroon":  [128, 0, 0],
        "mediumaquamarine":  [102, 205, 170],
        "mediumblue":  [0, 0, 205],
        "mediumorchid":  [186, 85, 211],
        "mediumpurple":  [147, 112, 219],
        "mediumseagreen":  [60, 179, 113],
        "mediumslateblue":  [123, 104, 238],
        "mediumspringgreen":  [0, 250, 154],
        "mediumturquoise":  [72, 209, 204],
        "mediumvioletred":  [199, 21, 133],
        "midnightblue":  [25, 25, 112],
        "mintcream":  [245, 255, 250],
        "mistyrose":  [255, 228, 225],
        "moccasin":  [255, 228, 181],
        "navajowhite":  [255, 222, 173],
        "navy":  [0, 0, 128],
        "oldlace":  [253, 245, 230],
        "olive":  [128, 128, 0],
        "olivedrab":  [107, 142, 35],
        "orange":  [255, 165, 0],
        "orangered":  [255, 69, 0],
        "orchid":  [218, 112, 214],
        "palegoldenrod":  [238, 232, 170],
        "palegreen":  [152, 251, 152],
        "paleturquoise":  [175, 238, 238],
        "palevioletred":  [219, 112, 147],
        "papayawhip":  [255, 239, 213],
        "peachpuff":  [255, 218, 185],
        "peru":  [205, 133, 63],
        "pink":  [255, 192, 203],
        "plum":  [221, 160, 221],
        "powderblue":  [176, 224, 230],
        "purple":  [128, 0, 128],
        "red":  [255, 0, 0],
        "rosybrown":  [188, 143, 143],
        "royalblue":  [65, 105, 225],
        "saddlebrown":  [139, 69, 19],
        "salmon":  [250, 128, 114],
        "sandybrown":  [244, 164, 96],
        "seagreen":  [46, 139, 87],
        "seashell":  [255, 245, 238],
        "sienna":  [160, 82, 45],
        "silver":  [192, 192, 192],
        "skyblue":  [135, 206, 235],
        "slateblue":  [106, 90, 205],
        "slategray":  [112, 128, 144],
        "slategrey":  [112, 128, 144],
        "snow":  [255, 250, 250],
        "springgreen":  [0, 255, 127],
        "steelblue":  [70, 130, 180],
        "tan":  [210, 180, 140],
        "teal":  [0, 128, 128],
        "thistle":  [216, 191, 216],
        "tomato":  [255, 99, 71],
        "turquoise":  [64, 224, 208],
        "violet":  [238, 130, 238],
        "wheat":  [245, 222, 179],
        "white":  [255, 255, 255],
        "whitesmoke":  [245, 245, 245],
        "yellow":  [255, 255, 0],
        "yellowgreen":  [154, 205, 50],
        "transparent":  [0, 0, 0, 0]
    },
    "filter": {
        "value": [
            "true",
            "false",
            "null",
            "point",
            "linestring",
            "polygon",
            "collection"
        ]
    }
}

window.carto['mapnik-reference'] =  {
  version: {
    latest: _mapnik_reference_latest,
    '2.1.1': _mapnik_reference_latest
  }
}
//
// Stub out `require` in the browser
//
window.carto = window.carto || {};
window.carto.underscore = window._;

function require(arg) {
    var mod = window.carto[arg];
    if(!mod) {
      mod = window.carto[arg.split('/')[1]];
    }
    if(!mod) {
      mod = window.carto[arg]
    }
    // try global scope
    if(!mod) {
      mod = window[arg]
    }
    return mod;
}
var carto, tree, _;

if (typeof(process) !== 'undefined') {
    carto = exports;
    tree = require('./tree');
    _ = require('underscore');
} else {
    if (typeof(window.carto) === 'undefined') { window.carto = {}; }
    carto = window.carto;
    tree = window.carto.tree = {};
}

// carto.js - parser
//
//    A relatively straight-forward predictive parser.
//    There is no tokenization/lexing stage, the input is parsed
//    in one sweep.
//
//    To make the parser fast enough to run in the browser, several
//    optimization had to be made:
//
//    - Matching and slicing on a huge input is often cause of slowdowns.
//      The solution is to chunkify the input into smaller strings.
//      The chunks are stored in the `chunks` var,
//      `j` holds the current chunk index, and `current` holds
//      the index of the current chunk in relation to `input`.
//      This gives us an almost 4x speed-up.
//
//    - In many cases, we don't need to match individual tokens;
//      for example, if a value doesn't hold any variables, operations
//      or dynamic references, the parser can effectively 'skip' it,
//      treating it as a literal.
//      An example would be '1px solid #000' - which evaluates to itself,
//      we don't need to know what the individual components are.
//      The drawback, of course is that you don't get the benefits of
//      syntax-checking on the CSS. This gives us a 50% speed-up in the parser,
//      and a smaller speed-up in the code-gen.
//
//
//    Token matching is done with the `$` function, which either takes
//    a terminal string or regexp, or a non-terminal function to call.
//    It also takes care of moving all the indices forwards.

carto.Parser = function Parser(env) {
    var input,       // LeSS input string
        i,           // current index in `input`
        j,           // current chunk
        temp,        // temporarily holds a chunk's state, for backtracking
        memo,        // temporarily holds `i`, when backtracking
        furthest,    // furthest index the parser has gone to
        chunks,      // chunkified input
        current,     // index of current chunk, in `input`
        parser;

    var that = this;

    // This function is called after all files
    // have been imported through `@import`.
    var finish = function() {};

    var imports = this.imports = {
        paths: env && env.paths || [],  // Search paths, when importing
        queue: [],                      // Files which haven't been imported yet
        files: {},                      // Holds the imported parse trees
        mime: env && env.mime,         // MIME type of .carto files
        push: function(path, callback) {
            var that = this;
            this.queue.push(path);

            //
            // Import a file asynchronously
            //
            carto.Parser.importer(path, this.paths, function(root) {
                that.queue.splice(that.queue.indexOf(path), 1); // Remove the path from the queue
                that.files[path] = root;                        // Store the root

                callback(root);

                if (that.queue.length === 0) { finish(); }       // Call `finish` if we're done importing
            }, env);
        }
    };

    function save()    {
        temp = chunks[j];
        memo = i;
        current = i;
    }
    function restore() {
        chunks[j] = temp;
        i = memo;
        current = i;
    }

    function sync() {
        if (i > current) {
            chunks[j] = chunks[j].slice(i - current);
            current = i;
        }
    }
    //
    // Parse from a token, regexp or string, and move forward if match
    //
    function $(tok) {
        var match, args, length, c, index, endIndex, k;

        //
        // Non-terminal
        //
        if (tok instanceof Function) {
            return tok.call(parser.parsers);
        //
        // Terminal
        //
        //     Either match a single character in the input,
        //     or match a regexp in the current chunk (chunk[j]).
        //
        } else if (typeof(tok) === 'string') {
            match = input.charAt(i) === tok ? tok : null;
            length = 1;
            sync();
        } else {
            sync();

            match = tok.exec(chunks[j]);
            if (match) {
                length = match[0].length;
            } else {
                return null;
            }
        }

        // The match is confirmed, add the match length to `i`,
        // and consume any extra white-space characters (' ' || '\n')
        // which come after that. The reason for this is that LeSS's
        // grammar is mostly white-space insensitive.
        if (match) {
            var mem = i += length;
            endIndex = i + chunks[j].length - length;

            while (i < endIndex) {
                c = input.charCodeAt(i);
                if (! (c === 32 || c === 10 || c === 9)) { break; }
                i++;
            }
            chunks[j] = chunks[j].slice(length + (i - mem));
            current = i;

            if (chunks[j].length === 0 && j < chunks.length - 1) { j++; }

            if (typeof(match) === 'string') {
                return match;
            } else {
                return match.length === 1 ? match[0] : match;
            }
        }
    }

    // Same as $(), but don't change the state of the parser,
    // just return the match.
    function peek(tok) {
        if (typeof(tok) === 'string') {
            return input.charAt(i) === tok;
        } else {
            if (tok.test(chunks[j])) {
                return true;
            } else {
                return false;
            }
        }
    }

    function extractErrorLine(style, errorIndex) {
        return (style.slice(0, errorIndex).match(/\n/g) || '').length + 1;
    }


    // Make an error object from a passed set of properties.
    // Accepted properties:
    // - `message`: Text of the error message.
    // - `filename`: Filename where the error occurred.
    // - `index`: Char. index where the error occurred.
    function makeError(err) {
        var einput;

        _(err).defaults({
            index: furthest,
            filename: env.filename,
            message: 'Parse error.',
            line: 0,
            column: -1
        });

        if (err.filename && that.env.inputs && that.env.inputs[err.filename]) {
            einput = that.env.inputs[err.filename];
        } else {
            einput = input;
        }

        err.line = extractErrorLine(einput, err.index);
        for (var n = err.index; n >= 0 && einput.charAt(n) !== '\n'; n--) {
            err.column++;
        }

        return new Error(_('<%=filename%>:<%=line%>:<%=column%> <%=message%>').template(err));
    }

    this.env = env = env || {};
    this.env.filename = this.env.filename || null;
    this.env.inputs = this.env.inputs || {};

    // The Parser
    return parser = {

        imports: imports,
        extractErrorLine: extractErrorLine,
        //
        // Parse an input string into an abstract syntax tree.
        // Throws an error on parse errors.
        parse: function(str) {
            var root, start, end, zone, line, lines, buff = [], c, error = null;

            i = j = current = furthest = 0;
            chunks = [];
            input = str.replace(/\r\n/g, '\n');
            if (env.filename) {
                that.env.inputs[env.filename] = input;
            }

            var early_exit = false;
            // Split the input into chunks.
            chunks = (function(chunks) {
                var j = 0,
                    skip = /[^"'`\{\}\/]+/g,
                    comment = /\/\*(?:[^*]|\*+[^\/*])*\*+\/|\/\/.*/g,
                    level = 0,
                    match,
                    chunk = chunks[0],
                    inString;

                chunker: for (var i = 0, c, cc; i < input.length; i++) {
                    skip.lastIndex = i;
                    if (match = skip.exec(input)) {
                        if (match.index === i) {
                            i += match[0].length;
                            chunk.push(match[0]);
                        }
                    }
                    c = input.charAt(i);
                    comment.lastIndex = i;

                    if (!inString && c === '/') {
                        cc = input.charAt(i + 1);
                        if (cc === '/' || cc === '*') {
                            if (match = comment.exec(input)) {
                                if (match.index === i) {
                                    i += match[0].length - 1;
                                    chunk.push(match[0]);
                                    c = input.charAt(i);
                                    continue chunker;
                                }
                            }
                        }
                    }

                    if (c === '{' && !inString) { level++;
                        chunk.push(c);
                    } else if (c === '}' && !inString) { level--;
                        chunk.push(c);
                        chunks[++j] = chunk = [];
                    } else {
                        if (c === '"' || c === "'" || c === '`') {
                            if (! inString) {
                                inString = c;
                            } else {
                                inString = inString === c ? false : inString;
                            }
                        }
                        chunk.push(c);
                    }
                }
                if (level > 0) {
                    // TODO: make invalid instead
                    throw makeError({
                        message: 'Missing closing `}`',
                        index: i
                    });
                }

                return chunks.map(function(c) { return c.join(''); });
            })([[]]);

            // Start with the primary rule.
            // The whole syntax tree is held under a Ruleset node,
            // with the `root` property set to true, so no `{}` are
            // output. The callback is called when the input is parsed.
            root = new tree.Ruleset([], $(this.parsers.primary));
            root.root = true;

            // Get an array of Ruleset objects, flattened
            // and sorted according to specificitySort
            root.toList = (function() {
                var line, lines, column;
                if (!(window && window._)) {
                    var _ = require('underscore')._;
                }
                return function(env) {
                    env.error = function(e) {
                        if (!env.errors) env.errors = new Error('');
                        if (env.errors.message) {
                            env.errors.message += '\n' + makeError(e).message;
                        } else {
                            env.errors.message = makeError(e).message;
                        }
                    };
                    env.frames = env.frames || [];

                    // call populates Invalid-caused errors
                    var definitions = this.flatten([], [], env);
                    definitions.sort(specificitySort);
                    return definitions;
                };
            })();

            // Sort rules by specificity: this function expects selectors to be
            // split already.
            //
            // Written to be used as a .sort(Function);
            // argument.
            //
            // [1, 0, 0, 467] > [0, 0, 1, 520]
            var specificitySort = function(a, b) {
                var as = a.specificity;
                var bs = b.specificity;

                if (as[0] != bs[0]) return bs[0] - as[0];
                if (as[1] != bs[1]) return bs[1] - as[1];
                if (as[2] != bs[2]) return bs[2] - as[2];
                return bs[3] - as[3];
            };

            // If `i` is smaller than the `input.length - 1`,
            // it means the parser wasn't able to parse the whole
            // string, so we've got a parsing error.
            //
            // We try to extract a \n delimited string,
            // showing the line where the parse error occured.
            // We split it up into two parts (the part which parsed,
            // and the part which didn't), so we can color them differently.
            if (i < input.length - 1) throw makeError({
                message:'Parse error.',
                index:i
            });

            return root;
        },

        //
        // Here in, the parsing rules/functions
        //
        // The basic structure of the syntax tree generated is as follows:
        //
        //   Ruleset ->  Rule -> Value -> Expression -> Entity
        //
        //  In general, most rules will try to parse a token with the `$()` function, and if the return
        //  value is truly, will return a new node, of the relevant type. Sometimes, we need to check
        //  first, before parsing, that's when we use `peek()`.
        //
        parsers: {
            //
            // The `primary` rule is the *entry* and *exit* point of the parser.
            // The rules here can appear at any level of the parse tree.
            //
            // The recursive nature of the grammar is an interplay between the `block`
            // rule, which represents `{ ... }`, the `ruleset` rule, and this `primary` rule,
            // as represented by this simplified grammar:
            //
            //     primary  →  (ruleset | rule)+
            //     ruleset  →  selector+ block
            //     block    →  '{' primary '}'
            //
            // Only at one point is the primary rule not called from the
            // block rule: at the root level.
            //
            primary: function() {
                var node, root = [];

                while ((node = $(this.rule) || $(this.ruleset) ||
                               $(this.comment)) ||
                               $(/^[\s\n]+/) || (node = $(this.invalid))) {
                    node && root.push(node);
                }
                return root;
            },

            invalid: function () {
                var chunk = $(/^[^;\n]*[;\n]/);

                // To fail gracefully, match everything until a semicolon or linebreak.
                if (chunk) {
                    return new(tree.Invalid)(chunk, memo);
                }
            },

            // We create a Comment node for CSS comments `/* */`,
            // but keep the LeSS comments `//` silent, by just skipping
            // over them.
            comment: function() {
                var comment;

                if (input.charAt(i) !== '/') return;

                if (input.charAt(i + 1) === '/') {
                    return new tree.Comment($(/^\/\/.*/), true);
                } else if (comment = $(/^\/\*(?:[^*]|\*+[^\/*])*\*+\/\n?/)) {
                    return new tree.Comment(comment);
                }
            },

            //
            // Entities are tokens which can be found inside an Expression
            //
            entities: {
                //
                // A string, which supports escaping " and '
                //
                //     "milky way" 'he\'s the one!'
                //
                quoted: function() {
                    if (input.charAt(i) !== '"' && input.charAt(i) !== "'") return;
                    var str = $(/^"((?:[^"\\\r\n]|\\.)*)"|'((?:[^'\\\r\n]|\\.)*)'/);
                    if (str) {
                        return new tree.Quoted(str[1] || str[2]);
                    }
                },

                // A reference to a Mapnik field, like
                //
                //     [NAME]
                //
                // Behind the scenes, this has the same representation, but Carto
                // needs to be careful to warn when unsupported operations are used.
                field: function() {
                    if (! $('[')) return;
                    var field_name = $(/(^[a-zA-Z0-9\-_]+)/);
                    if (! $(']')) return;
                    if (field_name) return new tree.Field(field_name[1]);
                },

                // This is a comparison operator
                comparison: function() {
                    var str = $(/^=~|=|!=|<=|>=|<|>/);
                    if (str) {
                        return str;
                    }
                },

                // A catch-all word, such as:
                //
                //     hard-light
                //
                //  These can start with either a letter or a dash (-),
                //  and then contain numbers, underscores, and letters.
                keyword: function() {
                    var k = $(/^[A-Za-z-]+[A-Za-z-0-9_]*/);
                    if (k) { return new tree.Keyword(k); }
                },

                // A function call
                //
                //     rgb(255, 0, 255)
                //
                // The arguments are parsed with the `entities.arguments` parser.
                call: function() {
                    var name, args;

                    if (! (name = /^([\w\-]+|%)\(/.exec(chunks[j]))) return;

                    name = name[1].toLowerCase();

                    if (name === 'url') {
                        return null;
                    } else {
                        i += name.length + 1;
                    }

                    args = $(this.entities.arguments);

                    if (!$(')')) return;

                    if (name) {
                        return new tree.Call(name, args, i); 
                    }
                },
                // Arguments are comma-separated expressions
                'arguments': function() {
                    var args = [], arg;

                    while (arg = $(this.expression)) {
                        args.push(arg);
                        if (! $(',')) { break; }
                    }

                    return args;
                },
                literal: function() {
                    return $(this.entities.dimension) ||
                           $(this.entities.color) ||
                           $(this.entities.quoted);
                },

                // Parse url() tokens
                //
                // We use a specific rule for urls, because they don't really behave like
                // standard function calls. The difference is that the argument doesn't have
                // to be enclosed within a string, so it can't be parsed as an Expression.
                url: function() {
                    var value;

                    if (input.charAt(i) !== 'u' || !$(/^url\(/)) return;
                    value = $(this.entities.quoted) || $(this.entities.variable) ||
                            $(/^[\-\w%@$\/.&=:;#+?~]+/) || '';
                    if (! $(')')) {
                        return new tree.Invalid(value, memo, 'Missing closing ) in URL.');
                    } else {
                        return new tree.URL((value.value || value instanceof tree.Variable) ?
                            value : new tree.Quoted(value), imports.paths);
                    }
                },

                // A Variable entity, such as `@fink`, in
                //
                //     width: @fink + 2px
                //
                // We use a different parser for variable definitions,
                // see `parsers.variable`.
                variable: function() {
                    var name, index = i;

                    if (input.charAt(i) === '@' && (name = $(/^@[\w-]+/))) {
                        return new tree.Variable(name, index, env.filename);
                    }
                },

                // A Hexadecimal color
                //
                //     #4F3C2F
                //
                // `rgb` and `hsl` colors are parsed through the `entities.call` parser.
                color: function() {
                    var rgb;

                    if (input.charAt(i) === '#' && (rgb = $(/^#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})/))) {
                        return new tree.Color(rgb[1]);
                    } else {
                        rgb = chunks[j].match(/^[a-z]+/);
                        if (rgb && rgb[0] in tree.Reference.data.colors) {
                            return new tree.Color(tree.Reference.data.colors[$(/^[a-z]+/)]);
                        }
                    }
                },

                // A Dimension, that is, a number and a unit. The only
                // unit that has an effect is %
                //
                //     0.5em 95%
                dimension: function() {
                    var c = input.charCodeAt(i);
                    if ((c > 57 || c < 45) || c === 47) return;
                    var value = $(/^(-?\d*\.?\d+)(\%|\w+)?/);
                    if (value) {
                        return new tree.Dimension(value[1], value[2], memo);
                    }
                }
            },

            // The variable part of a variable definition. Used in the `rule` parser
            //
            //     @fink:
            variable: function() {
                var name;

                if (input.charAt(i) === '@' && (name = $(/^(@[\w-]+)\s*:/))) {
                    return name[1];
                }
            },

            //
            // Entities are the smallest recognized token,
            // and can be found inside a rule's value.
            //
            entity: function() {
                return $(this.entities.literal) ||
                    $(this.entities.field) ||
                    $(this.entities.variable) ||
                    $(this.entities.url) ||
                    $(this.entities.call) ||
                    $(this.entities.keyword);
            },

            //
            // A Rule terminator. Note that we use `peek()` to check for '}',
            // because the `block` rule will be expecting it, but we still need to make sure
            // it's there, if ';' was ommitted.
            //
            end: function() {
                return $(';') || peek('}');
            },

            // Elements are the building blocks for Selectors. They consist of
            // an element name, such as a tag a class, or `*`.
            element: function() {
                var e = $(/^(?:[.#][\w\-]+|\*|Map)/);
                if (e) return new tree.Element(e);
            },

            // Attachments allow adding multiple lines, polygons etc. to an
            // object. There can only be one attachment per selector.
            attachment: function() {
                var s = $(/^::([\w\-]+(?:\/[\w\-]+)*)/);
                if (s) return s[1];
            },

            // Selectors are made out of one or more Elements, see above.
            selector: function() {
                var a, attachment;
                var e, elements = [];
                var f, filters = new tree.Filterset();
                var z, zoom = tree.Zoom.all;
                var segments = 0, conditions = 0;

                while (
                        (e = $(this.element)) ||
                        (z = $(this.zoom)) ||
                        (f = $(this.filter)) ||
                        (a = $(this.attachment))
                    ) {
                    segments++;
                    if (e) {
                        elements.push(e);
                    } else if (z) {
                        zoom &= z;
                        conditions++;
                    } else if (f) {
                        filters.add(f);
                        conditions++;
                    } else if (attachment) {
                        throw makeError({
                            message:'Encountered second attachment name.',
                            index:i - 1
                        });
                    } else {
                        attachment = a;
                    }

                    var c = input.charAt(i);
                    if (c === '{' || c === '}' || c === ';' || c === ',') { break; }
                }

                if (segments) {
                    return new tree.Selector(filters, zoom, elements, attachment, conditions, memo);
                }
            },

            filter: function() {
                save();
                var key, op, val;
                if (! $('[')) return;
                if (key = $(/^[a-zA-Z0-9\-_]+/) || $(this.entities.quoted) || $(this.entities.variable)) {
                    if ((op = $(this.entities.comparison)) &&
                        (val = $(this.entities.quoted) || $(this.entities.variable) || $(/^[\w\-\.]+/))) {
                        if (! $(']')) return;
                        return new tree.Filter(key, op, val, memo, env.filename);
                    }
                }
            },

            zoom: function() {
                save();
                var op, val;
                if ($(/^\[zoom/g) &&
                    (op = $(this.entities.comparison)) &&
                    (val = $(/^\d+/)) &&
                    $(']')) {
                        return tree.Zoom(op, val, memo);
                }
            },

            //
            // The `block` rule is used by `ruleset`
            // It's a wrapper around the `primary` rule, with added `{}`.
            //
            block: function() {
                var content;

                if ($('{') && (content = $(this.primary)) && $('}')) {
                    return content;
                }
            },

            //
            // div, .class, body > p {...}
            //
            ruleset: function() {
                var selectors = [], s, f, l, rules, filters = [];
                save();

                while (s = $(this.selector)) {
                    selectors.push(s);
                    if (! $(',')) { break }
                }
                if (s) $(this.comment);

                if (selectors.length > 0 && (rules = $(this.block))) {
                    if (selectors.length === 1 &&
                        selectors[0].elements.length &&
                        selectors[0].elements[0].value === 'Map') {
                        var rs = new tree.Ruleset(selectors, rules);
                        rs.isMap = true;
                        return rs;
                    }
                    return new tree.Ruleset(selectors, rules);
                } else {
                    // Backtrack
                    restore();
                }
            },
            rule: function() {
                var name, value, c = input.charAt(i);
                save();

                if (c === '.' || c === '#' || c === '&') { return }

                if (name = $(this.variable) || $(this.property)) {
                    value = $(this.value);

                    if (value && $(this.end)) {
                        return new tree.Rule(name, value, memo, env.filename);
                    } else {
                        furthest = i;
                        restore();
                    }
                }
            },

            font: function() {
                var value = [], expression = [], weight, font, e;

                while (e = $(this.entity)) {
                    expression.push(e);
                }

                value.push(new tree.Expression(expression));

                if ($(',')) {
                    while (e = $(this.expression)) {
                        value.push(e);
                        if (! $(',')) { break; }
                    }
                }
                return new tree.Value(value);
            },

            // A Value is a comma-delimited list of Expressions
            // In a Rule, a Value represents everything after the `:`,
            // and before the `;`.
            value: function() {
                var e, expressions = [];

                while (e = $(this.expression)) {
                    expressions.push(e);
                    if (! $(',')) { break; }
                }

                if (expressions.length > 0) {
                    return new tree.Value(expressions);
                }
            },
            // A sub-expression, contained by parenthensis
            sub: function() {
                var e;

                if ($('(') && (e = $(this.expression)) && $(')')) {
                    return e;
                }
            },
            // This is a misnomer because it actually handles multiplication
            // and division.
            multiplication: function() {
                var m, a, op, operation;
                if (m = $(this.operand)) {
                    while ((op = ($('/') || $('*') || $('%'))) && (a = $(this.operand))) {
                        operation = new tree.Operation(op, [operation || m, a], memo);
                    }
                    return operation || m;
                }
            },
            addition: function() {
                var m, a, op, operation;
                if (m = $(this.multiplication)) {
                    while ((op = $(/^[-+]\s+/) || (input.charAt(i - 1) != ' ' && ($('+') || $('-')))) &&
                           (a = $(this.multiplication))) {
                        operation = new tree.Operation(op, [operation || m, a], memo);
                    }
                    return operation || m;
                }
            },

            // An operand is anything that can be part of an operation,
            // such as a Color, or a Variable
            operand: function() {
                return $(this.sub) || $(this.entity);
            },

            // Expressions either represent mathematical operations,
            // or white-space delimited Entities.
            //
            //     1px solid black
            //     @var * 2
            expression: function() {
                var e, delim, entities = [], d;

                while (e = $(this.addition) || $(this.entity)) {
                    entities.push(e);
                }
                if (entities.length > 0) {
                    return new tree.Expression(entities);
                }
            },
            property: function() {
                var name = $(/^(([a-z][-a-z_0-9]*\/)?\*?-?[-a-z_0-9]+)\s*:/);
                if (name) return name[1];
            }
        }
    };
};

/**
 * TODO: document this. What does this do?
 */
if(typeof(module) !== "undefined") {
  module.exports.find = function (obj, fun) {
      for (var i = 0, r; i < obj.length; i++) {
          if (r = fun.call(obj, obj[i])) { return r; }
      }
      return null;
  };
}
(function(tree) {

tree.Anonymous = function Anonymous(string) {
    this.value = string.value || string;
};
tree.Anonymous.prototype = {
    toString: function() {
        return this.value;
    },
    eval: function() { return this; }
};

})(require('../tree'));
(function(tree) {

tree.Call = function Call(name, args, index) {
    this.is = 'call';

    this.name = name;
    this.args = args;
    this.index = index;
};

tree.Call.prototype = {
    //
    // When evaluating a function call,
    // we either find the function in `tree.functions` [1],
    // in which case we call it, passing the  evaluated arguments,
    // or we simply print it out as it appeared originally [2].
    //
    // The *functions.js* file contains the built-in functions.
    //
    // The reason why we evaluate the arguments, is in the case where
    // we try to pass a variable to a function, like: `saturate(@color)`.
    // The function should receive the value, not the variable.
    //
    eval: function(env) {
        var args = this.args.map(function(a) { return a.eval(env); });

        for (var i = 0; i < args.length; i++) {
            if (args[i].is === 'undefined') {
                return {
                    is: 'undefined',
                    value: 'undefined'
                };
            }
        }

        if (this.name in tree.functions) {
            if (tree.functions[this.name].length === args.length) {
                return tree.functions[this.name].apply(tree.functions, args);
            } else {
                env.error({
                    message: 'incorrect number of arguments for ' + this.name +
                        '(). ' + tree.functions[this.name].length + ' expected.',
                    index: this.index,
                    type: 'runtime',
                    filename: this.filename
                });
                return {
                    is: 'undefined',
                    value: 'undefined'
                };
            }
        } else {
            var fn = tree.Reference.mapnikFunction(this.name);
            if (!fn) {
                env.error({
                    message: 'unknown function ' + this.name,
                    index: this.index,
                    type: 'runtime',
                    filename: this.filename
                });
                return {
                    is: 'undefined',
                    value: 'undefined'
                };
            }
            if (fn[1] !== args.length) {
                env.error({
                    message: 'function ' + this.name + ' takes ' +
                        fn[1] + ' arguments and was given ' + args.length,
                    index: this.index,
                    type: 'runtime',
                    filename: this.filename
                });
                return {
                    is: 'undefined',
                    value: 'undefined'
                };
            } else {
                // Save the evaluated versions of arguments
                this.args = args;
                return this;
            }
        }
    },

    toString: function(env, format) {
        if (format === 'image-filter') {
            if (this.args.length) {
                return this.name + ':' + this.args.join(',');
            } else {
                return this.name;
            }
        } else {
            if (this.args.length) {
                return this.name + '(' + this.args.join(',') + ')';
            } else {
                return this.name;
            }
        }
    }
};

})(require('../tree'));
(function(tree) {
//
// RGB Colors - #ff0014, #eee
//
tree.Color = function Color(rgb, a) {
    //
    // The end goal here, is to parse the arguments
    // into an integer triplet, such as `128, 255, 0`
    //
    // This facilitates operations and conversions.
    //
    if (Array.isArray(rgb)) {
        this.rgb = rgb;
    } else if (rgb.length == 6) {
        this.rgb = rgb.match(/.{2}/g).map(function(c) {
            return parseInt(c, 16);
        });
    } else {
        this.rgb = rgb.split('').map(function(c) {
            return parseInt(c + c, 16);
        });
    }
    this.is = 'color';
    this.alpha = typeof(a) === 'number' ? a : 1;
};

tree.Color.prototype = {
    eval: function() { return this; },

    // If we have some transparency, the only way to represent it
    // is via `rgba`. Otherwise, we use the hex representation,
    // which has better compatibility with older browsers.
    // Values are capped between `0` and `255`, rounded and zero-padded.
    toString: function() {
        if (this.alpha < 1.0) {
            return 'rgba(' + this.rgb.map(function(c) {
                return Math.round(c);
            }).concat(this.alpha).join(', ') + ')';
        } else {
            return '#' + this.rgb.map(function(i) {
                i = Math.round(i);
                i = (i > 255 ? 255 : (i < 0 ? 0 : i)).toString(16);
                return i.length === 1 ? '0' + i : i;
            }).join('');
        }
    },

    // Operations have to be done per-channel, if not,
    // channels will spill onto each other. Once we have
    // our result, in the form of an integer triplet,
    // we create a new Color node to hold the result.
    operate: function(op, other) {
        var result = [];

        if (! (other instanceof tree.Color)) {
            other = other.toColor();
        }

        for (var c = 0; c < 3; c++) {
            result[c] = tree.operate(op, this.rgb[c], other.rgb[c]);
        }
        return new tree.Color(result);
    },

    toHSL: function() {
        var r = this.rgb[0] / 255,
            g = this.rgb[1] / 255,
            b = this.rgb[2] / 255,
            a = this.alpha;

        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, l = (max + min) / 2, d = max - min;

        if (max === min) {
            h = s = 0;
        } else {
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: h * 360, s: s, l: l, a: a };
    }
};


})(require('../tree'));
(function(tree) {

tree.Comment = function Comment(value, silent) {
    this.value = value;
    this.silent = !!silent;
};

tree.Comment.prototype = {
    toString: function(env) {
        return '<!--' + this.value + '-->';
    },
    eval: function() { return this; }
};

})(require('../tree'));
(function(tree) {
var assert = require('assert');

tree.Definition = function Definition(selector, rules) {
    this.elements = selector.elements;
    assert.ok(selector.filters instanceof tree.Filterset);
    this.rules = rules;
    this.ruleIndex = [];
    for (var i = 0; i < this.rules.length; i++) {
        if ('zoom' in this.rules[i]) this.rules[i] = this.rules[i].clone();
        this.rules[i].zoom = selector.zoom;
        this.ruleIndex.push(this.rules[i].updateID());
    }
    this.filters = selector.filters;
    this.zoom = selector.zoom;
    this.attachment = selector.attachment || '__default__';
    this.specificity = selector.specificity();
};

tree.Definition.prototype.toString = function() {
    var str = this.filters.toString();
    for (var i = 0; i < this.rules.length; i++) {
        str += '\n    ' + this.rules[i];
    }
    return str;
};

tree.Definition.prototype.clone = function(filters) {
    if (filters) assert.ok(filters instanceof tree.Filterset);
    var clone = Object.create(tree.Definition.prototype);
    clone.rules = this.rules.slice();
    clone.ruleIndex = this.ruleIndex.slice();
    clone.filters = filters ? filters : this.filters.clone();
    clone.attachment = this.attachment;
    return clone;
};

tree.Definition.prototype.addRules = function(rules) {
    var added = 0;

    // Add only unique rules.
    for (var i = 0; i < rules.length; i++) {
        if (this.ruleIndex.indexOf(rules[i].id) < 0) {
            this.rules.push(rules[i]);
            this.ruleIndex.push(rules[i].id);
            added++;
        }
    }

    return added;
};

/**
 * Determine whether this selector matches a given id
 * and array of classes, by determining whether
 * all elements it contains match.
 */
tree.Definition.prototype.appliesTo = function(id, classes) {
    for (var i = 0; i < this.elements.length; i++) {
        if (!this.elements[i].matches(id, classes)) {
            return false;
        }
    }
    return true;
};

tree.Definition.prototype.symbolizersToXML = function(env, symbolizers, zoom) {
    var xml = '  <Rule>\n';
    xml += tree.Zoom.toXML(zoom).join('');
    xml += this.filters.toXML(env);

    // Sort symbolizers by the index of their first property definition
    var sym_order = [], indexes = [];
    for (var key in symbolizers) {
        indexes = [];
        for (var prop in symbolizers[key]) {
            indexes.push(symbolizers[key][prop].index);
        }
        var min_idx = Math.min.apply(Math, indexes);
        sym_order.push([key, min_idx]);
    }

    // Get a simple list of the symbolizers, in order
    sym_order = sym_order.sort(function(a, b) {
        return a[1] - b[1];
    }).map(function(v) {
        return v[0];
    });

    for (var i = 0; i < sym_order.length; i++) {
        var attributes = symbolizers[sym_order[i]];
        var symbolizer = sym_order[i].split('/').pop();
        
        // Skip the magical * symbolizer which is used for universal properties
        // which are bubbled up to Style elements intead of Symbolizer elements.
        if (symbolizer === '*') continue;

        var fail = tree.Reference.requiredProperties(symbolizer, attributes);
        if (fail) {
            var rule = attributes[Object.keys(attributes).shift()];
            env.error({
                message: fail,
                index: rule.index,
                filename: rule.filename
            });
        }

        var name = symbolizer.charAt(0).toUpperCase() +
               symbolizer.slice(1).replace(/\-./, function(str) {
                   return str[1].toUpperCase();
               }) + 'Symbolizer';

        var selfclosing = true, tagcontent;
        xml += '    <' + name + ' ';
        for (var key in attributes) {
            if (symbolizer === 'map') env.error({
                message: 'Map properties are not permitted in other rules',
                index: attributes[key].index,
                filename: attributes[key].filename
            });
            var x = tree.Reference.selector(attributes[key].name);
            if (x && x.serialization && x.serialization === 'content') {
                selfclosing = false;
                tagcontent = attributes[key].eval(env).toXML(env, true);
            } else {
                xml += attributes[key].eval(env).toXML(env) + ' ';
            }
        }
        if (selfclosing) {
            xml += '/>\n';
        } else {
            xml += '><![CDATA[' + tagcontent + ']]></' + name + '>\n';
        }
    }
    xml += '  </Rule>\n';
    return xml;
};

tree.Definition.prototype.collectSymbolizers = function(zooms, i) {
    var symbolizers = {}, child;

    for (var j = i; j < this.rules.length; j++) {
        child = this.rules[j];
        var key = child.instance + '/' + child.symbolizer;
        if (zooms.current & child.zoom &&
           (!(key in symbolizers) ||
           (!(child.name in symbolizers[key])))) {
            zooms.current &= child.zoom;
            if (!(key in symbolizers)) {
                symbolizers[key] = {};
            }
            symbolizers[key][child.name] = child;
        }
    }

    if (Object.keys(symbolizers).length) {
        zooms.rule &= (zooms.available &= ~zooms.current);
        return symbolizers;
    }
};

tree.Definition.prototype.toXML = function(env, existing) {
    // The tree.Zoom.toString function ignores the holes in zoom ranges and outputs
    // scaledenominators that cover the whole range from the first to last bit set.
    // This algorithm can produces zoom ranges that may have holes. However,
    // when using the filter-mode="first", more specific zoom filters will always
    // end up before broader ranges. The filter-mode will pick those first before
    // resorting to the zoom range with the hole and stop processing further rules.
    var filter = this.filters.toString();
    if (!(filter in existing)) existing[filter] = tree.Zoom.all;

    var available = tree.Zoom.all, xml = '', zoom, symbolizers;
    var zooms = { available: tree.Zoom.all };
    for (var i = 0; i < this.rules.length && available; i++) {
        zooms.rule = this.rules[i].zoom;
        if (!(existing[filter] & zooms.rule)) continue;

        while (zooms.current = zooms.rule & available) {
            if (symbolizers = this.collectSymbolizers(zooms, i)) {
                if (!(existing[filter] & zooms.current)) continue;
                xml += this.symbolizersToXML(env, symbolizers, existing[filter] & zooms.current);
                existing[filter] &= ~zooms.current;
            }
        }
    }

    return xml;
};

})(require('../tree'));
(function(tree) {

//
// A number with a unit
//
tree.Dimension = function Dimension(value, unit, index) {
    this.value = parseFloat(value);
    this.unit = unit || null;
    this.is = 'float';
    this.index = index;
};

tree.Dimension.prototype = {
    eval: function (env) {
        if (this.unit && ['px', '%'].indexOf(this.unit) === -1) {
             env.error({
                message: "Invalid unit: '" + this.unit + "'",
                index: this.index
            });
        }

        return this;
    },
    toColor: function() {
        return new tree.Color([this.value, this.value, this.value]);
    },
    toString: function() {
        return this.value.toString();
    },

    // In an operation between two Dimensions,
    // we default to the first Dimension's unit,
    // so `1px + 2em` will yield `3px`.
    // In the future, we could implement some unit
    // conversions such that `100cm + 10mm` would yield
    // `101cm`.
    operate: function(op, other) {
        return new tree.Dimension(tree.operate(op, this.value, other.value),
                  this.unit || other.unit);
    }
};

})(require('../tree'));
(function(tree) {

tree.Directive = function Directive(name, value) {
    this.name = name;
    if (Array.isArray(value)) {
        this.ruleset = new tree.Ruleset([], value);
    } else {
        this.value = value;
    }
};
tree.Directive.prototype = {
    toString: function(ctx, env) {
        if (this.ruleset) {
            this.ruleset.root = true;
            return this.name + ' {\n  ' +
                   this.ruleset.toString(ctx, env).trim().replace(/\n/g, '\n  ') +
                               '\n}\n';
        } else {
            return this.name + ' ' + this.value.toString() + ';\n';
        }
    },
    eval: function(env) {
        env.frames.unshift(this);
        this.ruleset = this.ruleset && this.ruleset.eval(env);
        env.frames.shift();
        return this;
    },
    variable: function(name) {
        return tree.Ruleset.prototype.variable.call(this.ruleset, name);
    },
    find: function() {
        return tree.Ruleset.prototype.find.apply(this.ruleset, arguments);
    },
    rulesets: function() {
        return tree.Ruleset.prototype.rulesets.apply(this.ruleset);
    }
};

})(require('../tree'));
(function(tree) {

// An element is an id or class selector
tree.Element = function Element(value) {
    this.value = value.trim();
};

// Determine the 'specificity matrix' of this
// specific selector
tree.Element.prototype.specificity = function() {
    return [
        (this.value[0] == '#') ? 1 : 0, // a
        (this.value[0] == '.') ? 1 : 0  // b
    ];
};

tree.Element.prototype.toString = function() {
    return this.value;
};

// Determine whether this element matches an id or classes.
// An element is a single id or class, or check whether the given
// array of classes contains this, or the id is equal to this.
//
// Takes a plain string for id and plain strings in the array of
// classes.
tree.Element.prototype.matches = function(id, classes) {
    return (classes.indexOf(this.value.replace(/^\./, '')) !== -1) ||
        (this.value.replace(/^#/, '') === id) ||
        (this.value === '*');
};

})(require('../tree'));
(function(tree) {

tree.Expression = function Expression(value) {
    this.value = value;
};
tree.Expression.prototype = {
    eval: function(env) {
        if (this.value.length > 1) {
            return new tree.Expression(this.value.map(function(e) {
                return e.eval(env);
            }));
        } else {
            return this.value[0].eval(env);
        }
    },
    toString: function(env) {
        return this.value.map(function(e) {
            return e.toString(env);
        }).join(' ');
    }
};

})(require('../tree'));
(function(tree) {

tree.Field = function Field(content) {
    this.value = content || '';
    this.is = 'field';
};

tree.Field.prototype = {
    toString: function() {
        return '[' + this.value + ']';
    },
    'eval': function() {
        return this;
    }
};

})(require('../tree'));
(function(tree) {

tree.Filter = function Filter(key, op, val, index, filename) {
    if (key.is) {
        this.key = key.value;
        this._key = key;
    } else {
        this.key = key;
    }

    this.op = op;
    this.index = index;
    this.filename = filename;

    if (val.is) {
        this.val = val.value;
        this._val = val;
    } else {
        this.val = val;
    }

    if (ops[this.op][1] == 'numeric') {
        this.val = 1 * this.val;
    }

    this.id = this.key + this.op + this.val;
};


// xmlsafe, numeric, suffix
var ops = {
    '<': [' &lt; ', 'numeric'],
    '>': [' &gt; ', 'numeric'],
    '=': [' = ', 'both'],
    '!=': [' != ', 'both'],
    '<=': [' &lt;= ', 'numeric'],
    '>=': [' &gt;= ', 'numeric'],
    '=~': ['.match(', 'string', ')']
};

tree.Filter.prototype.toXML = function(env) {
    if (this.val.eval) this._val = this.val.eval(env);
    if (this.key.eval) this._key = this.key.eval(env);
    if (this._key) var key = this._key.toString(false);
    if (this._val) var val = this._val.toString(this._val.is == 'string');

    if (
        (ops[this.op][1] == 'numeric' && isNaN(this.val)) ||
        (ops[this.op][1] == 'string' && (val || this.val)[0] != "'")
    ) {
        env.error({
            message: 'Cannot use operator "' + this.op + '" with value ' + this.val,
            index: this.index,
            filename: this.filename
        });
    }

    return '[' + (key || this.key) + ']' + ops[this.op][0] + '' + (val || this.val) + (ops[this.op][2] || '');
};

tree.Filter.prototype.toString = function() {
    return '[' + this.id + ']';
};

})(require('../tree'));
var tree = require('../tree');

tree.Filterset = function Filterset() {};

Object.defineProperty(tree.Filterset.prototype, 'toXML', {
    enumerable: false,
    value: function(env) {
        var filters = [];
        for (var id in this) {
            filters.push('(' + this[id].toXML(env).trim() + ')');
        }

        if (filters.length) {
            return '    <Filter>' + filters.join(' and ') + '</Filter>\n';
        } else {
            return '';
        }
    }
});

Object.defineProperty(tree.Filterset.prototype, 'toString', {
    enumerable: false,
    value: function() {
        var arr = [];
        for (var id in this) arr.push(this[id].id);
        arr.sort();
        return arr.join('\t');
    }
});

Object.defineProperty(tree.Filterset.prototype, 'clone', {
    enumerable: false,
    value: function() {
        var clone = new tree.Filterset();
        for (var id in this) {
            clone[id] = this[id];
        }
        return clone;
    }
});

// Note: other has to be a tree.Filterset.
Object.defineProperty(tree.Filterset.prototype, 'cloneWith', {
    enumerable: false,
    value: function(other) {
        var additions;
        for (var id in other) {
            var status = this.addable(other[id]);
            if (status === false) {
                return false;
            }
            if (status === true) {
                // Adding the filter will override another value.
                if (!additions) additions = [];
                additions.push(other[id]);
            }
        }

        // Adding the other filters doesn't make this filterset invalid, but it
        // doesn't add anything to it either.
        if (!additions) return null;

        // We can successfully add all filters. Now clone the filterset and add the
        // new rules.
        var clone = new tree.Filterset();

        // We can add the rules that are already present without going through the
        // add function as a Filterset is always in it's simplest canonical form.
        for (var id in this) {
            clone[id] = this[id];
        }

        // Only add new filters that actually change the filter.
        while (id = additions.shift()) {
            clone.add(id);
        }

        return clone;
    }
});

/**
 * Returns true when the new filter can be added, false otherwise.
 */
Object.defineProperty(tree.Filterset.prototype, 'addable', {
    enumerable: false,
    value: function(filter) {
        var key = filter.key, value = filter.val;

        switch (filter.op) {
            case '=':
                if (key + '=' in this) return (this[key + '='].val != value) ? false : null;
                if (key + '!=' + value in this) return false;
                if (key + '>' in this  && this[key + '>'].val >= value) return false;
                if (key + '<' in this  && this[key + '<'].val <= value) return false;
                if (key + '>=' in this && this[key + '>='].val > value) return false;
                if (key + '<=' in this && this[key + '<='].val < value) return false;
                return true;

            case '!=':
                if (key + '=' in this) return (this[key + '='].val == value) ? false : null;
                if (key + '!=' + value in this) return null;
                if (key + '>' in this  && this[key + '>'].val >= value) return null;
                if (key + '<' in this  && this[key + '<'].val <= value) return null;
                if (key + '>=' in this && this[key + '>='].val > value) return null;
                if (key + '<=' in this && this[key + '<='].val < value) return null;
                return true;

            case '>':
                if (key + '=' in this) return (this[key + '='].val <= value) ? false : null;
                if (key + '<' in this && this[key + '<'].val <= value) return false;
                if (key + '<=' in this && this[key + '<='].val <= value) return false;
                if (key + '>' in this && this[key + '>'].val >= value) return null;
                if (key + '>=' in this && this[key + '>='].val > value) return null;
                return true;

            case '>=':
                if (key + '=' in this) return (this[key + '='].val < value) ? false : null;
                if (key + '<' in this && this[key + '<'].val <= value) return false;
                if (key + '<=' in this && this[key + '<='].val < value) return false;
                if (key + '>' in this && this[key + '>'].val >= value) return null;
                if (key + '>=' in this && this[key + '>='].val >= value) return null;
                return true;

            case '<':
                if (key + '=' in this) return (this[key + '='].val >= value) ? false : null;
                if (key + '>' in this && this[key + '>'].val >= value) return false;
                if (key + '>=' in this && this[key + '>='].val >= value) return false;
                if (key + '<' in this && this[key + '<'].val <= value) return null;
                if (key + '<=' in this && this[key + '<='].val < value) return null;
                return true;

            case '<=':
                if (key + '=' in this) return (this[key + '='].val > value) ? false : null;
                if (key + '>' in this && this[key + '>'].val >= value) return false;
                if (key + '>=' in this && this[key + '>='].val > value) return false;
                if (key + '<' in this && this[key + '<'].val <= value) return null;
                if (key + '<=' in this && this[key + '<='].val <= value) return null;
                return true;
        }
    }
});

/**
 * Only call this function for filters that have been cleared by .addable().
 */
Object.defineProperty(tree.Filterset.prototype, 'add', {
    enumerable: false,
    value: function(filter) {
        var key = filter.key;

        switch (filter.op) {
            case '=':
                for (var id in this) {
                    if (this[id].key == key) {
                        delete this[id];
                    }
                }
                this[key + '='] = filter;
                break;

            case '!=':
                this[key + '!=' + filter.val] = filter;
                break;

            case '=~':
                this[key + '=~' + filter.val] = filter;
                break;

            case '>':
                // If there are other filters that are also >
                // but are less than this one, they don't matter, so
                // remove them.
                for (var id in this) {
                    if (this[id].key == key && this[id].val <= filter.val) {
                        delete this[id];
                    }
                }
                this[key + '>'] = filter;
                break;

            case '>=':
                for (var id in this) {
                    if (this[id].key == key && this[id].val < filter.val) {
                        delete this[id];
                    }
                }
                if (key + '!=' + filter.val in this) {
                    delete this[key + '!=' + filter.val];
                    filter.op = '>';
                    this[key + '>'] = filter;
                }
                else {
                    this[key + '>='] = filter;
                }
                break;

            case '<':
                for (var id in this) {
                    if (this[id].key == key && this[id].val >= filter.val) {
                        delete this[id];
                    }
                }
                this[key + '<'] = filter;
                break;

            case '<=':
                for (var id in this) {
                    if (this[id].key == key && this[id].val > filter.val) {
                        delete this[id];
                    }
                }
                if (key + '!=' + filter.val in this) {
                    delete this[key + '!=' + filter.val];
                    filter.op = '<';
                    this[key + '<'] = filter;
                }
                else {
                    this[key + '<='] = filter;
                }
                break;
        }
    }
});
(function(tree) {

tree._getFontSet = function(env, fonts) {
    var find_existing = function(fonts) {
        var findFonts = fonts.join('');
        for (var i = 0; i < env.effects.length; i++) {
            if (findFonts == env.effects[i].fonts.join('')) {
                return env.effects[i];
            }
        }
    };

    var existing = false;
    if (existing = find_existing(fonts)) {
        return existing;
    } else {
        var new_fontset = new tree.FontSet(env, fonts);
        env.effects.push(new_fontset);
        return new_fontset;
    }
};

tree.FontSet = function FontSet(env, fonts) {
    this.fonts = fonts;
    this.name = 'fontset-' + env.effects.length;
};

tree.FontSet.prototype.toXML = function(env) {
    return '<FontSet name="' +
        this.name +
        '">\n' +
        this.fonts.map(function(f) {
            return '  <Font face-name="' + f +'"/>';
        }).join('\n') +
        '\n</FontSet>';
};

})(require('../tree'));
(function(tree) {
//
// RGB Colors - #ff0014, #eee
//
tree.ImageFilter = function ImageFilter(filter, args) {
    this.is = 'imagefilter';
    this.filter = filter;
    this.args = args || null;
};
tree.ImageFilter.prototype = {
    eval: function() { return this; },

    toString: function() {
        if (this.args) {
            return this.filter + ':' + this.args.join(',');
        } else {
            return this.filter;
        }
    }
};


})(require('../tree'));
(function (tree) {
tree.Invalid = function Invalid(chunk, index, message) {
    this.chunk = chunk;
    this.index = index;
    this.type = 'syntax';
    this.message = message || "Invalid code: " + this.chunk;
};

tree.Invalid.prototype.eval = function(env) {
    env.error({
        chunk: this.chunk,
        index: this.index,
        type: 'syntax',
        message: this.message || "Invalid code: " + this.chunk
    });
    return {
        is: 'undefined'
    };
};
})(require('../tree'));
(function(tree) {

tree.Keyword = function Keyword(value) {
    this.value = value;
    var special = {
        'transparent': 'color',
        'true': 'boolean',
        'false': 'boolean'
    };
    this.is = special[value] ? special[value] : 'keyword';
};
tree.Keyword.prototype = {
    eval: function() { return this; },
    toString: function() { return this.value; }
};

})(require('../tree'));
(function(tree) {

tree.Layer = function Layer(obj) {
    this.name = obj.name;
    this.status = obj.status;
    this.styles = obj.styles;
    this.properties = obj.properties  || {};
    this.srs = obj.srs;
    this.datasource = obj.Datasource;
};

tree.Layer.prototype.toXML = function() {
    var dsoptions = [];
    for (var i in this.datasource) {
        dsoptions.push('<Parameter name="' + i + '"><![CDATA[' +
            this.datasource[i] + ']]></Parameter>');
    }

    var prop_string = '';
    for (var i in this.properties) {
        prop_string += '  ' + i + '="' + this.properties[i] + '"\n';
    }

    return '<Layer' +
        ' name="' + this.name + '"\n' +
        prop_string +
        ((typeof this.status === 'undefined') ? '' : '  status="' + this.status + '"\n') +
        '  srs="' + this.srs + '">\n    ' +
        this.styles.reverse().map(function(s) {
            return '<StyleName>' + s + '</StyleName>';
        }).join('\n    ') +
        '\n    <Datasource>\n       ' +
        dsoptions.join('\n       ') +
        '\n    </Datasource>\n' +
        '  </Layer>\n';
};

})(require('../tree'));
// A literal is a literal string for Mapnik - the
// result of the combination of a `tree.Field` with any
// other type.
(function(tree) {

tree.Literal = function Field(content) {
    this.value = content || '';
    this.is = 'field';
};

tree.Literal.prototype = {
    toString: function() {
        return this.value;
    },
    'eval': function() {
        return this;
    }
};

})(require('../tree'));
(function(tree) {

tree.Operation = function Operation(op, operands, index) {
    this.op = op.trim();
    this.operands = operands;
    this.index = index;
    this.is = 'operation';
};

tree.Operation.prototype.eval = function(env) {
    var a = this.operands[0].eval(env),
        b = this.operands[1].eval(env),
        temp;

    if (a.is === 'undefined' || b.is === 'undefined') {
        return {
            is: 'undefined',
            value: 'undefined'
        };
    }

    if (a instanceof tree.Dimension && b instanceof tree.Color) {
        if (this.op === '*' || this.op === '+') {
            temp = b, b = a, a = temp;
        } else {
            env.error({
                name: "OperationError",
                message: "Can't substract or divide a color from a number",
                index: this.index
            });
        }
    }

    // Only concatenate plain strings, because this is easily
    // pre-processed
    if (a instanceof tree.Quoted && b instanceof tree.Quoted && this.op !== '+') {
        env.error({
           message: "Can't subtract, divide, or multiply strings.",
           index: this.index,
           type: 'runtime',
           filename: this.filename
        });
        return {
            is: 'undefined',
            value: 'undefined'
        };
    }

    // Fields, literals, dimensions, and quoted strings can be combined.
    if (a instanceof tree.Field || b instanceof tree.Field ||
        a instanceof tree.Literal || b instanceof tree.Literal) {
        if (a.is === 'color' || b.is === 'color') {
            env.error({
               message: "Can't subtract, divide, or multiply colors in expressions.",
               index: this.index,
               type: 'runtime',
               filename: this.filename
            });
            return {
                is: 'undefined',
                value: 'undefined'
            };
        } else {
            return new tree.Literal(a.eval(env).toString(true) + this.op + b.eval(env).toString(true));
        }
    }

    return a.operate(this.op, b);
};

tree.operate = function(op, a, b) {
    switch (op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '%': return a % b;
        case '/': return a / b;
    }
};

})(require('../tree'));
(function(tree) {

tree.Quoted = function Quoted(content) {
    this.value = content || '';
    this.is = 'string';
};

tree.Quoted.prototype = {
    toString: function(quotes) {
        var xmlvalue = this.value.replace(/\'/g, '&apos;');
        return (quotes === true) ? "'" + xmlvalue + "'" : this.value;
    },

    'eval': function() {
        return this;
    },

    operate: function(op, other) {
        return new tree.Quoted(true,
            tree.operate(op, this.toString(), other.toString(this.contains_field)));
    }
};

})(require('../tree'));
/*
 * Carto pulls in a reference from the `mapnik-reference`
 * module. This file builds indexes from that file for its various
 * options, and provides validation methods for property: value
 * combinations.
 */
(function(tree) {


var _ = require('underscore');
var reference = require('mapnik-reference');

tree.Reference = {
    data: reference.version.latest
};

tree.Reference.set = function(ref, version) {
    reference = ref;
    tree.Reference.setVersion(version || 'latest');
};

tree.Reference.setVersion = function(version) {
    tree.Reference.data = reference.version[version];
};

tree.Reference.required_prop_list_cache = {};

tree.Reference.selectors = tree.Reference.selectors || (function() {
    var list = [];
    for (var i in tree.Reference.data.symbolizers) {
        for (var j in tree.Reference.data.symbolizers[i]) {
            if (tree.Reference.data.symbolizers[i][j].hasOwnProperty('css')) {
                list.push(tree.Reference.data.symbolizers[i][j].css);
            }
        }
    }
    return list;
})();

tree.Reference.validSelector = function(selector) {
    return tree.Reference.selectors.indexOf(selector) !== -1;
};

tree.Reference.selectorName = function(selector) {
    for (var i in tree.Reference.data.symbolizers) {
        for (var j in tree.Reference.data.symbolizers[i]) {
            if (selector == tree.Reference.data.symbolizers[i][j].css) {
                return j;
            }
        }
    }
};

tree.Reference.selector = function(selector) {
    for (var i in tree.Reference.data.symbolizers) {
        for (var j in tree.Reference.data.symbolizers[i]) {
            if (selector == tree.Reference.data.symbolizers[i][j].css) {
                return tree.Reference.data.symbolizers[i][j];
            }
        }
    }
};

tree.Reference.symbolizer = function(selector) {
    for (var i in tree.Reference.data.symbolizers) {
        for (var j in tree.Reference.data.symbolizers[i]) {
            if (selector == tree.Reference.data.symbolizers[i][j].css) {
                return i;
            }
        }
    }
};

/*
 * For transform properties and image-filters,
 * mapnik has its own functions.
 */
tree.Reference.mapnikFunction = function(name) {
    var functions = [];
    for (var i in tree.Reference.data.symbolizers) {
        for (var j in tree.Reference.data.symbolizers[i]) {
            if (tree.Reference.data.symbolizers[i][j].type === 'functions') {
                functions = functions.concat(tree.Reference.data.symbolizers[i][j].functions);
            }
        }
    }
    return _.find(functions, function(f) {
        return f[0] === name;
    });
};

tree.Reference.requiredPropertyList = function(symbolizer_name) {
    if (this.required_prop_list_cache[symbolizer_name]) {
        return this.required_prop_list_cache[symbolizer_name];
    }
    var properties = [];
    for (var j in tree.Reference.data.symbolizers[symbolizer_name]) {
        if (tree.Reference.data.symbolizers[symbolizer_name][j].required) {
            properties.push(tree.Reference.data.symbolizers[symbolizer_name][j].css);
        }
    }
    return this.required_prop_list_cache[symbolizer_name] = properties;
};

tree.Reference.requiredProperties = function(symbolizer_name, rules) {
    var req = tree.Reference.requiredPropertyList(symbolizer_name);
    for (var i in req) {
        if (!(req[i] in rules)) {
            return 'Property ' + req[i] + ' required for defining ' +
                symbolizer_name + ' styles.';
        }
    }
};

/**
 * TODO: finish implementation - this is dead code
 */
tree.Reference._validateValue = {
    'font': function(env, value) {
        if (env.validation_data && env.validation_data.fonts) {
            return env.validation_data.fonts.indexOf(value) != -1;
        } else {
            return true;
        }
    }
};

tree.Reference.isFont = function(selector) {
    return tree.Reference.selector(selector).validate == 'font';
};

tree.Reference.validValue = function(env, selector, value) {
    var i, j;
    // TODO: handle in reusable way
    if (!tree.Reference.selector(selector)) {
        return false;
    } else if (value.value[0].is == 'keyword') {
        return tree.Reference
            .selector(selector).type
            .indexOf(value.value[0].value) !== -1;
    } else if (value.value[0].is == 'undefined') {
        // caught earlier in the chain - ignore here so that
        // error is not overridden
        return true;
    } else if (tree.Reference.selector(selector).type == 'numbers') {
        for (i in value.value) {
            if (value.value[i].is !== 'float') {
                return false;
            }
        }
        return true;
    } else if (tree.Reference.selector(selector).type == 'functions') {
        // For backwards compatibility, you can specify a string for `functions`-compatible
        // values, though they will not be validated.
        if (value.value[0].is === 'string') {
            return true;
        } else {
            for (i in value.value) {
                for (j in value.value[i].value) {
                    if (value.value[i].value[j].is !== 'call') {
                        return false;
                    }
                    var f = _.find(tree.Reference
                        .selector(selector).functions, function(x) {
                            return x[0] == value.value[i].value[j].name;
                        });
                    // This filter is unknown
                    if (!f) return false;
                    // The filter has been given an incorrect number of arguments
                    if (f[1] !== value.value[i].value[j].args.length) return false;
                }
            }
            return true;
        }
    } else if (tree.Reference.selector(selector).type == 'expression') {
        return true;
    } else {
        if (tree.Reference.selector(selector).validate) {
            var valid = false;
            for (i = 0; i < value.value.length; i++) {
                if (tree.Reference.selector(selector).type == value.value[i].is &&
                    tree.Reference
                        ._validateValue
                            [tree.Reference.selector(selector).validate]
                            (env, value.value[i].value)) {
                    return true;
                }
            }
            return valid;
        } else {
            return tree.Reference.selector(selector).type == value.value[0].is;
        }
    }
};

})(require('../tree'));
(function(tree) {
tree.Rule = function Rule(name, value, index, filename) {
    var parts = name.split('/');
    this.name = parts.pop();
    this.instance = parts.length ? parts[0] : '__default__';
    this.value = (value instanceof tree.Value) ?
        value : new tree.Value([value]);
    this.index = index;
    this.symbolizer = tree.Reference.symbolizer(this.name);
    this.filename = filename;
    this.variable = (name.charAt(0) === '@');
};

tree.Rule.prototype.clone = function() {
    var clone = Object.create(tree.Rule.prototype);
    clone.name = this.name;
    clone.value = this.value;
    clone.index = this.index;
    clone.instance = this.instance;
    clone.symbolizer = this.symbolizer;
    clone.filename = this.filename;
    clone.variable = this.variable;
    return clone;
};

tree.Rule.prototype.updateID = function() {
    return this.id = this.zoom + '#' + this.name;
};

tree.Rule.prototype.toString = function() {
    return '[' + tree.Zoom.toString(this.zoom) + '] ' + this.name + ': ' + this.value;
};

// second argument, if true, outputs the value of this
// rule without the usual attribute="content" wrapping. Right
// now this is just for the TextSymbolizer, but applies to other
// properties in reference.json which specify serialization=content
tree.Rule.prototype.toXML = function(env, content, sep, format) {
    if (!tree.Reference.validSelector(this.name)) {
        return env.error({
            message: "Unrecognized rule: " + this.name,
            index: this.index,
            type: 'syntax',
            filename: this.filename
        });
    }

    if ((this.value instanceof tree.Value) &&
        !tree.Reference.validValue(env, this.name, this.value)) {
        if (!tree.Reference.selector(this.name)) {
            return env.error({
                message: 'Unrecognized property: ' +
                    this.name,
                index: this.index,
                type: 'syntax',
                filename: this.filename
            });
        } else {
            return env.error({
                message: 'Invalid value for ' +
                    this.name +
                    ', a valid ' +
                    (tree.Reference.selector(this.name).validate ||
                        tree.Reference.selector(this.name).type) +
                    ' is expected. ' + this.value +
                    ' was given.',
                index: this.index,
                type: 'syntax',
                filename: this.filename
            });
        }
    }

    if (this.variable) {
        return '';
    } else if (tree.Reference.isFont(this.name) && this.value.value.length > 1) {
        var f = tree._getFontSet(env, this.value.value);
        return 'fontset-name="' + f.name + '"';
    } else if (content) {
        return this.value.toString(env, this.name, sep);
    } else {
        return tree.Reference.selectorName(this.name) +
            '="' +
            this.value.toString(env, this.name) +
            '"';
    }
};

/**
 * TODO: Rule eval chain should add fontsets to env.frames
 */
tree.Rule.prototype['eval'] = function(context) {
    return new tree.Rule(this.name,
        this.value['eval'](context),
        this.index,
        this.filename);
};

})(require('../tree'));
(function(tree) {

tree.Ruleset = function Ruleset(selectors, rules) {
    this.selectors = selectors;
    this.rules = rules;
    // static cache of find() function
    this._lookups = {};
};
tree.Ruleset.prototype = {
    eval: function(env) {
        var ruleset = new tree.Ruleset(this.selectors, this.rules.slice(0));
        ruleset.root = this.root;

        // push the current ruleset to the frames stack
        env.frames.unshift(ruleset);

        // Evaluate imports
        if (ruleset.root) {
            for (var i = 0; i < ruleset.rules.length; i++) {
                if (ruleset.rules[i] instanceof tree.Import) {
                    Array.prototype.splice
                         .apply(ruleset.rules, [i, 1].concat(ruleset.rules[i].eval(env)));
                }
            }
        }

        // Evaluate everything else
        for (var i = 0, rule; i < ruleset.rules.length; i++) {
            rule = ruleset.rules[i];
            ruleset.rules[i] = rule.eval ? rule.eval(env) : rule;
        }

        // Pop the stack
        env.frames.shift();

        return ruleset;
    },
    match: function(args) {
        return !args || args.length === 0;
    },
    variables: function() {
        if (this._variables) { return this._variables; }
        else {
            return this._variables = this.rules.reduce(function(hash, r) {
                if (r instanceof tree.Rule && r.variable === true) {
                    hash[r.name] = r;
                }
                return hash;
            }, {});
        }
    },
    variable: function(name) {
        return this.variables()[name];
    },
    /**
     * Extend this rule by adding rules from another ruleset
     *
     * Currently this is designed to accept less specific
     * rules and add their values only if this ruleset doesn't
     * contain them.
     */

    rulesets: function() {
        if (this._rulesets) { return this._rulesets; }
        else {
            return this._rulesets = this.rules.filter(function(r) {
                return (r instanceof tree.Ruleset);
            });
        }
    },
    find: function(selector, self) {
        self = self || this;
        var rules = [], rule, match,
            key = selector.toString();

        if (key in this._lookups) { return this._lookups[key]; }

        this.rulesets().forEach(function(rule) {
            if (rule !== self) {
                for (var j = 0; j < rule.selectors.length; j++) {
                    if (match = selector.match(rule.selectors[j])) {
                        if (selector.elements.length > 1) {
                            Array.prototype.push.apply(rules, rule.find(
                                new tree.Selector(null, null, selector.elements.slice(1)), self));
                        } else {
                            rules.push(rule);
                        }
                        break;
                    }
                }
            }
        });
        return this._lookups[key] = rules;
    },
    flatten: function(result, parents, env) {
        var selectors = [];
        if (this.selectors.length === 0) {
            env.frames = env.frames.concat(this.rules);
        }
        for (var i = 0; i < this.selectors.length; i++) {
            var child = this.selectors[i];

            // This is an invalid filterset.
            if (!child.filters) continue;

            if (parents.length) {
                for (var j = 0; j < parents.length; j++) {
                    var parent = parents[j];

                    var mergedFilters = parent.filters.cloneWith(child.filters);
                    if (mergedFilters === null) {
                        // Filters could be added, but they didn't change the
                        // filters. This means that we only have to clone when
                        // the zoom levels or the attachment is different too.
                        if (parent.zoom === (parent.zoom & child.zoom) &&
                            parent.attachment === child.attachment) {
                            continue;
                        } else {
                            mergedFilters = parent.filters;
                        }
                    } else if (!mergedFilters) {
                        // The merged filters are invalid, that means we don't
                        // have to clone.
                        continue;
                    }

                    var clone = Object.create(tree.Selector.prototype);
                    clone.filters = mergedFilters;
                    clone.zoom = parent.zoom & child.zoom;
                    clone.elements = parent.elements.concat(child.elements);
                    if (parent.attachment && child.attachment) {
                        clone.attachment = parent.attachment + '/' + child.attachment;
                    }
                    else clone.attachment = child.attachment || parent.attachment;
                    clone.conditions = parent.conditions + child.conditions;
                    clone.index = child.index;
                    selectors.push(clone);
                }
            } else {
                selectors.push(child);
            }
        }

        var rules = [];
        for (var i = 0; i < this.rules.length; i++) {
            var rule = this.rules[i];

            if (rule instanceof tree.Ruleset) {
                rule.flatten(result, selectors, env);
            } else if (rule instanceof tree.Rule) {
                rules.push(rule);
            } else if (rule instanceof tree.Invalid) {
                env.error(rule);
            }
        }

        var index = rules.length ? rules[0].index : false;
        for (var i = 0; i < selectors.length; i++) {
            // For specificity sort, use the position of the first rule to allow
            // defining attachments that are under current element as a descendant
            // selector.
            if (index !== false) {
                selectors[i].index = index;
            }
            result.push(new tree.Definition(selectors[i], rules.slice()));
        }

        return result;
    }
};
})(require('../tree'));
var assert = require('assert');

(function(tree) {

tree.Selector = function Selector(filters, zoom, elements, attachment, conditions, index) {
    this.elements = elements || [];
    this.attachment = attachment;
    this.filters = filters || {};
    this.zoom = typeof zoom !== 'undefined' ? zoom : tree.Zoom.all;
    this.conditions = conditions;
    this.index = index;
};

/**
 * Determine the specificity of this selector
 * based on the specificity of its elements - calling
 * Element.specificity() in order to do so
 *
 * [ID, Class, Filters, Position in document]
 */
tree.Selector.prototype.specificity = function() {
    return this.elements.reduce(function(memo, e) {
        var spec = e.specificity();
        memo[0] += spec[0];
        memo[1] += spec[1];
        return memo;
    }, [0, 0, this.conditions, this.index]);
};

})(require('../tree'));
(function(tree) {
var _ = require('underscore');

tree.Style = function Style(name, attachment, definitions) {
    this.attachment = attachment;
    this.definitions = definitions;
    this.name = name + (attachment !== '__default__' ? '-' + attachment : '');
};

tree.Style.prototype.toXML = function(env) {
    var existing = {};

    var image_filters = _.flatten(this.definitions.map(function(definition) {
        return definition.rules.filter(function(rule) {
            return (rule.name === 'image-filters');
        });
    }));

    var comp_op = _.flatten(this.definitions.map(function(definition) {
        return definition.rules.filter(function(rule) {
            return (rule.name === 'composite-operation');
        });
    }));

    var opacity = _.flatten(this.definitions.map(function(definition) {
        return definition.rules.filter(function(rule) {
            return (rule.name === 'opacity');
        });
    }));

    var rules = this.definitions.map(function(definition) {
        return definition.toXML(env, existing);
    });

    var attrs_xml = '';

    if (image_filters.length) {
        attrs_xml += ' image-filters="' + image_filters.map(function(f) {
            return f.eval(env).toXML(env, true, ' ', 'image-filter');
        }).join(' ') + '" ';
    }

    if (comp_op.length) {
        attrs_xml += ' comp-op="' + comp_op[0].value.eval(env).toString() + '" ';
    }

    if (opacity.length) {
        attrs_xml += ' opacity="' + opacity[0].value.eval(env).toString() + '" ';
    }

    return '<Style name="' + this.name + '" filter-mode="first" ' + attrs_xml + '>\n' + rules.join('') + '</Style>';
};

})(require('../tree'));
(function(tree) {

tree.URL = function URL(val, paths) {
    this.value = val;
    this.paths = paths;
    this.is = 'uri';
};
tree.URL.prototype = {
    toString: function() {
        return this.value.toString();
    },
    eval: function(ctx) {
        return new tree.URL(this.value.eval(ctx), this.paths);
    }
};

})(require('../tree'));
(function(tree) {

tree.Value = function Value(value) {
    this.value = value;
    this.is = 'value';
};
tree.Value.prototype = {
    eval: function(env) {
        if (this.value.length === 1) {
            return this.value[0].eval(env);
        } else {
            return new tree.Value(this.value.map(function(v) {
                return v.eval(env);
            }));
        }
    },
    toString: function(env, selector, sep, format) {
        return this.value.map(function(e) {
            return e.toString(env, format);
        }).join(sep || ', ');
    },
    clone: function() {
        var obj = Object.create(tree.Value.prototype);
        if (Array.isArray(obj)) obj.value = this.value.slice();
        else obj.value = this.value;
        obj.is = this.is;
        return obj;
    }
};

})(require('../tree'));
(function(tree) {

tree.Variable = function Variable(name, index, filename) {
    this.name = name;
    this.index = index;
    this.filename = filename;
};
tree.Variable.prototype = {
    eval: function(env) {
        var variable,
            v,
            that = this,
            name = this.name;

        if (this._css) return this._css;

        var thisframe = env.frames.filter(function(f) {
            return f.name == that.name;
        });
        if (thisframe.length) {
            return thisframe[0].value.eval(env);
        } else {
            env.error({
                message: 'variable ' + this.name + ' is undefined',
                index: this.index,
                type: 'runtime',
                filename: this.filename
            });
            return {
                is: 'undefined',
                value: 'undefined'
            };
        }
    }
};

})(require('../tree'));
var tree = require('../tree');

// Storage for zoom ranges. Only supports continuous ranges,
// and stores them as bit-sequences so that they can be combined,
// inverted, and compared quickly.
tree.Zoom = function(op, value, index) {
    value = parseInt(value, 10);
    if (value > tree.Zoom.maxZoom || value < 0) {
        throw {
            message: 'Only zoom levels between 0 and ' +
                tree.Zoom.maxZoom + ' supported.',
            index: index
        };
    }

    var start = 0,
        end = Infinity,
        zoom = 0;

    switch (op) {
        case '=':
            return 1 << value;
        case '>':
            start = value + 1;
            break;
        case '>=':
            start = value;
            break;
        case '<':
            end = value - 1;
            break;
        case '<=':
            end = value;
            break;
    }
    for (var i = 0; i <= tree.Zoom.maxZoom; i++) {
        if (i >= start && i <= end) {
            zoom |= (1 << i);
        }
    }
    return zoom;
};

// Covers all zoomlevels from 0 to 22
tree.Zoom.all = 0x7FFFFF;

tree.Zoom.maxZoom = 22;

tree.Zoom.ranges = {
     0: 1000000000,
     1: 500000000,
     2: 200000000,
     3: 100000000,
     4: 50000000,
     5: 25000000,
     6: 12500000,
     7: 6500000,
     8: 3000000,
     9: 1500000,
    10: 750000,
    11: 400000,
    12: 200000,
    13: 100000,
    14: 50000,
    15: 25000,
    16: 12500,
    17: 5000,
    18: 2500,
    19: 1500,
    20: 750,
    21: 500,
    22: 250,
    23: 100
};

// Only works for single range zooms. `[XXX....XXXXX.........]` is invalid.
tree.Zoom.toXML = function(zoom) {
    var conditions = [];
    if (zoom != tree.Zoom.all) {
        var start = null, end = null;
        for (var i = 0; i <= tree.Zoom.maxZoom; i++) {
            if (zoom & (1 << i)) {
                if (start === null) start = i;
                end = i;
            }
        }
        if (start > 0) conditions.push('    <MaxScaleDenominator>' +
            tree.Zoom.ranges[start] + '</MaxScaleDenominator>\n');
        if (end < 22) conditions.push('    <MinScaleDenominator>' +
            tree.Zoom.ranges[end + 1] + '</MinScaleDenominator>\n');
    }
    return conditions;
};


tree.Zoom.toString = function(zoom) {
    var str = '';
    for (var i = 0; i <= tree.Zoom.maxZoom; i++) {
        str += (zoom & (1 << i)) ? 'X' : '.';
    }
    return str;
};
(function (tree) {

tree.functions = {
    rgb: function (r, g, b) {
        return this.rgba(r, g, b, 1.0);
    },
    rgba: function (r, g, b, a) {
        var rgb = [r, g, b].map(function (c) { return number(c); });
        a = number(a);
        return new tree.Color(rgb, a);
    },
    hsl: function (h, s, l) {
        return this.hsla(h, s, l, 1.0);
    },
    hsla: function (h, s, l, a) {
        h = (number(h) % 360) / 360;
        s = number(s); l = number(l); a = number(a);

        var m2 = l <= 0.5 ? l * (s + 1) : l + s - l * s;
        var m1 = l * 2 - m2;

        return this.rgba(hue(h + 1/3) * 255,
                         hue(h)       * 255,
                         hue(h - 1/3) * 255,
                         a);

        function hue(h) {
            h = h < 0 ? h + 1 : (h > 1 ? h - 1 : h);
            if      (h * 6 < 1) return m1 + (m2 - m1) * h * 6;
            else if (h * 2 < 1) return m2;
            else if (h * 3 < 2) return m1 + (m2 - m1) * (2/3 - h) * 6;
            else                return m1;
        }
    },
    hue: function (color) {
        return new tree.Dimension(Math.round(color.toHSL().h));
    },
    saturation: function (color) {
        return new tree.Dimension(Math.round(color.toHSL().s * 100), '%');
    },
    lightness: function (color) {
        return new tree.Dimension(Math.round(color.toHSL().l * 100), '%');
    },
    alpha: function (color) {
        return new tree.Dimension(color.toHSL().a);
    },
    saturate: function (color, amount) {
        var hsl = color.toHSL();

        hsl.s += amount.value / 100;
        hsl.s = clamp(hsl.s);
        return hsla(hsl);
    },
    desaturate: function (color, amount) {
        var hsl = color.toHSL();

        hsl.s -= amount.value / 100;
        hsl.s = clamp(hsl.s);
        return hsla(hsl);
    },
    lighten: function (color, amount) {
        var hsl = color.toHSL();

        hsl.l += amount.value / 100;
        hsl.l = clamp(hsl.l);
        return hsla(hsl);
    },
    darken: function (color, amount) {
        var hsl = color.toHSL();

        hsl.l -= amount.value / 100;
        hsl.l = clamp(hsl.l);
        return hsla(hsl);
    },
    fadein: function (color, amount) {
        var hsl = color.toHSL();

        hsl.a += amount.value / 100;
        hsl.a = clamp(hsl.a);
        return hsla(hsl);
    },
    fadeout: function (color, amount) {
        var hsl = color.toHSL();

        hsl.a -= amount.value / 100;
        hsl.a = clamp(hsl.a);
        return hsla(hsl);
    },
    spin: function (color, amount) {
        var hsl = color.toHSL();
        var hue = (hsl.h + amount.value) % 360;

        hsl.h = hue < 0 ? 360 + hue : hue;

        return hsla(hsl);
    },
    replace: function (entity, a, b) {
        if (entity.is === 'field') {
            return entity.toString + '.replace(' + a.toString() + ', ' + b.toString() + ')';
        } else {
            return entity.replace(a, b);
        }
    },
    //
    // Copyright (c) 2006-2009 Hampton Catlin, Nathan Weizenbaum, and Chris Eppstein
    // http://sass-lang.com
    //
    mix: function (color1, color2, weight) {
        var p = weight.value / 100.0;
        var w = p * 2 - 1;
        var a = color1.toHSL().a - color2.toHSL().a;

        var w1 = (((w * a == -1) ? w : (w + a) / (1 + w * a)) + 1) / 2.0;
        var w2 = 1 - w1;

        var rgb = [color1.rgb[0] * w1 + color2.rgb[0] * w2,
                   color1.rgb[1] * w1 + color2.rgb[1] * w2,
                   color1.rgb[2] * w1 + color2.rgb[2] * w2];

        var alpha = color1.alpha * p + color2.alpha * (1 - p);

        return new tree.Color(rgb, alpha);
    },
    greyscale: function (color) {
        return this.desaturate(color, new tree.Dimension(100));
    },
    '%': function (quoted /* arg, arg, ...*/) {
        var args = Array.prototype.slice.call(arguments, 1),
            str = quoted.value;

        for (var i = 0; i < args.length; i++) {
            str = str.replace(/%s/,    args[i].value)
                     .replace(/%[da]/, args[i].toString());
        }
        str = str.replace(/%%/g, '%');
        return new tree.Quoted(str);
    }
};

var image_filter_functors = [
    'emboss', 'blur', 'gray', 'sobel', 'edge-detect',
    'x-gradient', 'y-gradient', 'sharpen'];

for (var i = 0; i < image_filter_functors.length; i++) {
    var f = image_filter_functors[i]; 
    tree.functions[f] = (function(f) {
        return function() {
            return new tree.ImageFilter(f);
        };
    })(f);
}

tree.functions['agg-stack-blur'] = function(x, y) {
    return new tree.ImageFilter('agg-stack-blur', [x, y]);
};

function hsla(hsla) {
    return tree.functions.hsla(hsla.h, hsla.s, hsla.l, hsla.a);
}

function number(n) {
    if (n instanceof tree.Dimension) {
        return parseFloat(n.unit == '%' ? n.value / 100 : n.value);
    } else if (typeof(n) === 'number') {
        return n;
    } else {
        throw new Error('Color functions take numbers as parameters.');
    }
}

function clamp(val) {
    return Math.min(1, Math.max(0, val));
}

})(require('./tree'));
(function() {
var tree = require('../tree');

// monkey patch less classes
tree.Value.prototype.toJS = function() {
  var v = this.value[0].value[0];
  val = v.toString();
  if(v.is === "color" || v.is === 'uri') {
    val = "'" + val + "'";
  }
  return "_value = " + val + ";";
};

Object.defineProperty(tree.Filterset.prototype, 'toJS', {
  enumerable: false,
  value: function(env) {
    var opMap = {
      '=': '==='
    };
    return _.map(this, function(filter) {
      var op = filter.op;
      if(op in opMap) {
        op = opMap[op];
      }
      var val = filter.val;
      if(filter._val !== undefined) {
        val = filter._val.toString(true);
      }

      var attrs = "data";
      return attrs + "." + filter.key  + " " + op + " " + val;
    }).join(' && ');
  }
});

tree.Definition.prototype.toJS = function() {
  var shaderAttrs = {};

  // merge conditions from filters with zoom condition of the
  // definition
  var zoom = "(" + this.zoom + " & (1 << ctx.zoom))";
  var _if = this.filters.toJS() 
  if(_if && _if.length > 0) {
     _if += " && " + zoom;
  } else {
    _if = zoom;
  }
  _.each(this.rules, function(rule) {
      if(rule instanceof tree.Rule) {
        shaderAttrs[rule.name] = shaderAttrs[rule.name] || [];
        if (_if) {
        shaderAttrs[rule.name].push(
          "if(" + _if + "){" + rule.value.toJS() + "}"
        );
        } else {
          shaderAttrs[rule.name].push(rule.value.toJS());
        }
      } else {
        if (rule instanceof tree.Ruleset) {
          var sh = rule.toJS();
          for(var v in sh) {
            shaderAttrs[v] = shaderAttrs[v] || [];
            for(var attr in sh[v]) {
              shaderAttrs[v].push(sh[v][attr]);
            }
          }
        }
      }
  });
  return shaderAttrs;
};


function CartoCSS(style) {
  if(style) {
    this.setStyle(style);
  }
}

CartoCSS.Layer = function(shader, options) {
  this.options = options;
  this.shader = shader;
};

CartoCSS.renderers = {};

CartoCSS.renderers['svg'] = {

  maps: {},

  transform: function(src) {
    var target = {};
    for(var i in src) {
      var t = this.maps[i];
      if(t) {
        target[t] = src[i];
      } else {
        console.log("unknow property: " + i);
      }
    }
    return target;
  }

};

CartoCSS.renderers['canvas-2d'] = {

  maps: {
    // marker
    'marker-width': 'point-radius',
    'marker-line-color': 'strokeStyle',
    'marker-line-width': 'lineWidth',
    'marker-line-opacity': 'strokeOpacity',
    'marker-fill-opacity': 'fillOpacity',
    'marker-fill': 'fillStyle',
    'marker-file': function(attr) {
      var img = new Image();
      img.src = attr;
      return img;
    },
    // point
    'point-color': 'fillStyle',
    'point-file': function(attr) {
      var img = new Image();
      img.src = attr;
      return img;
    },
    // line
    'line-color': 'strokeStyle',
    'line-width': 'lineWidth',
    'line-opacity': 'globalAlpha',
    // polygon
    'polygon-fill': 'fillStyle',
    'polygon-opacity': 'globalAlpha',
    'comp-op': 'comp-op'
  },

  transform: function(src) {
    var target = {};
    for(var i in src) {
      var t = this.maps[i];
      if(t) {
        if(typeof(t) === 'function') {
          target[i] = t(src[i]);
        } else {
          target[t] = src[i];
        }
      } else {
        console.log("unknow property: " + i);
      }
    }
    return target;
  }
}

var renderer = CartoCSS.renderers['svg'];
var ref = window.carto['mapnik-reference'].version.latest;
var to_load = ['polygon', 'line', 'point', 'markers'];
for(var ss in to_load) {
  var s = to_load[ss];
  for(var i in ref.symbolizers[s]) {
    renderer.maps[ref.symbolizers[s][i].css] = i;
  }
}


CartoCSS.Layer.prototype = {

  name: function() {
    return this.shader.attachment;
  },

  /*
   * `target`: style, 'svg', 'canvas-2d'...
   * `props`: feature properties
   * `context`: rendering properties, i.e zoom
   */
  getStyle: function(target, props, context) {
    var style = {};
    for(var i in this.shader) {
      if(i !== 'attachment') {
        style[i] = this.shader[i](props, context);
      }
    }
    return CartoCSS.renderers[target].transform(style);
  },

  /**
   * returns true if a feature needs to be rendered
   */
  filter: function(featureType, props, context) {
    for(var i in this.shader) {
     var s = this.shader[i](props, context);
     if(s) {
       return true;
     }
    }
    return false;
  },

  //
  // given a geoemtry type returns the transformed one acording the CartoCSS
  // For points there are two kind of types: point and sprite, the first one 
  // is a circle, second one is an image sprite
  //
  // the other geometry types are the same than geojson (polygon, linestring...)
  //
  transformGeometry: function(type) {
    return type;
  },

  transformGeometries: function(geojson) {
    return geojson;
  }

};

CartoCSS.prototype = {

  setStyle: function(style) {
    var layers = this.parse(style);
    if(!layers) {
      throw new Error(this.parse_env.errors);
    }
    this.layers = layers.map(function(shader) {
        return new CartoCSS.Layer(shader);
    });
  },

  getLayers: function() {
    return this.layers;
  },

  _createFn: function(ops) {
    var body = ops.join('\n');
    console.log(body);
    return Function("data","ctx", "var _value = null; " +  body + "; return _value; ");
  },

  _compile: function(shader) {
    if(typeof shader === 'string') {
        shader = eval("(function() { return " + shader +"; })()");
    }
    this.shader_src = shader;
    for(var attr in shader) {
        var c = mapper[attr];
        if(c) {
            this.compiled[c] = eval("(function() { return shader[attr]; })();");
        }
    }
  },

  parse: function(cartocss) {
    var parse_env = {
      frames: [],
      errors: [],
      error: function(obj) {
        this.errors.push(obj);
      }
    };
    this.parse_env = parse_env;

    var ruleset = null;
    try {
      ruleset = (new carto.Parser(parse_env)).parse(cartocss);
    } catch(e) {
      // add the style.mss string to match the response from the server
      parse_env.errors.push(e.message);
      return;
    }
    if(ruleset) {
      var defs = ruleset.toList(parse_env);
      defs.reverse();
      // group by elements[0].value::attachment
      var layers = {};
      for(var i = 0; i < defs.length; ++i) {
        var def = defs[i];
        var key = def.elements[0] + "::" + def.attachment;
        var layer = layers[key] = (layers[key] || {});
        var props = def.toJS();
        for(var v in props) {
          (layer[v] = (layer[v] || [])).push(props[v].join('\n'))
        }
      }

      var ordered_layers = [];

      var done = {};
      for(var i = 0; i < defs.length; ++i) {
        var def = defs[i];
        var k = def.elements[0] + "::" + def.attachment;
        if(!done[k]) {
          var layer = layers[k];
          for(var prop in layer) {
            layer[prop] = this._createFn(layer[prop]);
          }
          layer.attachment = k;
          ordered_layers.push(layer);
          done[k] = true;
        }
      }

      return ordered_layers;

    }
    return null;
  }
};

carto.RendererJS = function (options) {
    this.options = options || {};
    this.options.mapnik_version = this.options.mapnik_version || 'latest';
};

// Prepare a javascript object which contains the layers
carto.RendererJS.prototype.render = function render(cartocss, callback) {
    tree.Reference.setVersion(this.options.mapnik_version);
    return new CartoCSS(cartocss);
}

})();
