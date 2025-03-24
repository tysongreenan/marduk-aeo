/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning instead of error during builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  // Enable static 404 pages
  output: 'standalone',
  
  // Improve error handling
  onError: async (err, req, res) => {
    if (err.statusCode === 404) {
      res.statusCode = 404
      res.end('Not Found')
    }
  },

  // Ensure proper handling of dynamic routes
  async rewrites() {
    return {
      fallback: [
        // Fallback to 404 for unknown routes
        {
          source: '/:path*',
          destination: '/_not-found',
        },
      ],
    }
  },
}

module.exports = nextConfig 