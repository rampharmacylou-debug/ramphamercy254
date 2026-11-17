import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";
import { RoleProvider } from "@/lib/roleContext";
import { AppearanceProvider } from "@/lib/appearanceContext";
import { getAppearance } from "@/lib/appearanceServer";
import { DiaryConfigProvider } from "@/lib/diaryConfigContext";
import { getDiaryConfig } from "@/lib/diaryConfigServer";
import { PwaRegister } from "@/components/InstallApp";

// The pharmacy store's fonts. They are downloaded once when you run `npm run build`
// and then served from your own app.
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage" });
const body = Figtree({ subsets: ["latin"], variable: "--font-figtree" });

// Theme and app name are edited in Settings > Appearance and must show up straight away.
export const dynamic = "force-dynamic";

// Lets the page use the whole phone screen (notches, home bar); the layouts add their own safe-area spacing.
// The theme color tints the phone's status bar and the installed app's title bar.
export async function generateViewport(): Promise<Viewport> {
  const { brandColor } = await getAppearance();
  return { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: brandColor };
}

export async function generateMetadata(): Promise<Metadata> {
  const { appName } = await getAppearance();
  return {
    title: appName,
    description: "Operations record for products, diary, transport, and clients.",
    applicationName: appName,
    // Installed-app settings for iPhone/iPad ("Add to Home Screen"). The manifest covers everyone else.
    appleWebApp: { capable: true, title: appName, statusBarStyle: "default" },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      ],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    },
    formatDetection: { telephone: false },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [appearance, diaryConfig] = await Promise.all([getAppearance(), getDiaryConfig()]);

  return (
    <html
      lang="en"
      data-theme={appearance.theme}
      data-font={appearance.fontStyle}
      className={`${display.variable} ${body.variable}`}
      style={{ "--brand": appearance.brandColor } as CSSProperties}
    >
      <body className="antialiased">
        <PwaRegister />
        <AppearanceProvider value={appearance}>
          <DiaryConfigProvider value={diaryConfig}>
            <RoleProvider>{children}</RoleProvider>
          </DiaryConfigProvider>
        </AppearanceProvider>
      </body>
    </html>
  );
}
