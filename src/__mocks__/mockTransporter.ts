import type { SentMessageInfo } from "nodemailer/lib/ses-transport"
import type { Transporter } from "nodemailer"
import { jest } from '@jest/globals'

export type MockTransporter = {
    sendMail: jest.MockedFunction<Transporter['sendMail']>,
    sendMailReturns: (val: Partial<SentMessageInfo>) => void,
}

export const newMockTransporter = () => {
    let mockTransporter: MockTransporter = {
        sendMail: jest.fn(),
        sendMailReturns: (v) => {
            mockTransporter.sendMail.mockResolvedValue(v as never)
        }
    }

    return mockTransporter
}