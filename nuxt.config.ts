import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-08-26',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
  },
  vite: {
    plugins: [tailwindcss()],
  },
  app: {
    head: {
      htmlAttrs: { lang: 'vi' },
      title: 'MIÊN Spa | Một khoảng lặng cho cơ thể',
      meta: [
        {
          name: 'description',
          content:
            'MIÊN Spa mang đến các liệu trình chăm sóc cơ thể và làn da trong một không gian tĩnh, riêng tư giữa lòng thành phố.',
        },
        { name: 'theme-color', content: '#f3efe5' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600&family=Newsreader:opsz,wght@6..72,300;6..72,400&display=swap',
        },
      ],
    },
  },
  nitro: {
    preset: 'node-server',
  },
})
