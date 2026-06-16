import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        charcoal: "#1f2933",
        recycle: {
          50: "#edf8f0",
          100: "#d7f0df",
          600: "#198754",
          700: "#146c43",
          800: "#0f5132"
        },
        safety: {
          amber: "#b45309",
          red: "#b42318"
        }
      },
      boxShadow: {
        tile: "0 2px 10px rgba(15, 23, 42, 0.06)",
        "tile-hover": "0 10px 28px rgba(15, 23, 42, 0.14)"
      }
    },
  },
  plugins: [],
} satisfies Config;
