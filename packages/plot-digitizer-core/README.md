# plot-digitizer (core)

> **Status: pre-alpha / not published.** This package is being extracted
> in-repo from [starry-digitizer](../../README.md)'s `domain`/`application`
> layers. Do not depend on it yet.

Framework-agnostic TypeScript core for extracting numeric data points from
graph/plot images: axis calibration, pixel-color-based point extraction,
curve interpolation, and project (de)serialization — with no dependency on
Vue, the DOM, or any specific UI framework.

## Design

See [`docs/design/plot-digitizer-architecture.md`](../../docs/design/plot-digitizer-architecture.md)
for the full architecture (layers, dependency direction, migration phases).

Current phase: **Phase 0 — scaffolding**. Only build/test/lint tooling and a
placeholder entry point exist so far; no domain logic has been moved in yet
(that's Phase 1).

## Layout

```
src/
  domain/        # entities + domain services (Phase 1+)
  application/    # use cases, extraction strategies, ports (Phase 1+)
  infrastructure/ # port implementations that are safe to be isomorphic,
                  # e.g. a fetch-based HTTP client (Phase 3+)
  packageInfo.ts  # Phase 0 scaffold only — proves the toolchain works,
                  # will be removed once real exports land
  index.ts        # public API facade
```

## Notes on any future network-facing feature

Any use case that talks to an external API (e.g. an AI-assisted digitizer
backend) MUST take the endpoint URL as a required constructor argument, not a
bundled default — a library must never silently send a user's image data to a
third-party host. Document the endpoint in the usage example instead of
hardcoding it. (Design-review decision, see design doc section 8, item 5.)

## Scripts

Run from inside this directory (`packages/plot-digitizer-core`) — it is
**not** wired into the root workspace yet, see the Phase 0 PR description for
why.

```
yarn install
yarn test
yarn test:coverage
yarn lint
yarn build
```
