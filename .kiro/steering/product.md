# Product Overview

This is a Medusa notification provider plugin that enables email sending through AWS Simple Email Service (SES). The plugin provides:

- **Email delivery** via AWS SES with Nodemailer integration
- **Template system** supporting Handlebars templates with JSON schema validation
- **SES sandbox support** with automatic email verification for development environments
- **Multiple template providers** (local filesystem and S3)
- **Attachment support** for email attachments

The plugin is designed as a drop-in notification provider for Medusa v2 e-commerce applications, following Medusa's module provider pattern. It's published as an npm package `@bkosm/medusa-notification-ses` and supports both development (sandbox) and production environments.

Key features include automatic retry mechanisms for unverified email addresses in sandbox mode, template caching for performance, and comprehensive configuration options for AWS SES integration.