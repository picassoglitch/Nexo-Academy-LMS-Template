/** @type {import('common.next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/umami/script.js',
        destination: `https://eu.umami.is/script.js`,
      },
      {
        source: '/umami/api/send',
        destination: `https://eu.umami.is/api/send`,
      },
    ]
  },
  reactStrictMode: false,
  // Ensure consistent build IDs across multiple instances
  generateBuildId: async () => {
    return process.env.BUILD_ID || 'learnhouse-production'
  },
}

module.exports = nextConfig
