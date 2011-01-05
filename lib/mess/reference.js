{ "symbolizers" : 
  {
    "map": {
      "map-bgcolor": {
        "type": "color_transparent",
        "description": "Map Background color"
      }
    },
    "polygon": {
      "fill": {
        "css": "polygon-fill",
        "api": "fill",
        "type": "color",
        "availability": "0.5.1",
        "default": "rgb(128,128,128)",
        "default-meaning":"grey",
        "doc": "Fill color to assign to a polygon"
      },
      "gamma": {
        "css": "polygon-gamma",
        "api": "gamma",
        "type": "float",
        "availability": "0.7.0",
        "default": 1,
        "default-meaning":"fully antialiased",
        "range":"0-1",
        "doc": "Level of antialiasing of polygon edges"
      },
      "opacity": {
        "css": "polygon-opacity",
        "type": "float",
        "default": 1,
        "default-meaning": "opaque"
      },
      "meta-output": { 
        "css": "polygon-meta-output",
        "type": "string",
        "default": "",
        "default-meaning": "No MetaWriter Output"
      },
      "meta-writer": { 
        "css": "polygon-meta-writer",
        "type": "string",
        "default": "",
        "default-meaning": "No MetaWriter specified"
      }
    },
    "line": {
      "color": {
        "css": "line-color",
        "default": "black",
        "type": "color",
        "doc": "The color of a drawn line"
      },
      "width": {
        "css": "line-width",
        "default": 1,
        "type": "float",
        "doc": "The width of a line"
      },
      "opacity": {
        "css": "line-opacity",
        "default": 1
        "type": "float",
        "doc": "The opacity of a line"
      },
      "join": {
        "css": "line-join",
        "default": "miter",
        "type": ["miter", "round", "bevel"],
        "doc": "The behavior of lines when joining"
      },
      "cap": {
        "css": "line-cap",
        "default": "butt",
        "type": ["butt", "round", "square"],
        "doc": "The display of line endings."
      },
      "dasharray": {
        "css": "line-dasharray",
        "type": "numbers",
        "doc": "A pair of length values [a,b], where (a) is the dash length and (b) is the gap length respectively. More than two values are supported as well (e.g. to start the line not with a stroke, but with a gap).",
        "default": "none"
      },
      "meta-output": {
        "css": "line-meta-output",
        "type": "string",
        "default": "",
        "default-meaning": "No MetaWriter Output"
      },
      "meta-writer": {
        "css": "line-meta-writer",
        "type": "string",
        "default": ""
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
        "default": 1,
        "type": "float"
      },
      "placement": { 
        "css": "marker-placement",
        "type": ["point", "line"] 
      },
      "type": { 
        "css": "marker-type",
        "type": ["arrow", "ellipse"] 
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
        "default": 1,
        "type": "float"
      },
      "file": { 
        "css": "marker-file",
        "type": "uri"
      },
      "allow-overlap": {
        "css": "marker-allow-overlap",
        "type": "boolean"
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
        "default": "",
        "default-meaning": "No MetaWriter Output"
      },
      "meta-writer": {
        "css": "marker-meta-writer",
        "type": "string",
        "default": "none"
      }
    },
    "shield": {
      "name": {
        "css": "shield-name",
        "type":  "none"
      },
      "face-name": {
        "css": "shield-name",
        "type":  "string" 
      },
      "size": {
        "css": "shield-size",
        "type":  "int" 
      },
      "fill": {
        "css": "shield-fill",
        "type":  "color" 
      },
      "min-distance": {
        "css": "shield-min-distance",
        "type":  "int",
        "default": 0,
        "doc": "Minimum distance to the next shield symbol, not necessarily the same shield."
      },
      "spacing": {
        "css": "shield-spacing",
        "type":  "int",
        "default": 0,
        "doc": "The spacing between repeated occurrences of the same shield"
      },
      "character-spacing": {
        "css": "shield-spacing",
        "type":  "int" 
        "default": 0,
        "doc": "Horizontal spacing between characters (in pixels). Currently works for point placement only, not line placement."
      },
      "line-spacing": {
        "css": "shield-line-spacing",
        "doc": "Vertical spacing between lines of multiline labels (in pixels)",
        "type":  "int" 
      },
      "file": {
        "css": "shield-file",
        "type":  "uri"
      },
      "width": {
        "css": "shield-width",
        "type":  "int",
        "default": "The image's width"
      },
      "height": {
        "css": "shield-height",
        "type":  "int",
        "default": "The image's height"
      },
      "type": {
        "css": "shield-type",
        "type":  "None",
        "default": "The type of the image file: e.g. png"
      },
      "meta-output": {
        "css": "shield-meta-output",
        "type":  "string",
        "default": "",
        "default-meaning": "No MetaWriter Output"
      },
      "meta-writer": {
        "css": "shield-meta-writer",
        "type":  "string",
        "default": ""
      }
    },
    "line-pattern": {
      "file": {
        "css": "line-pattern-file",
        "type":  "uri"
      },
      "width": {
        "css": "line-pattern-width",
        "type":  "int" 
      },
      "height": {
        "css": "line-pattern-height",
        "type":  "int" 
      },
      "type": {
        "css": "line-pattern-type",
        "type":  "none"
      },
      "meta-output": {
        "css": "line-pattern-meta-output",
        "type":  "string",
        "default": "",
        "default-meaning": "No MetaWriter Output"
      },
      "meta-writer": {
        "css": "line-pattern-meta-writer",
        "type":  "string",
        "default": ""
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
        "default": "",
        "default-meaning": "No MetaWriter Output"
      },
      "meta-writer": {
        "css": "polygon-pattern-meta-writer",
        "type": "string",
        "default": ""
      }
    },
    "raster": {
      "opacity": {
        "css": "raster-opacity",
        "default": 1,
        "type": "float"
      },
      "mode": {
        "css": "raster-mode",
        "default": "normal",
        "type": 
          ["normal","grain_merge", "grain_merge2",
          "multiply", "multiply2", "divide", "divide2",
          "screen", "hard_light"] 
      },
      "scaling": {
        "css": "raster-scaling",
        "type": ["fast", "bilinear", "bilinear8"]
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
        "type": "boolean"
      },
      "meta-output": {
        "css": "point-meta-output",
        "type": "string",
        "default": "",
        "default-meaning": "No MetaWriter Output"
      },
      "meta-writer": {
        "css": "point-meta-writer",
        "type": "string",
        "default": ""
      }
    },
    "text": {
      "face-name": {
        "css": "text-face-name",
        "type": "string" 
      },
      "size": {
        "css": "text-size",
        "type": "integer" 
      },
      "ratio": {
        "css": "text-ratio",
        "type": "integer" 
        "type": "none"
      },
      "wrap-width": {
        "css": "text-wrap-width",
        "doc": "Length of a chunk of text in characters before wrapping text",
        "type": "integer" 
      },
      "spacing": {
        "css": "text-spacing",
        "type": "integer" 
      },
      "character-spacing": {
        "css": "text-character-spacing",
        "type": "integer" 
        "default": 0
      },
      "line-spacing": {
        "css": "text-line-spacing",
        "type": "integer" 
      },
      "label-position-tolerance": {
        "css": "text-label-position-tolerance",
        "type": "integer" 
      },
      "max-char-angle-delta": {
        "css": "text-max-char-angle-delta",
        "type": "integer" 
      },
      "fill": {
        "css": "text-fill",
        "type": "color" 
      },
      "halo-fill": {
        "css": "text-halo-fill",
        "docs": "Color of the text halo",
        "type": "color" 
      },
      "halo-radius": {
        "css": "text-halo-radius",
        "type": "integer" 
      },
      "dx": {
        "css": "text-dx",
        "type": "integer" 
      },
      "dy": {
        "css": "text-dy",
        "type": "integer" 
      },
      "avoid-edges": {
        "css": "text-avoid-edges",
        "doc": "Tell positioning algorithm to avoid labeling near intersection edges."
        "type": "boolean"
      },
      "min-distance": {
        "css": "text-min-distance",
        "type": "integer" 
      },
      "allow-overlap": {
        "css": "text-allow-overlap",
        "type": "boolean"
      },
      "placement": {
        "css": "text-placement",
        "type": ["point", "line"] 
      },
      "transform": {
        "css": "text-transform",
        "type": ["point", "line"] 
        "type": ["uppercase", "lowercase"] 
      },
      "meta-output": {
        "css": "text-meta-output",
        "type": "string",
        "default": "",
        "default-meaning": "No MetaWriter Output"
      },
      "meta-writer": {
        "css": "text-meta-writer",
        "type": "string",
        "default": ""
      }
    },
    "inline": {
      "color": {
        "css": "inline-color",
        "default": "black",
        "type": "color" 
      },
      "width": {
        "css": "inline-width",
        "type": "float"
      },
      "opacity": {
        "css": "inline-opacity",
        "default": 1,
        "type": "float"
      },
      "join": {
        "css": "inline-join",
        "default": "miter",
        "type": ["miter", "round", "bevel"]
      },
      "cap": {
        "css": "inline-cap",
        "default": "butt",
        "type": ["butt", "round", "square"]
      },
      "dasharray": {
        "css": "inline-dasharray",
        "type": "numbers"
      },
      "meta-output": {
        "css": "inline-meta-output",
        "type": "string",
        "default": "none",
        "default-meaning": "No MetaWriter Output"
      },
      "meta-writer": {
        "css": "inline-meta-writer",
        "type": "string",
        "default": "none"
      }
    },
    "outline": {
      "color": {
        "css": "outline-color",
        "default": "black",
        "type": "color" 
      },
      "width": {
        "css": "outline-width",
        "default": 1,
        "type": "float"
      },
      "opacity": {
        "css": "outline-opacity",
        "default": 1,
        "type": "float"
      },
      "join": {
        "css": "outline-join",
        "default": "miter",
        "type": ["miter", "round", "bevel"] 
      },
      "cap": {
        "css": "outline-cap",
        "default": "butt",
        "type": ["butt", "round", "square"] 
      },
      "dasharray": {
        "css": "outline-dasharray",
        "type": "numbers"
      },
      "meta-output": {
        "css": "outline-meta-output",
        "type": "string",
        "default": "none",
        "default-meaning": "No MetaWriter Output"
      },
      "meta-writer": {
        "css": "outline-meta-writer",
        "type": "string",
        "default": "none"
      }
    }
  }
};
