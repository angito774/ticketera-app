import type { NextConfig } from "next";

import { ALLOWED_IMAGE_HOSTS } from "./src/lib/image-hosts";

const nextConfig: NextConfig = {
  // Salida mínima para la imagen Docker (ver Dockerfile).
  output: "standalone",
  images: {
    remotePatterns: ALLOWED_IMAGE_HOSTS.map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
  },
};

export default nextConfig;
