import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import { InjectedDependencies, NodemailerConfig, SesClientConfig, SesNotificationService, SesNotificationServiceConfig } from "./adapter"
import { LocalTemplateProvider, LocalTemplateProviderOptions } from "./local-template-provider"
import { S3TemplateProvider, S3TemplateProviderOptions } from "./s3-template-provider"
import { SandboxConfig, SandboxManager } from "./sandbox"
import { TemplateManager, TemplateMetadata, TemplateProvider } from "./templates"
import { AddressLike } from "./utils"

const services = [SesNotificationService]

export default ModuleProvider(Modules.NOTIFICATION, {
  services,
})

export { SesNotificationService, LocalTemplateProvider, S3TemplateProvider, SandboxManager, TemplateManager }
export type {
  SesNotificationServiceConfig,
  LocalTemplateProviderOptions,
  S3TemplateProviderOptions,
  InjectedDependencies,
  NodemailerConfig,
  SesClientConfig,
  TemplateProvider,
  TemplateMetadata,
  SandboxConfig,
  AddressLike
}
