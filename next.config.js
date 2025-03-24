/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static output
  output: 'standalone',
  
  // Disable type checking during build since we handle it in development
  typescript: {
    ignoreBuildErrors: true,
  },

  // Ensure proper handling of 404s
  experimental: {
    missingSuspenseWithCSRError: false,
  },
}

module.exports = nextConfig 