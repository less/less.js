<p align="center"><img src="http://lesscss.org/public/img/less_logo.png" width="264" height="117"></p>

<p align="center">
    <a href="https://github.com/less/less.js/actions?query=branch%3Amaster"><img src="https://github.com/less/less.js/actions/workflows/ci.yml/badge.svg?branch=master" alt="Github Actions CI"/></a>
    <a href="https://www.npmtrends.com/less"><img src="https://img.shields.io/npm/dm/less.svg?sanitize=true" alt="Downloads"></a>
    <a href="https://www.npmjs.com/package/less"><img src="https://img.shields.io/npm/v/less.svg?sanitize=true" /></a>
</p>

# Less.js

> The dynamic stylesheet language. [lesscss.org](http://lesscss.org)

Less extends CSS with variables, mixins, functions, nesting, and more — then compiles to standard CSS. Write cleaner stylesheets with less code.

```less
@primary: #4a90d9;

.button {
  color: @primary;
  &:hover {
    color: darken(@primary, 10%);
  }
}
```

## Install

```sh
npm install less
```

## Usage

### Node.js

```js
const less = require('less');

less.render('.class { width: (1 + 1) }')
  .then(output => console.log(output.css));
```

### Command Line

```sh
npx lessc styles.less styles.css
```

### Browser

```html
<link rel="stylesheet/less" type="text/css" href="styles.less" />
<script src="https://cdn.jsdelivr.net/npm/less"></script>
```

## Why Less?

- **Variables** — define reusable values once
- **Mixins** — reuse groups of declarations across rulesets
- **Nesting** — mirror HTML structure in your stylesheets
- **Functions** — transform colors, manipulate strings, do math
- **Imports** — split stylesheets into manageable pieces
- **Extend** — reduce output size by combining selectors

## Documentation

Full documentation, usage guides, and configuration options at **[lesscss.org](http://lesscss.org)**.

## Contributing

Less.js is open source. [Report bugs](https://github.com/less/less.js/issues), submit pull requests, or help improve the [documentation](https://github.com/less/less-docs).

See [CONTRIBUTING.md](https://github.com/less/less.js/blob/master/CONTRIBUTING.md) for development setup.

## License

Copyright (c) 2009-2025 [Alexis Sellier](http://cloudhead.io) & The Core Less Team
Licensed under the [Apache License](https://github.com/less/less.js/blob/master/LICENSE).
