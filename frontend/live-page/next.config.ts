import type { NextConfig } from "next";

// Production builds (Vercel or Docker) must know the LleidaHackBackend URL;
// otherwise the bundle would silently fall back to http://localhost:8000.
if (
  (process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview" ||
    process.env.NEXT_OUTPUT_STANDALONE === "1") &&
  !process.env.NEXT_PUBLIC_API_BASE_URL
) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL is required for deployment builds");
}

const nextConfig: NextConfig = {
  // Self-contained server only for the Docker image; Vercel uses its own output.
  output: process.env.NEXT_OUTPUT_STANDALONE === "1" ? "standalone" : undefined,
  async headers() {
    return [
      {
        // Screens stay open for days: always revalidate the service worker.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
