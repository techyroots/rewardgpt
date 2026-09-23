import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RewardGPT — 5% cashback on AI subscriptions",
  description:
    "Privately prove your ChatGPT, Claude or Grok subscription with zkTLS and get 5% cashback paid in SOL. Your password and session never leave your device.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // The inline script below sets an attribute on <html> before React
    // hydrates, which React would otherwise report as a mismatch.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Enables the scroll-reveal hidden state. Inline and synchronous so
            it runs before first paint; if scripting is off it never runs and
            every section stays visible. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.setAttribute("data-motion","on")`,
          }}
        />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
