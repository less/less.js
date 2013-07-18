# [Less.js v1.4.1](http://lesscss.org)

> The **dynamic** stylesheet language. [http://lesscss.org](http://lesscss.org).

This is the JavaScript, and now official, stable version of LESS.


## Getting Started
Install the module with:

```shell
 npm install less
```

## Running tests

Start by [downloading this project](https://github.com/less/less.js/archive/master.zip) or in the command line do the following:

```shell
git clone https://github.com/less/less.js.git "less"
```

This plugin requires Grunt `~0.4.0`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-contrib-less --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-contrib-less');
```



## Features
LESS extends CSS with dynamic features such as:

* [nesting](#nesting)
* [variables](#variables)
* [operations](#operations)
* [mixins](#mixins)
* [extend](#extend) (selector inheritance)
* [many more features](http://lesscss.org)


### Examples

#### nesting
Take advantage of nesting to make code more readable and maintainable. This:
``` less
.nav > li > a {
  border: 1px solid #f5f5f5;
  &:hover {
    border-color: #ddd;
  }
}
```
renders to:
``` css
.nav > li > a {
  border: 1px solid #f5f5f5;
}
.nav > li > a:hover {
  border-color: #ddd;
}
```

#### variables
Updated commonly used values from a single location.

``` less
// Variables ("inline" comments like this can be used)
@link-color:  #428bca; // sea blue

// Styles
a {
  color: @link-color;
}
```
Variables can also be used in `@import` statements, urls, selector names, and more.

#### operations
Continuing with the same example above, we can use our variables even easier to maintain with _operations_, which enables the use of addition, subraction, multiplication and division in your styles:

``` less
// Variables
@link-color:        #428bca; // sea blue
@link-color-hover:  darken(@link-color, 10%);

// Styles
a {
  color: @link-color;
}
a:hover {
  color: @link-color-hover;
}
```
renders to:
``` css
a {
  color: #428bca;
}
a:hover {
  color: #3071a9;
}
```

#### mixins
Mixins enable you to apply the styles of one selector inside another selector like this:

``` less
.link {
  color: @link-color;
}
a {
  font-weight: bold;
  .link; // use the .link; class as a mixin
}
```
renders to:
``` css
.link {
  color: #428bca;
}
a {
  font-weight: bold;
  color: #428bca;
}
```
So any selector can be an "implicit mixin". We'll show you a DRYer way to do this below.

#### parametric mixins
Mixins can also accept parameters:

``` less
// Transition mixin
.transition(@transition) {
  -webkit-transition: @transition;
     -moz-transition: @transition;
       -o-transition: @transition;
          transition: @transition;
}
```
used like this:
``` less
a {
  font-weight: bold;
  color: @link-color;
  .transition(color .2s ease-in-out);
}
a:hover {
  color: @link-color-hover;
}
```
renders to:
``` css
a {
  font-weight: bold;
  color: #428bca;
  -webkit-transition: color 0.2s ease-in-out;
     -moz-transition: color 0.2s ease-in-out;
       -o-transition: color 0.2s ease-in-out;
          transition: color 0.2s ease-in-out;
}
a:hover {
  color: #3071a9;
}
```
#### extend
The `extend` feature can be thought of as the _inverse_ of mixins. It accomplishes the goal of "borrowing styles", but rather than copying all the rules of _Selector A_ over to _Selector B_, `extend` copies the name of the _inheriting selector_ (_Selector B_) over to the _extending selector_ (_Selector A_). So continuing the example used for `mixins` above, extend would be applied like this:

``` less
.link {
  color: @link-color;
}
a:extend(.link) {
  font-weight: bold;
}
// Can also be written as
a {
  &:extend(.link);
  font-weight: bold;
}
```
renders to:
``` css
.link, a {
  color: #428bca;
}
```

## Documentation

For general information on the language, configuration options or usage visit:

* [lesscss.org](http://lesscss.org) or
* [the less wiki](https://github.com/cloudhead/less.js/wiki)


### Usage
Invoke the compiler from node:
``` javascript
var less = require('less');

less.render('.class { width: (1 + 1) }', function (e, css) {
    console.log(css);
});
```
Outputs:
``` css
.class {
  width: 2;
}
```
You may also manually invoke the parser and compiler:
``` javascript
var parser = new(less.Parser);

parser.parse('.class { width: (1 + 1) }', function (err, tree) {
    if (err) { return console.error(err) }
    console.log(tree.toCSS());
});
```

### Configuration
You may also pass options to the compiler:
``` javascript
var parser = new(less.Parser)({
    paths: ['.', './src/less'], // Specify search paths for @import directives
    filename: 'style.less'      // Specify a filename, for better error messages
});

parser.parse('.class { width: (1 + 1) }', function (e, tree) {
    tree.toCSS({ compress: true }); // Minify CSS output
});
```


Learn more about LESS:
* [node.js tools](https://github.com/cloudhead/less.js/wiki/Converting-LESS-to-CSS) for converting Less to CSS
* [GUI compilers for Less](https://github.com/cloudhead/less.js/wiki/GUI-compilers-that-use-LESS.js)
* [stackoverflow.com](http://stackoverflow.com/questions/tagged/twitter-bootstrap+less) is a great place to get answers about Less.



## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
See the [changelog](CHANGELOG)

## [License](./LICENSE)

Copyright (c) 2009-2013 Alexis Sellier & The Core Less Team
Licensed under the Apache license.
