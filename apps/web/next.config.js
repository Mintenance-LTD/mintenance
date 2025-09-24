/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  transpilePackages: ['@mintenance/auth', '@mintenance/shared', '@mintenance/types'],
};

module.exports = nextConfig;