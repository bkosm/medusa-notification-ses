import { describe, expect, it, beforeEach } from '@jest/globals'
import path from 'path'
import { TemplateManager } from '../templates'
import { LocalTemplateProvider } from '../local-template-provider'

const FIXTURES_DIR = path.join(__dirname, '../../../__fixtures__/templates')

describe('TemplateManager', () => {
  describe('create', () => {
    it('should return null when no provider provided', () => {
      const manager = TemplateManager.create()
      expect(manager).toBeNull()
    })

    it('should return null when provider is undefined', () => {
      const manager = TemplateManager.create(undefined)
      expect(manager).toBeNull()
    })

    it('should create manager with valid provider', () => {
      const provider = new LocalTemplateProvider(FIXTURES_DIR)
      const manager = TemplateManager.create(provider)
      expect(manager).toBeInstanceOf(TemplateManager)
    })
  })

  describe('template loading', () => {
    let manager: TemplateManager

    beforeEach(() => {
      const provider = new LocalTemplateProvider(FIXTURES_DIR)
      manager = TemplateManager.create(provider)!
    })

    it('should load all templates from fixtures', async () => {
      expect(await manager.hasTemplate('welcome-email')).toBe(true)
      expect(await manager.hasTemplate('order-confirmation')).toBe(true)
    })

    it('should return correct template IDs', async () => {
      const templateIds = await manager.getTemplateIds()
      expect(templateIds).toContain('welcome-email')
      expect(templateIds).toContain('order-confirmation')
      expect(templateIds).toHaveLength(2)
    })

    it('should return false for non-existent template', async () => {
      expect(await manager.hasTemplate('non-existent')).toBe(false)
    })
  })

  describe('renderTemplate', () => {
    let manager: TemplateManager

    beforeEach(() => {
      const provider = new LocalTemplateProvider(FIXTURES_DIR)
      manager = TemplateManager.create(provider)!
    })

    it('should render welcome-email template with valid data', async () => {
      const data = {
        firstName: 'John',
        email: 'john@example.com',
        companyName: 'Acme Corp',
        hasPromo: true,
        promoCode: 'WELCOME20'
      }

      const html = await manager.renderTemplate('welcome-email', data)
      
      expect(html).toContain('Welcome John!')
      expect(html).toContain('john@example.com')
      expect(html).toContain('Acme Corp')
      expect(html).toContain('WELCOME20')
    })

    it('should render welcome-email template without promo', async () => {
      const data = {
        firstName: 'Jane',
        email: 'jane@example.com',
        companyName: 'Test Inc',
        hasPromo: false
      }

      const html = await manager.renderTemplate('welcome-email', data)
      
      expect(html).toContain('Welcome Jane!')
      expect(html).toContain('jane@example.com')
      expect(html).toContain('Test Inc')
      expect(html).not.toContain('promo code')
    })

    it('should render order-confirmation template with valid data', async () => {
      const data = {
        customerName: 'Alice',
        orderNumber: 'ORD-123',
        items: [
          { name: 'Widget A', quantity: 2, price: 10.99 },
          { name: 'Widget B', quantity: 1, price: 5.50 }
        ],
        total: 27.48,
        deliveryDate: '2024-01-15'
      }

      const html = await manager.renderTemplate('order-confirmation', data)
      
      expect(html).toContain('Hi Alice')
      expect(html).toContain('ORD-123')
      expect(html).toContain('Widget A')
      expect(html).toContain('Widget B')
      expect(html).toContain('$27.48')
      expect(html).toContain('2024-01-15')
    })

    it('should throw error for non-existent template', async () => {
      await expect(manager.renderTemplate('non-existent', {})).rejects.toThrow(/SesNotificationService: TemplateManager: Template not found: non-existent/)
    })

    it('should throw error for invalid data - missing required field', async () => {
      const data = {
        promoCode: '',
        firstName: 'John',
        // missing email and companyName
      }

      await expect(manager.renderTemplate('welcome-email', data)).rejects.toThrow(/SesNotificationService: TemplateManager: Validation error: root: must have required property 'email'/)
    })

    it('should throw error for invalid data - wrong type', async () => {
      const data = {
        promoCode: '',
        firstName: 123, // should be string
        email: 'john@example.com',
        companyName: 'Acme Corp'
      }

      await expect(manager.renderTemplate('welcome-email', data)).rejects.toThrow(/SesNotificationService: TemplateManager: Validation error: \/firstName: must be string/)
    })

    it('should throw error for invalid data - conditional validation', async () => {
      const data = {
        firstName: 'John',
        email: 'john@example.com',
        companyName: 'Acme Corp',
        hasPromo: true
        // missing promoCode when hasPromo is true
      }

      await expect(manager.renderTemplate('welcome-email', data)).rejects.toThrow(/SesNotificationService: TemplateManager: Validation error: root: must have required property 'promoCode'/)
    })

    it('should throw error for additional properties', async () => {
      const data = {
        firstName: 'John',
        email: 'john@example.com',
        companyName: 'Acme Corp',
        extraField: 'not allowed'
      }

      await expect(manager.renderTemplate('welcome-email', data)).rejects.toThrow(/SesNotificationService: TemplateManager: Validation error: root: must have required property 'promoCode'/)
    })
  })
})
