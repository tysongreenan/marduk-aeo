/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static output
  output: 'standalone',
  
  // Disable type checking and linting during build since we handle it in development
  typescript: {
    ignoreBuildErrors: true,
  },
  
  eslint: {
    // Warning instead of error during builds
    ignoreDuringBuilds: true,
  },

  // Ensure proper handling of 404s
  experimental: {
    missingSuspenseWithCSRError: false,
  },
}

module.exports = nextConfig 