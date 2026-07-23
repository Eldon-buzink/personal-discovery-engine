import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// metadataBase resolves the relative OG/Twitter image paths set per-route
// (e.g. "/og-image.png") into absolute URLs — without it, Next falls back to
// the dev server origin, which would break OG previews in production.
// This is a fallback only: every route in scope for SEO (see per-route
// metadata exports) sets its own title/description/OG data, which wins over
// this. Only reachable by a route that doesn't define its own — currently
// the assessment/report/auth flow, which isn't meant to be indexed or shared.
export const metadata: Metadata = {
  metadataBase: new URL("https://getbearing.me"),
  title: "Bearing",
  description: "A personal discovery engine — find out what's actually driving you.",
  openGraph: {
    siteName: "Bearing",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${newsreader.variable} ${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
