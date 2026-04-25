/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F172A",
        mint: "#D9F99D",
        clay: "#F4EBD0",
        coral: "#FB7185",
        ocean: "#0EA5E9",
      },
      fontFamily: {
        display: ["Manrope", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 40px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};
