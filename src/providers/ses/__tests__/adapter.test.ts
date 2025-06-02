import type { SentMessageInfo } from "nodemailer/lib/ses-transport"
import type { Transporter } from "nodemailer"
import { SesNotificationService } from "../adapter"
import { describe, expect, it, beforeEach, jest } from '@jest/globals'
import { newMockTransporter } from "../../../__mocks__/mockTransporter"
import { testService } from "../../../__fixtures__/testService"

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
})