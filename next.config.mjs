/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /* node:sqlite is a core module; keep it out of the bundler's resolution. */
  serverExternalPackages: ['node:sqlite'],
  eslint: { ignoreDuringBuilds: true },
  /* The dev badge sits bottom-left by default, which is where the sidebar
     keeps Settings and the way into the explainer — in development it covers
     both. It has no equivalent in a build, so this only moves a dev overlay. */
  devIndicators: { position: 'bottom-right' }
};

export default nextConfig;
