all: clean
	@echo "Building less.js:"
	make -C .. min

	@echo

	@echo "Building test-relative-paths:"
	../bin/lessc static/less/main.less static/css/main.css

clean:
	@echo "Cleaning up test-relative-paths:"
	rm -f static/css/main.css
