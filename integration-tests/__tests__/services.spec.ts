import { describe, expect, it, jest } from '@jest/globals'
import { testService } from "../../src/__fixtures__/testService"
import { newMockTransporter } from "../../src/__mocks__/mockTransporter"

jest.setTimeout(10_000)

const testNotification = () => ({
    to: "someone@e.xt",
    from: "from@e.g",
    attachments: [
        {
            filename: "test.txt",
            content: "test content",
            content_type: "text/plain",
        },
    ],
    channel: "email",
    template: "template",
    data: {
        key: "value",
    },
    content: {
        subject: "subject",
        text: "text",
        html: "html",
    },
})

describe("SES notification provider", () => {
    it("throws error when notification has no content", async () => {
        const notification = testNotification()
        const transporter = newMockTransporter()

        const service = testService(transporter, {
            from: "source@e.g",
        })

        await expect(service.send({
            ...notification,
            content: null,
        })).rejects.toThrow("SesNotificationService: Notification has no content")

        expect(transporter.sendMail).not.toHaveBeenCalled()
    })

    it("sends email with correct options", async () => {
        const notification = testNotification()
        const transporter = newMockTransporter()

        transporter.sendMailReturns({ messageId: 'test-message-id' })
        
        const service = testService(transporter, {
            from: "source@e.g",
        })

        const result = await service.send(notification)

        expect(result.id).toEqual('test-message-id')
        expect(transporter.sendMail).toHaveBeenCalledWith({
            from: "from@e.g",
            to: ["someone@e.xt"],
            subject: "subject",
            text: "text",
            html: "html",
            attachments: [
                {
                    cid: undefined,
                    filename: "test.txt",
                    content: "test content",
                    contentType: "text/plain",
                    contentDisposition: undefined,
                },
            ],
        })
    })

    it("uses default from address when not provided in notification", async () => {
        const notification = testNotification()
        const transporter = newMockTransporter()

        transporter.sendMailReturns({ messageId: 'test-message-id' })

        const service = testService(transporter, {
            from: "source@e.g",
        })


        const result = await service.send({
            ...notification,
            from: undefined,
        })

        expect(result.id).toEqual('test-message-id')
        expect(transporter.sendMail).toHaveBeenCalledWith(
            expect.objectContaining({
                from: undefined,
                to: ["someone@e.xt"],
            })
        )
    })

    it("handles email sending errors", async () => {
        const notification = testNotification()
        const transporter = newMockTransporter()

        const service = testService(transporter, {
            from: "source@e.g",
        })

        transporter.sendMail.mockRejectedValueOnce(new Error("boom"))

        await expect(service.send(notification)).rejects.toThrow("SesNotificationService: Failed to send email: boom")
    })

    it("merges static to addresses with notification to", async () => {
        const notification = testNotification()
        const transporter = newMockTransporter()

        transporter.sendMailReturns({ messageId: 'test-id' })
        
        const service = testService(transporter, {
            from: "static@example.com",
            to: ["static1@example.com", "static2@example.com"]
        })

        await service.send(notification)

        expect(transporter.sendMail).toHaveBeenCalledWith(
            expect.objectContaining({
                to: ["static1@example.com", "static2@example.com", "someone@e.xt"]
            })
        )
    })

    it("merges static cc addresses with notification", async () => {
        const notification = testNotification()
        const transporter = newMockTransporter()

        transporter.sendMailReturns({ messageId: 'test-id' })
        
        const service = testService(transporter, {
            from: "static@example.com",
            cc: ["cc1@example.com", "cc2@example.com"]
        })

        await service.send(notification)

        expect(transporter.sendMail).toHaveBeenCalledWith(
            expect.objectContaining({
                cc: ["cc1@example.com", "cc2@example.com"]
            })
        )
    })

    it("merges static bcc addresses with notification", async () => {
        const notification = testNotification()
        const transporter = newMockTransporter()

        transporter.sendMailReturns({ messageId: 'test-id' })
        
        const service = testService(transporter, {
            from: "static@example.com",
            bcc: "bcc@example.com"
        })

        await service.send(notification)

        expect(transporter.sendMail).toHaveBeenCalledWith(
            expect.objectContaining({
                bcc: "bcc@example.com"
            })
        )
    })

    it("uses static replyTo address", async () => {
        const notification = testNotification()
        const transporter = newMockTransporter()

        transporter.sendMailReturns({ messageId: 'test-id' })
        
        const service = testService(transporter, {
            from: "static@example.com",
            replyTo: "noreply@example.com"
        })

        await service.send(notification)

        expect(transporter.sendMail).toHaveBeenCalledWith(
            expect.objectContaining({
                replyTo: "noreply@example.com"
            })
        )
    })

    it("merges static attachments with notification attachments", async () => {
        const notification = testNotification()
        const transporter = newMockTransporter()

        transporter.sendMailReturns({ messageId: 'test-id' })
        
        const service = testService(transporter, {
            from: "static@example.com",
            attachments: [
                {
                    filename: "static.pdf",
                    content: "static content",
                    contentType: "application/pdf"
                }
            ]
        })

        await service.send(notification)

        expect(transporter.sendMail).toHaveBeenCalledWith(
            expect.objectContaining({
                attachments: [
                    {
                        filename: "static.pdf",
                        content: "static content",
                        contentType: "application/pdf"
                    },
                    {
                        cid: undefined,
                        filename: "test.txt",
                        content: "test content",
                        contentType: "text/plain",
                        contentDisposition: undefined,
                    }
                ]
            })
        )
    })

    it("handles mixed address types in static to field", async () => {
        const notification = testNotification()
        const transporter = newMockTransporter()

        transporter.sendMailReturns({ messageId: 'test-id' })
        
        const service = testService(transporter, {
            from: "static@example.com",
            to: [
                "string@example.com",
                { name: "Test User", address: "object@example.com" }
            ]
        })

        await service.send(notification)

        expect(transporter.sendMail).toHaveBeenCalledWith(
            expect.objectContaining({
                to: ["string@example.com", "object@example.com", "someone@e.xt"]
            })
        )
    })

    it("preserves other static nodemailer options", async () => {
        const notification = testNotification()
        const transporter = newMockTransporter()

        transporter.sendMailReturns({ messageId: 'test-id' })
        
        const service = testService(transporter, {
            from: "static@example.com",
            priority: "high",
            headers: {
                "X-Custom-Header": "test-value"
            }
        })

        await service.send(notification)

        expect(transporter.sendMail).toHaveBeenCalledWith(
            expect.objectContaining({
                priority: "high",
                headers: {
                    "X-Custom-Header": "test-value"
                }
            })
        )
    })
})
