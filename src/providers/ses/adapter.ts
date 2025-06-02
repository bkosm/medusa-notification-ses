import {
    Logger,
    NotificationTypes,
} from "@medusajs/framework/types"
import {
    AbstractNotificationProviderService,
    MedusaError,
} from "@medusajs/framework/utils"

import { SendEmailCommand, SendEmailRequest, SESClient, SESClientConfig } from "@aws-sdk/client-ses";
import { CheckOptionalClientConfig } from "@smithy/types"

type InjectedDependencies = {
    logger: Logger
}

export type SenderConfig = Omit<SendEmailRequest, 'Message' | 'Destination'> & {
    Destination?: SendEmailRequest['Destination']
    Charset?: string
}

export type SesClientConfig = CheckOptionalClientConfig<SESClientConfig>

export type SesNotificationServiceConfig = { sender: SenderConfig, sesClient?: SesClientConfig }

export class SesNotificationService extends AbstractNotificationProviderService {
    static identifier = "notification-ses"
    protected config_: SesNotificationServiceConfig
    protected logger_: Logger
    protected ses_: SESClient

    constructor(
        { logger }: InjectedDependencies,
        options: SesNotificationServiceConfig,
        ses: SESClient = new SESClient(options?.sesClient ?? [])
    ) {
        super()
        this.config_ = options
        this.logger_ = logger
        this.ses_ = ses
    }

    async send(
        notification: NotificationTypes.ProviderSendNotificationDTO
    ): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
        if (!notification) {
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                `No notification information provided`
            )
        }

        // handler skipped if null
        let messageId: string | undefined | null = undefined

        messageId = await this.handleRawEmail(notification)
        if (messageId !== undefined) {
            return { id: messageId }
        }

        return { id: undefined }
    }

    protected async handleRawEmail(notification: NotificationTypes.ProviderSendNotificationDTO) {
        if (!notification.content) {
            return undefined
        }

        const {
            subject,
            text,
            html,
        } = notification.content!

        const command = new SendEmailCommand({
            ...this.config_.sender,
            Destination: {
                ToAddresses: [notification.to, ...(this.config_.sender.Destination?.CcAddresses ?? [])],
                CcAddresses: this.config_.sender.Destination?.CcAddresses,
                BccAddresses: this.config_.sender.Destination?.BccAddresses,
            },
            Message: {
                Subject: {
                    Data: subject,
                    Charset: this.config_.sender.Charset,
                },
                Body: {
                    Text: {
                        Data: text,
                        Charset: this.config_.sender.Charset,
                    },
                    Html: {
                        Data: html,
                        Charset: this.config_.sender.Charset,
                    }
                }
            },
        })

        const response = await this.ses_.send(command)
        return response.MessageId
    }
}
