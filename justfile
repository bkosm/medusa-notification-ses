default:
    just --list --unsorted

ci:
    npm run test
    npm run test:integration
    npm run build

release *args:
    npm run build
    CI=true npm run semantic-release {{ args }}

update-commit-to tag ref="HEAD":
    git tag -d {{ tag }}
    git tag {{ tag }} {{ ref }}
    git push -f origin {{ tag }}
