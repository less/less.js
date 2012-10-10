# CartoCSS

[![Build Status](https://secure.travis-ci.org/mapbox/carto.png)](http://travis-ci.org/mapbox/carto)

Is a stylesheet renderer for Mapnik. It's an evolution of the
[Cascadenik](https://github.com/mapnik/Cascadenik) idea and language,
with an emphasis on speed and flexibility.

## Reference Documentation

* [mapbox.com/carto](http://mapbox.com/carto/)

## MML
_incompatibility_

* MML files are assumed to be JSON, not XML. The files are near-identical
  to the XML files accepted by Cascadenik, just translated into JSON.
* CartoCSS will not embed files or download URLs for you. Stylesheets should
  be embedded directly into your MML JSON and any datasources should be
  paths (relative or absolute) that would be acceptable in Mapnik XML.
  The [millstone project](https://github.com/mapbox/millstone) aims to fill this need.

CartoCSS MML:

    {
        "srs": "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0.0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs +over",
        "Stylesheet": [{"id":"style.mss","data":"Map {\n  background-color: #fff;\n}\n\n#world {\n  line-color: #ccc;\n  line-width: 0.5;\n  polygon-fill: #eee;\n}"}],
        "Layer": [{
            "id": "world",
            "name": "world",
            "srs": "+proj=latlong +ellps=WGS84 +datum=WGS84 +no_defs",
            "Datasource": {
                "file": "world_borders",
                "type": "shape"
            }
        }]
    }

Cascadenik MML

<pre>&lt;Stylesheet&gt;&lt;![CDATA[
    Map {
        map-bgcolor: #69f;
    }

    Layer {
        line-width: 1;
        line-color: #696;
        polygon-fill: #6f9;
    }
]]&gt;&lt;/Stylesheet&gt;
&lt;Layer srs=&quot;+proj=latlong +ellps=WGS84 +datum=WGS84 +no_defs&quot;&gt;
    &lt;Datasource&gt;
        &lt;Parameter name=&quot;type&quot;&gt;shape&lt;/Parameter&gt;
        &lt;Parameter name=&quot;file&quot;&gt;world_borders&lt;/Parameter&gt;
    &lt;/Datasource&gt;
&lt;/Layer&gt;
&lt;/Map&gt;</pre>

## Attachments and Instances
_new_

In CSS, a certain object can only have one instance of a property. A `<div>` has a specific border width and color, rules that match better than others (#id instead of .class) override previous definitions. `CartoCSS` acts the same way normally for the sake of familiarity and organization, but Mapnik itself is more powerful.

Layers in Mapnik can have multiple [borders](http://trac.mapnik.org/wiki/LineSymbolizer) and multiple copies of other attributes. This ability is useful in drawing line outlines, like in the case of road borders or 'glow' effects around coasts. `CartoCSS` makes this accessible by allowing attachments to styles:

    #world {
      line-color: #fff;
      line-width: 3;
      }

      #world::outline {
        line-color: #000;
        line-width: 6;
        }

Attachments are optional: if you don't define them, CartoCSS does overriding of styles just like Cascadenik.

This brings us to another _incompatibility_: `line-inline` and `line-outline` have been removed from the language, because attachments are capable of the same trick.

While attachments allow creating implicit "layers" with the same data, using **instances** allows you to create multiple symbolizers in the same style/layer:

    #roads {
      casing/line-width: 6;
      casing/line-color: #333;
      line-width: 4;
      line-color: #666;
      }

This makes Mapnik first draw the line of color #333 with a width of 6, and then immediately afterwards, it draws the same line again with width 4 and color #666. Contrast that to attachments: Mapnik would first draw all casings before proceeding to the actual lines.

## text-name
_incompatibility_

Instead of the name attribute of the [TextSymbolizer](http://trac.mapnik.org/wiki/TextSymbolizer) and [ShieldSymbolizer](http://trac.mapnik.org/wiki/ShieldSymbolizer) being a part of the selector, it is a property of a rule. Thus the evaluation is less complex and one can use expressions in names.

<table>
  <tr>
    <th>cascadenik</th>
    <th>CartoCSS</th>
  </tr>
  <tr>
    <td valign='top'>
      <pre>
#world NAME {
  text-face-name: "Arial";
}</pre>
    </td>
    <td valign='top'>
      <pre>
#world {
  text-name: "NAME";
  text-face-name: "Arial";
}</pre>
    </td>
  </tr>
</table>

## Mapnik2
_new_

CartoCSS is only compatible with [Mapnik2](http://trac.mapnik.org/wiki/Mapnik2). Compatibility with Mapnik 0.7.x is not planned.

## Rasters and Buildings
_new_

Rasters are supported in CartoCSS - it knows how to download `.vrt`, `.tiff`, and soon other raster formats, and the properties of the [RasterSymbolizer](http://trac.mapnik.org/wiki/RasterSymbolizer) are exposed in the language.

The [BuildingSymbolizer](http://trac.mapnik.org/wiki/BuildingSymbolizer) is also supported in `CartoCSS`. The code stores symbolizer types and properties in a JSON file (in `tree/reference.json`), so new Mapnik features can be quickly implemented here.

## Variables & Expressions
_new_

CartoCSS inherits from its basis in [less.js](http://lesscss.org/) some new features in CSS. One can define variables in stylesheets, and use expressions to modify them.

    @mybackground: #2B4D2D;
    
    Map {
      background-color: @mybackground
    }
    
    #world {
      polygon-fill: @mybackground + #222;
      line-color: darken(@mybackground, 10%);
    }

## Nested Styles
_new_

CartoCSS also inherits nesting of rules from less.js.

    /* Applies to all layers with .land class */
    .land {
      line-color: #ccc;
      line-width: 0.5;
      polygon-fill: #eee;
      /* Applies to #lakes.land */
      #lakes {
        polygon-fill: #000;
      }
    }

This can be a convenient way to group style changes by zoom level:

    [zoom > 1] {
      /* Applies to all layers at zoom > 1 */
      polygon-gamma: 0.3;
      #world {
        polygon-fill: #323;
      }
      #lakes {
        polygon-fill: #144;
      }
    }

## FontSets

_new_

By defining multiple fonts in a `text-face-name` definition, you create [FontSets](http://trac.mapnik.org/wiki/FontSet) in `CartoCSS`. These are useful for supporting multiple character sets and fallback fonts for distributed styles.

<table>
  <tr>
    <th>carto</th><th>XML</th>
    </tr>
    <tr>
    <td valign='top'>

    <pre>#world {
  text-name: "[NAME]";
  text-size: 11;
  text-face-name: "Georgia Regular", "Arial Italic";
}</pre>

</td>
<td valign='top'>
<pre>&lt;FontSet name=&quot;fontset-0&quot;&gt;
  &lt;Font face-name=&quot;Georgia Regular&quot;/&gt;
  &lt;Font face-name=&quot;Arial Italic&quot;/&gt;
&lt;/FontSet&gt;
&lt;Style name=&quot;world-text&quot;&gt;
  &lt;Rule&gt;
    &lt;TextSymbolizer fontset-name=&quot;fontset-0&quot;
      size=&quot;11&quot;
      name=&quot;[NAME]&quot;/&gt;
  &lt;/Rule&gt;
&lt;/Style&gt;</pre>
</td>
<tr>
</table>

## Filters

CartoCSS supports a variety of filter styles:

Numeric comparisons:

```
#world[population > 100]
#world[population < 100]
#world[population >= 100]
#world[population <= 100]
```

General comparisons:

```
#world[population = 100]
#world[population != 100]
```


String comparisons:

```
/* a regular expression over name */
#world[name =~ "A.*"]
```

## Developers

#### Installation

If you're using [TileMill](http://mapbox.com/tilemill/), you're already
using CartoCSS and don't need to do a thing.

If you're a developer-type and want to use the `carto` binary with
`node.js` (and you have [npm](http://npmjs.org/) installed),

    npm install carto

#### From the binary

Install `millstone` to enable support for localizing external resources (URLs and local files) referenced in your mml file.

    npm install millstone
    carto map_file.json

#### From code

Currently CartoCSS is designed to be invoked from [node.js](http://nodejs.org/).
The `Renderer` interface is the main API for developers, and it takes an MML file as a string as input.

    // defined variables:
    // - input (the name or identifier of the file being parsed)
    // - data (a string containing the MML or an object of MML)
    var carto = require('carto');
    
    new carto.Renderer({
            filename: input,
            local_data_dir: path.dirname(input),
        }).render(data, function(err, output) {
            if (err) {
                if (Array.isArray(err)) {
                    err.forEach(function(e) {
                        carto.writeError(e, options);
                    });
                } else { throw err; }
            } else {
                sys.puts(output);
            }
        });

### Vim

To install, download or clone this repository, then add the `vim-carto`
directory located at `build/vim-carto` to your `~/.vim` file.

## Credits

CartoCSS is based on [less.js](https://github.com/cloudhead/less.js), a CSS compiler written by Alexis Sellier.

It depends on:

* [underscore.js](https://github.com/documentcloud/underscore/)

Only for running tests:

* [mocha](https://github.com/visionmedia/mocha)
* [sax-js](https://github.com/isaacs/sax-js/)

## Authors

* Tom MacWright (tmcw)
* Konstantin Käfer (kkaefer)
* AJ Ashton (ajashton)
* Dane Springmeyer (springmeyer)
