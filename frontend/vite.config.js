import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {}
  }

  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) {
        return env
      }

      const equalsIndex = trimmed.indexOf('=')
      if (equalsIndex === -1) {
        return env
      }

      const key = trimmed.slice(0, equalsIndex).trim()
      const value = trimmed.slice(equalsIndex + 1).trim()
      env[key] = value
      return env
    }, {})
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const currentFile = fileURLToPath(import.meta.url)
  const currentDir = path.dirname(currentFile)
  const prodEnvPath = path.resolve(currentDir, '../.env.prod')
  const prodEnv = readEnvFile(prodEnvPath)
  const isProductionBuild = mode === 'production'

  const define = {}

  if (isProductionBuild) {
    define['import.meta.env.VITE_CLOUDINARY_CLOUD_NAME'] = JSON.stringify(prodEnv.VITE_CLOUDINARY_CLOUD_NAME || '')
    define['import.meta.env.VITE_GOOGLE_CLIENT_ID'] = JSON.stringify(prodEnv.GOOGLE_CLIENT_ID || '')
    define['import.meta.env.VITE_API_URL'] = prodEnv.VITE_API_URL
      ? JSON.stringify(prodEnv.VITE_API_URL)
      : 'window.location.origin'
  }

  return {
    plugins: [react()],
    define,
  }
})
