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
NAME = less-clean
SRC = lib/
HEADER = build/header.js
VERSION = `git describe --tag | sed -e 's/^\w//'`
DIST = dist/less-${VERSION}.js
RHINO = dist/less-rhino-${VERSION}.js
DIST_MIN = dist/less-${VERSION}.min.js
less:
	@@echo v${VERSION}
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

rhino:
	@@mkdir -p dist
	@@touch ${RHINO}
	@@cat build/require-rhino.js\
	      build/ecma-5.js\
	      ${SRC}/parser.js\
	      ${SRC}/functions.js\
	      ${SRC}/tree/*.js\
	      ${SRC}/tree.js\
	      ${SRC}/rhino.js > ${RHINO}
	@@echo ${RHINO} built.

min: less
	@@echo minifying...
	@@cat ${HEADER} | sed s/@VERSION/${VERSION}/ > ${DIST_MIN}
	@@closure --js ${DIST} >> ${DIST_MIN} || uglifyjs ${DIST} >> ${DIST_MIN}

clean:
	rm -f -v dist/*

dist: clean min
	git commit -a
	git archive clean --prefix=less/ -o ${NAME}-${VERSION}.tar.gz
	#npm publish ${NAME}-${VERSION}.tar.gz

stable:
	npm tag ${NAME} ${VERSION} stable


.PHONY: test benchmark
