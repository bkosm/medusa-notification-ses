# Medusa Provider - Notification SES

Send emails from your Medusa application through AWS Simple Email Service using nodemailer transport.

## Installation

```bash
npm install @bkosm/medusa-notification-ses
```

## Configuration

Register the provider in your Medusa project:

```typescript
import { Modules } from "@medusajs/framework/utils"

export default defineConfig({
  modules: [
    {
      resolve: "@bkosm/medusa-notification-ses",
      key: Modules.NOTIFICATION,
      options: {
        sesClientConfig: {
          region: "us-east-1",
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
        },
        nodemailerConfig: {
          from: "noreply@yourdomain.com",
          replyTo: "support@yourdomain.com",
        },
        templatesConfig: {
          directory: "./email-templates",
        },
        sandboxConfig: {
          // Enables SES sandbox mode with automatic email verification
        },
      },
    },
  ],
})
```

## SES Sandbox Mode

When using AWS SES in sandbox mode (common in development/staging environments), emails can only be sent to verified email addresses. This provider includes automatic email verification support that integrates seamlessly with Medusa's workflow retry mechanisms.

### Configuration

Enable sandbox mode by adding the `sandboxConfig` option:

```typescript
export default defineConfig({
  modules: [
    {
      resolve: "@bkosm/medusa-notification-ses",
      key: Modules.NOTIFICATION,
      options: {
        // ... other config
        sandboxConfig: {
          // Presence of this object enables sandbox mode
        },
      },
    },
  ],
})
```

### How Sandbox Mode Works

1. **Address Verification Check**: Before sending emails, all recipient addresses (to, cc, bcc) are checked against SES verification status
2. **Automatic Verification**: Unverified addresses automatically trigger verification emails via `VerifyEmailIdentity` API
3. **Retryable Errors**: Throws `MedusaError.Types.INVALID_DATA` for pending verifications, signaling Medusa workflows to retry

### Workflow Integration

The sandbox mode is designed to work with Medusa's workflow retry system. When an email is sent to unverified addresses, the provider throws a retryable error that workflows can handle automatically.

#### Subscriber Example with Workflow

```typescript
import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

// Define the workflow for order confirmation emails
const sendOrderConfirmationWorkflow = createWorkflow(
  "send-order-confirmation",
  (input: { orderId: string }) => {
    return sendNotificationStep({
      notification: {
        to: input.customerEmail,
        channel: "email",
        template: "order-confirmation",
        data: {
          orderNumber: input.orderNumber,
          customerName: input.customerName,
          // ... other order data
        },
        content: {
          subject: `Order Confirmation #${input.orderNumber}`
        }
      }
    })
  }
)

// Configure step with appropriate retry settings for email verification
const sendNotificationStep = createStep(
  {
    name: "send-order-confirmation",
    maxRetries: 20,        // Allow more retries for user verification
    retryInterval: 60,     // Check every minute
  },
  async (input) => {
    const notificationService = input.scope.resolve(Modules.NOTIFICATION)
    return await notificationService.createNotifications(input.notification)
  }
)

// Subscriber that handles order placed events
export default async function orderPlacedHandler({ 
  event, 
  container 
}: SubscriberArgs<{ id: string }>) {
  // Execute workflow with retry handling
  await sendOrderConfirmationWorkflow(container).run({
    input: {
      orderId: event.data.id,
      // ... extract other data from order
    }
  })
}

