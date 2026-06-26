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
      },
      colors: {
        cream: "#F7F4ED",
        charcoal: "#262420",
      },
    },
  },
  plugins: [],
};
export default config;
