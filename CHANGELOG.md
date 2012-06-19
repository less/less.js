## Changelog

### 0.6.0

* Bump `mapnik-reference` dependency to 1.0.0 to allow for using `buffer-size` in the
  `Map` element.

### 0.5.0

* Now uses the [mapnik-reference](https://github.com/mapnik/mapnik-reference) npm module
  instead of copying `reference.json` when it's updated
* Adds a second parameter to `carto.Renderer` - an object which has a key `mapnik_version`
  that specifies the version of Mapnik this stylesheet should target.

### 0.4.10

* Updated reference.json

### 0.4.9

* Render TileJSON, Mapnik options to Mapnik XML parameters.

### 0.4.8

* Updated reference.json

### 0.4.7

* Removed deprecation warnings re: sys/util
* Updated reference.json
* Updated underscore dependency

### 0.4.6

* Node >=v0.6.x compatibility
* Dropped cartox
* Updated reference.json

### 0.4.5

* Fixes text-name with HTML entities
* Fixes function calls with incorrect number of arguments
* Fixes invalid code segments not having eval

### 0.4.3

* Fixes serialization bug with invalid selectors.

### 0.4.0

* Switches text-symbolizer syntax to new-style for Mapnik 2.0

### 0.3.0

* Add "name/" prefix for creating multiple instances of a symbolizer in the same
  attachment
* Only output `<Layer>` tag when there's at least one style
* Sort styles by location of first rule's index
* Don't support selectors that are not either `Map`, `.` or `#`-prefixed.

### 0.2.3

* Fixes many bugs
* Supports arbitrary properties on layers with the `properties` key in MML
* Adds `min-path-length`
* Updates `reference.json`

### 0.2.2

* Update `carto` to use `millstone` if available.

### 0.2.1

* Accept valid Map properties directly from input mml object.

### 0.2.0

* Removed all external handling - see http://github.com/mapbox/millstone for localizing/caching MML objects with external references.
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


