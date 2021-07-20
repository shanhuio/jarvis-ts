.PHONY: gen css js static all fmt

LESSC=lessc --include-path=less:node_modules

all: static js

static: gen css

tsc: 
	tsc

gen: tsc
	node ./dist/gen

css:
	$(LESSC) less/style.less css/style.css

js: tsc
	node esbuild.js

fmt:
	tsfmt -r `find ./src -name "*.tsx"`
