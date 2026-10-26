import path from "node:path";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Permite compilar en otra carpeta (NEXT_DIST_DIR=.next-verify) sin pisar la
  // de un `next dev` en marcha. En Vercel y CI se usa el valor por defecto.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    // Fija la raíz al proyecto: hay un package-lock.json ajeno en una carpeta superior.
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    // Avatares de los proveedores OAuth (tarea 4).
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    // La raíz lleva al dashboard; si no hay sesión, el proxy redirige a /login.
    return [{ source: "/", destination: "/dashboard", permanent: false }];
  },
};

export default nextConfig;
