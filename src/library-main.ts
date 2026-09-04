// INFO: Public entry point of the npm package (`starry-digitizer`).
// Named exports only: the old Vue 2 style auto-install plugin is gone.
// Everything a host application needs to embed <StarryDigitizer> must be
// re-exported from here, because `library-build/dist/index.d.ts` is
// generated from this file alone.
//
// INFO: this entry is the union of the two subpath entries plus the ready-made
// component, so `starry-digitizer` keeps exactly the surface it had before
// `./core` and `./vue` were split out. Add new exports to core-main.ts (no Vue
// renderer) or vue-main.ts (Vue), not here — here only re-export.

// ---------------------------------------------------------------------------
// The component
// ---------------------------------------------------------------------------
export { default as StarryDigitizer } from './presentation/components/StarryDigitizer.vue'
export type { StarryDigitizerProps } from './presentation/components/StarryDigitizer.vue'

// ---------------------------------------------------------------------------
// State, operations, project data and errors (`starry-digitizer/core`)
// ---------------------------------------------------------------------------
export * from './core-main'

// ---------------------------------------------------------------------------
// Panels, provide/inject and options (`starry-digitizer/vue`)
// ---------------------------------------------------------------------------
export * from './vue-main'
