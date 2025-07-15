import { describe, expect, it, beforeAll, afterAll } from '@jest/globals'
import path from 'path'
import fs from 'fs/promises'
import { LocalTemplateProvider, TemplateError } from '../templates'

const FIXTURES_DIR = path.join(__dirname, '../../../__fixtures__/templates')
const TEMP_TEST_DIR = path.join(__dirname, 'temp-test-dir')

describe('LocalTemplateProvider', () => {
  beforeAll(async () => {
    await fs.mkdir(TEMP_TEST_DIR, { recursive: true })
  })

  afterAll(async () => {
    await fs.rm(TEMP_TEST_DIR, { recursive: true, force: true })
  })

  describe('listIds', () => {
    it('should return template IDs from a valid directory', async () => {
      const provider = new LocalTemplateProvider(FIXTURES_DIR)
      const ids = await provider.listIds()
      expect(ids).toEqual(expect.arrayContaining(['welcome-email', 'order-confirmation']))
      expect(ids).toHaveLength(2)
    })

    it('should throw TemplateError for a non-existent directory', async () => {
      const provider = new LocalTemplateProvider(path.join(FIXTURES_DIR, 'non-existent'))
      await expect(provider.listIds()).rejects.toThrow(TemplateError)
      await expect(provider.listIds()).rejects.toThrow('Templates directory does not exist')
    })

    it('should throw TemplateError if the path is a file', async () => {
        const filePath = path.join(TEMP_TEST_DIR, 'file.txt')
        await fs.writeFile(filePath, 'hello')
        const provider = new LocalTemplateProvider(filePath)
        await expect(provider.listIds()).rejects.toThrow(TemplateError)
        await expect(provider.listIds()).rejects.toThrow('Templates path is not a directory')
    })

    it('should throw TemplateError for an empty directory', async () => {
        const emptyDirPath = path.join(TEMP_TEST_DIR, 'empty-dir')
        await fs.mkdir(emptyDirPath, { recursive: true })
        const provider = new LocalTemplateProvider(emptyDirPath)
        await expect(provider.listIds()).rejects.toThrow(TemplateError)
        await expect(provider.listIds()).rejects.toThrow('No template directories found')
    })
  })

  describe('getFiles', () => {
    const provider = new LocalTemplateProvider(FIXTURES_DIR)

    it('should return template and schema content for a valid template ID', async () => {
      const files = await provider.getFiles('welcome-email')
      expect(files).toHaveProperty('template')
      expect(files).toHaveProperty('schema')
      expect(files.template).toContain('Welcome {{firstName}}!')
      expect(JSON.parse(files.schema)).toHaveProperty('type', 'object')
    })

    it('should throw TemplateError if template file is missing', async () => {
        const missingTemplatePath = path.join(TEMP_TEST_DIR, 'missing-template')
        await fs.mkdir(missingTemplatePath, { recursive: true })
        // Create only the schema file
        await fs.writeFile(path.join(missingTemplatePath, 'data.schema.json'), '{}')
        const provider = new LocalTemplateProvider(TEMP_TEST_DIR)
        await expect(provider.getFiles('missing-template')).rejects.toThrow(TemplateError)
        await expect(provider.getFiles('missing-template')).rejects.toThrow(/File not found: .*handlebars.template.html/)
    })

    it('should throw TemplateError if schema file is missing', async () => {
        const missingSchemaPath = path.join(TEMP_TEST_DIR, 'missing-schema')
        await fs.mkdir(missingSchemaPath, { recursive: true })
        // Create only the template file
        await fs.writeFile(path.join(missingSchemaPath, 'handlebars.template.html'), 'hello')
        const provider = new LocalTemplateProvider(TEMP_TEST_DIR)
        await expect(provider.getFiles('missing-schema')).rejects.toThrow(TemplateError)
        await expect(provider.getFiles('missing-schema')).rejects.toThrow(/File not found: .*data.schema.json/)
    })

    it('should throw TemplateError for a non-existent template ID', async () => {
        await expect(provider.getFiles('non-existent-id')).rejects.toThrow(TemplateError)
    })
  })
})
