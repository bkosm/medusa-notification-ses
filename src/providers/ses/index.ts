import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import { InjectedDependencies, NodemailerConfig, SesClientConfig, SesNotificationService, SesNotificationServiceConfig } from "./adapter"
import { SandboxConfig, SandboxManager } from "./sandbox"
import { TemplateManager, TemplateMetadata } from "./templates"
import { AddressLike } from "./utils"

const services = [SesNotificationService]

export default ModuleProvider(Modules.NOTIFICATION, {
  services,
})

export { SesNotificationService, SandboxManager, TemplateManager }
export type {
  SesNotificationServiceConfig,
  InjectedDependencies,
  NodemailerConfig,
  SesClientConfig,
  TemplateMetadata,
  SandboxConfig,
  AddressLike
}
