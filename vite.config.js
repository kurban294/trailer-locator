import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cspMiddleware } from './vite.middleware'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic'
    })
  ],
  server: {
    port: 4000,
    strictPort: true,
    hmr: true,
    middlewares: [cspMiddleware()]
  },
  build: {
    sourcemap: true,
  }
})
