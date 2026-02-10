.PHONY: build help

help:
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

install: package.json ## install dependencies
	npm install

start: ## start the app in development mode
	npm run dev

start-demo: ## start the app in demo mode (no database needed)
	npm run dev:demo

build: ## build the app for production
	npm run build

build-demo: ## build the app in demo mode
	npm run build:demo

serve: build ## serve the production build locally
	npm run serve

test: ## run tests
	npm test

test-ci: ## run tests in CI mode
	CI=1 npm test --if-present

lint: ## run linter and prettier
	npm run lint --if-present
	npm run prettier --if-present

typecheck: ## run TypeScript type checking
	npm run typecheck --if-present

# Developer commands for remote Supabase management
db-push: ## push migrations to remote Supabase (developers only)
	npx supabase db push

db-functions-deploy: ## deploy edge functions to remote Supabase (developers only)
	npx supabase functions deploy

# Documentation commands
doc-install:
	@(cd docs && npm install)

doc-dev:
	@(cd docs && npm run dev)

doc-build:
	@(cd docs && npm run build)

doc-preview: doc-build
	@(cd docs && npm run preview)

doc-deploy: doc-build
	@npx gh-pages -b gh-pages -d docs/dist -m "Deploy docs (clean)" --no-history --dotfiles --nojekyll

doc-reset: ## delete the gh-pages branch to start fresh
	-git branch -D gh-pages
	-git push origin --delete gh-pages
	git fetch --prune origin
	rm -rf docs/node_modules/.cache/gh-pages

# Deployment commands
app-deploy:
	@npx gh-pages -d dist -m "Deploy app" --no-history --nojekyll

# Registry commands (for shadcn/ui components)
registry-build: ## build the shadcn registry
	npm run registry:build

registry-deploy: registry-build ## deploy the shadcn registry
	@(cd public/r && npx gh-pages -b gh-pages -d ./ -s atomic-crm.json -e r -m "Deploy registry" --remove r --add --nojekyll)

registry-gen: ## generate the shadcn registry (auto-run by pre-commit hook)
	npm run registry:gen
	npx prettier --config ./.prettierrc.json --write "registry.json"
