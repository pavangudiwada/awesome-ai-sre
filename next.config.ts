import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/*": ["./tools/**/*.yaml", "./content/**/*.mdx"],
  },
  turbopack: { root: __dirname },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.aisrewatchlist.com" }],
        destination: "https://aisrewatchlist.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "aisre.pavangudiwada.dev" }],
        destination: "https://aisrewatchlist.com/:path*",
        permanent: true,
      },
      {
        source: "/account/saved",
        destination: "/workspace/saved",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
