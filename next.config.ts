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
        source: "/account/saved",
        destination: "/workspace/saved",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
