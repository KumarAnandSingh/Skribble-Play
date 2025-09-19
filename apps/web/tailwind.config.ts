import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui-kit/src/**/*.{ts,tsx}"] ,
  theme: {
    extend: {
      colors: {
        background: "#0f1020",
        surface: "rgba(20, 20, 40, 0.85)",
        primary: {
          DEFAULT: "#8f47ff",
          600: "#7436d1"
        },
        accent: "#ff6fcb",
        text: "#f5f5ff"
      },
      boxShadow: {
        panel: "0 20px 45px rgba(0, 0, 0, 0.45)"
      }
    }
  },
  plugins: []
};

export default config;
