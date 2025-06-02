import { SESClient, SendTemplatedEmailCommandOutput } from "@aws-sdk/client-ses";
import { SesNotificationService } from "../../src/providers/ses"
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { SenderConfig } from "../../src/providers/ses/adapter";
import { NotificationTypes } from "@medusajs/framework/types";

jest.setTimeout(10_000)

type MockedSESClient = jest.Mocked<SESClient> & {
  mock: {
    send: (matcher: (params: any) => SendTemplatedEmailCommandOutput) => void
  }
}

describe("SES notification provider", () => {
  let service: SesNotificationService
  let senderConfig: SenderConfig

  let sesClient: MockedSESClient
  let notification: NotificationTypes.ProviderSendNotificationDTO

  beforeEach(() => {
    sesClient = {
      send: jest.fn(),
      mock: {
        send: (matcher: (params: any) => SendTemplatedEmailCommandOutput) => {
          sesClient.send.mockImplementation((params) => Promise.resolve(matcher(params)))
        }
      }
    } as unknown as MockedSESClient

    senderConfig = {
      Source: 'source@e.g',
      Destination: {
        ToAddresses: ['to@e.g'],
        CcAddresses: ['cc@e.g'],
        BccAddresses: ['bcc@e.g'],
      },
      Charset: 'utf-8'
    }

    service = new SesNotificationService(
      {
        logger: console as any,
      },
      { sender: senderConfig },
      sesClient,
    )

    notification = {
      to: 'someone@e.xt',
      from: 'from@e.g',
      attachments: null,
      channel: 'email',
      template: 'template',
      data: {
        key: 'value'
      },
      content: {
        subject: 'subject',
        text: 'text',
        html: 'html',
      }
    }
  })

  it("returns undefined when notification has no content", async () => {
    const result = await service.send({
      ...notification, content: null
    })

    expect(result.id).toEqual(undefined)
    expect(sesClient.send).not.toHaveBeenCalled()
  })
})
