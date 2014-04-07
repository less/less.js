# CartoCSS

[![Build Status](https://secure.travis-ci.org/mapbox/carto.png)](http://travis-ci.org/mapbox/carto)

Is the language for map design used by [TileMill](). It is similiar in syntax to CSS, but builds upon it with specific abilities to filter map data and by providing things like variables.

Carto, aka CartoCSS, targets the [Mapnik renderer](http://mapnik.org) and is able to general Mapnik XML>

Carto is an evolution of the [Cascadenik](https://github.com/mapnik/Cascadenik) idea and language,
with an emphasis on speed and flexibility. If you are a previous user of Cascadenik, see the [key differences wiki](https://github.com/mapbox/carto/wiki/Differences-With-Cascadenik).

## Documentation

For users looking to learn how to use TileMill the best places to start are to 1) Download [TileMill](http://mapbox.com/carto/) and review the [Carto reference documentation](http://mapbox.com/carto/).

Tutorials like the [TileMill Crashcourse](https://www.mapbox.com/tilemill/docs/crashcourse/styling/) are a great place to start to learn the basics of CartoCSS.

For more advanced topics see:

 - [Details on Filtering data with CartoCSS](https://www.mapbox.com/tilemill/docs/guides/selectors/)
 - [How order works in rendering](https://www.mapbox.com/tilemill/docs/guides/symbol-drawing-order/)
 - [How to style labels](https://www.mapbox.com/tilemill/docs/guides/styling-labels/)
 - [How to style lines](https://www.mapbox.com/tilemill/docs/guides/styling-lines/)
 - [How to style polygons](https://www.mapbox.com/tilemill/docs/guides/styling-polygons/)
 - See also the (Styling Concepts)[#styling-concepts] for explanations of advanced features.

## Developers

For details about how to install Carto from source and use on the command line see the [Installation section](#installation).

## Styling Concepts

### Attachments and Instances

In CSS, a certain object can only have one instance of a property. A `<div>` has a specific border width and color, rules that match better than others (#id instead of .class) override previous definitions. `CartoCSS` acts the same way normally for the sake of familiarity and organization, but Mapnik itself is more powerful.

Layers in Mapnik can have multiple [borders](http://trac.mapnik.org/wiki/LineSymbolizer) and multiple copies of other attributes. This ability is useful in drawing line outlines, like in the case of road borders or 'glow' effects around coasts. `CartoCSS` makes this accessible by allowing attachments to styles:

```css
#world {
  line-color: #fff;
  line-width: 3;
}

#world::outline {
  line-color: #000;
  line-width: 6;
}
```

Attachments are optional.

While attachments allow creating implicit "layers" with the same data, using **instances** allows you to create multiple symbolizers in the same style/layer:

```css
#roads {
  casing/line-width: 6;
  casing/line-color: #333;
  line-width: 4;
  line-color: #666;
}
```

This makes Mapnik first draw the line of color #333 with a width of 6, and then immediately afterwards, it draws the same line again with width 4 and color #666. Contrast that to attachments: Mapnik would first draw all casings before proceeding to the actual lines.

## Variables & Expressions

CartoCSS inherits from its basis in [less.js](http://lesscss.org/) some new features in CSS. One can define variables in stylesheets, and use expressions to modify them.

```css
@mybackground: #2B4D2D;

Map {
  background-color: @mybackground
}

#world {
  polygon-fill: @mybackground + #222;
  line-color: darken(@mybackground, 10%);
}
```

## Nested Styles

CartoCSS also inherits nesting of rules from less.js.

```css
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
```

This can be a convenient way to group style changes by zoom level:

```css
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
```

## FontSets

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

#### Installation

If you're using [TileMill](http://mapbox.com/tilemill/), you're already
using CartoCSS and don't need to do a thing.

If you're a developer-type and want to use the `carto` binary with
`node.js` (and you have [npm](http://npmjs.org/) installed),

    npm install -g carto

Optionally you may also want to install millstone which is required for resolving data in the same way as TileMill does:

    npm install -g millstone


Having `millstone` installed specifically enable support for localizing external resources (URLs and local files) referenced in your mml file, and detecting projections (using [node-srs](https://github.com/mapbox/node-srs))

Now that Carto is installed you should have a `carto` command line tool available that can be run on a TileMill project:

    carto project.mml > mapnik.xml

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
