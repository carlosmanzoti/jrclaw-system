import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable strict mode in dev to avoid double renders
  reactStrictMode: false,

  // Optimize barrel file imports — tree-shakes heavy packages
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@fullcalendar/react",
      "date-fns",
      "zod",
      "@radix-ui/react-icons",
      "cmdk",
    ],
  },

  // Do not block builds on TS errors (they show as warnings)
  typescript: {
    ignoreBuildErrors: false,
  },

  // Security headers (also in middleware for edge runtime)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ]
  },
};

export default nextConfig;
