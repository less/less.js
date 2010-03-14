#
# Run all tests
#
test: 
	node test/less-test.js

#
# Run benchmark
#
benchmark:
	node benchmark/less-benchmark.js

SRC = lib/less

#
# Build less.js
#
less:
	@@mkdir -p build
	@@cat ${SRC}/parser.js\
	      ${SRC}/functions.js\
	      ${SRC}/tree/*.js > build/less.js
	@@echo build/less.js built.

min:

.PHONY: test benchmark
