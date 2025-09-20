/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  experimental: {},
  webpack: (config) => {
    const serverModule = "next/dist/compiled/react-server-dom-webpack/server.js";

    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      "react-server-dom-webpack/server": serverModule
    };

    return config;
  }
};

export default nextConfig;
