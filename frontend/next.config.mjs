/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  webpack: (config) => {
    // Allow canvas/WebGL to work
    config.externals = config.externals || [];
    return config;
  },
};

export default nextConfig;
