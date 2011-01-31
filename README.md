# mess.js

Is a stylesheet renderer for Mapnik. It's an evolution of the [Cascadenik](https://github.com/mapnik/Cascadenik) idea and language, with an emphasis on speed and flexibility.

## MML
_incompatibility_

* MML files are assumed to be JSON, not XML


## Attachments
_new_

In CSS, a certain object can only have one instance of a property. A `<div>` has a specific border width and color, rules that match better than others (#id instead of .class) override previous definitions. `mess.js` acts the same way normally for the sake of familiarity and organization, but Mapnik itself is more powerful.

Layers in Mapnik can have multiple [borders](http://trac.mapnik.org/wiki/LineSymbolizer) and multiple copies of other attributes. This ability is useful in drawing line outlines, like in the case of road borders or 'glow' effects around coasts. `mess.js` makes this accessible by allowing attachments to styles:

    #world {
      line-color: #fff;
      line-width: 3;
      }

      #world::outline {
        line-color: #000;
        line-width: 6;
        }

Attachments are optional: if you don't define them, mess.js does overriding of styles just like Cascadenik.

This brings us to another _incompatibility_: `line-inline` and `line-outline` have been removed from the language, because attachments are capable of the same trick.

## text-name
_incompatibility_

Instead of the name attribute of the TextSymbolizer and ShieldSymbolizer being a part of the selector, it is a property of a rule. Thus the evaluation is less complex and one can use expressions in names.

<table>
  <tr>
    <th>cascadenik</th>
    <th>mess.js</th>
  </tr>
  <tr>
    <td>
      <pre>
#world NAME {
  text-face-name: "Arial";
}</pre>
    </td>
    <td>
      <pre>
#world {
  text-name: "NAME";
  text-face-name: "Arial";
}</pre>
    </td>
  </tr>
</table>

## Mapnik2

`mess.js` is only compatible with [Mapnik2](http://trac.mapnik.org/wiki/Mapnik2). Compatibility with Mapnik 0.7.x is not planned.

## Rasters and Buildings

Rasters are supported in mess.js - it knows how to download `.vrt`, `.tiff`, and soon other raster formats, and the properties of the [RasterSymbolizer](http://trac.mapnik.org/wiki/RasterSymbolizer) are exposed in the language.

The [BuildingSymbolizer](http://trac.mapnik.org/wiki/BuildingSymbolizer) is also supported in `mess.js`. The code stores symbolizer types and properties in a JSON file (in `tree/reference.js`), so new Mapnik features can be quickly implemented here.

## Variables & Expressions

`mess.js` inherits from its basis in [less.js](http://lesscss.org/) some new features in CSS. One can define variables in stylesheets, and use expressions to modify them.

    @mybackground: #2B4D2D;
    
    Map {
      background-color: @mybackground
    }
    
    #world {
      polygon-fill: @mybackground + #222;
      line-color: darken(@mybackground, 10%);
    }

## FontSets

By defining multiple fonts in a `text-face-name` definition, you create [FontSets](http://trac.mapnik.org/wiki/FontSet) in `mess.js`. These are useful for supporting multiple character sets and fallback fonts for distributed styles.


## Credits

`mess.js` is based on [less.js](https://github.com/cloudhead/less.js), a CSS compiler written by Alexis Sellier. It depends on [underscore.js](https://github.com/documentcloud/underscore/).


## Usage

Using the binary

    messc map_file.json

## Authors

* Tom MacWright (tmcw)
* Konstantin Käfer (kkaefer)
* AJ Ashton (ajashton)