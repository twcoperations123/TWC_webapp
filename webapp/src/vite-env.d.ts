/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SQUARE_APPLICATION_ID: string
  readonly VITE_SQUARE_ACCESS_TOKEN: string
  readonly VITE_SQUARE_ENVIRONMENT: 'sandbox' | 'production'
  readonly VITE_SQUARE_LOCATION_ID: string
  readonly SQUARE_WEBHOOK_SIGNATURE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
