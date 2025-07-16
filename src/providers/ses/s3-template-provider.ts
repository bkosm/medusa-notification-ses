import { S3Client, ListObjectsV2Command, GetObjectCommand, S3ClientConfig } from '@aws-sdk/client-s3'
import { TemplateProvider } from './templates'
import { providerError } from './utils'

export interface S3TemplateProviderOptions {
  clientConfig?: S3ClientConfig
  bucket: string
  prefix?: string
}

export class S3TemplateProvider implements TemplateProvider {
  constructor(
    private options: S3TemplateProviderOptions,
    private s3: S3Client = new S3Client(options.clientConfig ?? [])
  ) { }

  async listIds(): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.options.bucket,
        Prefix: this.options.prefix,
        Delimiter: '/',
      })
      const response = await this.s3.send(command)
      const ids = response.CommonPrefixes?.map(p => p.Prefix!.replace(this.options.prefix ?? '', '').replace(/\/$/, '')) || []
      if (ids.length === 0) {
        throw new Error(`No template directories found in bucket: ${this.options.bucket}, prefix: ${this.options.prefix}`)
      }
      return ids
    } catch (err) {
      throw providerError(
        'UNEXPECTED_STATE',
        `S3TemplateProvider: Failed to list templates from S3: ${err.message}`,
      )
    }
  }

  async getFiles(id: string): Promise<{ template: string; schema: string }> {
    let normalizedPrefix = this.options.prefix ?? ''
    if (normalizedPrefix && !normalizedPrefix.endsWith('/')) {
      normalizedPrefix = `${normalizedPrefix}/`
    }

    const templateKey = `${this.options.prefix}${id}/handlebars.template.html`
    const schemaKey = `${this.options.prefix}${id}/data.schema.json`

    try {
      const [template, schema] = await Promise.all([
        this.getObject(templateKey),
        this.getObject(schemaKey),
      ])
      return { template, schema }
    } catch (err) {
      throw providerError(
        'UNEXPECTED_STATE',
        `S3TemplateProvider: Failed to get files for template ${id} from S3: ${err.message}`,
      )
    }
  }

  private async getObject(key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
      })
      const response = await this.s3.send(command)
      return response.Body!.transformToString()
    } catch (err) {
      throw providerError(
        'UNEXPECTED_STATE',
        `S3TemplateProvider: Failed to get object ${key} from S3: ${err.message}`,
      )
    }
  }
}
