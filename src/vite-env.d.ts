/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/vue" />

interface ImportMetaEnv {
  /** Base URL of the auto service for the standalone app (unset = none). */
  readonly VITE_AUTO_SERVICE_URL?: string
  /** Directory (under the base) the build put the OCR assets in (unset = CDN). */
  readonly VITE_OCR_ASSET_DIR?: string
  /** The deployed commit (deploy/deploy.sh), sent with research records. */
  readonly VITE_APP_COMMIT?: string
  /** The deploy's build number (deploy/deploy.sh), sent with research records. */
  readonly VITE_APP_BUILD?: string
}
