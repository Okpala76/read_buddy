/// <reference lib="esnext" />
/// <reference lib="webworker" />

import {
  CacheableResponsePlugin,
  CacheFirst,
  ExpirationPlugin,
  NetworkOnly,
  Serwist,
} from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

import {
  isSensitivePathname,
  isStaticAssetRequest,
} from "@/lib/pwa/cache-policy";
import {
  normalizePushNotificationPayload,
  resolveNotificationUrl,
} from "@/features/push-notifications/domain/push-notification";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const networkOnly = new NetworkOnly();

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ sameOrigin, url }) =>
        sameOrigin && isSensitivePathname(url.pathname),
      handler: networkOnly,
    },
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin && request.mode === "navigate",
      handler: networkOnly,
    },
    {
      matcher: isStaticAssetRequest,
      handler: new CacheFirst({
        cacheName: "reading-buddy-static-v1",
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 128,
            maxAgeSeconds: 60 * 60 * 24 * 365,
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

self.addEventListener("push", (event) => {
  let rawPayload: unknown;
  try {
    rawPayload = event.data?.json();
  } catch {
    rawPayload = undefined;
  }

  const payload = normalizePushNotificationPayload(
    rawPayload,
    self.location.origin,
  );
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: payload.tag,
      data: { url: payload.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const notificationData = event.notification.data as
    Record<string, unknown> | undefined;
  const targetUrl = resolveNotificationUrl(
    notificationData?.url,
    self.location.origin,
  );

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const exactClient = windowClients.find(
        (client) => client.url === targetUrl,
      );
      const appClient =
        exactClient ??
        windowClients.find((client) => {
          try {
            return new URL(client.url).origin === self.location.origin;
          } catch {
            return false;
          }
        });

      if (appClient) {
        if (appClient.url !== targetUrl) {
          await appClient.navigate(targetUrl);
        }
        await appClient.focus();
        return;
      }

      await self.clients.openWindow(targetUrl);
    })(),
  );
});

serwist.addEventListeners();
