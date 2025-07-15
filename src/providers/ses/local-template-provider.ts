import fs from 'fs/promises'
import path from 'path'
import { TemplateProvider, TemplateError } from './templates'

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
