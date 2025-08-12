# Technology Stack

## Core Technologies
- **TypeScript** - Primary language with strict configuration
- **Node.js** - Runtime (>=22 for main package, >=20 for examples)
- **Medusa v2** - E-commerce framework integration
- **AWS SDK v3** - SES and S3 client libraries

## Key Dependencies
- **@aws-sdk/client-ses** - AWS SES integration
- **@aws-sdk/client-s3** - S3 template provider
- **nodemailer** - Email sending abstraction
- **handlebars** - Template rendering engine
- **ajv** - JSON schema validation

## Build System
- **TypeScript Compiler** - Primary build tool
- **SWC** - Fast TypeScript/JavaScript transformer for Jest
- **Jest** - Testing framework with SWC transform
- **Semantic Release** - Automated versioning and publishing

## Common Commands

### Development
```bash
npm run build          # Compile TypeScript to dist/
npm run watch          # Watch mode compilation
npm run test           # Unit tests
npm run test:integration # Integration tests
```

### CI/CD
```bash
just ci                # Run full CI pipeline (test + build)
just build             # Build only
just release           # Build and publish with semantic-release
```

### Example App (Medusa)
```bash
# In examples/app/
npm run dev            # Start Medusa in development
npm run build          # Build Medusa app
npm run seed           # Seed database
npm run start          # Start production server
```

## Configuration Notes
- Uses Node16 module resolution
- Strict TypeScript settings enabled
- Decorators and metadata support for Medusa compatibility
- Source maps enabled for debugging
- Test files and mocks excluded from build output