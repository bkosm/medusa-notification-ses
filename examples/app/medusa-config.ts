import { loadEnv, defineConfig } from '@medusajs/framework/utils'
import { LocalTemplateProvider } from '@bkosm/medusa-notification-ses/template-providers'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  modules: [
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "@bkosm/medusa-notification-ses",
            id: "notification-ses",
            options: {
              channels: ["email"],
              nodemailerConfig: {
                from: 'no-reply@commerce.itnsh.it'
              },
              templateProvider: new LocalTemplateProvider({
                directory: `${__dirname}/src/emails`
              }),
              sandboxConfig: {},
            }
          },
        ],
      },
    },
  ]
})
