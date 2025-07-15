import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import { SesNotificationService, SesNotificationServiceConfig } from "./adapter"
import { LocalTemplateProvider } from "./templates"

const services = [SesNotificationService]

export default ModuleProvider(Modules.NOTIFICATION, {
  services,
})

export { SesNotificationService, LocalTemplateProvider }
export type { SesNotificationServiceConfig }
