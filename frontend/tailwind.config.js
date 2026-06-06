/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        abyss: "#041326",
        ocean: "#052a44",
        cyanline: "#29e3db",
        mintline: "#37f4b6",
        panel: "rgba(8, 34, 64, 0.76)",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(45, 227, 219, 0.3), 0 24px 48px rgba(2, 12, 22, 0.6)",
      },
      backgroundImage: {
        aurora:
          "radial-gradient(1200px 480px at 50% -10%, rgba(46, 218, 171, 0.35), transparent 60%), radial-gradient(900px 500px at 40% 20%, rgba(11, 130, 164, 0.22), transparent 70%), linear-gradient(180deg, #020b18 0%, #041426 45%, #041223 100%)",
      },
    },
  },
  plugins: [],
};
