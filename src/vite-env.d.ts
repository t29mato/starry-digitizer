/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/vue" />

interface ImportMetaEnv {
  /** Base URL of the auto service for the standalone app (unset = none). */
  readonly VITE_AUTO_SERVICE_URL?: string
}
