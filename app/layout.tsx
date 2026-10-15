import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import MetaPixel from "@/components/known/MetaPixel";
import ConsentBanner from "@/components/known/ConsentBanner";
import ThemeLabHead from "@/components/known/ThemeLabHead";
import "./globals.css";

// Italic is loaded for real (not browser-faked): the trait-word token is
// Newsreader italic 600.
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
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
  metadataBase: new URL("https://www.getbearing.me"),
  title: "Bearing",
  description: "A Big Five personality assessment. Rate 120 short statements and see your patterns. Your first 5 patterns are free, no account needed.",
  openGraph: {
    siteName: "Bearing",
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/api/og"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${newsreader.variable} ${inter.variable}`}>
      <head>
        {/* Supabase auth session check (SiteNav) runs on every page, including
            the landing page — this is the only third-party origin actually
            in use site-wide. No Stripe preconnect: PaywallModal (and the
            Stripe SDK it pulls in) is now dynamically imported and only
            rendered once the paywall actually opens, not loaded eagerly. */}
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        {/* Dev-only theme lab; renders nothing (and ships nothing) unless the flag is set. */}
        {process.env.NEXT_PUBLIC_THEME_LAB === "1" && <ThemeLabHead />}
      </head>
      <body className="font-sans antialiased">
        {/* Meta Pixel loads only after the visitor allows ad measurement
            (ConsentBanner); see components/known/MetaPixel.tsx. */}
        <MetaPixel />
        {children}
        <ConsentBanner />
      </body>
    </html>
  );
}
