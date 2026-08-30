# AGENTS.md

Practical notes for AI agents working in this repository, so a new workspace doesn't have to rediscover "how does deployment actually work" from scratch. `CLAUDE.md` is the source of truth for operating rules (what's allowed on which branch, whether a production release is allowed, etc.); this file explains what actually gets deployed where, and by which trigger, underneath those rules.

## Setup

- Node.js 22
- Package manager: **yarn** (every CI job uses yarn). A `package-lock.json` also exists in the repo, but the CI/deploy pipeline is yarn-based — don't mix the two.
  ```bash
  yarn install
  yarn dev          # start the dev server at http://localhost:8888
  yarn lint         # eslint + vue-tsc
  yarn test         # jest
  yarn test:coverage
  yarn cypress:open # Cypress E2E (local)
  ```

## Deployment automation (GitHub Actions × Vercel)

All three workflows live under `.github/workflows/vercel-*.yaml`, each with its own trigger and target environment.

| Trigger | Environment | Job flow | Workflow file |
|---|---|---|---|
| **PR opened/updated** against any branch | Vercel Preview (per PR) | UnitTest (lint + test + coverage → Codecov) → Deploy-Preview → Slack notification. E2E (Cypress) only runs when **the PR's base branch is `main`** (see [#211](https://github.com/t29mato/starry-digitizer/issues/211)) | `vercel-preview-development.yaml` |
| **Push to `develop`** (including PR merges) | Vercel Preview (fixed develop URL) | UnitTest → Deploy-Develop → Slack notification | `vercel-develop-deployment.yaml` |
| **Tag push** matching `v[0-9]+.[0-9]+.[0-9]+` | Production (Vercel) + npm publish | UnitTest, E2E-Test → (version-match check) → Deploy-Production-on-Vercel and Publish-Production-on-NPM run in parallel → Slack notification | `vercel-production-deployment.yaml` |

Notes:
- Both the production-deploy and npm-publish jobs first verify that the tag's version matches `package.json`'s `version` field; the job fails if they don't match.
- Vercel credentials are the repo secrets `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` / `VERCEL_TOKEN`. If you use the Vercel CLI locally, `vercel link` creates a git-ignored `.vercel/` directory holding the project link info. Vercel project name: `starrydigitizer`.
- Slack notifications go to the `DIGITIZER_DEV_SLACK_WEBHOOK` webhook.

## Constraints specific to this repo (summarized from CLAUDE.md)

- **AI agents must not create tags, cut a GitHub Release, publish to npm, or land changes on `main` on their own judgment.** Since pushing a tag is exactly what triggers the production deploy + npm publish above, creating a tag *is* effectively shipping to production. This requires human approval.
- **Direct pushes to `main` are prohibited.** Work off `develop`: feature branch → PR into `develop` only.
- See `CLAUDE.md` for full details and rationale.

## See also

- `README.md`: product overview, features, usage
- `CLAUDE.md`: operating rules and quality policy for AI agents (workers) in this repo