export const config: SubscriberConfig = {
  event: ["order.placed"],
}
```

### Workflow Retry Mechanics

Medusa's workflow system provides robust retry capabilities that integrate perfectly with SES sandbox verification:

- **Automatic Retries**: Failed steps are automatically retried based on `maxRetries` configuration
- **Long-Running Workflows**: Setting `retryInterval` makes workflows run asynchronously in the background
- **Error Classification**: The provider uses `MedusaError.Types.INVALID_DATA` to signal retryable verification errors
- **Graceful Degradation**: Workflows can continue with other operations while email verification is pending
- **State Management**: Workflow state is persisted, allowing long-running verification processes

## Features

- **AWS SES Integration**: Uses SES v2 API with `SendRawEmail` for attachment support
- **Email Templates**: Optional Handlebars templating with JSON schema validation
- **SES Sandbox Mode**: Automatic email address verification for sandbox environments
- **Workflow Integration**: Seamless integration with Medusa's retry mechanisms
- **Static Configuration**: Set default `from`, `replyTo`, `cc`, `bcc` addresses and other nodemailer options
- **Address Merging**: Combines static addresses with notification-specific addresses
- **Flexible Address Formats**: Supports strings, Address objects, and arrays
- **Attachment Support**: Handles file attachments through nodemailer

## Usage

### Basic Email Sending

Use Medusa's notification module to send emails with raw HTML:

```typescript
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INotificationModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const notificationService: INotificationModuleService = req.scope.resolve(
    Modules.NOTIFICATION
  )

  await notificationService.createNotifications({
    to: "customer@example.com",
    channel: "email",
    content: {
      subject: "Order Confirmed",
      text: "Your order has been confirmed",
      html: "<p>Your order has been confirmed</p>",
    },
    attachments: [{
      filename: "receipt.pdf",
      content: pdfBuffer,
      content_type: "application/pdf",
    }],
  })

  res.json({ success: true })
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
      { name: "Product B", quantity: 1, price: 15.50 }
    ],
    total: 75.48,
    deliveryDate: "2024-01-15"
  },
  content: {
    subject: "Order Confirmation #ORD-123"
  }
})
```

## Email Templates

### Template Setup

The template system uses a directory-based structure where each template ID maps to a folder containing:

1. **`handlebars.template.html`** - Pre-compiled MJML template with Handlebars placeholders
2. **`data.schema.json`** - JSON schema for validating template data

### Directory Structure

```
email-templates/
├── welcome-email/
│   ├── handlebars.template.html
│   └── data.schema.json
├── order-confirmation/
│   ├── handlebars.template.html
│   └── data.schema.json
└── password-reset/
    ├── handlebars.template.html
    └── data.schema.json
```

### Example Template

**`email-templates/welcome-email/handlebars.template.html`**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to {{companyName}}</title>
</head>
<body>
    <h1>Welcome {{firstName}}!</h1>
    <p>Thank you for joining {{companyName}}. We're excited to have you on board.</p>
    <p>Your email address is: {{email}}</p>
    {{#if hasPromo}}
    <p>Use promo code <strong>{{promoCode}}</strong> for 20% off your first order!</p>
    {{/if}}
    <p>Best regards,<br>The {{companyName}} Team</p>
</body>
</html>
```

**`email-templates/welcome-email/data.schema.json`**
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

### Template Best Practices

1. **Pre-compile MJML**: Compile MJML to HTML at build time for better performance
2. **Validate Data**: Use comprehensive JSON schemas to catch data errors early
3. **Use Handlebars Helpers**: Leverage built-in helpers like `{{#if}}`, `{{#each}}` for dynamic content
4. **Conditional Logic**: Use JSON schema conditional validation for complex data requirements
5. **Fallback Content**: Always provide fallback text content in case HTML rendering fails
6. **Template Naming**: Use descriptive, kebab-case names for template IDs

### Build Process Integration

```bash
# Example build script to compile MJML templates
mjml email-templates-src/welcome-email/template.mjml -o email-templates/welcome-email/handlebars.template.html
mjml email-templates-src/order-confirmation/template.mjml -o email-templates/order-confirmation/handlebars.template.html
```

### Template Processing Flow

1. **Startup**: Templates are loaded and validated when the service initializes
2. **Runtime**: When sending emails with templates:
   - Template ID is validated against available templates
   - Data is validated against the template's JSON schema
   - Handlebars template is rendered with provided data
   - Rendered HTML replaces the notification's HTML content
3. **Caching**: Templates are cached in memory for optimal performance

## Configuration Options

### `sesClientConfig`
AWS SES client configuration (optional):
- `region` - AWS region
- `credentials` - AWS credentials
- Other `SESClientConfig` options

### `nodemailerConfig`
Static nodemailer options (optional):
- `from` - Default sender address
- `replyTo` - Default reply-to address  
- `cc`, `bcc` - Default carbon copy addresses
- `attachments` - Static attachments
- Other `SendMailOptions` (excluding `subject`, `text`, `html`)

### `templatesConfig`
Email template configuration (optional):
- `directory` - Path to directory containing template folders

### `sandboxConfig`
SES sandbox mode configuration (optional):
- When present (even as empty object), enables sandbox mode with automatic email verification
- Only include in development/staging environments
- Automatically handles recipient address verification and integrates with Medusa workflow retries

## License

MIT