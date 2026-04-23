import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { PageTransition } from "@/components/ui/PageTransition";
import "./globals.css";

export const metadata: Metadata = {
  title: "LOGIS. 2030",
  description: "Minimalist order and supplier quote management",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LOGIS."
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <Toaster position="top-center" richColors />
        <main className="layout">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </body>
    </html>
  );
}
