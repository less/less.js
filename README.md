less.js
=======

about
-----

less.js is the next evolution of [LESS](http://lesscss.org), eventually, it will become LESS 2.0.
less.js is a complete rewrite of LESS in JavaScript, and will be able to run directly in the browser,
as well as on the server, with node.js.

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

    <link rel="less" href="/stylesheets/main.less" type="text/css">

