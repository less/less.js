#
# Run all tests
#

expresso = ./node_modules/.bin/expresso
docco = ./node_modules/.bin/docco

lint:
	./node_modules/.bin/jshint lib/carto/*.js lib/carto/tree/*.js

ifndef only
test:
	@NODE_PATH=./lib:$NODE_PATH $(expresso) -I lib test/*.test.js
else
test:
	@NODE_PATH=./lib:$NODE_PATH $(expresso) -I lib test/${only}.test.js
endif

doc:
	$(docco) lib/carto/*.js lib/carto/tree/*.js

.PHONY: test
