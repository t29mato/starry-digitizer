// INFO: Phase 0 scaffold module. Not part of the public API surface described
// in docs/design/plot-digitizer-architecture.md section 4.4 — it only exists
// to prove the build/test toolchain works end to end before Phase 1 moves
// real domain code into this package. Safe to delete once Phase 1 lands.
export const PACKAGE_NAME = 'plot-digitizer'

type PackageInfo = {
  name: string
  status: 'pre-alpha' | 'unpublished'
}

export function getPackageInfo(options?: { published?: boolean }): PackageInfo {
  const published = options?.published ?? true

  return {
    name: PACKAGE_NAME,
    status: published ? 'pre-alpha' : 'unpublished',
  }
}
