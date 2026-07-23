import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables from the workspace root (../)
  const env = loadEnv(mode, '../', '');

  // Select the appropriate VITE_API_URL: check VITE_API_URL first, then fallback based on mode
  const apiPreset = env.VITE_API_URL || (
    mode === 'production'
      ? (env.VITE_API_URL_PROD || 'https://na-mindx-hub.onrender.com')
      : (env.VITE_API_URL_DEV || 'http://localhost:5000')
  );

  return {
    plugins: [react()],
    envDir: '../',
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(apiPreset)
    }
  }
})
