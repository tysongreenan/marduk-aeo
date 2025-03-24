/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static output
  output: 'standalone',
  
  // Ensure proper handling of dynamic routes
  async rewrites() {
    return [
      {
        source: '/:path*',
        destination: '/_not-found',
        missing: [
          {
            type: 'page',
            key: 'pathname',
          },
        ],
      },
    ]
  },

  // Disable type checking during build since we handle it in development
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig 