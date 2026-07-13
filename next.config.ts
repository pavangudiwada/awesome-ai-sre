import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
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
