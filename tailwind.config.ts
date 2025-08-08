/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./app.vue", "./error.vue", "./app/**/*.{vue,js,ts}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1280px" } },
    extend: {},
  },
  plugins: [],
};
