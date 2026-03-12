/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  headers: async () => {
    const isDev = process.env.NODE_ENV === "development";

    // Paddle'ın ihtiyaç duyduğu tüm domain'ler (Paddle dokümantasyonuna göre)
    const paddleScriptDomains = [
      "https://cdn.paddle.com",
      "https://sandbox-cdn.paddle.com",
      "https://global.localizecdn.com",   // Paddle'ın i18n kütüphanesi (Localize.js)
    ].join(" ");

    const paddleFrameDomains = [
      "https://sandbox-buy.paddle.com",
      "https://buy.paddle.com",
      "https://sandbox-checkout-service.paddle.com",
      "https://checkout-service.paddle.com",
    ].join(" ");

    const csp = [
      `default-src 'self'`,

      // script-src: kendi scriptler + Paddle CDN + Localize.js + Cloudflare Insights (Railway inject ediyor)
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${paddleScriptDomains} https://static.cloudflareinsights.com${isDev ? " http://localhost:*" : ""}`,

      // style-src
      `style-src 'self' 'unsafe-inline' https://cdn.paddle.com https://sandbox-cdn.paddle.com`,

      // img-src: her şeye izin
      `img-src 'self' data: https: blob:`,

      // font-src
      `font-src 'self' data: https://cdn.paddle.com https://sandbox-cdn.paddle.com`,

      // frame-src: Paddle overlay iframe
      `frame-src 'self' ${paddleFrameDomains}${isDev ? " http://localhost:*" : ""}`,

      // frame-ancestors: bu sayfanın içine kim frame edebilir
      `frame-ancestors 'self' ${paddleFrameDomains}`,

      // connect-src: API çağrıları + Paddle API + Localize + Cloudflare
      `connect-src 'self' https://*.paddle.com https://global.localizecdn.com https://cloudflareinsights.com${isDev ? " http://localhost:* ws://localhost:*" : ""}`,

      // worker-src (Next.js HMR için)
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
        ],
      },
    ];
  },
};

export default nextConfig;
