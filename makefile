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

#
# Build less.js
#
SRC = lib/less
BUILD = build/less.js
BUILD_MIN = build/less.min.js
HEADER = build/header.js
VERSION = `cat VERSION`

less:
	@@mkdir -p build
	@@cat ${SRC}/parser.js\
	      ${SRC}/functions.js\
	      ${SRC}/tree/*.js > ${BUILD}
	@@echo ${BUILD} built.

min: less
	@@echo Minifying...
	@@cat ${HEADER} | sed s/@VERSION/${VERSION}/ > ${BUILD_MIN}
	@@java -jar build/compiler.jar\
		     --js ${BUILD} >> ${BUILD_MIN}

.PHONY: test benchmark
