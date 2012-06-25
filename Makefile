#
# Run all tests
#

expresso = ./node_modules/.bin/mocha
docco = ./node_modules/.bin/docco

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

.PHONY: test
