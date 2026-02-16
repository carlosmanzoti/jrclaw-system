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
};

export default nextConfig;
