import { SESClient, GetIdentityVerificationAttributesCommand, VerifyEmailIdentityCommand } from '@aws-sdk/client-ses'
import { providerError, AddressLike, addressesToArray } from './utils'

// Presence of object enables sandbox mode
export type SandboxConfig = {
  verifyOnEachSend?: boolean
}

export class SandboxManager {
  verifiedAddresses = new Map<string, boolean>()
  pendingVerifications = new Set<string>()

  constructor(public sesClient: SESClient, public verifyOnEachSend: boolean = false) {}

  static create(config?: SandboxConfig, sesClient?: SESClient): SandboxManager | null {
    if (!config || !sesClient) {
      return null
    }
    
    return new SandboxManager(sesClient, config.verifyOnEachSend ?? false)
  }

  async checkAndVerifyAddresses(addresses: AddressLike[]): Promise<void> {
    const uniqueAddresses = [...new Set(addressesToArray(addresses))]
    
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
    throw providerError(
      'INVALID_DATA',
      `Email verification pending for sandbox mode: ${addressList}`
    )
  }

  async getVerificationStatus(addresses: string[]): Promise<Map<string, boolean>> {
    const statusMap = new Map<string, boolean>()
    
    try {
      // SES API allows max 100 identities per call
      const chunks = chunkArray(addresses, 100)
      
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
    } catch (err) {
      throw providerError(
        'UNEXPECTED_STATE',
        `SandboxManager: Failed to check email verification status: ${err.message}`
      )
    }
    
    return statusMap
  }

  async startVerification(address: string): Promise<void> {
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


function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}
