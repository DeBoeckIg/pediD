import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        // Next.js/Tailwind may emit runtime inline style attributes; keep this
        // narrowly scoped exception until the styling pipeline can eliminate them.
        // Scripts do not require an inline exception, and WhatsApp is only a link
        // destination (not a browser connection made by the application).
        { key: 'Content-Security-Policy', value: "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: https://*.supabase.co; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co;" },
      ],
    }];
  },
};
export default nextConfig;
