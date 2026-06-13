/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // For static export (traditional web servers), uncomment the following:
  // output: 'export',
  // trailingSlash: true,
  // distDir: 'out',
  // Note: Static export disables API routes - use direct API URLs instead
}

export default nextConfig
