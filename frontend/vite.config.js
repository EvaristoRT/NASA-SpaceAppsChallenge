import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // El token de Mapbox sale de VITE_MAPBOX_TOKEN (archivo .env en local, variables del proyecto en Vercel).
  // loadEnv también lee las variables del sistema, que es donde Vercel las pone al compilar.
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  if (mode === 'production' && !env.VITE_MAPBOX_TOKEN) {
    console.warn(
      '\n[aviso] Falta VITE_MAPBOX_TOKEN: el mapa se compilará sin token y mostrará un aviso. ' +
        'Defínela en las variables de entorno del proyecto en Vercel (o en .env) y vuelve a desplegar.\n',
    )
  }

  return {
    plugins: [react()],
  }
})
