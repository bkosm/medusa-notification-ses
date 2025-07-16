import fs from 'fs/promises'
import path from 'path'
import { TemplateProvider } from './templates'
import { providerError } from './utils'

export type LocalTemplateProviderOptions = {
  directory: string
}

export class LocalTemplateProvider implements TemplateProvider {
  constructor(public options: LocalTemplateProviderOptions) { }

  async checkDirectoryExists(): Promise<void> {
    try {
      const stats = await fs.stat(this.options.directory)
      if (!stats.isDirectory()) {
        throw new Error(`Templates path is not a directory: ${this.options.directory}`)
      }
    } catch (err) {
      throw providerError(
        'INVALID_DATA',
        `LocalTemplateProvider: Directory error: ${err.message}`,
      )
    }
  }

  async listIds(): Promise<string[]> {
    await this.checkDirectoryExists()
    const dirents = await fs.readdir(this.options.directory, { withFileTypes: true })
    const templateIds = dirents
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)

    if (templateIds.length === 0) {
      throw providerError(
        'INVALID_DATA',
        `LocalTemplateProvider: No template directories found in: ${this.options.directory}`,
      )
    }

    return templateIds
  }

  async getFiles(id: string): Promise<{ template: string; schema: string }> {
    const templateDir = path.join(this.options.directory, id)
    const templatePath = path.join(templateDir, 'handlebars.template.html')
    const schemaPath = path.join(templateDir, 'data.schema.json')

    try {
      const templateContent = await fs.readFile(templatePath, 'utf-8')
      const schemaContent = await fs.readFile(schemaPath, 'utf-8')
      return { template: templateContent, schema: schemaContent }
    } catch (err) {
      throw providerError(
        'INVALID_DATA',
        `LocalTemplateProvider: File error: ${err.message}`,
      )
    }
  }
}
