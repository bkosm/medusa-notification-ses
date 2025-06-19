import type { SentMessageInfo } from "nodemailer/lib/ses-transport"
import type { Transporter } from "nodemailer"
import { SesNotificationService } from "../adapter"
import { describe, expect, it, beforeEach, jest } from '@jest/globals'
import { newMockTransporter } from "../../../__mocks__/mockTransporter"
import { testService } from "../../../__fixtures__/testService"
import path from 'path'

// Test the addressesToArray function indirectly through the service
describe("SesNotificationService", () => {
    describe("addressesToArray", () => {
        it("handles array of mixed addresses in sender config", async () => {
            const transporter = newMockTransporter()

            transporter.sendMailReturns({ messageId: 'test-id' })

            const service = testService(transporter, {
                to: [
                    "string@example.com",
                    { name: "Object User", address: "object@example.com" }
                ]
            })

            await service.send({
                to: "recipient@example.com",
                channel: "email",
                template: "test",
                content: {
                    subject: "Test",
                    text: "Test message"
                }
            })

            expect(transporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: ["string@example.com", "object@example.com", "recipient@example.com"]
                })
            )
        })

        it("handles undefined sender config", async () => {
            const transporter = newMockTransporter()

            transporter.sendMailReturns({ messageId: 'test-id' })

            const service = testService(transporter)

            await service.send({
                to: "recipient@example.com",
                channel: "email",
                template: "test",
                content: {
                    subject: "Test",
                    text: "Test message"
                }
            })

            expect(transporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: ["recipient@example.com"]
                })
            )
        })
    })

    describe("template functionality", () => {
        const FIXTURES_DIR = path.join(__dirname, '../../../__fixtures__/templates')

        it("should send email with template rendering", async () => {
            const transporter = newMockTransporter()
            transporter.sendMailReturns({ messageId: 'test-id' })

            const service = testService(transporter, {}, {
                templatesConfig: {
                    directory: FIXTURES_DIR
                }
            })

            await service.send({
                to: "recipient@example.com",
                channel: "email",
                template: "welcome-email",
                data: {
                    firstName: "John",
                    email: "john@example.com",
                    companyName: "Test Corp",
                    hasPromo: false
                },
                content: {
                    subject: "Test"
                }
            })

            expect(transporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    html: expect.stringContaining("Welcome John!"),
                    subject: "Test"
                })
            )
        })

        it("should send email without template when no templatesConfig provided", async () => {
            const transporter = newMockTransporter()
            transporter.sendMailReturns({ messageId: 'test-id' })

            const service = testService(transporter)

            await service.send({
                to: "recipient@example.com",
                channel: "email",
                template: "welcome-email",
                data: { firstName: "John" },
                content: {
                    subject: "Test",
                    html: "<p>Raw HTML</p>"
                }
            })

            expect(transporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    html: "<p>Raw HTML</p>",
                    subject: "Test"
                })
            )
        })

        it("should throw error for non-existent template", async () => {
            const transporter = newMockTransporter()
            const service = testService(transporter, {}, {
                templatesConfig: {
                    directory: FIXTURES_DIR
                }
            })

            await expect(service.send({
                to: "recipient@example.com",
                channel: "email",
                template: "non-existent",
                data: {},
                content: {
                    subject: "Test"
                }
            })).rejects.toThrow("Template 'non-existent' not found")
        })

        it("should throw error for invalid template data", async () => {
            const transporter = newMockTransporter()
            const service = testService(transporter, {}, {
                templatesConfig: {
                    directory: FIXTURES_DIR
                }
            })

            await expect(service.send({
                to: "recipient@example.com",
                channel: "email",
                template: "welcome-email",
                data: {
                    firstName: "John"
                    // missing required fields
                },
                content: {
                    subject: "Test"
                }
            })).rejects.toThrow("Template rendering failed")
        })

        it("should use raw HTML when template is empty string", async () => {
            const transporter = newMockTransporter()
            transporter.sendMailReturns({ messageId: 'test-id' })

            const service = testService(transporter, {}, {
                templatesConfig: {
                    directory: FIXTURES_DIR
                }
            })

            await service.send({
                to: "recipient@example.com",
                channel: "email",
                template: "",
                data: {},
                content: {
                    subject: "Test",
                    html: "<p>Raw HTML</p>"
                }
            })

            expect(transporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    html: "<p>Raw HTML</p>",
                    subject: "Test"
                })
            )
        })
    })
})