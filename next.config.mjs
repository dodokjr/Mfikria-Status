/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    '3000-firebase-api-mfikria-1781747502400.cluster-ikxjzjhlifcwuroomfkjrx437g.cloudworkstations.dev',
    '**.cloudworkstations.dev',
  ],
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
