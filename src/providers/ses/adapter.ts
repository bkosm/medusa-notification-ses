import {
    Logger,
    NotificationTypes,
} from "@medusajs/framework/types"
import {
    AbstractNotificationProviderService,
} from "@medusajs/framework/utils"

import { SESClient, SESClientConfig } from "@aws-sdk/client-ses"
import { CheckOptionalClientConfig } from "@smithy/types"
import * as nodemailer from "nodemailer"
import type { Transporter, SendMailOptions } from "nodemailer"
import type { Address, Attachment as NodemailerAttachment } from "nodemailer/lib/mailer"
import type { SentMessageInfo } from "nodemailer/lib/ses-transport"

import { TemplateManager, TemplatesConfig } from "./templates"
import { SandboxManager, SandboxConfig } from "./sandbox"
import { error } from "./utils"

type InjectedDependencies = {
    logger: Logger
}

type SafeOmit<T, K extends keyof T> = Omit<T, K>

export type NodemailerConfig = SafeOmit<SendMailOptions,
    | 'subject'
    | 'text'
    | 'html'
>

export type SesClientConfig = CheckOptionalClientConfig<SESClientConfig>

export type SesNotificationServiceConfig = {
    sesClientConfig?: SesClientConfig
    nodemailerConfig?: NodemailerConfig
    templatesConfig?: TemplatesConfig
    sandboxConfig?: SandboxConfig
}

export class SesNotificationService extends AbstractNotificationProviderService {
    static identifier = "notification-ses"

    protected config_: SesNotificationServiceConfig
    protected logger_: Logger
    protected transporter_: Transporter<SentMessageInfo>
    protected templateManager_: TemplateManager | null
    protected sandboxManager_: SandboxManager | null

    constructor(
        { logger }: InjectedDependencies,
        options: SesNotificationServiceConfig,
        sesClient: SESClient = new SESClient(options?.sesClientConfig ?? {}),
        transporter: Transporter<SentMessageInfo> = nodemailer.createTransport({
            SES: { ses: sesClient }
        })
    ) {
        super()
        this.config_ = options
        this.logger_ = logger
        this.transporter_ = transporter
        this.templateManager_ = TemplateManager.create(options.templatesConfig)
        this.sandboxManager_ = SandboxManager.create(options.sandboxConfig, sesClient)
    }

    async send(
        notification: NotificationTypes.ProviderSendNotificationDTO
    ): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
        if (!notification) {
            throw error(
                'INVALID_ARGUMENT',
                `Notification is not defined`
            )
        }

        if (notification.channel !== 'email') {
            throw error(
                'INVALID_ARGUMENT',
                `Notification is for channel email, got ${notification.channel}`
            )
        }

        if (!notification.content) {
            throw error(
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

        if (this.templateManager_ && templateId !== "") {
            if (!this.templateManager_.hasTemplate(templateId)) {
                throw error('INVALID_ARGUMENT', `Template '${templateId}' not found`)
            }

            try {
                html = this.templateManager_.renderTemplate(templateId, data)
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : 'unknown'
                throw error('UNEXPECTED_STATE', `Template rendering failed: ${message}`)
            }
        }

        const staticOptions = this.config_.nodemailerConfig

        const dynamicAttachments = notification.attachments?.map<NodemailerAttachment>(at => ({
            cid: at.id,
            filename: at.filename,
            content: at.content,
            contentType: at.content_type,
            contentDisposition: (at.disposition as NodemailerAttachment['contentDisposition']),
        })) ?? []

        let mailOptions: SendMailOptions = {
            ...(staticOptions ?? {}),
            from: notification.from ?? undefined,
            to: addressesToArray([staticOptions?.to, notification.to]),
            subject,
            text,
            html,
            attachments: [...(staticOptions?.attachments ?? []), ...dynamicAttachments],
        }

        // Sandbox verification check - only verify recipient addresses
        if (this.sandboxManager_) {
            await this.sandboxManager_.checkAndVerifyAddresses([
                mailOptions.to,
                mailOptions.cc, 
                mailOptions.bcc
            ])
        }

        try {
            const response = await this.transporter_.sendMail(mailOptions)
            return { id: response.messageId }
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'unknown'
            throw error('UNEXPECTED_STATE', `Failed to send email: ${message}`)
        }
    }
}

type AddressLike = string | Address | Array<string | Address> | undefined;

function addressesToArray(addressLikes: AddressLike[]): string[] {
    return addressLikes.flatMap(addressToArray)
}

function addressToArray(addressLike: AddressLike): string[] {
    if (!addressLike) {
        return []
    }

    if (typeof addressLike === 'string') {
        return [addressLike]
    }

    if (Array.isArray(addressLike)) {
        return addressLike.map(addr =>
            typeof addr === 'string' ? addr : addr.address
        )
    }

    return [addressLike.address]
}

