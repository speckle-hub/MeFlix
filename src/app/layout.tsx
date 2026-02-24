import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import MainLayout from "@/components/layout/MainLayout";
import ThemeProvider from "@/components/layout/ThemeProvider";
import ShortcutManager from "@/components/ui/ShortcutManager";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MeFlix | Premium Streaming",
  description: "Aggregated streaming content from Stremio addons",
};

import { AddonInitializer } from "@/components/ui/AddonInitializer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body
        className={`${inter.variable} antialiased selection:bg-accent selection:text-white bg-[#000]`}
      >
        <ThemeProvider>
          <Toaster
            theme="dark"
            position="bottom-right"
            expand={false}
            toastOptions={{
              style: {
                background: "rgba(18, 18, 18, 0.8)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "20px",
                color: "#fff",
              }
            }}
          />
          <ShortcutManager />
          <AddonInitializer />
          <MainLayout>
            {children}
          </MainLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
