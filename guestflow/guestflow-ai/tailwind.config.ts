import type { Config } from "tailwindcss";

/**
 * GuestFlow AI design tokens.
 * Palette: Aegean hospitality — deep sea ink, aegean blue, whitewash, sand, sun gold.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sea: "#0E2A3B", // deep sea ink — primary text / dark surfaces
        aegean: "#1D63A8", // aegean blue — primary actions
        "aegean-deep": "#154B80",
        shore: "#FAF8F2", // whitewash — page background
        sand: "#F1EADB", // sand — cards / soft surfaces
        gold: "#E9B44C", // sun gold — accents, highlights
        foam: "#E8F0F7", // pale sea — chat bubbles, chips
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      borderRadius: {
        card: "1.25rem",
      },
      boxShadow: {
        soft: "0 8px 30px rgba(14, 42, 59, 0.08)",
        lift: "0 12px 40px rgba(14, 42, 59, 0.14)",
      },
    },
  },
  plugins: [],
};
export default config;
