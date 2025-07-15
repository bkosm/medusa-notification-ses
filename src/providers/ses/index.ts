import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import { SesNotificationService, SesNotificationServiceConfig } from "./adapter"
import { LocalTemplateProvider } from "./local-template-provider"
import { S3TemplateProvider } from "./s3-template-provider"

const services = [SesNotificationService]

export default ModuleProvider(Modules.NOTIFICATION, {
  services,
})

export { SesNotificationService, LocalTemplateProvider, S3TemplateProvider }
export type { SesNotificationServiceConfig }
