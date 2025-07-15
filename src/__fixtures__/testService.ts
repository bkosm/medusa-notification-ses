import { SESClient } from "@aws-sdk/client-ses";
import { MockTransporter } from "../__mocks__/mockTransporter";
import { NodemailerConfig, SesNotificationService, SesNotificationServiceConfig } from "../providers/ses/adapter";

export const testService = (
    transporter: MockTransporter, 
    nodemailerConfig: NodemailerConfig, 
    configOverrides?: Partial<SesNotificationServiceConfig>,
    sesClient?: SESClient
) => new SesNotificationService(
    {
        logger: console as any,
    },
    {
        nodemailerConfig,
        sesClientConfig: configOverrides?.sesClientConfig,
        templateProvider: configOverrides?.templateProvider,
        sandboxConfig: configOverrides?.sandboxConfig,
    },
    sesClient,
    transporter as any,
)
