import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
  headers: async () => {
    const isDev = process.env.NODE_ENV === "development";

    const paddleScriptDomains = [
      "https://cdn.paddle.com",
      "https://sandbox-cdn.paddle.com",
      "https://global.localizecdn.com",
    ].join(" ");

    const paddleFrameDomains = [
      "https://sandbox-buy.paddle.com",
      "https://buy.paddle.com",
      "https://sandbox-checkout-service.paddle.com",
      "https://checkout-service.paddle.com",
    ].join(" ");

    const csp = [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${paddleScriptDomains} https://static.cloudflareinsights.com${isDev ? " http://localhost:*" : ""}`,
      `style-src 'self' 'unsafe-inline' https://cdn.paddle.com https://sandbox-cdn.paddle.com`,
      `img-src 'self' data: https: blob:`,
      `font-src 'self' data: https://cdn.paddle.com https://sandbox-cdn.paddle.com`,
      `frame-src 'self' ${paddleFrameDomains}${isDev ? " http://localhost:*" : ""}`,
      `frame-ancestors 'self' ${paddleFrameDomains}`,
      `connect-src 'self' https://*.paddle.com https://global.localizecdn.com https://cloudflareinsights.com${isDev ? " http://localhost:* ws://localhost:*" : ""}`,
      isDev ? "worker-src 'self' blob:" : "worker-src 'self' blob:",
    ]
      .join("; ")
      .replace(/\s+/g, " ")
      .trim();

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ...(isDev
            ? []
            : [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]),
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
