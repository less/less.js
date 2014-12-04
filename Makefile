#
# Run all tests
#

expresso = ./node_modules/.bin/mocha
BROWSERIFY = ./node_modules/.bin/browserify
TREE_FILES = $(shell ls ./lib/carto/tree/*.js)

# generates the requirement options for browserify for modules loaded dinamically (see, lib/carto/index.js)
BROWSERIFY_REQUIRES = $(foreach var,$(TREE_FILES), -r $(var):$(subst .js,,$(subst ./lib/carto,.,$(var))))

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

dist/carto.uncompressed.js: dist $(shell $(BROWSERIFY) --list lib/carto/index.js) $(TREE_FILES)
	$(BROWSERIFY) --require $(BROWSERIFY_REQUIRES)  --debug lib/carto/index.js --standalone carto > $@

.PHONY: test
