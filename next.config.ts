import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "trusted-types * allow-duplicates;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
