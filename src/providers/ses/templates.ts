import fs from 'fs'
import path from 'path'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import Handlebars from 'handlebars'

export interface TemplatesConfig {
  directory: string
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

  private constructor(private config: TemplatesConfig) {}

  static create(config?: TemplatesConfig): TemplateManager | null {
    if (!config) {
      return null
    }
    
    const manager = new TemplateManager(config)
    manager.initialize()
    return manager
  }

  private initialize(): void {
    if (!fs.existsSync(this.config.directory)) {
      throw new TemplateError(`Templates directory does not exist: ${this.config.directory}`)
    }

    if (!fs.statSync(this.config.directory).isDirectory()) {
      throw new TemplateError(`Templates path is not a directory: ${this.config.directory}`)
    }

    const templateIds = fs.readdirSync(this.config.directory, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)

    if (templateIds.length === 0) {
      throw new TemplateError(`No template directories found in: ${this.config.directory}`)
    }

    for (const templateId of templateIds) {
      this.loadTemplate(templateId)
    }
  }

  private loadTemplate(templateId: string): void {
    const templateDir = path.join(this.config.directory, templateId)
    const templatePath = path.join(templateDir, 'handlebars.template.html')
    const schemaPath = path.join(templateDir, 'data.schema.json')

    if (!fs.existsSync(templatePath)) {
      throw new TemplateError(`Template file not found: ${templatePath}`, templateId)
    }

    if (!fs.existsSync(schemaPath)) {
      throw new TemplateError(`Schema file not found: ${schemaPath}`, templateId)
    }

    try {
      const templateContent = fs.readFileSync(templatePath, 'utf-8')
      const template = Handlebars.compile(templateContent)

      const schemaContent = fs.readFileSync(schemaPath, 'utf-8')
      const schema = JSON.parse(schemaContent)
      const validator = this.ajv.compile(schema)

      this.templates.set(templateId, {
        id: templateId,
        template,
        schema,
        validator
      })
    } catch (error) {
      throw new TemplateError(
        `Failed to load template '${templateId}': ${error instanceof Error ? error.message : String(error)}`,
        templateId,
        error instanceof Error ? error : undefined
      )
    }
  }

  hasTemplate(templateId: string): boolean {
    return this.templates.has(templateId)
  }

  renderTemplate(templateId: string, data: unknown): string {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new TemplateError(`Template not found: ${templateId}`, templateId)
    }

    if (!template.validator(data)) {
      const errors = template.validator.errors
        ?.map(err => `${err.instancePath || 'root'}: ${err.message}`)
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
        `Template rendering failed for '${templateId}': ${error instanceof Error ? error.message : String(error)}`,
        templateId,
        error instanceof Error ? error : undefined
      )
    }
  }

  getTemplateIds(): string[] {
    return Array.from(this.templates.keys())
  }
}