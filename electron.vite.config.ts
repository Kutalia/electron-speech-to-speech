import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from './node_modules/@tailwindcss/vite/dist/index.mjs' // https://github.com/tailwindlabs/tailwindcss/discussions/16250#discussioncomment-13472403

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss()],
    worker: {
      format: 'es' // https://github.com/vitejs/vite/issues/18585#issuecomment-2459681237
    },
    build: {
      rollupOptions: {
        input: [
          resolve(__dirname, 'src/renderer/index.html'),
          resolve(__dirname, 'src/renderer/index.captions.html')
        ]
      }
    }
  }
})
