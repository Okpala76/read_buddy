import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Reading Buddy",
    short_name: "Reading Buddy",
    description:
      "A calm reading companion for tracking books, progress, and reading habits.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7fbf8",
    theme_color: "#00522c",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
