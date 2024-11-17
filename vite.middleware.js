import crypto from 'crypto';

export function cspMiddleware() {
  return (req, res, next) => {
    // Development CSP - more permissive
    const isDev = process.env.NODE_ENV !== 'production';
    
    const developmentCSP = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.supabase.co",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://* http://*",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mapbox.com",
      "frame-src 'self' https://*.supabase.co",
      "worker-src 'self' blob:",
      "child-src 'self' blob:",
    ].join('; ');

    const productionCSP = [
      "default-src 'self'",
      "script-src 'self' https://*.supabase.co",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://* http://*",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mapbox.com",
      "frame-src 'self' https://*.supabase.co",
      "worker-src 'self' blob:",
      "child-src 'self' blob:",
    ].join('; ');

    res.setHeader(
      'Content-Security-Policy',
      isDev ? developmentCSP : productionCSP
    );

    next();
  };
}
