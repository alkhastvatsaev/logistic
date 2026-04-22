import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { PageTransition } from "@/components/ui/PageTransition";
import "./globals.css";

export const metadata: Metadata = {
  title: "Logistics Hub",
  description: "Minimalist order and supplier quote management",
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
