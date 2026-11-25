/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sem o selo do Next no canto da tela: a demo roda em `npm run dev` na frente do cliente.
  devIndicators: false,

  // O cache persistente do Turbopack em dev serviu globals.css antigo no Windows
  // depois de edições; sem ele o HMR de CSS fica confiável.
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },

  // Cabeçalhos de segurança em todas as respostas. A CSP só trava o que não quebra a app
  // (moldura, <base>, plugins, destino de formulário); scripts/imagens seguem livres.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },

  turbopack: {
    resolveAlias: {
      html2canvas: "html2canvas-pro",
    },
  },
};

module.exports = nextConfig;
