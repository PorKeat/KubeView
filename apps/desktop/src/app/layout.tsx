import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "KubeView",
  description: "Next-generation Kubernetes desktop IDE and operations platform",
  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="h-screen w-screen font-sans antialiased overflow-hidden select-none">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <QueryProvider>
            {children}
            <Toaster position="bottom-right" theme="dark" richColors closeButton />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
