import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./bin/coral",
      "./coral/source-specs/**/*",
    ],
  },
};

export default nextConfig;
