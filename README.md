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
      },
    },
  ],
})
```

## Features

- **AWS SES Integration**: Uses SES v2 API with `SendRawEmail` for attachment support
- **Static Configuration**: Set default `from`, `replyTo`, `cc`, `bcc` addresses and other nodemailer options
- **Address Merging**: Combines static addresses with notification-specific addresses
- **Flexible Address Formats**: Supports strings, Address objects, and arrays
- **Attachment Support**: Handles file attachments through nodemailer

## Usage

After registering the provider, use Medusa's notification module to create and send emails:

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

## License

MIT