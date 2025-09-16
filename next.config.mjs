/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { 
            key: 'Access-Control-Allow-Origin', 
            value: process.env.NODE_ENV === 'production'
              ? process.env.NEXT_PUBLIC_APP_URL || '*'
              : 'http://localhost:3000'
          },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-user' },
        ],
      },
    ];
  },

  images: {
    domains: ['localhost'],
  },

  experimental: {
    serverActions: {}   // ✅ must be object, not boolean
  },

  serverExternalPackages: ['bcryptjs'],

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        dns: false,
      };
    }
    return config;
  },

  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  },
};

export default nextConfig;
