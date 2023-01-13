module.exports = {
  purge: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      height: () => ({
        "screen/2": "50vh",
      }),
      fontFamily: {
        'sans': ['Osaka', 'Helvetica', 'Arial', 'sans-serif']
      },
      transitionProperty: {
        'width': 'width'
      },
    },
  },
  variants: {
    extend: {
      cursor: ['disabled'],
      pointerEvents: ['disabled'],
      textColor: [ 'disabled' ]
    },
  },
  plugins: [],
}
