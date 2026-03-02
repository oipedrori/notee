import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow firebase-admin to be bundled properly on the server
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
