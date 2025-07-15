import fs from 'fs/promises'
import path from 'path'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import Handlebars from 'handlebars'

export interface TemplateProvider {
  listIds(): Promise<string[]>
  getFiles(id: string): Promise<{ template: string; schema: string }>
}

export class LocalTemplateProvider implements TemplateProvider {
  constructor(private directory: string) {}

  private async checkDirectoryExists(): Promise<void> {
    try {
      const stats = await fs.stat(this.directory)
      if (!stats.isDirectory()) {
        throw new TemplateError(`Templates path is not a directory: ${this.directory}`)
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new TemplateError(`Templates directory does not exist: ${this.directory}`)
      }
      throw error
    }
  }

  async listIds(): Promise<string[]> {
    await this.checkDirectoryExists()
    const dirents = await fs.readdir(this.directory, { withFileTypes: true })
    const templateIds = dirents
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)

    if (templateIds.length === 0) {
      throw new TemplateError(`No template directories found in: ${this.directory}`)
    }

    return templateIds
  }

  async getFiles(id: string): Promise<{ template: string; schema: string }> {
    const templateDir = path.join(this.directory, id)
    const templatePath = path.join(templateDir, 'handlebars.template.html')
    const schemaPath = path.join(templateDir, 'data.schema.json')

    try {
      const templateContent = await fs.readFile(templatePath, 'utf-8')
      const schemaContent = await fs.readFile(schemaPath, 'utf-8')
      return { template: templateContent, schema: schemaContent }
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new TemplateError(`File not found: ${error.path}`, id)
      }
      throw new TemplateError(
        `Failed to read files for template '${id}': ${error.message}`,
        id,
        error
      )
    }
  }
}

export interface TemplateMetadata {
  id: string
  template: HandlebarsTemplateDelegate
  schema: object
  validator: ReturnType<Ajv['compile']>
}

export class TemplateError extends Error {
  constructor(message: string, public templateId?: string, public cause?: Error) {
    super(message)
    this.name = 'TemplateError'
  }
}

export class TemplateManager {
  private templates = new Map<string, TemplateMetadata>()
  private ajv = addFormats(new Ajv(), ['email'])
  private initializationPromise: Promise<void> | null = null

  private constructor(private provider: TemplateProvider) {}

  static create(provider?: TemplateProvider): TemplateManager | null {
    if (!provider) {
      return null
    }
    return new TemplateManager(provider)
  }

  private initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise
    }
    this.initializationPromise = this._initialize()
    return this.initializationPromise
  }

  private async _initialize(): Promise<void> {
    const templateIds = await this.provider.listIds()
    await Promise.all(templateIds.map((templateId) => this.loadTemplate(templateId)))
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
    } catch (error) {
      throw new TemplateError(
        `Failed to load template '${templateId}': ${
          error instanceof Error ? error.message : String(error)
        }`,
        templateId,
        error instanceof Error ? error : undefined
      )
    }
  }

  async hasTemplate(templateId: string): Promise<boolean> {
    await this.initialize()
    return this.templates.has(templateId)
  }

  async renderTemplate(templateId: string, data: unknown): Promise<string> {
    await this.initialize()
    const template = this.templates.get(templateId)
    if (!template) {
      throw new TemplateError(`Template not found: ${templateId}`, templateId)
    }

    if (!template.validator(data)) {
      const errors =
        template.validator.errors
          ?.map((err) => `${err.instancePath || 'root'}: ${err.message}`)
          .join(', ') || 'Unknown validation error'
      throw new TemplateError(
        `Template data validation failed for '${templateId}': ${errors}`,
        templateId
      )
    }

    try {
      return template.template(data)
    } catch (error) {
      throw new TemplateError(
        `Template rendering failed for '${templateId}': ${
          error instanceof Error ? error.message : String(error)
        }`,
        templateId,
        error instanceof Error ? error : undefined
      )
    }
  }

  async getTemplateIds(): Promise<string[]> {
    await this.initialize()
    return Array.from(this.templates.keys())
  }
}