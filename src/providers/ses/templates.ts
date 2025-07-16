import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import Handlebars from 'handlebars'
import { providerError } from './utils'
import { TemplateProvider } from './template-providers'

export interface TemplateMetadata {
  id: string
  template: HandlebarsTemplateDelegate
  schema: object
  validator: ReturnType<Ajv['compile']>
}

export class TemplateManager {
  private templates = new Map<string, TemplateMetadata>()
  private ajv = addFormats(new Ajv(), ['email'])

  private initPromise: Promise<void> | null | undefined = undefined

  constructor(private provider: TemplateProvider) { }

  static create(provider?: TemplateProvider): TemplateManager | null {
    if (!provider) {
      return null
    }

    const instance = new TemplateManager(provider)
    instance.initPromise = instance.beginInit()

    return instance
  }

  private async beginInit(): Promise<void> {
    const templateIds = await this.provider.listIds()
    await Promise.all(templateIds.map((templateId) => this.loadTemplate(templateId)))
  }

  async endInit(): Promise<void> {
    if (this.initPromise === null) {
      return
    }

    if (this.initPromise !== undefined) {
      await this.initPromise
      this.initPromise = null
      return
    }

    throw providerError('UNEXPECTED_STATE', 'TemplateManager: could not finish initialization')
  }

  private async loadTemplate(templateId: string): Promise<void> {
    try {
      const { template: templateContent, schema: schemaContent } =
        await this.provider.getFiles(templateId)

      const template = Handlebars.compile(templateContent)

      const schema = JSON.parse(schemaContent)
      const validator = this.ajv.compile(schema)

      this.templates.set(templateId, {
        id: templateId,
        template,
        schema,
        validator,
      })
    } catch (err) {
      throw providerError(
        'INVALID_DATA',
        `TemplateManager: Failed to load template '${templateId}': ${err.message}`,
      )
    }
  }

  async hasTemplate(templateId: string): Promise<boolean> {
    await this.endInit()
    return this.templates.has(templateId)
  }

  async renderTemplate(templateId: string, data: unknown): Promise<string> {
    await this.endInit()

    const template = this.templates.get(templateId)
    if (!template) {
      throw providerError(
        'INVALID_ARGUMENT',
        `TemplateManager: Template not found: ${templateId}`
      )
    }

    if (!template.validator(data)) {
      const errors =
        template.validator.errors
          ?.map((err) => `${err.instancePath || 'root'}: ${err.message}`)
          .join(', ') || 'Unknown validation error'

      throw providerError(
        'INVALID_ARGUMENT',
        `TemplateManager: Validation error: ${errors}`
      )
    }

    try {
      return template.template(data)
    } catch (err) {
      throw providerError(
        'UNEXPECTED_STATE',
        `TemplateManager: Template rendering failed for '${templateId}': ${err.message}`
      )
    }
  }

  async getTemplateIds(): Promise<string[]> {
    await this.endInit()
    return Array.from(this.templates.keys())
  }
}
