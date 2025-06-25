import { describe, expect, it, beforeEach } from '@jest/globals'
import path from 'path'
import { TemplateManager, TemplateError } from '../templates'

const FIXTURES_DIR = path.join(__dirname, '../../../__fixtures__/templates')

describe('TemplateManager', () => {
  describe('create', () => {
    it('should return null when no config provided', () => {
      const manager = TemplateManager.create()
      expect(manager).toBeNull()
    })

    it('should return null when config is undefined', () => {
      const manager = TemplateManager.create(undefined)
      expect(manager).toBeNull()
    })

    it('should create manager with valid config', () => {
      const manager = TemplateManager.create({
        directory: FIXTURES_DIR
      })
      expect(manager).toBeInstanceOf(TemplateManager)
    })

    it('should throw error for non-existent directory', () => {
      expect(() => {
        TemplateManager.create({
          directory: '/non/existent/path'
        })
      }).toThrow(TemplateError)
    })

    it('should throw error for empty directory', () => {
      const tempDir = path.join(__dirname, '../../__fixtures__/empty-templates')
      require('fs').mkdirSync(tempDir, { recursive: true })
      
      expect(() => {
        TemplateManager.create({
          directory: tempDir
        })
      }).toThrow('No template directories found')
      
      require('fs').rmSync(tempDir, { recursive: true })
    })
  })

  describe('template loading', () => {
    let manager: TemplateManager

    beforeEach(() => {
      manager = TemplateManager.create({
        directory: FIXTURES_DIR
      })!
    })

    it('should load all templates from fixtures', () => {
      expect(manager.hasTemplate('welcome-email')).toBe(true)
      expect(manager.hasTemplate('order-confirmation')).toBe(true)
    })

    it('should return correct template IDs', () => {
      const templateIds = manager.getTemplateIds()
      expect(templateIds).toContain('welcome-email')
      expect(templateIds).toContain('order-confirmation')
      expect(templateIds).toHaveLength(2)
    })

    it('should return false for non-existent template', () => {
      expect(manager.hasTemplate('non-existent')).toBe(false)
    })
  })

  describe('renderTemplate', () => {
    let manager: TemplateManager

    beforeEach(() => {
      manager = TemplateManager.create({
        directory: FIXTURES_DIR
      })!
    })

    it('should render welcome-email template with valid data', () => {
      const data = {
        firstName: 'John',
        email: 'john@example.com',
        companyName: 'Acme Corp',
        hasPromo: true,
        promoCode: 'WELCOME20'
      }

      const html = manager.renderTemplate('welcome-email', data)
      
      expect(html).toContain('Welcome John!')
      expect(html).toContain('john@example.com')
      expect(html).toContain('Acme Corp')
      expect(html).toContain('WELCOME20')
    })

    it('should render welcome-email template without promo', () => {
      const data = {
        firstName: 'Jane',
        email: 'jane@example.com',
        companyName: 'Test Inc',
        hasPromo: false
      }

      const html = manager.renderTemplate('welcome-email', data)
      
      expect(html).toContain('Welcome Jane!')
      expect(html).toContain('jane@example.com')
      expect(html).toContain('Test Inc')
      expect(html).not.toContain('promo code')
    })

    it('should render order-confirmation template with valid data', () => {
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

      const html = manager.renderTemplate('order-confirmation', data)
      
      expect(html).toContain('Hi Alice')
      expect(html).toContain('ORD-123')
      expect(html).toContain('Widget A')
      expect(html).toContain('Widget B')
      expect(html).toContain('$27.48')
      expect(html).toContain('2024-01-15')
    })

    it('should throw error for non-existent template', () => {
      expect(() => {
        manager.renderTemplate('non-existent', {})
      }).toThrow(TemplateError)
    })

    it('should throw error for invalid data - missing required field', () => {
      const data = {
        firstName: 'John',
        // missing email and companyName
      }

      expect(() => {
        manager.renderTemplate('welcome-email', data)
      }).toThrow(TemplateError)
    })

    it('should throw error for invalid data - wrong type', () => {
      const data = {
        firstName: 123, // should be string
        email: 'john@example.com',
        companyName: 'Acme Corp'
      }

      expect(() => {
        manager.renderTemplate('welcome-email', data)
      }).toThrow(TemplateError)
    })

    it('should throw error for invalid data - conditional validation', () => {
      const data = {
        firstName: 'John',
        email: 'john@example.com',
        companyName: 'Acme Corp',
        hasPromo: true
        // missing promoCode when hasPromo is true
      }

      expect(() => {
        manager.renderTemplate('welcome-email', data)
      }).toThrow(TemplateError)
    })

    it('should throw error for additional properties', () => {
      const data = {
        firstName: 'John',
        email: 'john@example.com',
        companyName: 'Acme Corp',
        extraField: 'not allowed'
      }

      expect(() => {
        manager.renderTemplate('welcome-email', data)
      }).toThrow(TemplateError)
    })
  })
})