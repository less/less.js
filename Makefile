#
# Run all tests
#

expresso = ./node_modules/.bin/mocha
UGLIFYJS=./node_modules/.bin/uglifyjs
BROWSERIFY = ./node_modules/.bin/browserify

lint:
	./node_modules/.bin/jshint lib/carto/*.js lib/carto/tree/*.js

ifndef only
test:
	@NODE_PATH=./lib:$NODE_PATH $(expresso) -R spec -I lib test/*.test.js
else
test:
	@NODE_PATH=./lib:$NODE_PATH $(expresso) -R spec -I lib test/${only}.test.js
endif

check: test

dist:
	mkdir -p dist

dist/carto.uncompressed.js: dist $(shell $(BROWSERIFY) --list lib/carto/index.js)
	$(BROWSERIFY) lib/carto/index.js --exclude node_modules/underscore/underscore.js --standalone carto > $@

dist/carto.js: dist/carto.uncompressed.js $(shell $(BROWSERIFY) --list lib/carto/index.js)
	$(UGLIFYJS) dist/carto.uncompressed.js > $@


.PHONY: test
