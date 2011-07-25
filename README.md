# carto

Is a stylesheet renderer for Mapnik. It's an evolution of the [Cascadenik](https://github.com/mapnik/Cascadenik) idea and language, with an emphasis on speed and flexibility.

## Installation

    npm install carto

## MML
_incompatibility_

* MML files are assumed to be JSON, not XML. The files are near-identical to the XML files accepted by Cascadenik, just translated into JSON.
* Carto will not embed files or download URLs for you. Stylesheets should be embedded directly into your MML JSON and any datasources should be paths (relative or absolute) that would be acceptable in Mapnik XML.

carto.js MML:

    {
        "srs": "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs +over",
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
    Map
    {
        map-bgcolor: #69f;
    }

    Layer
    {
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

## Attachments
_new_

In CSS, a certain object can only have one instance of a property. A `<div>` has a specific border width and color, rules that match better than others (#id instead of .class) override previous definitions. `carto.js` acts the same way normally for the sake of familiarity and organization, but Mapnik itself is more powerful.

Layers in Mapnik can have multiple [borders](http://trac.mapnik.org/wiki/LineSymbolizer) and multiple copies of other attributes. This ability is useful in drawing line outlines, like in the case of road borders or 'glow' effects around coasts. `carto.js` makes this accessible by allowing attachments to styles:

    #world {
      line-color: #fff;
      line-width: 3;
      }

      #world::outline {
        line-color: #000;
        line-width: 6;
        }

Attachments are optional: if you don't define them, carto.js does overriding of styles just like Cascadenik.

This brings us to another _incompatibility_: `line-inline` and `line-outline` have been removed from the language, because attachments are capable of the same trick.

## text-name
_incompatibility_

Instead of the name attribute of the [TextSymbolizer](http://trac.mapnik.org/wiki/TextSymbolizer) and [ShieldSymbolizer](http://trac.mapnik.org/wiki/ShieldSymbolizer) being a part of the selector, it is a property of a rule. Thus the evaluation is less complex and one can use expressions in names.

<table>
  <tr>
    <th>cascadenik</th>
    <th>carto.js</th>
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

`carto.js` is only compatible with [Mapnik2](http://trac.mapnik.org/wiki/Mapnik2). Compatibility with Mapnik 0.7.x is not planned.

## Rasters and Buildings
_new_

Rasters are supported in carto.js - it knows how to download `.vrt`, `.tiff`, and soon other raster formats, and the properties of the [RasterSymbolizer](http://trac.mapnik.org/wiki/RasterSymbolizer) are exposed in the language.

The [BuildingSymbolizer](http://trac.mapnik.org/wiki/BuildingSymbolizer) is also supported in `carto.js`. The code stores symbolizer types and properties in a JSON file (in `tree/reference.json`), so new Mapnik features can be quickly implemented here.

## Variables & Expressions
_new_

`carto.js` inherits from its basis in [less.js](http://lesscss.org/) some new features in CSS. One can define variables in stylesheets, and use expressions to modify them.

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

`carto.js` also inherits nesting of rules from less.js.

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

By defining multiple fonts in a `text-face-name` definition, you create [FontSets](http://trac.mapnik.org/wiki/FontSet) in `carto.js`. These are useful for supporting multiple character sets and fallback fonts for distributed styles.

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


## Usage

#### Using the binary

    carto map_file.json

#### Using the code

Currently `carto.js` is designed to be invoked from [node.js](http://nodejs.org/).
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

## TextMate bundle

There's a TextMate bundle that offers syntax highlighting for `.mss` and `.mml` files in the `build` directory. To install, download or clone this repository, then double-click on the `carto.tmbundle` icon in that folder.

The TextMate bundle **requires** [node-mapnik](https://github.com/mapnik/node-mapnik) and Carto installed globally - the versions that are installed locally in TileMill or other tools can't be automatically discovered.

    npm install mapnik -g
    npm install carto -g

## Credits

`carto.js` is based on [less.js](https://github.com/cloudhead/less.js), a CSS compiler written by Alexis Sellier.

It depends on:

* [underscore.js](https://github.com/documentcloud/underscore/)

Only for running tests:

* [expresso](https://github.com/visionmedia/expresso)
* [sax-js](https://github.com/isaacs/sax-js/)

## Changelog

### 0.2.0

* Removed all external handling - see http://github.com/mapbox/millstone.git for localizing/caching MML objects with external references.
* All errors are now handled as Error objects.

### 0.1.14

* Optional-file datasources - allows string argument to OGR

### 0.1.9

* Variables in filters.

### 0.1.6 & 0.1.8

* Fixed bug caused by jshint testing

### 0.1.5

* Using npm devDependencies in place of ndistro
* Updated package.json format
* Fixes tests

### 0.1.4

* Fix bug in which SRS autodetection broke error handling
* Update carto


## Authors

* Tom MacWright (tmcw)
* Konstantin Käfer (kkaefer)
* AJ Ashton (ajashton)
* Dane Springmeyer (springmeyer)
