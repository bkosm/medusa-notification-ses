import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import { SesNotificationService, SesNotificationServiceConfig } from "./adapter"

const services = [SesNotificationService]

export default ModuleProvider(Modules.NOTIFICATION, {
  services,
})

export { SesNotificationService }
export type { SesNotificationServiceConfig }
