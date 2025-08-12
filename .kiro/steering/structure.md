# Project Structure

## Root Level Organization
```
├── src/                    # Main source code
├── examples/app/           # Example Medusa application
├── integration-tests/      # Integration test suite
├── dist/                   # Compiled output (generated)
└── .kiro/                  # Kiro configuration and steering
```

## Source Code Structure (`src/`)
```
src/
├── providers/ses/          # Main SES provider implementation
│   ├── adapter.ts          # Core notification service adapter
│   ├── sandbox.ts          # SES sandbox mode handling
│   ├── templates.ts        # Template management system
│   ├── utils.ts            # Utility functions
│   ├── index.ts            # Module provider export
│   └── template-providers/ # Template provider implementations
│       ├── local.ts        # Local filesystem provider
│       ├── s3.ts           # S3 bucket provider
│       └── interface.ts    # Provider interface definition
├── __fixtures__/           # Test fixtures and sample templates
└── __mocks__/              # Jest mocks
```

## Key Architectural Patterns

### Module Provider Pattern
- Main entry point exports Medusa `ModuleProvider`
- Service classes follow Medusa's dependency injection pattern
- Configuration through options object

### Template Provider System
- Pluggable template providers via interface
- Directory-based template structure:
  ```
  template-id/
  ├── handlebars.template.html  # Handlebars template
  └── data.schema.json          # JSON schema validation
  ```

### Testing Structure
- Unit tests co-located with source files (`.test.ts`)
- Integration tests in separate directory
- Mocks and fixtures in dedicated directories
- SWC transformer for fast test execution

## Example Application (`examples/app/`)
- Full Medusa v2 application demonstrating plugin usage
- Docker Compose setup with PostgreSQL
- Sample email templates and configurations
- Integration test examples

## Export Structure
- Main export: `./dist/index.js`
- Template providers: `./dist/template-providers/index.js`
- TypeScript declarations included for both exports

## Configuration Files
- `tsconfig.json` - TypeScript compilation settings
- `jest.config.js` - Test configuration with SWC
- `justfile` - Task runner for common operations
- `.releaserc.json` - Semantic release configuration