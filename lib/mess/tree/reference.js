(function (tree) {
tree.Reference = {
    "symbolizers" : {
        "map": {
            "background-color": {
                "css": "background-color",
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
            "fill-opacity": {
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
            "stroke": {
                "css": "line-color",
                "default-value": "black",
                "type": "color",
                "doc": "The color of a drawn line" 
            },
            "stroke-width": {
                "css": "line-width",
                "default-value": 1,
                "type": "float",
                "doc": "The width of a line" 
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
                "doc": "The display of line endings." 
            },
            "stroke-dasharray": {
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
        "markers": {
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
                "type": "float" 
            },
            "height": {
                "css": "marker-height",
                "type": "float" 
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
            "allow_overlap": {
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
            "max_error": {
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
                "type": "none",
                "required": true
            },
            "face_name": {
                "css": "shield-face-name",
                "type": "string",
                "validate": "font",
                "required": true
            },
            "size": {
                "css": "shield-size",
                "type": "float" 
            },
            "fill": {
                "css": "shield-fill",
                "type": "color" 
            },
            "min_distance": {
                "css": "shield-min-distance",
                "type": "float",
                "default-value": 0,
                "doc": "Minimum distance to the next shield symbol, not necessarily the same shield." 
            },
            "spacing": {
                "css": "shield-spacing",
                "type": "float",
                "default-value": 0,
                "doc": "The spacing between repeated occurrences of the same shield" 
            },
            "character_spacing": {
                "css": "shield-spacing",
                "type": "float",
                "default-value": 0,
                "doc": "Horizontal spacing between characters (in pixels). Currently works for point placement only, not line placement." 
            },
            "line_spacing": {
                "css": "shield-line-spacing",
                "doc": "Vertical spacing between lines of multiline labels (in pixels)",
                "type": "float" 
            },
            "file": {
                "css": "shield-file",
                "type": "uri",
                "default-value": "none"
            },
            "width": {
                "css": "shield-width",
                "type": "float",
                "default-value": "The image's width" 
            },
            "height": {
                "css": "shield-height",
                "type": "float",
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
                "type": "float" 
            },
            "height": {
                "css": "line-pattern-height",
                "type": "float" 
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
                "type": "float"
            },
            "height": {
                "css": "polygon-pattern-height",
                "type": "float"
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
                "type": "float" 
            },
            "height": {
                "css": "point-height",
                "type": "float" 
            },
            "type": {
                "css": "point-type",
                "type": "none" 
            },
            "allow_overlap": {
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
            "name": {
                "css": "text-name",
                "type": "string",
                "required": true
            },
            "face_name": {
                "css": "text-face-name",
                "validate": "font",
                "type": "string",
                "required": true
            },
            "size": {
                "css": "text-size",
                "type": "float",
                "default-value": 10
            },
            "ratio": {
                "css": "text-ratio",
                "doc": "Define the amount of text (of the total) present on successive lines when wrapping occurs",
                "type": "float",
                "type": "none" 
            },
            "wrap_width": {
                "css": "text-wrap-width",
                "doc": "Length of a chunk of text in characters before wrapping text",
                "type": "float" 
            },
            "spacing": {
                "css": "text-spacing",
                "type": "float" 
            },
            "character_spacing": {
                "css": "text-character-spacing",
                "type": "float",
                "default-value": 0 
            },
            "line_spacing": {
                "css": "text-line-spacing",
                "default-value": 0,
                "type": "float" 
            },
            "label_position_tolerance": {
                "css": "text-label-position-tolerance",
                "type": "float" 
            },
            "max_char_angle_delta": {
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
            "halo_fill": {
                "css": "text-halo-fill",
                "docs": "Color of the text halo",
                "type": "color",
                "default-value": "#FFFFFF",
                "doc": "Specifies the color of the halo around the text."
            },
            "halo_radius": {
                "css": "text-halo-radius",
                "doc":  "Specify the radius of the halo in pixels",
                "default-value": 0,
                "default-meaning": "no halo",
                "type": "float" 
            },
            "dx": {
                "css": "text-dx",
                "type": "float",
                "doc": "Displace text by fixed amount, in pixels, +/- along the X axis.  A positive value will shift the text right",
                "default-value": 10
            },
            "dy": {
                "css": "text-dy",
                "type": "float",
                "doc": "Displace text by fixed amount, in pixels, +/- along the Y axis.  A positive value will shift the text down",
                "default-value": 10
            },
            "avoid_edges": {
                "css": "text-avoid-edges",
                "doc": "Tell positioning algorithm to avoid labeling near intersection edges.",
                "type": "boolean" 
            },
            "min_distance": {
                "css": "text-min-distance",
                "type": "float" 
            },
            "allow_overlap": {
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

tree.Reference.requiredPropertyList = function(symbolizer_name) {
    var properties = [];
    for (var j in tree.Reference.symbolizers[symbolizer_name]) {
        if (tree.Reference.symbolizers[symbolizer_name][j].required) {
            properties.push(tree.Reference.symbolizers[symbolizer_name][j].css);
        }
    }
    return properties;
};

tree.Reference.requiredProperties = function(symbolizer_name, properties) {
    var req = tree.Reference.requiredPropertyList(symbolizer_name);
    for (i in req) {
        if (properties.indexOf(req[i]) === -1) {
            return 'Property ' + req[i] + ' required for defining '
                + symbolizer_name + ' styles.';
        }
    }
};

tree.Reference._validateValue = {
    'font': function(env, value) {
        if (env.validation_data && env.validation_data.fonts) {
            return env.validation_data.fonts.indexOf(value) != -1;
        } else {
            return true;
        }
    }
};


tree.Reference.validValue = function(env, selector, value) {
    if (value[0]) {
        return tree.Reference.selector(selector).type == value[0].is;
    } else {
        // TODO: handle in reusable way
        if (value.value[0].is == 'keyword') {
            return tree.Reference.selector(selector).type.indexOf(value.value[0].value) !== -1;
        } else if (tree.Reference.selector(selector).type == 'numbers') {
            for (i in value.value) {
                if (value.value[i].is !== 'float') {
                    return false;
                }
            }
            return true;
        } else {
            if (tree.Reference.selector(selector).validate) {
                return tree.Reference.selector(selector).type == value.value[0].is &&
                    tree.Reference._validateValue[tree.Reference.selector(selector).validate]
                        (env, value.value[0].value);
            } else {
                return tree.Reference.selector(selector).type == value.value[0].is;
            }
        }
    }
}

tree.Reference.colors = {
    aliceblue:  new(tree.Color)([240, 248, 255]),
    antiquewhite:  new(tree.Color)([250, 235, 215]),
    aqua:  new(tree.Color)([0, 255, 255]),
    aquamarine:  new(tree.Color)([127, 255, 212]),
    azure:  new(tree.Color)([240, 255, 255]),
    beige:  new(tree.Color)([245, 245, 220]),
    bisque:  new(tree.Color)([255, 228, 196]),
    black:  new(tree.Color)([0, 0, 0]),
    blanchedalmond:  new(tree.Color)([255,235,205]),
    blue:  new(tree.Color)([0, 0, 255]),
    blueviolet:  new(tree.Color)([138, 43, 226]),
    brown:  new(tree.Color)([165, 42, 42]),
    burlywood:  new(tree.Color)([222, 184, 135]),
    cadetblue:  new(tree.Color)([95, 158, 160]),
    chartreuse:  new(tree.Color)([127, 255, 0]),
    chocolate:  new(tree.Color)([210, 105, 30]),
    coral:  new(tree.Color)([255, 127, 80]),
    cornflowerblue:  new(tree.Color)([100, 149, 237]),
    cornsilk:  new(tree.Color)([255, 248, 220]),
    crimson:  new(tree.Color)([220, 20, 60]),
    cyan:  new(tree.Color)([0, 255, 255]),
    darkblue:  new(tree.Color)([0, 0, 139]),
    darkcyan:  new(tree.Color)([0, 139, 139]),
    darkgoldenrod:  new(tree.Color)([184, 134, 11]),
    darkgray:  new(tree.Color)([169, 169, 169]),
    darkgreen:  new(tree.Color)([0, 100, 0]),
    darkgrey:  new(tree.Color)([169, 169, 169]),
    darkkhaki:  new(tree.Color)([189, 183, 107]),
    darkmagenta:  new(tree.Color)([139, 0, 139]),
    darkolivegreen:  new(tree.Color)([85, 107, 47]),
    darkorange:  new(tree.Color)([255, 140, 0]),
    darkorchid:  new(tree.Color)([153, 50, 204]),
    darkred:  new(tree.Color)([139, 0, 0]),
    darksalmon:  new(tree.Color)([233, 150, 122]),
    darkseagreen:  new(tree.Color)([143, 188, 143]),
    darkslateblue:  new(tree.Color)([72, 61, 139]),
    darkslategrey:  new(tree.Color)([47, 79, 79]),
    darkturquoise:  new(tree.Color)([0, 206, 209]),
    darkviolet:  new(tree.Color)([148, 0, 211]),
    deeppink:  new(tree.Color)([255, 20, 147]),
    deepskyblue:  new(tree.Color)([0, 191, 255]),
    dimgray:  new(tree.Color)([105, 105, 105]),
    dimgrey:  new(tree.Color)([105, 105, 105]),
    dodgerblue:  new(tree.Color)([30, 144, 255]),
    firebrick:  new(tree.Color)([178, 34, 34]),
    floralwhite:  new(tree.Color)([255, 250, 240]),
    forestgreen:  new(tree.Color)([34, 139, 34]),
    fuchsia:  new(tree.Color)([255, 0, 255]),
    gainsboro:  new(tree.Color)([220, 220, 220]),
    ghostwhite:  new(tree.Color)([248, 248, 255]),
    gold:  new(tree.Color)([255, 215, 0]),
    goldenrod:  new(tree.Color)([218, 165, 32]),
    gray:  new(tree.Color)([128, 128, 128]),
    grey:  new(tree.Color)([128, 128, 128]),
    green:  new(tree.Color)([0, 128, 0]),
    greenyellow:  new(tree.Color)([173, 255, 47]),
    honeydew:  new(tree.Color)([240, 255, 240]),
    hotpink:  new(tree.Color)([255, 105, 180]),
    indianred:  new(tree.Color)([205, 92, 92]),
    indigo:  new(tree.Color)([75, 0, 130]),
    ivory:  new(tree.Color)([255, 255, 240]),
    khaki:  new(tree.Color)([240, 230, 140]),
    lavender:  new(tree.Color)([230, 230, 250]),
    lavenderblush:  new(tree.Color)([255, 240, 245]),
    lawngreen:  new(tree.Color)([124, 252, 0]),
    lemonchiffon:  new(tree.Color)([255, 250, 205]),
    lightblue:  new(tree.Color)([173, 216, 230]),
    lightcoral:  new(tree.Color)([240, 128, 128]),
    lightcyan:  new(tree.Color)([224, 255, 255]),
    lightgoldenrodyellow:  new(tree.Color)([250, 250, 210]),
    lightgray:  new(tree.Color)([211, 211, 211]),
    lightgreen:  new(tree.Color)([144, 238, 144]),
    lightgrey:  new(tree.Color)([211, 211, 211]),
    lightpink:  new(tree.Color)([255, 182, 193]),
    lightsalmon:  new(tree.Color)([255, 160, 122]),
    lightseagreen:  new(tree.Color)([32, 178, 170]),
    lightskyblue:  new(tree.Color)([135, 206, 250]),
    lightslategray:  new(tree.Color)([119, 136, 153]),
    lightslategrey:  new(tree.Color)([119, 136, 153]),
    lightsteelblue:  new(tree.Color)([176, 196, 222]),
    lightyellow:  new(tree.Color)([255, 255, 224]),
    lime:  new(tree.Color)([0, 255, 0]),
    limegreen:  new(tree.Color)([50, 205, 50]),
    linen:  new(tree.Color)([250, 240, 230]),
    magenta:  new(tree.Color)([255, 0, 255]),
    maroon:  new(tree.Color)([128, 0, 0]),
    mediumaquamarine:  new(tree.Color)([102, 205, 170]),
    mediumblue:  new(tree.Color)([0, 0, 205]),
    mediumorchid:  new(tree.Color)([186, 85, 211]),
    mediumpurple:  new(tree.Color)([147, 112, 219]),
    mediumseagreen:  new(tree.Color)([60, 179, 113]),
    mediumslateblue:  new(tree.Color)([123, 104, 238]),
    mediumspringgreen:  new(tree.Color)([0, 250, 154]),
    mediumturquoise:  new(tree.Color)([72, 209, 204]),
    mediumvioletred:  new(tree.Color)([199, 21, 133]),
    midnightblue:  new(tree.Color)([25, 25, 112]),
    mintcream:  new(tree.Color)([245, 255, 250]),
    mistyrose:  new(tree.Color)([255, 228, 225]),
    moccasin:  new(tree.Color)([255, 228, 181]),
    navajowhite:  new(tree.Color)([255, 222, 173]),
    navy:  new(tree.Color)([0, 0, 128]),
    oldlace:  new(tree.Color)([253, 245, 230]),
    olive:  new(tree.Color)([128, 128, 0]),
    olivedrab:  new(tree.Color)([107, 142, 35]),
    orange:  new(tree.Color)([255, 165, 0]),
    orangered:  new(tree.Color)([255, 69, 0]),
    orchid:  new(tree.Color)([218, 112, 214]),
    palegoldenrod:  new(tree.Color)([238, 232, 170]),
    palegreen:  new(tree.Color)([152, 251, 152]),
    paleturquoise:  new(tree.Color)([175, 238, 238]),
    palevioletred:  new(tree.Color)([219, 112, 147]),
    papayawhip:  new(tree.Color)([255, 239, 213]),
    peachpuff:  new(tree.Color)([255, 218, 185]),
    peru:  new(tree.Color)([205, 133, 63]),
    pink:  new(tree.Color)([255, 192, 203]),
    plum:  new(tree.Color)([221, 160, 221]),
    powderblue:  new(tree.Color)([176, 224, 230]),
    purple:  new(tree.Color)([128, 0, 128]),
    red:  new(tree.Color)([255, 0, 0]),
    rosybrown:  new(tree.Color)([188, 143, 143]),
    royalblue:  new(tree.Color)([65, 105, 225]),
    saddlebrown:  new(tree.Color)([139, 69, 19]),
    salmon:  new(tree.Color)([250, 128, 114]),
    sandybrown:  new(tree.Color)([244, 164, 96]),
    seagreen:  new(tree.Color)([46, 139, 87]),
    seashell:  new(tree.Color)([255, 245, 238]),
    sienna:  new(tree.Color)([160, 82, 45]),
    silver:  new(tree.Color)([192, 192, 192]),
    skyblue:  new(tree.Color)([135, 206, 235]),
    slateblue:  new(tree.Color)([106, 90, 205]),
    slategray:  new(tree.Color)([112, 128, 144]),
    slategrey:  new(tree.Color)([112, 128, 144]),
    snow:  new(tree.Color)([255, 250, 250]),
    springgreen:  new(tree.Color)([0, 255, 127]),
    steelblue:  new(tree.Color)([70, 130, 180]),
    tan:  new(tree.Color)([210, 180, 140]),
    teal:  new(tree.Color)([0, 128, 128]),
    thistle:  new(tree.Color)([216, 191, 216]),
    tomato:  new(tree.Color)([255, 99, 71]),
    turquoise:  new(tree.Color)([64, 224, 208]),
    violet:  new(tree.Color)([238, 130, 238]),
    wheat:  new(tree.Color)([245, 222, 179]),
    white:  new(tree.Color)([255, 255, 255]),
    whitesmoke:  new(tree.Color)([245, 245, 245]),
    yellow:  new(tree.Color)([255, 255, 0]),
    yellowgreen:  new(tree.Color)([154, 205, 50]),
    transparent:  new(tree.Color)([0, 0, 0, 0])
}

})(require('mess/tree'));
