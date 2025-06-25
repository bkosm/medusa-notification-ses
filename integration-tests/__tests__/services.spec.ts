import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { testService } from "../../src/__fixtures__/testService"
import { newMockTransporter } from "../../src/__mocks__/mockTransporter"
import { SESClient, GetIdentityVerificationAttributesCommand, VerifyEmailIdentityCommand, VerifyEmailIdentityCommandInput, GetIdentityVerificationAttributesCommandInput } from '@aws-sdk/client-ses'
import { mockClient } from 'aws-sdk-client-mock'
import { MedusaError } from '@medusajs/framework/utils'

const sesMock = mockClient(SESClient)

jest.setTimeout(10_000)

beforeEach(() => {
    sesMock.reset()
})

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
                    encoding: 'base64'
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
                from: "source@e.g",
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
                        encoding: 'base64'
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

    describe("Sandbox Mode", () => {
        it("should send email normally when sandbox is disabled", async () => {
            const notification = testNotification()
            const transporter = newMockTransporter()
            const sesClient = new SESClient({})

            transporter.sendMailReturns({ messageId: 'test-message-id' })

            const service = testService(transporter, {
                from: "source@e.g",
            }, undefined, sesClient)

            const result = await service.send(notification)

            expect(result.id).toEqual('test-message-id')
            expect(transporter.sendMail).toHaveBeenCalled()
            expect(sesMock.calls()).toHaveLength(0) // No SES verification calls
        })

        it("should verify addresses and send when all are verified", async () => {
            const notification = testNotification()
            const transporter = newMockTransporter()
            const sesClient = new SESClient({})

            transporter.sendMailReturns({ messageId: 'test-message-id' })
            sesMock.on(GetIdentityVerificationAttributesCommand).resolves({
                VerificationAttributes: {
                    'someone@e.xt': { VerificationStatus: 'Success' }
                }
            })

            const service = testService(transporter, {
                from: "source@e.g",
            }, {
                sandboxConfig: {}
            }, sesClient)

            const result = await service.send(notification)

            expect(result.id).toEqual('test-message-id')
            expect(transporter.sendMail).toHaveBeenCalled()
            expect(sesMock.calls()).toHaveLength(1)
        })

        it("should throw retryable error when addresses are unverified", async () => {
            const notification = testNotification()
            const transporter = newMockTransporter()
            const sesClient = new SESClient({})

            sesMock.on(GetIdentityVerificationAttributesCommand).resolves({
                VerificationAttributes: {
                    'someone@e.xt': { VerificationStatus: 'Pending' }
                }
            })
            sesMock.on(VerifyEmailIdentityCommand).resolves({})

            const service = testService(transporter, {
                from: "source@e.g",
            }, {
                sandboxConfig: {}
            }, sesClient)

            await expect(service.send(notification)).rejects.toThrow(MedusaError)
            expect(transporter.sendMail).not.toHaveBeenCalled()

            // Should check verification status and start verification
            const calls = sesMock.calls()
            expect(calls).toHaveLength(2)
            expect(calls[0].args[0].constructor.name).toBe('GetIdentityVerificationAttributesCommand')
            expect(calls[1].args[0].constructor.name).toBe('VerifyEmailIdentityCommand')
        })

        it("should verify all recipient addresses (to, cc, bcc)", async () => {
            const notification = {
                ...testNotification(),
                cc: "cc@example.com",
                bcc: "bcc@example.com"
            }
            const transporter = newMockTransporter()
            const sesClient = new SESClient({})

            transporter.sendMailReturns({ messageId: 'test-message-id' })
            sesMock.on(GetIdentityVerificationAttributesCommand).resolves({
                VerificationAttributes: {
                    'someone@e.xt': { VerificationStatus: 'Success' },
                    'cc@example.com': { VerificationStatus: 'Success' },
                    'bcc@example.com': { VerificationStatus: 'Success' }
                }
            })

            const service = testService(transporter, {
                from: "source@e.g",
            }, {
                sandboxConfig: {}
            }, sesClient)

            await service.send(notification)

            const calls = sesMock.calls()
            expect((calls[0].args[0].input as GetIdentityVerificationAttributesCommandInput).Identities).toContain('someone@e.xt')
        })

        it("should handle mixed verified and unverified addresses", async () => {
            const notification = {
                ...testNotification(),
                cc: "verified@example.com"
            }
            const transporter = newMockTransporter()
            const sesClient = new SESClient({})

            sesMock.on(GetIdentityVerificationAttributesCommand).resolves({
                VerificationAttributes: {
                    'someone@e.xt': { VerificationStatus: 'Pending' },
                    'verified@example.com': { VerificationStatus: 'Success' }
                }
            })
            sesMock.on(VerifyEmailIdentityCommand).resolves({})

            const service = testService(transporter, {
                from: "source@e.g",
            }, {
                sandboxConfig: {}
            }, sesClient)

            await expect(service.send(notification)).rejects.toThrow(
                'Email verification pending for sandbox mode: someone@e.xt'
            )

            // Should only verify the unverified address
            const verifyCalls = sesMock.calls().filter(call =>
                call.args[0].constructor.name === 'VerifyEmailIdentityCommand'
            )
            expect(verifyCalls).toHaveLength(1)
            expect((verifyCalls[0].args[0].input as VerifyEmailIdentityCommandInput).EmailAddress).toBe('someone@e.xt')
        })

        it("should handle SES API errors gracefully", async () => {
            const notification = testNotification()
            const transporter = newMockTransporter()
            const sesClient = new SESClient({})

            sesMock.on(GetIdentityVerificationAttributesCommand).rejects(
                new Error('SES API Error')
            )

            const service = testService(transporter, {
                from: "source@e.g",
            }, {
                sandboxConfig: {}
            }, sesClient)

            await expect(service.send(notification)).rejects.toThrow(
                'Failed to check email verification status'
            )
        })

        it("should bypass cache when verifyOnEachSend is true", async () => {
            const notification = testNotification()
            const transporter = newMockTransporter()
            const sesClient = new SESClient({})

            transporter.sendMailReturns({ messageId: 'test-message-id' })
            sesMock.on(GetIdentityVerificationAttributesCommand).resolves({
                VerificationAttributes: {
                    'someone@e.xt': { VerificationStatus: 'Success' }
                }
            })

            const service = testService(transporter, {
                from: "source@e.g",
            }, {
                sandboxConfig: { verifyOnEachSend: true }
            }, sesClient)

            // First send
            await service.send(notification)
            expect(sesMock.calls()).toHaveLength(1)

            // Second send should make another verification call (no cache)
            await service.send(notification)
            expect(sesMock.calls()).toHaveLength(2)
        })

        it("should use cache when verifyOnEachSend is false or undefined", async () => {
            const notification = testNotification()
            const transporter = newMockTransporter()
            const sesClient = new SESClient({})

            transporter.sendMailReturns({ messageId: 'test-message-id' })
            sesMock.on(GetIdentityVerificationAttributesCommand).resolves({
                VerificationAttributes: {
                    'someone@e.xt': { VerificationStatus: 'Success' }
                }
            })

            const service = testService(transporter, {
                from: "source@e.g",
            }, {
                sandboxConfig: { verifyOnEachSend: false }
            }, sesClient)

            // First send
            await service.send(notification)
            expect(sesMock.calls()).toHaveLength(1)

            // Second send should use cache (no additional API call)
            await service.send(notification)
            expect(sesMock.calls()).toHaveLength(1)
        })
    })
})
