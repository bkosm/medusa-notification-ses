# Medusa Provider - Notification SES

Send emails from your Medusa application through AWS Simple Email Service.
Supports SES sandbox, attachments and handlebars templates.

## Installation

```bash
npm install @bkosm/medusa-notification-ses
```

## Configuration

Register the provider in your Medusa project:

```typescript
import { LocalTemplateProvider } from '@bkosm/medusa-notification-ses'

export default defineConfig({
  modules: [
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "@bkosm/medusa-notification-ses",
            id: "notification-ses",
            options: {
              channels: ["email"],
              // Nodemailer send options, passed on each sent message
              nodemailerConfig: {
                from: "noreply@yourdomain.com",
              },
              // Use a template provider for email templates (see below)
              templateProvider: new LocalTemplateProvider("./email-templates"),
              // Enables SES sandbox mode with automatic email address verification
              sandboxConfig: {},
            },
          },
        ],
      },
    },
  ],
});
```

See the [example Medusa app](./examples/app/medusa-config.ts) how it looks in practice.

## SES Sandbox Mode

When using AWS SES in sandbox mode (common in development/staging environments), emails can only be sent to verified email addresses. This provider includes automatic email verification support that integrates seamlessly with Medusa's workflow retry mechanisms.

### Configuration

Enable sandbox mode by defining the `sandboxConfig` option.

### How Sandbox Mode Works

1. **Address Verification Check**: Before sending emails, all recipient addresses (to, cc, bcc) are checked against SES verification status
2. **Automatic Verification**: Unverified addresses automatically trigger verification emails via `VerifyEmailIdentity` API
3. **Retryable Errors**: Throws `MedusaError.Types.INVALID_DATA` for pending verifications, signaling Medusa workflows to retry

To re-request verification on every send, define `sandboxConfig.verifyOnEachSend: false` in the configuration.

## Template Providers

The provider has built-in support for handlebars templates through a pluggable provider system. Two providers are included: `LocalTemplateProvider` and `S3TemplateProvider`.

The template system uses a directory-based structure where each template ID maps to a folder containing:

1.  **`handlebars.template.html`** - Pre-compiled MJML template with Handlebars placeholders
2.  **`data.schema.json`** - JSON schema for validating template data

### `LocalTemplateProvider`

This provider loads templates from the local filesystem.

#### Configuration

```typescript
import { LocalTemplateProvider } from '@bkosm/medusa-notification-ses'

// ...
  // Path to your templates directory
  templateProvider: new LocalTemplateProvider("./email-templates"),
// ...
```

#### Example template setup

With the configuration above, your directory structure should look like this:

##### `email-templates/welcome-email/handlebars.template.html`

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Welcome to {{companyName}}</title>
  </head>
  <body>
    <h1>Welcome {{firstName}}!</h1>
    <p>
      Thank you for joining {{companyName}}. We're excited to have you on board.
    </p>
    <p>Your email address is: {{email}}</p>
    {{#if hasPromo}}
    <p>
      Use promo code <strong>{{promoCode}}</strong> for 20% off your first
      order!
    </p>
    {{/if}}
    <p>Best regards,<br />The {{companyName}} Team</p>
  </body>
</html>
```

##### `email-templates/welcome-email/data.schema.json`

```json
{
  "type": "object",
  "properties": {
    "firstName": {
      "type": "string",
      "minLength": 1
    },
    "email": {
      "type": "string",
      "format": "email"
    },
    "companyName": {
      "type": "string",
      "minLength": 1
    },
    "hasPromo": {
      "type": "boolean"
    },
    "promoCode": {
      "type": "string"
    }
  },
  "required": ["firstName", "email", "companyName"],
  "additionalProperties": false,
  "if": {
    "properties": {
      "hasPromo": { "const": true }
    }
  },
  "then": {
    "required": ["promoCode"]
  }
}
```

### `S3TemplateProvider`

This provider loads templates from an S3 bucket. This is useful for production environments where you might want to manage templates centrally without deploying new code.

#### Configuration

```typescript
import { S3TemplateProvider } from '@bkosm/medusa-notification-ses'

// ...
  templateProvider: new S3TemplateProvider({
    clientConfig: { region: 'us-east-1' }, // AWS S3 client config
    bucket: 'your-s3-bucket-name',
    prefix: 'email-templates/', // Optional prefix for your templates in the bucket
  }),
// ...
```

The S3 bucket should have the same directory structure as the local provider. For example: `s3://your-s3-bucket-name/email-templates/welcome-email/handlebars.template.html`.

### Template Processing Flow

1.  **Startup**: Templates are loaded from the configured provider and validated when the service initializes.
2.  **Runtime**: When sending emails with templates:
    -   Template ID is validated against available templates.
    -   Data is validated against the template's JSON schema.
    -   Handlebars template is rendered with provided data.
    -   Rendered HTML replaces the notification's HTML content.
3.  **Caching**: Templates are cached in memory for optimal performance.

## Usage

### Basic Email Sending

Use Medusa's notification module to send emails with raw HTML:

```typescript
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { INotificationModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const notificationService: INotificationModuleService = req.scope.resolve(
    Modules.NOTIFICATION
  );

  await notificationService.createNotifications({
    to: "customer@example.com",
    channel: "email",
    content: {
      subject: "Order Confirmed",
      text: "Your order has been confirmed",
      html: "<p>Your order has been confirmed</p>",
    },
    attachments: [
      {
        filename: "receipt.pdf",
        content: pdfBufferBase64String,
        content_type: "application/pdf",
      },
    ],
  });

  res.json({ success: true });
}
```

### Template-Based Email Sending

Send emails using pre-defined templates with dynamic data:

```typescript
await notificationService.createNotifications({
  to: "customer@example.com",
  channel: "email",
  template: "order-confirmation",
  data: {
    customerName: "John Doe",
    orderNumber: "ORD-123",
    items: [
      { name: "Product A", quantity: 2, price: 29.99 },
      { name: "Product B", quantity: 1, price: 15.5 },
    ],
    total: 75.48,
    deliveryDate: "2024-01-15",
  },
  content: {
    subject: "Order Confirmation #ORD-123",
  },
});
```

## Configuration Options

### `sesClientConfig`

AWS SES client configuration (optional). 

See the full set of options here: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-ses/Interface/SESClientConfig

### `nodemailerConfig`

Nodemailer send options (`from` is required).

See the full set of options here: https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/nodemailer/v3/index.d.ts#L104-L177
Only `subject`, `text` and `html` are substituted for runtime values at all times. Fields like `to`, `attachments` are concatenated with runtime values.

### `templateProvider`

An instance of a template provider (optional). If not provided, the templating feature is disabled. This provider is responsible for loading and caching templates.

- `LocalTemplateProvider(directory: string)`: Loads templates from the local filesystem.
- `S3TemplateProvider(config: S3TemplateProviderConfig)`: Loads templates from an S3 bucket.
  - `clientConfig`: AWS S3 client configuration.
  - `bucket`: The S3 bucket name.
  - `prefix`: An optional key prefix for the templates within the bucket.

### `sandboxConfig`

SES sandbox mode configuration (optional):

- `verifyOnEachSend` (boolean, default: false) - When true, bypasses verification cache and checks SES on every send

Disables sandbox feature if the object is not set (will fail on unverified addresses at runtime if the account uses SES sandbox).