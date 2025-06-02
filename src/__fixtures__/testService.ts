import { MockTransporter } from "../__mocks__/mockTransporter";
import { NodemailerConfig, SesClientConfig, SesNotificationService } from "../providers/ses/adapter";

export const testService = (transporter: MockTransporter, nodemailerConfig?: NodemailerConfig, sesClientConfig?: SesClientConfig) => new SesNotificationService(
    {
        logger: console as any,
    },
    {
        nodemailerConfig,
        sesClientConfig,
    },
    undefined,
    transporter as any,
)
