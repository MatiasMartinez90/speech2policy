/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // Static export for S3
  images: {
    unoptimized: true  // Required for static export
  },
  trailingSlash: true,
}

module.exports = nextConfig
