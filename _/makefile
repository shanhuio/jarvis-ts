.PHONY: dist

dist:
	rm -rf dist
	mkdir -p dist/
	cp -RHL _ dist/
	rm -f jarvis.zip
	cd dist && zip -r ../jarvis.zip _ -x '*/.DS_Store'
