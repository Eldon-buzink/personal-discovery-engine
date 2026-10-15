import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-display)"],
        display: ["var(--font-display)"],
        trait: ["var(--font-trait)"],
        sans: ["var(--font-body)"],
      },
      // Type tokens (app/globals.css). Use these, not raw sizes.
      fontSize: {
        "display-1": ["var(--text-display-1)", { lineHeight: "1.12", letterSpacing: "-0.02em" }],
        "display-2": ["var(--text-display-2)", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "display-3": ["var(--text-display-3)", { lineHeight: "1.3" }],
        "display-4": ["var(--text-display-4)", { lineHeight: "1.35" }],
        "trait-word": ["var(--text-trait-word)", { lineHeight: "1.2" }],
        body: ["var(--text-body)", { lineHeight: "var(--leading-body)" }],
        ui: ["var(--text-ui)", { lineHeight: "1.4" }],
        meta: ["var(--text-meta)", { lineHeight: "1.5" }],
      },
      colors: {
        cream: "#F7F4ED",
        charcoal: "#262420",
        "charcoal-soft": "#56534D",
        muted: "#8C8A83",
        "line": "#E5E1D5",
        accent: "#3D6B5C",
      },
    },
  },
  plugins: [],
};
export default config;
