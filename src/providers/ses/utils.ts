import { MedusaError } from '@medusajs/framework/utils'

export const error = (type: keyof typeof MedusaError.bTypes, message: string) => {
    return new MedusaError(
        type,
        `SesNotificationService: ${message}`
    )
}