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
DIST = dist/less.js
DIST_MIN = dist/less.min.js
HEADER = build/header.js
VERSION = `cat VERSION`

less:
	@@mkdir -p build
	@@cat lib/ext/*.js\
	      ${SRC}/parser.js\
	      ${SRC}/functions.js\
	      ${SRC}/tree/*.js\
	      ${SRC}/browser.js > ${DIST}
	@@echo ${DIST} built.

min: less
	@@echo Minifying...
	@@cat ${HEADER} | sed s/@VERSION/${VERSION}/ > ${DIST_MIN}
	@@java -jar build/compiler.jar\
		     --js ${DIST} >> ${DIST_MIN}

.PHONY: test benchmark
