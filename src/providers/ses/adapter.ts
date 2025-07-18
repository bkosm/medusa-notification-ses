import {
    Logger,
    NotificationTypes,
} from "@medusajs/framework/types"
import {
    AbstractNotificationProviderService,
} from "@medusajs/framework/utils"
import { SESClient, SESClientConfig, SendRawEmailCommand } from "@aws-sdk/client-ses"
import { CheckOptionalClientConfig } from "@smithy/types"
import * as nodemailer from "nodemailer"
import type { Transporter, SendMailOptions } from "nodemailer"
import type { Attachment as NodemailerAttachment } from "nodemailer/lib/mailer"
import type { SentMessageInfo } from "nodemailer/lib/ses-transport"

import { TemplateManager } from "./templates"
import { SandboxManager, SandboxConfig } from "./sandbox"
import { addressesToArray, providerError } from "./utils"
import { TemplateProvider } from "./template-providers"

export type InjectedDependencies = {
    logger: Logger
}

type SafeOmit<T, K extends keyof T> = Omit<T, K>

export type NodemailerConfig = SafeOmit<SendMailOptions,
    | 'subject'
    | 'text'
    | 'html'
> & {
    from: string
}

export type SesClientConfig = NonNullable<CheckOptionalClientConfig<SESClientConfig>[0]>

export type SesNotificationServiceConfig = {
    nodemailerConfig: NodemailerConfig
    sesClientConfig?: SesClientConfig
    templateProvider?: TemplateProvider
    sandboxConfig?: SandboxConfig
}

export class SesNotificationService extends AbstractNotificationProviderService {
    static identifier = "notification-ses"
    
    templateManager: TemplateManager | null
    sandboxManager: SandboxManager | null

    constructor(
        // @ts-ignore
        public _deps: InjectedDependencies,
        public config: SesNotificationServiceConfig,
        public sesClient: SESClient = new SESClient(config?.sesClientConfig ?? []),
        public transporter: Transporter<SentMessageInfo> = nodemailer.createTransport({
            SES: { ses: sesClient, aws: { SendRawEmailCommand } }
        })
    ) {
        super()
        this.templateManager = TemplateManager.create(config.templateProvider)
        this.sandboxManager = SandboxManager.create(config.sandboxConfig, sesClient)
    }

    async send(
        notification: NotificationTypes.ProviderSendNotificationDTO
    ): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
        if (!notification) {
            throw providerError(
                'INVALID_ARGUMENT',
                `Notification is not defined`
            )
        }

        if (notification.channel !== 'email') {
            throw providerError(
                'INVALID_ARGUMENT',
                `Notification is for channel email, got ${notification.channel}`
            )
        }

        if (!notification.content) {
            throw providerError(
                'INVALID_DATA',
                `Notification has no content`
            )
        }

        let {
            subject,
            text,
            html,
        } = notification.content


        const { template: templateId, data } = notification

        if (this.templateManager && templateId) {
            if (!await this.templateManager.hasTemplate(templateId)) {
                throw providerError('INVALID_ARGUMENT', `Template '${templateId}' not found`)
            }

            try {
                html = await this.templateManager.renderTemplate(templateId, data)
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : 'unknown'
                throw providerError('UNEXPECTED_STATE', `Template rendering failed: ${message}`)
            }
        }

        const staticOptions = this.config.nodemailerConfig

        const dynamicAttachments = notification.attachments?.map<NodemailerAttachment>(at => ({
            cid: at.id,
            filename: at.filename,
            content: at.content,
            contentType: at.content_type,
            encoding: 'base64',
            contentDisposition: (at.disposition as NodemailerAttachment['contentDisposition']),
        })) ?? []

        let mailOptions: SendMailOptions = {
            ...(staticOptions ?? {}),
            // notification.from is permanently undefined in Medusa v2
            from: notification.from ?? staticOptions?.from,
            to: addressesToArray([staticOptions?.to, notification.to]),
            subject,
            text,
            html,
            attachments: [...(staticOptions?.attachments ?? []), ...dynamicAttachments],
        }

        // Sandbox verification check - only verify recipient addresses
        if (this.sandboxManager) {
            await this.sandboxManager.checkAndVerifyAddresses([
                mailOptions.to,
                mailOptions.cc,
                mailOptions.bcc
            ])
        }

        try {
            const response = await this.transporter.sendMail(mailOptions)
            return { id: response.messageId }
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'unknown'
            throw providerError('UNEXPECTED_STATE', `Failed to send email: ${message}`)
        }
    }
}
