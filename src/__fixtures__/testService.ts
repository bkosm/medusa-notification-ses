import { SESClient } from "@aws-sdk/client-ses";
import { MockTransporter } from "../__mocks__/mockTransporter";
import { NodemailerConfig, SesClientConfig, SesNotificationService, SesNotificationServiceConfig } from "../providers/ses/adapter";

export const testService = (
    transporter: MockTransporter, 
    nodemailerConfig?: NodemailerConfig, 
    configOverrides?: Partial<SesNotificationServiceConfig>,
    sesClient?: SESClient
) => new SesNotificationService(
    {
        logger: console as any,
    },
    {
        nodemailerConfig,
        sesClientConfig: configOverrides?.sesClientConfig,
        templatesConfig: configOverrides?.templatesConfig,
        sandboxConfig: configOverrides?.sandboxConfig,
    },
    sesClient,
    transporter as any,
)
