/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sem o selo do Next no canto da tela: a demo roda em `npm run dev` na frente do cliente.
  devIndicators: false,

  // O cache persistente do Turbopack em dev serviu globals.css antigo no Windows
  // depois de edições; sem ele o HMR de CSS fica confiável.
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },

  turbopack: {
    resolveAlias: {
      html2canvas: "html2canvas-pro",
    },
  },

  // fallback caso algo rode no webpack (ou em build environments diferentes)
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      html2canvas: "html2canvas-pro",
    };
    return config;
  },
};

module.exports = nextConfig;
