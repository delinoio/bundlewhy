# Repository Workflow Contract

## Scope

This repository owns bundlewhy. See [project ownership](project-bundlewhy.md) and [the public-guide contract](apps-bundlewhy-docs-foundation.md). The transferred runtime, adapters, UI, fixtures, schemas and generated bindings retain their directory layout. Public hosting and release publication are not configured.

## Installation

Use Node.js 24 from `.nvmrc` and pnpm 10.26.2 from `package.json`. Run `pnpm install --frozen-lockfile`. The prepare script installs Lefthook through `scripts/install-git-hooks.sh`. Archives without Git metadata skip hook installation. Linked worktrees may use their shared Git hooks directory; unrelated custom hook paths remain protected.

## Task orchestration

The pinned `turbo` dependency and root `turbo.json` orchestrate packages selected by `pnpm-workspace.yaml`: `apps/*` and `packages/*`. Commands run the tasks declared by the bundlewhy workspace packages.

Root `pnpm build`, `pnpm dev`, `pnpm lint` and `pnpm typecheck` delegate to `turbo run`. Root `pnpm test` runs workspace tests and the repository-wide `test:tooling` task. The latter runs the existing formatter and hook fixtures directly and is registered as `//#test:tooling`. It is uncached so each invocation checks the current Git and hook environment. `prepare`, `format` and `format:check` remain direct commands: hook installation has side effects, and formatting depends on Git revisions, staged changes and untracked files rather than package inputs.

Root `pnpm dev` starts all workspace development servers together through the unfiltered `turbo run dev` command. Each workspace package that owns a development server exposes it through its `dev` script. Packages without a development server do not need a `dev` script. Package-specific development is available through an explicit filtered command; the root command always selects all packages. The public documentation package owns the current development server.

Define each workspace task in its owning `package.json`. Declare workspace dependencies so Turbo can order tasks: builds depend on dependency builds, tests depend on dependency builds, and lint and typecheck tasks depend on their corresponding dependency tasks. Build and test outputs retain `dist/**` and `doc_build/**`; packages with other outputs must override them in a package-local `turbo.json` that extends `//`. Declare any additional test reports or incremental compiler outputs there. Development tasks are persistent and uncached.

Turbo uses strict environment mode by default. Package contracts and package-local task configuration must declare environment variables, ignored configuration inputs and shared root inputs that affect results before enabling their caching. Keep side-effecting or environment-dependent tasks uncached when their inputs cannot be fully declared. Do not route Git-sensitive formatting through cached tasks or pass credentials through global environment wildcards. Remote caching is not configured. `.turbo/` is ignored local state; generated `dist` directories remain subject to the cleanup rule below.

For a package subset, use `pnpm exec turbo run <task> --filter=<package>`. Use `pnpm exec turbo run <task> --dry=json` to inspect the graph without running tasks. Root-only fixture execution is also available as `pnpm test:tooling`. New runtime projects must add their own contracts and package scripts before these commands can establish runtime acceptance.

## Formatting

Root `pnpm format` writes fixes and `pnpm format:check` checks without rewriting. Both use pinned Rstack and `rstack.config.ts`. Default local selection compares the merge base of `origin/main` and HEAD, including working changes and untracked files. Explicit `--base <sha> --head <sha>` arguments select that committed comparison. Local `--all` selects existing tracked files. Before the first commit, use `--staged`.

Lefthook runs `node scripts/ci/format-changed.mjs --staged --write` with `stage_fixed: true`. It preserves unstaged edits, supports initial commits and rejects parser failures. Select files with NUL-separated Git paths, skip deletions and symlinks, and preserve imported skills, generated files and lockfiles through shared exclusions.

CI requires an explicit comparison and rejects local `--staged` and `--all` modes. An unset, empty or case-insensitive `false` CI value means local execution; every other nonempty value enables CI restrictions.

## Validation

Run `pnpm test:tooling` for formatter, hook and change-planning fixtures, or `pnpm test` to include workspace tests. CI plans affected fixtures and `pnpm format:check --base <sha> --head <sha>` on Ubuntu for pull requests, main pushes and manual dispatch. PR comparisons use the pull request base and head. Push comparisons use the prior and current commits. Manual comparisons use the merge base with `origin/main`; an optional `base` input selects another existing revision. A root push has no previous commit, so CI creates a local empty-tree comparison commit without pushing it. No full manual mode or macOS runners are configured.

Each CI run records the validation revision, comparison revisions, commands and results in its logs and job summary. Affected runtime checks use the same exact comparison for project paths and shared manifests, scripts and workflow configuration. CI runs schema lint/format/breaking/generation freshness, Go binding tests, UI/adapter/launcher/guide tests, Rust formatting/tests/Clippy and real Vite/Rspack fixture acceptance on Ubuntu. `cargo test` at the repository root covers the single Rust workspace member. Build the UI before distributing a Rust binary; release-profile builds require it. Fixture acceptance removes generated UI output. These checks do not establish cross-platform native or release acceptance.

The `changes` job resolves that comparison and runs `scripts/ci/plan.mjs` without installing dependencies. It publishes `base`, `head`, `format`, `fixtures`, `bundlewhy` and `quality` outputs. Formatting uses the existing formatter's changed-file selection; Rstack still owns exclusions. Fixtures run for changes, deletions or renames affecting `scripts/ci/`, `scripts/install-git-hooks.sh`, `.github/workflows/CI.yml`, `.nvmrc`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `rstack.config.ts` or `lefthook.yml`. Documentation-only changes select formatting without fixtures. Runtime checks retain the existing selection for apps, packages, crates, protos, shared manifests, scripts and the workflow. The `quality` job runs when formatting, fixtures or runtime validation is selected and passes the exact comparison to formatting. Empty comparisons or changes with no validation inputs skip `quality`. The planner records the checkout revision, comparison and selections in logs and the job summary. New shared validation dependencies must update the planner inputs.

The `ci-result` job aggregates validation through `needs`, including `changes` and `quality`. It runs with `always()` so dependency failures do not skip the aggregate check. Failed or cancelled dependencies fail `ci-result`. The `changes` job must succeed; a skipped `quality` job passes only when the planner selected no validation. Successful dependencies and other skipped dependencies pass. Every new PR validation job must be included in `ci-result.needs`. The aggregate job runs on Ubuntu for the same PR, main-push and manual-dispatch events.

## Assets and licensing

Every repository-owned `dist` directory is ignored generated output and must be removed after validation. Assets at least 512 KiB require exact-path Git LFS attributes and hydration before use. The transferred bundlewhy sources and fixtures include no LFS assets.

## Dependency updates

Renovate extends `github>delinoio/renovate-config`. Ordinary updates and lockfile maintenance use Monday 00:00–04:00 in `Asia/Seoul`; vulnerability updates retain the inherited immediate security policy. Follow the dependency security contract and retain unresolved findings in GitHub or CI records.
