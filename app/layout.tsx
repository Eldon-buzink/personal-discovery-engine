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
// No `images` field here: the file-convention app/opengraph-image.tsx
// takes priority over any config-based openGraph.images per Next's own
// resolution order, so a hardcoded path here would just be dead code that
// nothing serves — see lib/seo.ts's buildMetadata for the same reasoning.
export const metadata: Metadata = {
  metadataBase: new URL("https://www.getbearing.me"),
  title: "Bearing",
  description: "A personal discovery engine — find out what's actually driving you.",
  openGraph: {
    siteName: "Bearing",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Supabase auth session check (SiteNav) runs on every page, including
            the landing page — this is the only third-party origin actually
            in use site-wide. Not adding a Stripe preconnect here: Stripe
            currently loads eagerly on every page too (see PaywallModal's
            module-level loadStripe() call), but that's a bug flagged
            separately, not a resource this layout should treat as expected. */}
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
      </head>
      <body className={`${newsreader.variable} ${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
