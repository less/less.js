#
# Run all tests
#

expresso = ./node_modules/.bin/expresso
docco = ./node_modules/.bin/docco

ifndef only
test:
	$(expresso) -I lib test/*.test.js
else
test:
	$(expresso) -I lib test/${only}.test.js
endif

doc:
	$(docco) lib/carto/*.js lib/carto/tree/*.js

.PHONY: test
