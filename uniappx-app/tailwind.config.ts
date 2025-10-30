import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{vue,ts,js,uvue}',
    './uni_modules/**/*.{vue,ts,js,uvue}'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config
