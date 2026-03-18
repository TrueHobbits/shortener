import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import type { Plugin } from 'vite'

const frontendPaths = ['/', '/login', '/register', '/dashboard']

function shortLinkProxy(): Plugin {
  return {
    name: 'short-link-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || ''
        const pathname = url.split('?')[0]

        // Let known frontend routes, assets, and Vite internals pass through
        if (
          frontendPaths.includes(pathname) ||
          pathname.startsWith('/api') ||
          pathname.startsWith('/src') ||
          pathname.startsWith('/node_modules') ||
          pathname.startsWith('/@') ||
          pathname.startsWith('/__') ||
          pathname.includes('.')
        ) {
          return next()
        }

        // Everything else (e.g. /AbCdEf) — proxy to NestJS for redirect
        const proxyUrl = `http://localhost:3000${url}`
        res.writeHead(302, { Location: proxyUrl })
        res.end()
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), shortLinkProxy()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
