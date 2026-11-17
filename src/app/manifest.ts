import type { MetadataRoute } from "next";
import { getAppearance } from "@/lib/appearanceServer";

// Makes the site installable as an app (phone home screen, computer Start menu / dock).
// The name and color follow Settings > Appearance, so it is built on each request.
export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { appName, brandColor } = await getAppearance();

  return {
    id: "/",
    name: appName,
    short_name: appName.length > 12 ? appName.split(" ")[0].slice(0, 12) : appName,
    description: "Operations record for products, diary, transport, and clients.",
    // "/" sends each person to the right place: the sign-in page, the staff view, or the admin area.
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#ffffff",
    theme_color: brandColor,
    categories: ["business", "medical", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press the app icon (phone) or right-click it (computer) to jump straight to these.
    shortcuts: [
      {
        name: "Products",
        short_name: "Products",
        description: "Look up a product, price or barcode",
        url: "/staff/products",
        icons: [{ src: "/icons/shortcut-96.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "Diary",
        short_name: "Diary",
        description: "Open the diary",
        url: "/staff/diary",
        icons: [{ src: "/icons/shortcut-96.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "Clients",
        short_name: "Clients",
        description: "Find a client",
        url: "/staff/clients",
        icons: [{ src: "/icons/shortcut-96.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "Admin dashboard",
        short_name: "Admin",
        description: "Open the admin area",
        url: "/products",
        icons: [{ src: "/icons/shortcut-96.png", sizes: "96x96", type: "image/png" }],
      },
    ],
  };
}
