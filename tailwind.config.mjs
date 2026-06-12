// tailwind.config.mjs

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#050505',
          card: '#111111',
          section: '#0a0a0a',
        },
        text: {
          DEFAULT: '#f0f0f0',
          sub: '#888888',
        },
        accent: '#b8a88a',
        silver: {
          DEFAULT: '#c0c0c0',
          light: '#e8e8e8',
        },
        border: '#1a1a1a',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans JP', 'sans-serif'],
        serif: ['Cormorant Garamond', 'Noto Serif JP', 'serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
