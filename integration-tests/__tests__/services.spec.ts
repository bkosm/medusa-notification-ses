import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { testService } from "../../src/__fixtures__/testService"
import { newMockTransporter } from "../../src/__mocks__/mockTransporter"
import { SESClient, GetIdentityVerificationAttributesCommand, VerifyEmailIdentityCommand, VerifyEmailIdentityCommandInput, GetIdentityVerificationAttributesCommandInput } from '@aws-sdk/client-ses'
import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { mockClient } from 'aws-sdk-client-mock'
import { MedusaError } from '@medusajs/framework/utils'
import path from 'path'
import { LocalTemplateProvider } from '../../src/providers/ses/local-template-provider'
import { S3TemplateProvider } from '../../src/providers/ses/s3-template-provider'
import type { StreamingBlobPayloadOutputTypes } from '@smithy/types'

const sesMock = mockClient(SESClient)
const s3Mock = mockClient(S3Client)

jest.setTimeout(10_000)

beforeEach(() => {
    sesMock.reset()
    s3Mock.reset()
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

    describe("Local Template Provider Integration", () => {
        const FIXTURES_DIR = path.join(__dirname, '../../src/__fixtures__/templates')

        it('should fail fast given invalid configuration', async () => {
            await expect(async () => {
                const service = testService(
                    newMockTransporter(),
                    {
                        from: "",
                    },
                    {
                        templateProvider: new LocalTemplateProvider('./reserved-invalid-dir')
                    }
                )

                await service.templateManager?.endInit()
            }).rejects.toThrow("Templates directory does not exist: ./reserved-invalid-dir")
        })

        it("should render template from local provider", async () => {
            const notification = testNotification()
            const transporter = newMockTransporter()
            transporter.sendMailReturns({ messageId: 'test-id' })

            const service = testService(transporter, {
                from: "source@e.g",
            }, {
                templateProvider: new LocalTemplateProvider(FIXTURES_DIR)
            })

            await service.send({
                ...notification,
                template: "welcome-email",
                data: {
                    firstName: "John",
                    email: "john@example.com",
                    companyName: "Test Corp",
                    hasPromo: false
                },
                content: {
                    subject: "Welcome Email"
                }
            })

            expect(transporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    html: expect.stringContaining("Welcome John!"),
                    subject: "Welcome Email"
                })
            )
        })

        it("should throw error if local template not found", async () => {
            const notification = testNotification()
            const transporter = newMockTransporter()

            const service = testService(transporter, {
                from: "source@e.g",
            }, {
                templateProvider: new LocalTemplateProvider(FIXTURES_DIR)
            })

            await expect(service.send({
                ...notification,
                template: "non-existent-template",
                data: {},
                content: {
                    subject: "Test"
                }
            })).rejects.toThrow("SesNotificationService: Template 'non-existent-template' not found")
        })
    })

    describe("S3 Template Provider Integration", () => {
        const S3_BUCKET = 'test-bucket'
        const S3_PREFIX = 'templates/'

        beforeEach(() => {
            s3Mock.on(ListObjectsV2Command).resolves({ CommonPrefixes: [{ Prefix: S3_PREFIX + 'welcome-email/' }] })
            s3Mock.on(GetObjectCommand, { Key: S3_PREFIX + 'welcome-email/handlebars.template.html' }).resolves({ Body: { transformToString: () => Promise.resolve('S3 Template Content: Welcome {{firstName}}!') } as StreamingBlobPayloadOutputTypes })
            s3Mock.on(GetObjectCommand, { Key: S3_PREFIX + 'welcome-email/data.schema.json' }).resolves({ Body: { transformToString: () => Promise.resolve(JSON.stringify({ type: 'object', properties: { firstName: { type: 'string' } }, required: ['firstName'], additionalProperties: false })) } as StreamingBlobPayloadOutputTypes })
        })

        it("should render template from S3 provider", async () => {
            const notification = testNotification()
            const transporter = newMockTransporter()
            transporter.sendMailReturns({ messageId: 'test-id' })

            const service = testService(transporter, {
                from: "source@e.g",
            }, {
                templateProvider: new S3TemplateProvider({
                    clientConfig: { region: 'us-east-1' },
                    bucket: S3_BUCKET,
                    prefix: S3_PREFIX
                })
            })

            await service.send({
                ...notification,
                template: "welcome-email",
                data: {
                    firstName: "John",
                },
                content: {
                    subject: "S3 Welcome Email"
                }
            })

            expect(transporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    html: expect.stringContaining("S3 Template Content: Welcome John!"),
                    subject: "S3 Welcome Email"
                })
            )
        })

        it("should throw error if S3 template not found", async () => {
            const notification = testNotification()
            const transporter = newMockTransporter()
            transporter.sendMailReturns({ messageId: 'test-id' })

            const service = testService(transporter, {
                from: "source@e.g",
            }, {
                templateProvider: new S3TemplateProvider({
                    clientConfig: { region: 'us-east-1' },
                    bucket: S3_BUCKET,
                    prefix: S3_PREFIX
                })
            })

            await expect(service.send({
                ...notification,
                template: "non-existent-s3-template",
                data: {},
                content: {
                    subject: "Test"
                }
            })).rejects.toThrow("SesNotificationService: Template 'non-existent-s3-template' not found")
        })

        it("should throw error if S3 template data validation fails", async () => {
            // Mock S3 to return a template but with a schema that requires 'firstName'
            s3Mock.on(ListObjectsV2Command).resolves({ CommonPrefixes: [{ Prefix: S3_PREFIX + 'welcome-email/' }] })
            s3Mock.on(GetObjectCommand, { Key: S3_PREFIX + 'welcome-email/handlebars.template.html' }).resolves({ Body: { transformToString: () => Promise.resolve('S3 Template Content: Welcome {{firstName}}!') } as StreamingBlobPayloadOutputTypes })
            s3Mock.on(GetObjectCommand, { Key: S3_PREFIX + 'welcome-email/data.schema.json' }).resolves({ Body: { transformToString: () => Promise.resolve(JSON.stringify({ type: 'object', properties: { firstName: { type: 'string' } }, required: ['firstName'], additionalProperties: false })) } as StreamingBlobPayloadOutputTypes })

            const notification = testNotification()
            const transporter = newMockTransporter()

            const service = testService(transporter, {
                from: "source@e.g",
            }, {
                templateProvider: new S3TemplateProvider({
                    clientConfig: { region: 'us-east-1' },
                    bucket: S3_BUCKET,
                    prefix: S3_PREFIX
                })
            })

            await expect(service.send({
                ...notification,
                template: "welcome-email",
                data: { /* missing firstName */ },
                content: {
                    subject: "Test"
                }
            })).rejects.toThrow(/Template data validation failed for 'welcome-email': root: must have required property 'firstName'/)
        })
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
