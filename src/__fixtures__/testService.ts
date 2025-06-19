import { MockTransporter } from "../__mocks__/mockTransporter";
import { NodemailerConfig, SesClientConfig, SesNotificationService, SesNotificationServiceConfig } from "../providers/ses/adapter";

export const testService = (
    transporter: MockTransporter, 
    nodemailerConfig?: NodemailerConfig, 
    configOverrides?: Partial<SesNotificationServiceConfig>
) => new SesNotificationService(
    {
        logger: console as any,
    },
    {
        nodemailerConfig,
        sesClientConfig: configOverrides?.sesClientConfig,
        templatesConfig: configOverrides?.templatesConfig,
    },
    undefined,
    transporter as any,
)
