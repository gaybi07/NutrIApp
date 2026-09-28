import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Morphy",
  description: "Morphy — Planificá. Medí. Evolucioná.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Morphy",
  },
};

export const viewport: Viewport = {
  themeColor: "#15141B",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-bg text-text font-sans min-h-screen">
        <div className="max-w-[480px] lg:max-w-6xl mx-auto px-3 lg:px-6 py-5 pb-16">{children}</div>
      </body>
    </html>
  );
}
