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
        cream: "#FAF8F4",
        linen: "#F0EAE0",
        brown: "#3D2B1F",
        "brown-light": "#5C4033",
        "brown-mid": "#8B7355",
        gold: "#C4952E",
        "gold-light": "#E8C97A",
        teal: "#1D9E75",
        surface: "#FFFFFF",
        muted: "#A09484",
        error: "#C44536",
      },
    },
  },
  plugins: [],
};
export default config;
