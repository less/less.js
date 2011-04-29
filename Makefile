#
# Run all tests
#

ifndef only
test:
	expresso -I lib test/*.test.js
else
test:
	expresso -I lib test/${only}.test.js
endif

doc:
	docco lib/carto/*.js lib/carto/tree/*.js

.PHONY: test
