import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        lumm: {
          black: "#1a1a1a",
          dark: "#0d0d0d",
          gold: "#c9a84c",
          "gold-light": "#e0c068",
          "gold-dark": "#a68a3a",
          gray: "#2a2a2a",
          "gray-light": "#3a3a3a",
          "text-primary": "#f5f5f5",
          "text-secondary": "#999999",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
