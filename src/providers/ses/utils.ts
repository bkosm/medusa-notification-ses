import { MedusaError } from '@medusajs/framework/utils'

export const error = (type: keyof typeof MedusaError.Types, message: string) => {
    return new MedusaError(
        type,
        `SesNotificationService: ${message}`
    )
}
