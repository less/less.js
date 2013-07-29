#
# Run all tests
#

expresso = ./node_modules/.bin/mocha
docco = ./node_modules/.bin/docco
uglify = ./node_modules/.bin/uglify

JS_CLIENT_FILES=browser/*.js lib/carto/parser.js lib/carto/tree.js lib/carto/tree/*.js lib/carto/functions.js lib/carto/renderer_js.js

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

doc:
	$(docco) lib/carto/*.js lib/carto/tree/*.js

dist/carto.js: $(JS_CLIENT_FILES)
	cat browser/*.js lib/carto/parser.js lib/carto/tree.js lib/carto/tree/*.js lib/carto/functions.js lib/carto/renderer_js.js > dist/carto.js

dist: dist/carto.js

.PHONY: test
