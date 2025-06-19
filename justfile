default:
    just --list --unsorted

ci:
    npm run test
    npm run test:integration
    npm run build

release *args:
    npm run build
    CI=true npm run semantic-release {{ args }}

tag-cleanup tag:
    git tag -d {{ tag }}
    git push origin -d {{ tag }}
