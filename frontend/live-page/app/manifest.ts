import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HackEPS Live",
    short_name: "HackEPS",
    start_url: "/",
    display: "standalone",
    background_color: "#94cbf5",
    theme_color: "#ff7430",
    icons: [
      {
        src: "/tractor-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
