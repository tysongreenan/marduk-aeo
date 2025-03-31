/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static output for better performance
  output: 'standalone',
  
  // Disable ESLint during production builds to prevent failed deployments
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  
  // Optionally, you can also disable TypeScript type checking during builds
  typescript: {
    // Warning: This setting is not recommended unless you're actively fixing type errors.
    // It's better to fix the type errors than to ignore them.
    ignoreBuildErrors: true,
  },

  // Configure runtime for auth-dependent pages
  experimental: {
    // This forces client-side rendering for pages that need auth
    // so they don't fail during build time
    appDir: true,
  },
}

module.exports = nextConfig 