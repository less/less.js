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

.PHONY: test benchmark
