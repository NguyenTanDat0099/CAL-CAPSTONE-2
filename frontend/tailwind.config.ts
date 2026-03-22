import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        calai: {
          bg: "#0f0f11",
          card: "#1c1c1e",
          sidebar: "#000000",
          orange: "#f97316",
          orangeHover: "#ea580c",
          text: "#ffffff",
          textMuted: "#a1a1aa",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
