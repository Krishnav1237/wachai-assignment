.PHONY: install build test demo clean

install:
	npm install

build:
	npm run build

test:
	npx vitest run

demo:
	npx ts-node scripts/demo.ts

clean:
	rm -rf dist
	rm -rf node_modules
