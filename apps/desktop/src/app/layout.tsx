import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${GeistMono.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var raw = localStorage.getItem("kubeview-preferences");
                  if (!raw) return;
                  var parsed = JSON.parse(raw);
                  var state = parsed && parsed.state ? parsed.state : {};
                  if (state.fontSize) {
                    document.documentElement.dataset.fontSize = state.fontSize;
                  }
                  if (state.reducedMotion === true) {
                    document.documentElement.dataset.reducedMotion = "true";
                  }
                } catch (error) {}
              })();
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="h-screen w-screen font-sans antialiased overflow-hidden select-none"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={200} skipDelayDuration={150}>
            {children}
            <Toaster position="bottom-right" richColors closeButton />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
