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
        serif: ["var(--font-newsreader)", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
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
