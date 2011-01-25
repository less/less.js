#
# Run all tests
#

ifndef only
test:
	bin/expresso -I lib
else
test:
	bin/expresso -I lib test/${only}.test.js
endif

.PHONY: test
