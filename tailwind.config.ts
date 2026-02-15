import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#3b2f2a",
        accent: "#8b6f5c",
        sand: "#f6f1eb",
        clay: "#f7f2eb",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Space Grotesk", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 45px rgba(61, 44, 33, 0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
