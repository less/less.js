## Changelog

### 0.3.0 (NOT YET RELEASED)

* Add "name/" prefix for creating multiple instances of a symbolizer in the same
  attachment
* Only output <Layer> tag when there's at least one style
* Sort styles by location of first rule's index

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


