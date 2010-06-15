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
HEADER = build/header.js
VERSION = `cat package.json | grep version \
														| grep -o '[0-9]\.[0-9]\.[0-9]\+'`
DIST = dist/less-${VERSION}.js
DIST_MIN = dist/less-${VERSION}.min.js

less:
	@@mkdir -p dist
	@@touch ${DIST}
	@@cat ${HEADER} | sed s/@VERSION/${VERSION}/ > ${DIST}
	@@echo "(function (window, undefined) {" >> ${DIST}
	@@cat build/require.js\
	      build/ecma-5.js\
	      ${SRC}/parser.js\
	      ${SRC}/functions.js\
	      ${SRC}/tree/*.js\
	      ${SRC}/tree.js\
	      ${SRC}/browser.js >> ${DIST}
	@@echo "})(window);" >> ${DIST}
	@@echo ${DIST} built.

min: less
	@@echo minifying...
	@@cat ${HEADER} | sed s/@VERSION/${VERSION}/ > ${DIST_MIN}
	@@java -jar build/compiler.jar\
		     --js ${DIST} >> ${DIST_MIN}

.PHONY: test benchmark
