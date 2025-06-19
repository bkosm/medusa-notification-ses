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
- `src/providers/ses/sandbox.ts` - `SandboxManager` class for SES sandbox mode email verification
- `src/providers/ses/templates.ts` - `TemplateManager` class for email template rendering
- `src/providers/ses/utils.ts` - Shared utilities including error handling
- `src/providers/ses/index.ts` - Module provider export setup
- `integration-tests/` - Integration tests with mocked nodemailer and SES
- `src/__fixtures__` - Test helpers
- `src/__mocks__` - Test mocks
- `src/providers/ses/__tests__` - Unit tests for the provider

### Key Implementation Details

- Uses nodemailer with SES transport for email sending
- Supports SES-specific configuration through `SesNotificationServiceConfig`
- Handles attachments by mapping Medusa's attachment format to nodemailer format
- Configuration split between `sesClientConfig` (SES client config), `nodemailerConfig` (static nodemailer options), and `sandboxConfig` (sandbox mode)
- Constructor accepts optional transporter parameter for dependency injection and testing
- **Template Support**: Optional email templating with Handlebars and JSON schema validation via `templatesConfig`
- **Sandbox Mode**: Automatic email address verification for SES sandbox environments with Medusa workflow retry integration

### Configuration Types

- `SesNotificationServiceConfig` - Main config with optional `sesClientConfig`, `nodemailerConfig`, `templatesConfig`, and `sandboxConfig` fields
- `NodemailerConfig` - Omits core email fields (subject, text, html) from SendMailOptions and passes them through to core nodemailer API call
- `SesClientConfig` - AWS SES client configuration directly used in the v3 SDK constructor
- `TemplatesConfig` - Template configuration with `directory` field pointing to pre-compiled template directory structure
- `SandboxConfig` - Sandbox mode configuration (empty object enables sandbox mode)

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

### Sandbox System

The provider supports SES sandbox mode for development environments with automatic email verification:

#### Sandbox Architecture
- `SandboxManager` class handles email verification workflow
- Integrates with AWS SES `GetIdentityVerificationAttributes` and `VerifyEmailIdentity` APIs
- In-memory caching of verification status for performance
- Batch processing of verification checks (up to 100 addresses per API call)

#### Sandbox Processing Flow
1. **Address Extraction**: Extract recipient addresses from mailOptions (to, cc, bcc)
2. **Verification Check**: Check cached status, then query SES for unverified addresses
3. **Auto-Verification**: Start verification for unverified addresses via SES API
4. **Retryable Error**: Throw `MedusaError.Types.INVALID_DATA` for pending verifications
5. **Workflow Integration**: Medusa workflows automatically retry with `retryInterval`

### Testing Setup

- Jest with SWC transformer for TypeScript
- `aws-sdk-client-mock` for mocking SES API calls in tests
- Transporter injection for testing email sending
- Integration tests cover email sending scenarios, error handling, static option merging, and sandbox mode
- Unit tests focus on address handling functionality, template rendering, and sandbox verification logic

## Key Dependencies

- `@aws-sdk/client-ses` - AWS SES SDK v3
- `@medusajs/framework` - Medusa framework types and utilities
- `nodemailer` - Email transport with SES support
- `handlebars` - Template rendering engine for email templates
- `ajv` - JSON schema validation for template data
- `ajv-formats` - Standard format validators for AJV (email, date, etc.)

## Dev Dependencies

- `aws-sdk-client-mock` - Mock AWS SDK v3 clients for testing
- `jest` - Testing framework
- `@swc/jest` - Fast TypeScript transformation for Jest
- `typescript` - TypeScript compiler
- `rimraf` - Cross-platform file deletion for build cleanup

## TypeScript Best Practices

- Never use type assertions like `(notification as any)`, as they can introduce type safety issues and potential runtime errors
- Always read and understand type definitions before working around type issues
- Handle mixed address types properly by extracting and transforming them in dedicated functions
- Use proper type guards and validation instead of casting

## Development Guidelines

### Error Handling
- Use the shared `error()` function from `src/providers/ses/utils.ts` for consistent error formatting
- Use `MedusaError.Types.INVALID_DATA` for retryable errors that workflows should retry
- Use `MedusaError.Types.INVALID_ARGUMENT` for permanent configuration/validation errors
- Use `MedusaError.Types.UNEXPECTED_STATE` for runtime errors that shouldn't be retried

### Testing Patterns
- Mock SES clients using `aws-sdk-client-mock` for sandbox-related tests
- Mock nodemailer transporter using custom `MockTransporter` for email sending tests
- Use `testService()` fixture for consistent service instantiation in tests
- Test both positive and negative scenarios for all major features
- Include integration tests for end-to-end email sending workflows

### Code Organization
- Keep feature-specific logic in dedicated modules (`templates.ts`, `sandbox.ts`)
- Use consistent patterns across similar features (factory methods, error handling)
- Maintain backward compatibility when adding new features
- Document complex business logic and integration points
