## Project Overview

This is a Medusa notification provider for AWS SES (Simple Email Service). It enables sending emails through AWS SES using nodemailer as a transport layer.

## Development Commands

- `npm test` - Run unit tests for src directory
- `npm run test:integration` - Run integration tests with cleanup
- `npm run build` - Clean and build TypeScript to dist directory
- `npm run watch` - Watch mode for TypeScript compilation

## Architecture

The provider follows Medusa's notification provider pattern:

### Core Components

- `src/providers/ses/adapter.ts` - Main `SesNotificationService` class implementing `AbstractNotificationProviderService`
- `src/providers/ses/index.ts` - Module provider export setup
- `integration-tests/` - Integration tests with mocked nodemailer
- `src/__fixtures__` - Test helpers
- `src/__mocks__` - Test mocks
- `src/providers/ses/__tests__` - Unit tests for the provider

### Key Implementation Details

- Uses nodemailer with SES transport for email sending
- Supports SES-specific configuration through `SesNotificationServiceConfig`
- Handles attachments by mapping Medusa's attachment format to nodemailer format
- Configuration split between `sesClientConfig` (SES client config) and `nodemailerConfig` (static nodemailer options)
- Constructor accepts optional transporter parameter for dependency injection and testing
- **Template Support**: Optional email templating with Handlebars and JSON schema validation via `templatesConfig`

### Configuration Types

- `SesNotificationServiceConfig` - Main config with optional `sesClientConfig`, `nodemailerConfig`, and `templatesConfig` fields
- `NodemailerConfig` - Omits core email fields (subject, text, html) from SendMailOptions and passes them through to core nodemailer API call
- `SesClientConfig` - AWS SES client configuration directly used in the v3 SDK constructor
- `TemplatesConfig` - Template configuration with `directory` field pointing to pre-compiled template directory structure

### Template System

The provider supports optional email templating through a clean, performant architecture:

#### Template Directory Structure
```
templates/
├── welcome-email/
│   ├── handlebars.template.html    # Pre-compiled MJML template with Handlebars placeholders
│   └── data.schema.json           # JSON schema for data validation
└── order-confirmation/
    ├── handlebars.template.html
    └── data.schema.json
```

#### Template Processing Flow
1. **Initialization**: Templates loaded and validated at service startup
2. **Runtime**: When `notification.content.template` is provided:
   - Template ID validated against available templates
   - Data validated against template's JSON schema
   - Handlebars template rendered with provided data
   - Rendered HTML replaces `notification.content.html`

#### Key Features
- **Performance**: MJML pre-compilation at build time, only Handlebars rendering at runtime
- **Validation**: Comprehensive JSON schema validation prevents template rendering errors
- **Caching**: Templates and schemas cached in memory after initial load
- **Error Handling**: Clear error messages for missing templates, invalid data, and rendering failures
- **Backward Compatibility**: Templates are completely optional - existing code continues to work unchanged

### Testing Setup

- Jest with SWC transformer for TypeScript
transporter injection
- Integration tests cover email sending scenarios, error handling, and static option merging
- Unit tests focus on address handling functionality

## Key Dependencies

- `@aws-sdk/client-ses` - AWS SES SDK v3
- `@medusajs/framework` - Medusa framework types and utilities
- `nodemailer` - Email transport with SES support
- `handlebars` - Template rendering engine for email templates
- `ajv` - JSON schema validation for template data
- `ajv-formats` - Standard format validators for AJV (email, date, etc.)
