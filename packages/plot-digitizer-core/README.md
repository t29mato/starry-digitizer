# plot-digitizer (core)

> **Status: pre-alpha / not published.** This package was extracted in-repo
> from [starry-digitizer](../../README.md)'s `domain`/`application` layers.
> Do not depend on it from outside this repo yet.

Framework-agnostic TypeScript core for extracting numeric data points from
graph/plot images: axis calibration, pixel-color-based point extraction,
curve interpolation, and project (de)serialization — with no dependency on
Vue, the DOM, or any specific UI framework.

## Design

See [`docs/design/plot-digitizer-architecture.md`](../../docs/design/plot-digitizer-architecture.md)
for the full architecture (layers, dependency direction, migration phases).

Current phase: **Phase 4 — public API facade confirmed**. Phases 1-3 moved
all the framework-agnostic domain/application logic here; `src/index.ts` is
now the package's confirmed public surface, and the host app's old
`src/domain`/`src/application` re-export wrappers have been removed — the
app imports this package directly via the `@plot-digitizer/core` alias.
AutoLineDigitizerService/HttpClientPort were scoped out of Phase 3 entirely
(the AI-assisted-extraction feature was withdrawn from the product before
being ported — see the design doc's Phase 3 note). Phase 5 (standalone
repo / npm publish) is proposal-only until the criteria in design doc
section 3-a are met.

## Layout

```
src/
  domain/
    models/       # Axis, AxisSet, Dataset
    services/     # AxisSetCalculator
    types.ts      # Coord, Point, PointMode
    constants.ts  # POINT_MODE
  application/
    strategies/   # LineExtract, SymbolExtractByArea, ExtractParent
    services/     # Extractor, Magnifier, Confirmer
    useCases/     # SerializeProjectUseCase (ProjectDTO ⇄ domain models)
    ports/        # PixelSourcePort
    dto/          # AxisDTO, AxisSetDTO, DatasetDTO, CanvasStateDTO, ProjectDTO
    utils/        # extractColorSwatches, getPointsTotalDistance
  index.ts        # public API facade — import everything from here
```

Not here, and not planned to move here: `CanvasHandler`/`Interpolator` (DOM
canvas services — see design doc section 8 item 3 on why mask *drawing*
stayed out of scope) and `ProjectService`'s ZIP/File/Blob handling. Both
remain in the host app (`src/presentation/services/`,
`src/application/services/projectService/`).

## Notes on any future network-facing feature

Any use case that talks to an external API (e.g. a future from-scratch
AI-assisted digitizer, internally called "deep-digitizer") MUST take the
endpoint URL as a required constructor argument, not a bundled default — a
library must never silently send a user's image data to a third-party host.
Document the endpoint in the usage example instead of hardcoding it.
(Design-review decision, see design doc section 8, item 5.)

## Scripts

Run from inside this directory (`packages/plot-digitizer-core`) — it is
**not** wired into a root workspace (npm/yarn workspaces would require the
repo root — itself the published `starry-digitizer` package — to become
`private: true`, which was rejected; the host app resolves this package via
a TS/bundler path alias instead, see design doc Phase 0/1).

```
yarn install
yarn test
yarn test:coverage
yarn lint
yarn build
```
