import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { SerwistProvider } from "@serwist/turbopack/react";
import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Reading Buddy",
  title: "Reading Buddy",
  description:
    "A calm reading companion for tracking books, progress, and reading habits.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Reading Buddy",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        type: "image/png",
        sizes: "180x180",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#00522c",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider appearance={{ theme: shadcn }}>
          <SerwistProvider
            swUrl="/serwist/sw.js"
            disable={process.env.NODE_ENV !== "production"}
            cacheOnNavigation={false}
            reloadOnOnline
            options={{ updateViaCache: "none" }}
          >
            {children}
          </SerwistProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
