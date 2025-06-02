# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Medusa notification provider for AWS SES (Simple Email Service). It enables sending emails through AWS SES using nodemailer as a transport layer, with support for attachments via SES v2 API's `SendRawEmail` method.

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

### Key Implementation Details

- Uses nodemailer with SES transport for email sending
- Supports SES-specific configuration through `SesNotificationServiceConfig`
- Handles attachments by mapping Medusa's attachment format to nodemailer format
- Configuration split between `sesClientConfig` (SES client config) and `nodemailerConfig` (static nodemailer options)
- Service identifier: `"notification-ses"`
- Constructor accepts optional transporter parameter for dependency injection and testing
- Address handling via `addressesToArray` and `addressToArray` functions supporting string, Address objects, and arrays
- Returns message ID from successful sends via `response.messageId`

### Configuration Types

- `SesNotificationServiceConfig` - Main config with optional `sesClientConfig` and `nodemailerConfig` fields
- `NodemailerConfig` - Omits core email fields (subject, text, html) from SendMailOptions using SafeOmit
- `SesClientConfig` - AWS SES client configuration

### Testing Setup

- Jest with SWC transformer for TypeScript
- Structured test utilities in `src/__fixtures__/testService.ts` and `src/__mocks__/mockTransporter.ts`
- No external nodemailer mock files - uses direct transporter injection
- Integration tests cover email sending scenarios, error handling, and static option merging
- Unit tests focus on address handling functionality
- Mock transporter pattern allows clean, isolated testing without complex mocking setup

### Address Handling

The `addressesToArray` function handles multiple address formats:
- Single strings: `"user@example.com"`
- Address objects: `{ name: "User", address: "user@example.com" }`
- Arrays of mixed types: `["user1@example.com", { name: "User2", address: "user2@example.com" }]`
- Undefined/null values are filtered out

Static addresses from `nodemailerConfig` are merged with notification addresses, with static addresses appearing first in the final array.

## Key Dependencies

- `@aws-sdk/client-ses` - AWS SES SDK v3
- `@medusajs/framework` - Medusa framework types and utilities
- `nodemailer` - Email transport with SES support