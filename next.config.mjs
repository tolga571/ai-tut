/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  headers: async () => {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://sandbox-buy.paddle.com https://buy.paddle.com; frame-src 'self' https://sandbox-buy.paddle.com https://buy.paddle.com https://sandbox-checkout-service.paddle.com https://checkout-service.paddle.com; default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.paddle.com https://sandbox-cdn.paddle.com; style-src 'self' 'unsafe-inline' https://sandbox-cdn.paddle.com https://cdn.paddle.com; img-src 'self' data: https:; font-src 'self' data: https://sandbox-cdn.paddle.com https://cdn.paddle.com; connect-src 'self' https:;",
          },
        ],
      },
    ];
  },
};
export default nextConfig;
