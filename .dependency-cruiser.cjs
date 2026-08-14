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
      name: 'core-no-vue-or-dom',
      comment:
        'plot-digitizer-core must stay framework-agnostic: no Vue/Vuetify import, ' +
        'and no dependency-cruiser-visible DOM lib usage.',
      severity: 'error',
      from: { path: '^packages/plot-digitizer-core' },
      to: { path: '^(vue|@vue|vuetify)' },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
  },
}
