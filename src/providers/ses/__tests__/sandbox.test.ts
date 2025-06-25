import { SESClient, GetIdentityVerificationAttributesCommand, VerifyEmailIdentityCommand, GetIdentityVerificationAttributesCommandInput } from '@aws-sdk/client-ses'
import { MedusaError } from '@medusajs/framework/utils'
import { mockClient } from 'aws-sdk-client-mock'
import { SandboxManager, SandboxError } from '../sandbox'
import { describe, expect, it, beforeEach } from '@jest/globals'

const sesMock = mockClient(SESClient)

describe('SandboxManager', () => {
  let sesClient: SESClient

  beforeEach(() => {
    sesMock.reset()
    sesClient = new SESClient({})
  })

  describe('create', () => {
    it('should return null when no config provided', () => {
      const manager = SandboxManager.create()
      expect(manager).toBeNull()
    })

    it('should return null when config is undefined', () => {
      const manager = SandboxManager.create(undefined)
      expect(manager).toBeNull()
    })

    it('should return null when sesClient is undefined', () => {
      const manager = SandboxManager.create({}, undefined)
      expect(manager).toBeNull()
    })

    it('should create manager with valid config and client', () => {
      const manager = SandboxManager.create({}, sesClient)
      expect(manager).toBeInstanceOf(SandboxManager)
    })

    it('should create manager with verifyOnEachSend option', () => {
      const manager = SandboxManager.create({ verifyOnEachSend: true }, sesClient)
      expect(manager).toBeInstanceOf(SandboxManager)
    })
  })

  describe('checkAndVerifyAddresses', () => {
    let manager: SandboxManager

    beforeEach(() => {
      manager = SandboxManager.create({}, sesClient)!
    })

    it('should return early for empty addresses array', async () => {
      await expect(manager.checkAndVerifyAddresses([])).resolves.toBeUndefined()
      expect(sesMock.calls()).toHaveLength(0)
    })

    it('should pass for all verified addresses', async () => {
      sesMock.on(GetIdentityVerificationAttributesCommand).resolves({
        VerificationAttributes: {
          'verified@example.com': { VerificationStatus: 'Success' }
        }
      })

      await expect(manager.checkAndVerifyAddresses(['verified@example.com'])).resolves.toBeUndefined()
      expect(sesMock.calls()).toHaveLength(1)
    })

    it('should throw retryable error for unverified addresses', async () => {
      sesMock.on(GetIdentityVerificationAttributesCommand).resolves({
        VerificationAttributes: {
          'unverified@example.com': { VerificationStatus: 'Pending' }
        }
      })
      sesMock.on(VerifyEmailIdentityCommand).resolves({})

      await expect(manager.checkAndVerifyAddresses(['unverified@example.com']))
        .rejects.toThrow(MedusaError)

      const calls = sesMock.calls()
      expect(calls).toHaveLength(2)
      expect(calls[0].args[0].input).toEqual({
        Identities: ['unverified@example.com']
      })
      expect(calls[1].args[0].input).toEqual({
        EmailAddress: 'unverified@example.com'
      })
    })

    it('should handle mixed verified and unverified addresses', async () => {
      sesMock.on(GetIdentityVerificationAttributesCommand).resolves({
        VerificationAttributes: {
          'verified@example.com': { VerificationStatus: 'Success' },
          'unverified@example.com': { VerificationStatus: 'Pending' }
        }
      })
      sesMock.on(VerifyEmailIdentityCommand).resolves({})

      await expect(manager.checkAndVerifyAddresses(['verified@example.com', 'unverified@example.com']))
        .rejects.toThrow('Email verification pending for sandbox mode: unverified@example.com')
    })

    it('should deduplicate addresses', async () => {
      sesMock.on(GetIdentityVerificationAttributesCommand).resolves({
        VerificationAttributes: {
          'test@example.com': { VerificationStatus: 'Success' }
        }
      })

      await manager.checkAndVerifyAddresses(['test@example.com', 'test@example.com'])

      const calls = sesMock.calls()
      expect(calls).toHaveLength(1)
      expect(calls[0].args[0].input).toEqual({
        Identities: ['test@example.com']
      })
    })

    it('should cache verification status', async () => {
      sesMock.on(GetIdentityVerificationAttributesCommand).resolves({
        VerificationAttributes: {
          'cached@example.com': { VerificationStatus: 'Success' }
        }
      })

      // First call
      await manager.checkAndVerifyAddresses(['cached@example.com'])
      expect(sesMock.calls()).toHaveLength(1)

      // Second call should use cache
      await manager.checkAndVerifyAddresses(['cached@example.com'])
      expect(sesMock.calls()).toHaveLength(1) // No additional API calls
    })

    it('should handle SES API errors', async () => {
      sesMock.on(GetIdentityVerificationAttributesCommand).rejects(new Error('SES API Error'))

      await expect(manager.checkAndVerifyAddresses(['error@example.com']))
        .rejects.toThrow(SandboxError)
    })

    it('should chunk large address lists', async () => {
      const addresses = Array.from({ length: 150 }, (_, i) => `test${i}@example.com`)

      sesMock.on(GetIdentityVerificationAttributesCommand).resolves({
        VerificationAttributes: {}
      })
      sesMock.on(VerifyEmailIdentityCommand).resolves({})

      await expect(manager.checkAndVerifyAddresses(addresses)).rejects.toThrow(MedusaError)

      const getCalls = sesMock.calls().filter(call =>
        call.args[0].constructor.name === 'GetIdentityVerificationAttributesCommand'
      )
      expect(getCalls).toHaveLength(2) // 150 addresses chunked into 2 calls (100 + 50)

      expect((getCalls[0].args[0].input as GetIdentityVerificationAttributesCommandInput).Identities).toHaveLength(100)
      expect((getCalls[1].args[0].input as GetIdentityVerificationAttributesCommandInput).Identities).toHaveLength(50)
    })

    it('should not start duplicate verifications', async () => {
      sesMock.on(GetIdentityVerificationAttributesCommand).resolves({
        VerificationAttributes: {
          'pending@example.com': { VerificationStatus: 'Pending' }
        }
      })
      sesMock.on(VerifyEmailIdentityCommand).resolves({})

      // First call starts verification
      await expect(manager.checkAndVerifyAddresses(['pending@example.com']))
        .rejects.toThrow(MedusaError)

      // Second call should not start verification again
      await expect(manager.checkAndVerifyAddresses(['pending@example.com']))
        .rejects.toThrow(MedusaError)

      const verificationCalls = sesMock.calls().filter(call =>
        call.args[0].constructor.name === 'VerifyEmailIdentityCommand'
      )
      expect(verificationCalls).toHaveLength(1) // Only one verification call
    })

    it('should bypass cache when verifyOnEachSend is true', async () => {
      const manager = SandboxManager.create({ verifyOnEachSend: true }, sesClient)!

      sesMock.on(GetIdentityVerificationAttributesCommand).resolves({
        VerificationAttributes: {
          'test@example.com': { VerificationStatus: 'Success' }
        }
      })

      // First call
      await manager.checkAndVerifyAddresses(['test@example.com'])
      expect(sesMock.calls()).toHaveLength(1)

      // Second call should not use cache and make another API call
      await manager.checkAndVerifyAddresses(['test@example.com'])
      expect(sesMock.calls()).toHaveLength(2) // Additional API call made
    })

    it('should still use cache when verifyOnEachSend is false', async () => {
      const manager = SandboxManager.create({ verifyOnEachSend: false }, sesClient)!

      sesMock.on(GetIdentityVerificationAttributesCommand).resolves({
        VerificationAttributes: {
          'test@example.com': { VerificationStatus: 'Success' }
        }
      })

      // First call
      await manager.checkAndVerifyAddresses(['test@example.com'])
      expect(sesMock.calls()).toHaveLength(1)

      // Second call should use cache
      await manager.checkAndVerifyAddresses(['test@example.com'])
      expect(sesMock.calls()).toHaveLength(1) // No additional API calls
    })
  })

  describe('cache management', () => {
    let manager: SandboxManager

    beforeEach(() => {
      manager = SandboxManager.create({}, sesClient)!
    })

    it('should provide cache introspection methods', () => {
      expect(manager.isAddressCached('test@example.com')).toBeFalsy()
      expect(manager.getCachedStatus('test@example.com')).toBeUndefined()
    })

    it('should clear cache', async () => {
      sesMock.on(GetIdentityVerificationAttributesCommand).resolves({
        VerificationAttributes: {
          'test@example.com': { VerificationStatus: 'Success' }
        }
      })

      await manager.checkAndVerifyAddresses(['test@example.com'])
      expect(manager.isAddressCached('test@example.com')).toBeTruthy()

      manager.clearCache()
      expect(manager.isAddressCached('test@example.com')).toBeFalsy()
    })
  })
})