import { describe, expect, it, beforeEach } from '@jest/globals'
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'
import type { StreamingBlobPayloadOutputTypes } from '@smithy/types'
import { mockClient } from 'aws-sdk-client-mock'

import { S3TemplateProvider } from '../s3-template-provider'

// Mock the S3Client using aws-sdk-client-mock
const s3Mock = mockClient(S3Client)

describe('S3TemplateProvider', () => {
  beforeEach(() => {
    s3Mock.reset()
  })

  const config = {
    bucket: 'test-bucket',
    prefix: 'templates/',
  }

  describe('listIds', () => {
    it('should return template IDs from S3', async () => {
      s3Mock.on(ListObjectsV2Command).resolves({ CommonPrefixes: [{ Prefix: 'templates/welcome-email/' }, { Prefix: 'templates/order-confirmation/' }] })
      const provider = new S3TemplateProvider(config)
      const ids = await provider.listIds()
      expect(ids).toEqual(['welcome-email', 'order-confirmation'])
    })

    it('should throw TemplateError if no templates are found', async () => {
      s3Mock.on(ListObjectsV2Command).resolves({ CommonPrefixes: [] })
      const provider = new S3TemplateProvider(config)
      await expect(provider.listIds()).rejects.toThrow('SesNotificationService: S3TemplateProvider: Failed to list templates from S3: No template directories found in bucket: test-bucket, prefix: templates/')
    })

    it('should throw TemplateError on S3 client error', async () => {
      s3Mock.on(ListObjectsV2Command).rejects(new Error('S3 Error'))
      const provider = new S3TemplateProvider(config)
      await expect(provider.listIds()).rejects.toThrow('Failed to list templates from S3: S3 Error')
    })
  })

  describe('getFiles', () => {
    it('should return template and schema content for a valid template ID', async () => {
      s3Mock.on(GetObjectCommand, { Key: 'templates/welcome-email/handlebars.template.html' }).resolves({ Body: { transformToString: () => Promise.resolve('template content') } as StreamingBlobPayloadOutputTypes })
      s3Mock.on(GetObjectCommand, { Key: 'templates/welcome-email/data.schema.json' }).resolves({ Body: { transformToString: () => Promise.resolve('schema content')  } as StreamingBlobPayloadOutputTypes })

      const provider = new S3TemplateProvider(config)
      const files = await provider.getFiles('welcome-email')

      expect(files.template).toBe('template content')
      expect(files.schema).toBe('schema content')
    })

    it('should throw TemplateError on S3 client error', async () => {
      s3Mock.on(GetObjectCommand).rejects(new Error('S3 Error'))
      const provider = new S3TemplateProvider(config)
      await expect(provider.getFiles('welcome-email')).rejects.toThrow('Failed to get files for template welcome-email from S3')
    })
  })
})