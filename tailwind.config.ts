import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        lumm: {
          black: "var(--lumm-black)",
          dark: "var(--lumm-dark)",
          gold: "var(--lumm-gold)",
          "gold-light": "var(--lumm-gold-light)",
          "gold-dark": "var(--lumm-gold-dark)",
          gray: "var(--lumm-gray)",
          "gray-light": "var(--lumm-gray-light)",
          "text-primary": "var(--lumm-text-primary)",
          "text-secondary": "var(--lumm-text-secondary)",
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
