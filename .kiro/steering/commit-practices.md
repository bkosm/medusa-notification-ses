# Commit Message Best Practices

This repository follows **Conventional Commits** specification for consistent and semantic commit messages.

## Structure
```
<type>(<scope>): <description>

[optional body with detailed explanations]
```

## Types
- `feat:` - New features or functionality
- `fix:` - Bug fixes and corrections
- `chore:` - Maintenance tasks, dependencies, tooling
- `docs:` - Documentation updates
- `test:` - Adding or updating tests
- `refactor:` - Code refactoring without feature changes
- `perf:` - Performance improvements
- `style:` - Code style changes (formatting, etc.)
- `ci:` - CI/CD pipeline changes
- `build:` - Build system or external dependencies

## Common Scopes
- `ci:` - CI/CD workflows and automation
- `docs:` - Documentation files
- `adapter:` - Core SES adapter functionality
- `sandbox:` - SES sandbox mode features
- `templates:` - Template system components
- `providers:` - Template provider implementations
- `release:` - Release automation and versioning
- `*:` - Multiple areas affected

## Description Guidelines
- Use imperative mood ("add" not "added" or "adds")
- Start with lowercase letter
- No period at the end
- Keep under 50 characters for the subject line
- Be specific and descriptive

## Body Guidelines
- Use bullet points for multiple changes
- Explain the "what" and "why", not the "how"
- Reference issues/PRs when relevant
- Keep lines under 72 characters

## Examples from Repository
```bash
# Feature additions
feat: ci: convert Claude workflows to manual triggers
feat: *: rearrange template providers into subpackage
feat: expose everything by default

# Bug fixes
fix: docs: one more update
fix: adapter: tidy
fix: sandbox: cleanup
fix: s3templates: cleanup the interface

# Breaking changes
feat!: local template provider gets single object as options

# Maintenance
chore(release): 1.1.0 [skip ci]
```

## Breaking Changes
- Use `!` after type/scope for breaking changes: `feat!:`
- Explain the breaking change in the body
- Consider semantic versioning impact

## Special Markers
- `[skip ci]` - Skip CI pipeline execution
- `[WIP]` - Work in progress (avoid in main branch)

## Quick Reference
When committing changes, ask yourself:
1. What type of change is this?
2. What area/scope does it affect?
3. What does this change accomplish?
4. Is this a breaking change?