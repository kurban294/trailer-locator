import { defineMiddleware } from '@vite/middleware'

export default defineMiddleware((req, res, next) => {
  // Set CSP headers
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob: https://*.supabase.co; " +
    "frame-src 'self' https://*.supabase.co; " +
    "font-src 'self' data:;"
  )
  next()
})
