less.js
=======

about
-----

less.js is the next evolution of [LESS](http://lesscss.org), eventually, it will become LESS 2.0.
less.js is a complete rewrite of LESS in JavaScript, and will be able to run directly in the browser,
as well as on the server, with node.js.

where do I get it?
------------------

The latest builds are in the `dist/` folder.

synopsis
--------

### in node.js

    var less = require('less');

    less.render(".class { width: 10px * 2 }", function (e, css) {
        sys.puts(css); // .class { width: 20px }
    });

### via the command-line (requires node)

    bin/lessc style.less

### in the browser

Get the pre-built version from the `dist/` folder, and include it as such:

    <link rel="stylesheet/less" href="main.less" type="text/css">
    <script src="less.js" type="text/javascript"></script>

Note the `rel="stylesheet/less"` for all stylesheets you want to parse with LESS.

installation
------------

In node:

    $ npm install less
