import { MedusaError } from '@medusajs/framework/utils'
import { Address } from 'nodemailer/lib/mailer';

export const providerError = (type: keyof typeof MedusaError.Types, message: string) => {
    return new MedusaError(
        type,
        `SesNotificationService: ${message}`
    )
}

export type AddressLike = string | Address | Array<string | Address> | undefined;

export function addressesToArray(addressLikes: AddressLike[]): string[] {
    return addressLikes.flatMap(addressToArray)
}

export function addressToArray(addressLike: AddressLike): string[] {
    if (!addressLike) {
        return []
    }

    if (typeof addressLike === 'string') {
        return [addressLike]
    }

    if (Array.isArray(addressLike)) {
        return addressLike.map(addr =>
            typeof addr === 'string' ? addr : addr.address
        )
    }

    return [addressLike.address]
}
