import { SESClient, GetIdentityVerificationAttributesCommand, VerifyEmailIdentityCommand } from '@aws-sdk/client-ses'
import { error } from './utils'

export interface SandboxConfig {
  // Presence of object enables sandbox mode
  verifyOnEachSend?: boolean
}

export class SandboxError extends Error {
  constructor(message: string, public emailAddress?: string, public cause?: Error) {
    super(message)
    this.name = 'SandboxError'
  }
}

export class SandboxManager {
  private verifiedAddresses = new Map<string, boolean>()
  private pendingVerifications = new Set<string>()
  private verifyOnEachSend: boolean

  private constructor(private sesClient: SESClient, verifyOnEachSend: boolean = false) {
    this.verifyOnEachSend = verifyOnEachSend
  }

  static create(config?: SandboxConfig, sesClient?: SESClient): SandboxManager | null {
    if (!config || !sesClient) {
      return null
    }
    
    return new SandboxManager(sesClient, config.verifyOnEachSend ?? false)
  }

  async checkAndVerifyAddresses(addresses: any[]): Promise<void> {
    // Extract email addresses from mixed types and deduplicate
    const emailAddresses = addresses
      .filter(addr => addr != null)
      .flatMap(addr => {
        if (typeof addr === 'string') return [addr]
        if (Array.isArray(addr)) return addr.map(a => typeof a === 'string' ? a : a.address)
        if (typeof addr === 'object' && addr.address) return [addr.address]
        return []
      })
    
    const uniqueAddresses = [...new Set(emailAddresses)]
    
    if (uniqueAddresses.length === 0) {
      return
    }
    const unverifiedAddresses: string[] = []

    if (this.verifyOnEachSend) {
      // Skip cache check when verifyOnEachSend is true
      unverifiedAddresses.push(...uniqueAddresses)
    } else {
      // Check cached verification status first
      for (const address of uniqueAddresses) {
        const cached = this.verifiedAddresses.get(address)
        if (cached === false || cached === undefined) {
          unverifiedAddresses.push(address)
        }
      }

      if (unverifiedAddresses.length === 0) {
        return // All addresses are verified
      }
    }

    // Get current verification status from SES
    const verificationStatuses = await this.getVerificationStatus(unverifiedAddresses)
    
    const stillUnverified: string[] = []
    
    for (const address of unverifiedAddresses) {
      const isVerified = verificationStatuses.get(address) ?? false
      this.verifiedAddresses.set(address, isVerified)
      
      if (!isVerified) {
        stillUnverified.push(address)
      }
    }

    if (stillUnverified.length === 0) {
      return // All addresses became verified
    }

    // Start verification for unverified addresses
    for (const address of stillUnverified) {
      if (!this.pendingVerifications.has(address)) {
        await this.startVerification(address)
        this.pendingVerifications.add(address)
      }
    }

    // Throw retryable error for Medusa's workflow system
    const addressList = stillUnverified.join(', ')
    throw error(
      'INVALID_DATA',
      `Email verification pending for sandbox mode: ${addressList}`
    )
  }

  private async getVerificationStatus(addresses: string[]): Promise<Map<string, boolean>> {
    const statusMap = new Map<string, boolean>()
    
    try {
      // SES API allows max 100 identities per call
      const chunks = this.chunkArray(addresses, 100)
      
      for (const chunk of chunks) {
        const command = new GetIdentityVerificationAttributesCommand({
          Identities: chunk
        })
        
        const response = await this.sesClient.send(command)
        
        for (const address of chunk) {
          const attributes = response.VerificationAttributes?.[address]
          const isVerified = attributes?.VerificationStatus === 'Success'
          statusMap.set(address, isVerified)
        }
      }
    } catch (error) {
      throw new SandboxError(
        `Failed to check email verification status: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        error instanceof Error ? error : undefined
      )
    }
    
    return statusMap
  }

  private async startVerification(address: string): Promise<void> {
    try {
      const command = new VerifyEmailIdentityCommand({
        EmailAddress: address
      })
      
      await this.sesClient.send(command)
    } catch (error) {
      // Don't throw error for verification start failure
      // Log it and continue - the verification check will catch it next time
      console.warn(`Failed to start verification for ${address}:`, error)
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  // Test utilities
  isAddressCached(address: string): boolean {
    return this.verifiedAddresses.has(address)
  }

  getCachedStatus(address: string): boolean | undefined {
    return this.verifiedAddresses.get(address)
  }

  clearCache(): void {
    this.verifiedAddresses.clear()
    this.pendingVerifications.clear()
  }
}