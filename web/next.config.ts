import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  typedRoutes: true,
  serverExternalPackages: ["pg"],
};

export default config;
