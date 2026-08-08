import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import Script from "next/script";
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
  metadataBase: new URL("https://www.getbearing.me"),
  title: "Bearing",
  description: "A personal discovery engine — find out what's actually driving you.",
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
    <html lang="en">
      <head>
        {/* Supabase auth session check (SiteNav) runs on every page, including
            the landing page — this is the only third-party origin actually
            in use site-wide. No Stripe preconnect: PaywallModal (and the
            Stripe SDK it pulls in) is now dynamically imported and only
            rendered once the paywall actually opens, not loaded eagerly. */}
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
      </head>
      <body className={`${newsreader.variable} ${inter.variable} font-sans antialiased`}>
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${process.env.NEXT_PUBLIC_META_PIXEL_ID}');
          fbq('track', 'PageView');`}
        </Script>
        {children}
      </body>
    </html>
  );
}
