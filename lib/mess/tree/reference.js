(function (tree) {
tree.Reference = {
    "symbolizers" : {
        "map": {
            "map-bgcolor": {
                "css": "map-bgcolor",
                "default-value": "none",
                "default-meaning": "transparent",
                "type": "color",
                "description": "Map Background color" 
            } 
        },
        "polygon": {
            "fill": {
                "css": "polygon-fill",
                "api": "fill",
                "type": "color",
                "availability": "0.5.1",
                "default-value": "rgb(128,128,128)",
                "default-meaning": "grey",
                "doc": "Fill color to assign to a polygon" 
            },
            "gamma": {
                "css": "polygon-gamma",
                "api": "gamma",
                "type": "float",
                "availability": "0.7.0",
                "default-value": 1,
                "default-meaning": "fully antialiased",
                "range": "0-1",
                "doc": "Level of antialiasing of polygon edges" 
            },
            "opacity": {
                "css": "polygon-opacity",
                "type": "float",
                "default-value": 1,
                "default-meaning": "opaque" 
            },
            "meta-output": {
                "css": "polygon-meta-output",
                "type": "string",
                "default-value": "",
                "default-meaning": "No MetaWriter Output" 
            },
            "meta-writer": {
                "css": "polygon-meta-writer",
                "type": "string",
                "default-value": "",
                "default-meaning": "No MetaWriter specified" 
            } 
        },
        "line": {
            "color": {
                "css": "line-color",
                "default-value": "black",
                "type": "color",
                "doc": "The color of a drawn line" 
            },
            "width": {
                "css": "line-width",
                "default-value": 1,
                "type": "float",
                "doc": "The width of a line" 
            },
            "opacity": {
                "css": "line-opacity",
                "default-value": 1,
                "type": "float",
                "default-meaning": "opaque",
                "doc": "The opacity of a line" 
            },
            "join": {
                "css": "line-join",
                "default-value": "miter",
                "type": [
                    "miter",
                    "round",
                    "bevel" 
                ],
                "doc": "The behavior of lines when joining" 
            },
            "cap": {
                "css": "line-cap",
                "default-value": "butt",
                "type": [
                    "butt",
                    "round",
                    "square" 
                ],
                "doc": "The display of line endings." 
            },
            "dasharray": {
                "css": "line-dasharray",
                "type": "numbers",
                "doc": "A pair of length values [a,b], where (a) is the dash length and (b) is the gap length respectively. More than two values are supported as well (e.g. to start the line not with a stroke, but with a gap).",
                "default-value": "none" 
            },
            "meta-output": {
                "css": "line-meta-output",
                "type": "string",
                "default-value": "",
                "default-meaning": "No MetaWriter Output" 
            },
            "meta-writer": {
                "css": "line-meta-writer",
                "type": "string",
                "default-value": "" 
            } 
        },
        "marker": {
            "line-color": {
                "css": "marker-line-color",
                "type": "color" 
            },
            "line-width": {
                "css": "marker-line-width",
                "type": "float" 
            },
            "line-opacity": {
                "css": "marker-line-opacity",
                "default-value": 1,
                "default-meaning": "opaque",
                "type": "float" 
            },
            "placement": {
                "css": "marker-placement",
                "type": [
                    "point",
                    "line" 
                ] 
            },
            "type": {
                "css": "marker-type",
                "type": [
                    "arrow",
                    "ellipse" 
                ] 
            },
            "width": {
                "css": "marker-width",
                "type": "int" 
            },
            "height": {
                "css": "marker-height",
                "type": "int" 
            },
            "fill": {
                "css": "marker-fill",
                "type": "color" 
            },
            "fill-opacity": {
                "css": "marker-opacity",
                "default-value": 1,
                "default-meaning": "opaque",
                "type": "float" 
            },
            "file": {
                "css": "marker-file",
                "type": "uri" 
            },
            "allow-overlap": {
                "css": "marker-allow-overlap",
                "type": "boolean",
                "default-value": "false",
                "default-meaning": "do not allow overlap"
            },
            "spacing": {
                "css": "marker-spacing",
                "docs": "Space between repeated labels",
                "type": "float" 
            },
            "max-error": {
                "css": "marker-max-error",
                "type": "float" 
            },
            "transform": {
                "css": "marker-transform",
                "type": "string" 
            },
            "meta-output": {
                "css": "marker-meta-output",
                "type": "string",
                "default-value": "",
                "default-meaning": "No MetaWriter Output" 
            },
            "meta-writer": {
                "css": "marker-meta-writer",
                "type": "string",
                "default-value": "none" 
            } 
        },
        "shield": {
            "name": {
                "css": "shield-name",
                "type": "none" 
            },
            "face-name": {
                "css": "shield-name",
                "type": "string" 
            },
            "size": {
                "css": "shield-size",
                "type": "int" 
            },
            "fill": {
                "css": "shield-fill",
                "type": "color" 
            },
            "min-distance": {
                "css": "shield-min-distance",
                "type": "int",
                "default-value": 0,
                "doc": "Minimum distance to the next shield symbol, not necessarily the same shield." 
            },
            "spacing": {
                "css": "shield-spacing",
                "type": "float",
                "default-value": 0,
                "doc": "The spacing between repeated occurrences of the same shield" 
            },
            "character-spacing": {
                "css": "shield-spacing",
                "type": "int",
                "default-value": 0,
                "doc": "Horizontal spacing between characters (in pixels). Currently works for point placement only, not line placement." 
            },
            "line-spacing": {
                "css": "shield-line-spacing",
                "doc": "Vertical spacing between lines of multiline labels (in pixels)",
                "type": "int" 
            },
            "file": {
                "css": "shield-file",
                "type": "uri",
                "default-value": "none"
            },
            "width": {
                "css": "shield-width",
                "type": "int",
                "default-value": "The image's width" 
            },
            "height": {
                "css": "shield-height",
                "type": "int",
                "default-value": "The image's height" 
            },
            "type": {
                "css": "shield-type",
                "type": "None",
                "default-value": "The type of the image file: e.g. png" 
            },
            "meta-output": {
                "css": "shield-meta-output",
                "type": "string",
                "default-value": "",
                "default-meaning": "No MetaWriter Output" 
            },
            "meta-writer": {
                "css": "shield-meta-writer",
                "type": "string",
                "default-value": "" 
            } 
        },
        "line-pattern": {
            "file": {
                "css": "line-pattern-file",
                "type": "uri" 
            },
            "width": {
                "css": "line-pattern-width",
                "type": "int" 
            },
            "height": {
                "css": "line-pattern-height",
                "type": "int" 
            },
            "type": {
                "css": "line-pattern-type",
                "type": "none" 
            },
            "meta-output": {
                "css": "line-pattern-meta-output",
                "type": "string",
                "default-value": "",
                "default-meaning": "No MetaWriter Output" 
            },
            "meta-writer": {
                "css": "line-pattern-meta-writer",
                "type": "string",
                "default-value": "" 
            } 
        },
        "polygon-pattern": {
            "file": {
                "css": "polygon-pattern-file",
                "type": "uri" 
            },
            "width": {
                "css": "polygon-pattern-width",
                "type": "int"
            },
            "height": {
                "css": "polygon-pattern-height",
                "type": "int"
            },
            "type": {
                "css": "polygon-pattern-type",
                "type": "none" 
            },
            "meta-output": {
                "css": "polygon-pattern-meta-output",
                "type": "string",
                "default-value": "",
                "default-meaning": "No MetaWriter Output" 
            },
            "meta-writer": {
                "css": "polygon-pattern-meta-writer",
                "type": "string",
                "default-value": "" 
            } 
        },
        "raster": {
            "opacity": {
                "css": "raster-opacity",
                "default-value": 1,
                "default-meaning": "opaque",
                "type": "float" 
            },
            "mode": {
                "css": "raster-mode",
                "default-value": "normal",
                "type": [
                    "normal",
                    "grain_merge",
                    "grain_merge2",
                    "multiply",
                    "multiply2",
                    "divide",
                    "divide2",
                    "screen",
                    "hard_light" 
                ] 
            },
            "scaling": {
                "css": "raster-scaling",
                "type": [
                    "fast",
                    "bilinear",
                    "bilinear8" 
                ] 
            } 
        },
        "point": {
            "file": {
                "css": "point-file",
                "type": "uri" 
            },
            "width": {
                "css": "point-width",
                "type": "int" 
            },
            "height": {
                "css": "point-height",
                "type": "int" 
            },
            "type": {
                "css": "point-type",
                "type": "none" 
            },
            "allow-overlap": {
                "css": "point-allow-overlap",
                "type": "boolean",
                "default-value": "false",
                "default-meaning": "do not allow overlap"
            },
            "meta-output": {
                "css": "point-meta-output",
                "type": "string",
                "default-value": "",
                "default-meaning": "No MetaWriter Output" 
            },
            "meta-writer": {
                "css": "point-meta-writer",
                "type": "string",
                "default-value": "" 
            } 
        },
        "text": {
            "face-name": {
                "css": "text-face-name",
                "type": "string" 
            },
            "size": {
                "css": "text-size",
                "type": "float",
                "default-value": 10
            },
            "ratio": {
                "css": "text-ratio",
                "doc": "Define the amount of text (of the total) present on successive lines when wrapping occurs",
                "type": "integer",
                "type": "none" 
            },
            "wrap-width": {
                "css": "text-wrap-width",
                "doc": "Length of a chunk of text in characters before wrapping text",
                "type": "float" 
            },
            "spacing": {
                "css": "text-spacing",
                "type": "float" 
            },
            "character-spacing": {
                "css": "text-character-spacing",
                "type": "integer",
                "default-value": 0 
            },
            "line-spacing": {
                "css": "text-line-spacing",
                "default-value": 0,
                "type": "integer" 
            },
            "label-position-tolerance": {
                "css": "text-label-position-tolerance",
                "type": "integer" 
            },
            "max-char-angle-delta": {
                "css": "text-max-char-angle-delta",
                "type": "float",
                "default-value": "none",
                "doc": "If present, the maximum angle change, in degrees, allowed between adjacent characters in a label.  This will stop label placement around sharp corners."
            },
            "fill": {
                "css": "text-fill",
                "doc": "Specifies the color for the text",
                "default-value": "#000000",
                "type": "color" 
            },
            "halo-fill": {
                "css": "text-halo-fill",
                "docs": "Color of the text halo",
                "type": "color",
                "default-value": "#FFFFFF",
                "doc": "Specifies the color of the halo around the text."
            },
            "halo-radius": {
                "css": "text-halo-radius",
                "doc":  "Specify the radius of the halo in pixels",
                "default-value": 0,
                "default-meaning": "no halo",
                "type": "float" 
            },
            "dx": {
                "css": "text-dx",
                "type": "integer",
                "doc": "Displace text by fixed amount, in pixels, +/- along the X axis.  A positive value will shift the text right",
                "default-value": 10
            },
            "dy": {
                "css": "text-dy",
                "type": "integer",
                "doc": "Displace text by fixed amount, in pixels, +/- along the Y axis.  A positive value will shift the text down",
                "default-value": 10
            },
            "avoid-edges": {
                "css": "text-avoid-edges",
                "doc": "Tell positioning algorithm to avoid labeling near intersection edges.",
                "type": "boolean" 
            },
            "min-distance": {
                "css": "text-min-distance",
                "type": "float" 
            },
            "allow-overlap": {
                "css": "text-allow-overlap",
                "type": "boolean",
                "default-value": "false",
                "default-meaning": "do not allow overlap"
            },
            "placement": {
                "css": "text-placement",
                "type": [
                    "point",
                    "line" 
                ],
                "default-value": "point"
            },
            "transform": {
                "css": "text-transform",
                "type": [
                    "point",
                    "line",
                    "uppercase",
                    "lowercase" 
                ] 
            },
            "meta-output": {
                "css": "text-meta-output",
                "type": "string",
                "default-value": "",
                "default-meaning": "No MetaWriter Output" 
            },
            "meta-writer": {
                "css": "text-meta-writer",
                "type": "string",
                "default-value": "" 
            } 
        },
        "inline": {
            "color": {
                "css": "inline-color",
                "default-value": "black",
                "type": "color" 
            },
            "width": {
                "css": "inline-width",
                "type": "float" 
            },
            "opacity": {
                "css": "inline-opacity",
                "default-value": 1,
                "default-meaning": "opaque",
                "type": "float" 
            },
            "join": {
                "css": "inline-join",
                "default-value": "miter",
                "type": [
                    "miter",
                    "round",
                    "bevel" 
                ] 
            },
            "cap": {
                "css": "inline-cap",
                "default-value": "butt",
                "type": [
                    "butt",
                    "round",
                    "square" 
                ] 
            },
            "dasharray": {
                "css": "inline-dasharray",
                "type": "numbers" 
            },
            "meta-output": {
                "css": "inline-meta-output",
                "type": "string",
                "default-value": "none",
                "default-meaning": "No MetaWriter Output" 
            },
            "meta-writer": {
                "css": "inline-meta-writer",
                "type": "string",
                "default-value": "none" 
            } 
        },
        "outline": {
            "color": {
                "css": "outline-color",
                "default-value": "black",
                "type": "color" 
            },
            "width": {
                "css": "outline-width",
                "default-value": 1,
                "type": "float" 
            },
            "opacity": {
                "css": "outline-opacity",
                "default-value": 1,
                "default-meaning": "opaque",
                "type": "float" 
            },
            "join": {
                "css": "outline-join",
                "default-value": "miter",
                "type": [
                    "miter",
                    "round",
                    "bevel" 
                ] 
            },
            "cap": {
                "css": "outline-cap",
                "default-value": "butt",
                "type": [
                    "butt",
                    "round",
                    "square" 
                ] 
            },
            "dasharray": {
                "css": "outline-dasharray",
                "type": "numbers" 
            },
            "meta-output": {
                "css": "outline-meta-output",
                "type": "string",
                "default-value": "none",
                "default-meaning": "No MetaWriter Output" 
            },
            "meta-writer": {
                "css": "outline-meta-writer",
                "type": "string",
                "default-value": "none" 
            } 
        } 
    }
};

tree.Reference.selectors = tree.Reference.selectors || (function() {
    // TODO: HORRIBLE CODE FIX
    var list = [];
    for (var i in tree.Reference.symbolizers) {
        for (var j in tree.Reference.symbolizers[i]) {
            if (tree.Reference.symbolizers[i][j].hasOwnProperty('css')) {
                list.push(tree.Reference.symbolizers[i][j].css);
            }
        }
    }
    return list;
})();


tree.Reference.validSelector = function(selector) {
    // TODO: not compatible in browser
    return tree.Reference.selectors.indexOf(selector) !== -1;
};

tree.Reference.selectorName = function(selector) {
    // TODO: not compatible in browser
    for (var i in tree.Reference.symbolizers) {
        for (var j in tree.Reference.symbolizers[i]) {
            if (selector == tree.Reference.symbolizers[i][j].css) {
                return j;
            }
        }
    }
};

tree.Reference.selector = function(selector) {
    for (var i in tree.Reference.symbolizers) {
        for (var j in tree.Reference.symbolizers[i]) {
            if (selector == tree.Reference.symbolizers[i][j].css) {
                return tree.Reference.symbolizers[i][j];
            }
        }
    }
};

tree.Reference.symbolizer = function(selector) {
    for (var i in tree.Reference.symbolizers) {
        for (var j in tree.Reference.symbolizers[i]) {
            if (selector == tree.Reference.symbolizers[i][j].css) {
                return i;
            }
        }
    }
};

tree.Reference.validValue = function(selector, value) {
    if (value[0]) {
        return tree.Reference.selector(selector).type == value[0].is;
    } else {
        // TODO: handle in reusable way
        if (value.value[0].is == 'keyword') {
            return tree.Reference.selector(selector).type.indexOf(value.value[0].value) !== -1;
        }
        else {
            return tree.Reference.selector(selector).type == value.value[0].is;
        }
    }
}
})(require('mess/tree'));
