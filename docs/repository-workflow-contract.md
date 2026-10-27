# Repository Workflow Contract

## Scope

This repository owns bundlewhy. See [project ownership](project-bundlewhy.md) and [the public-guide contract](apps-bundlewhy-docs-foundation.md). The transferred runtime, adapters, UI, fixtures, schemas and generated bindings retain their directory layout. Public hosting and release publication are not configured.

## Installation

Use Node.js 24 from `.nvmrc` and pnpm 10.26.2 from `package.json`. Run `pnpm install --frozen-lockfile`. The prepare script installs Lefthook through `scripts/install-git-hooks.sh`. Archives without Git metadata skip hook installation. Linked worktrees may use their shared Git hooks directory; unrelated custom hook paths remain protected.

## Formatting

Root `pnpm format` writes fixes and `pnpm format:check` checks without rewriting. Both use pinned Rstack and `rstack.config.ts`. Default local selection compares the merge base of `origin/main` and HEAD, including working changes and untracked files. Explicit `--base <sha> --head <sha>` arguments select that committed comparison. Local `--all` selects existing tracked files. Before the first commit, use `--staged`.

Lefthook runs `node scripts/ci/format-changed.mjs --staged --write` with `stage_fixed: true`. It preserves unstaged edits, supports initial commits and rejects parser failures. Select files with NUL-separated Git paths, skip deletions and symlinks, and preserve imported skills, generated files and lockfiles through shared exclusions.

CI requires an explicit comparison and rejects local `--staged` and `--all` modes. An unset, empty or case-insensitive `false` CI value means local execution; every other nonempty value enables CI restrictions.

## Validation

Run `pnpm test:tooling` for formatter and hook fixtures. CI runs these fixtures and `pnpm format:check --base <sha> --head <sha>` on Ubuntu for pull requests, main pushes and manual dispatch. PR comparisons use the pull request base and head. Push comparisons use the prior and current commits. Manual comparisons use the merge base with `origin/main`; an optional `base` input selects another existing revision. A root push has no previous commit, so CI creates a local empty-tree comparison commit without pushing it. No full manual mode or macOS runners are configured.

Each CI run records the validation revision, comparison revisions, commands and results in its logs and job summary. Affected runtime checks use the same exact comparison for project paths and shared manifests, scripts and workflow configuration. CI runs schema lint/format/breaking/generation freshness, Go binding tests, UI/adapter/launcher/guide tests, Rust formatting/tests/Clippy and real Vite/Rspack fixture acceptance on Ubuntu. `cargo test` at the repository root covers the single Rust workspace member. Build the UI before distributing a Rust binary; release-profile builds require it. Fixture acceptance removes generated UI output. These checks do not establish cross-platform native or release acceptance.

## Assets and licensing

Every repository-owned `dist` directory is ignored generated output and must be removed after validation. Assets at least 512 KiB require exact-path Git LFS attributes and hydration before use. The transferred bundlewhy sources and fixtures include no LFS assets.

## Dependency updates

Renovate extends `github>delinoio/renovate-config`. Ordinary updates and lockfile maintenance use Monday 00:00–04:00 in `Asia/Seoul`; vulnerability updates retain the inherited immediate security policy. Follow the dependency security contract and retain unresolved findings in GitHub or CI records.
