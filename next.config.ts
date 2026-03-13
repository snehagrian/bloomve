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
            value: [
              "default-src 'self' https://www.gstatic.com https://*.firebaseapp.com https://*.firebase.com https://*.firebaseio.com https://*.googleapis.com https://cdn.jsdelivr.net",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.gstatic.com https://*.firebase.com https://*.firebaseapp.com https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.gstatic.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' https: data: blob:",
              "connect-src 'self' https://*.firebaseapp.com https://*.firebase.com https://*.firebaseio.com https://*.googleapis.com https://cdn.jsdelivr.net https://storage.googleapis.com wss://*.firebaseio.com",
              "frame-src 'self' https://*.firebaseapp.com",
              "trusted-types * allow-duplicates",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
