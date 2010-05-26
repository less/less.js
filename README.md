less.js
=======

about
-----

less.js is the next evolution of [LESS](http://lesscss.org), eventually, it will become LESS 2.0.
less.js is a complete rewrite of LESS in JavaScript, and will be able to run directly in the browser,
as well as on the server, with node.js.

where do I get it?
------------------

Go to the Downloads section, and get the latest version:

<http://github.com/cloudhead/less.js/downloads>

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

First, run `make less` in the command line. It will the build the *less.js* file in *dist/*.
Then, you can use it as such:

    <link rel="stylesheet/less" href="main.less" type="text/css">
    <script src="less.js"></script>

To build a minified version, run `make min`

installation
------------

In node:

    $ npm install less
