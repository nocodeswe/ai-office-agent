/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://appsforoffice.microsoft.com; style-src 'self' 'unsafe-inline'; connect-src 'self' *; img-src 'self' data: blob: *; frame-src 'self' https://appsforoffice.microsoft.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
