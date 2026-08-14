// INFO: Enforces the dependency directions defined in
// docs/design/plot-digitizer-architecture.md (sections 4.2 and 7).
//
// packages/plot-digitizer-core ("plot-digitizer") must stay framework
// agnostic and must never be reached into by, or reach into, the Vue app
// under src/. Run with: `yarn depcruise`.
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'core-no-app-dependency',
      comment:
        'plot-digitizer-core must not depend on the starry-digitizer Vue app (src/). ' +
        'The app depends on core, never the reverse.',
      severity: 'error',
      from: { path: '^packages/plot-digitizer-core' },
      to: { path: '^src/' },
    },
    {
      name: 'core-domain-no-outward-dependency',
      comment:
        'domain must not depend on application/infrastructure/ports — dependencies ' +
        'always point inward.',
      severity: 'error',
      from: { path: '^packages/plot-digitizer-core/src/domain' },
      to: {
        path: '^packages/plot-digitizer-core/src',
        pathNot: '^packages/plot-digitizer-core/src/domain',
      },
    },
    {
      // INFO: `to.path` matches the *resolved* module path, which for an
      // npm dependency is `node_modules/<pkg>/...` — not the bare specifier
      // ('vue') written in the import. Verified with a deliberate violation
      // (see PR description) before landing this pattern.
      name: 'core-no-vue-or-dom',
      comment:
        'plot-digitizer-core must stay framework-agnostic: no Vue/Vuetify import, ' +
        'and no dependency-cruiser-visible DOM lib usage.',
      severity: 'error',
      from: { path: '^packages/plot-digitizer-core' },
      to: { path: 'node_modules/(vue|@vue|vuetify)' },
    },
    {
      // INFO: Phase 2 (docs/design/plot-digitizer-architecture.md). This is
      // the rule that would have caught the original CanvasHandler/
      // Interpolator -> presentation/dom/HTMLCanvas violation. DOM-coupled
      // services (CanvasHandler, Interpolator) now live under
      // src/presentation/services/ instead; application/ depends on
      // presentation-owned interfaces only through app-owned ports (e.g.
      // CanvasStatePort, PixelSourcePort), never on presentation/ directly.
      name: 'app-application-no-presentation-dependency',
      comment:
        'src/application must not depend on src/presentation — dependencies always ' +
        'point from presentation towards application, never the reverse.',
      severity: 'error',
      from: { path: '^src/application' },
      to: { path: '^src/presentation' },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    // INFO: resolves the `@/*` (root tsconfig.json) and `@plot-digitizer/core`
    // path aliases so imports written in that style are actually followed —
    // without this, most of the app's real imports (which use `@/`, not
    // relative paths) are invisible to the rules above.
    tsConfig: {
      fileName: 'tsconfig.json',
    },
  },
}
