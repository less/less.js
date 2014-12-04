#
# Run all tests
#

expresso = ./node_modules/.bin/mocha
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
	$(BROWSERIFY) --debug lib/carto/index.js --standalone carto > $@

.PHONY: test
