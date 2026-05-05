/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Enable standalone output to build a self-contained server bundle
  output: 'standalone',
};

export default nextConfig;
