.PHONY: patch minor major push

define release
	git add -A && \
	git commit -m "chore: bump version" && \
	git tag v$$(node -p "require('./packages/y-grid/package.json').version") && \
	git push origin main --tags
endef

patch:
	npm version patch -w @y-grid/y-grid && $(release)

minor:
	npm version minor -w @y-grid/y-grid && $(release)

major:
	npm version major -w @y-grid/y-grid && $(release)

push:
	git push origin main && git push origin --tags