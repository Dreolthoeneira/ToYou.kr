import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { createScrapeProductMiddleware } from './server/scrape-product.js'
import { createAuthApiMiddleware } from './server/auth-api.js'
import { createStoreApiMiddleware } from './server/store-api.js'

function scrapeProductPlugin() {
  return {
    name: 'scrape-product-api',
    configureServer(server: { middlewares: { use: (handler: unknown) => void } }) {
      server.middlewares.use(createScrapeProductMiddleware())
    },
    configurePreviewServer(server: { middlewares: { use: (handler: unknown) => void } }) {
      server.middlewares.use(createScrapeProductMiddleware())
    },
  }
}

function backendApiPlugin() {
  return {
    name: 'toyou-backend-api',
    configureServer(server: { middlewares: { use: (handler: unknown) => void } }) {
      server.middlewares.use(createAuthApiMiddleware())
      server.middlewares.use(createStoreApiMiddleware())
    },
    configurePreviewServer(server: { middlewares: { use: (handler: unknown) => void } }) {
      server.middlewares.use(createAuthApiMiddleware())
      server.middlewares.use(createStoreApiMiddleware())
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')

  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [react(), backendApiPlugin(), scrapeProductPlugin()],
  }
})
