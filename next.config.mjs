/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /* node:sqlite is a core module; keep it out of the bundler's resolution. */
  serverExternalPackages: ['node:sqlite'],
  eslint: { ignoreDuringBuilds: true }
};

export default nextConfig;
