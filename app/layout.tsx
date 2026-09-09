import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Registro",
  description: "Registro nutricional y de entrenamiento",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Registro",
  },
};

export const viewport: Viewport = {
  themeColor: "#1C1B18",
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
