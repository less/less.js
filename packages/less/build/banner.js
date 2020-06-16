const pkg = require('./../package.json');

module.exports = 
`/**
 * Less - ${ pkg.description } v${ pkg.version }
 * http://lesscss.org
 * 
 * Copyright (c) 2009-${new Date().getFullYear()}, ${ pkg.author.name } <${ pkg.author.email }>
 * Licensed under the ${ pkg.license } License.
 *
 * @license ${ pkg.license }
 */
`;
