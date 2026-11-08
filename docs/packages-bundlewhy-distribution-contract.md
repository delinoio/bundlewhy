# bundlewhy adapters and distribution contract

## Scope

`packages/bundlewhy` tests the engine collector adapters, which live in `crates/bundlewhy/adapters` (`common.mjs`, `vite.mjs`, `rspack.mjs`) and are embedded by the binary. It owns the npm/npx launcher (`bin/bundlewhy.cjs`), acceptance fixtures (`fixtures/vite-app`, `fixtures/rspack-app`) and acceptance scripts.

## Runtime and Language

Adapters are dependency-free ESM for Node.js 22.18 or newer. They run in the analyzed project's directory and load the project's own `vite` or `@rspack/core`. The launcher is CommonJS using Node.js built-ins.

## Users and Operators

Developers running `npx @delino/bundlewhy analyze ...` and maintainers running acceptance.

## Interfaces and Contracts

- Adapter protocol: `node <adapter>.mjs <request.json>`. The request carries the project root, selected configuration, configuration name, build directory, collection path and the frozen supported version. Adapters write protocol frames to stdout, one per line: `BUNDLEWHY-FRAME <protocolToken> <json>`, where the per-run token comes from the request and the JSON is a `progress`, `engine`, `error` (with a `BW_*` code and recovery) or `done` event. A `protection` event requires a token-matched acknowledgement on stdin after the Rust supervisor hashes the selected root files; the adapter waits before loading user configuration or starting Vite. Lines without the exact prefix and token are project output and are ignored, so JSON printed by configuration or plugins cannot impersonate adapter events. Adapters also write and one collection file (`collectVersion: 1`) with engine identity, overrides, a safe configuration summary, normalized modules (identifiers, paths, importers, exports, used exports, input format, rendered size, chunk files, bailouts, reasons, nearest package identity, hook-level and configured `moduleSideEffects` values for Vite), chunks, assets, warnings and structured engine logs. The Vite adapter (version `5`) records, for every chunk, the optional `imports`, `externalImports` and `dynamicImports` lists of the finished build's bundle and keeps them only when the finished build's chunk files and per-chunk module membership match the module snapshot and no chunk's generated code changed after it, otherwise it omits the three lists of every chunk (the Rust crate contract defines the exact rule and how the analysis treats a chunk without them). Version `3` added the optional `mangle` field (`enabled` or `disabled`) and the matching `build.rolldownOptions.output.minify.mangle` configuration summary entry. It resolves the value from the resolved Vite configuration and then replaces it in `renderStart` with the finalized output options of the first output, so a plugin `outputOptions` hook that changes `output.minify` is respected; only a verified disabled setting (`false` while Rolldown owns minification, `'dce-only'`, or an options object without `mangle`) writes `disabled`. A collection without the field, including every Rspack collection, is read as `enabled`, and the Rust crate contract defines how `disabled` skips the direct-eval detector and makes the Name mangling category not applicable. The Rspack adapter (version `2`) adds the optional `exportUsage` record (edges, availability, reason and skipped-edge count) collected through an appended observation-only `RsdoctorPlugin`; it records that plugin as a collection override, never replaces the project's engine or plugins, guards construction, `apply`, every hook and the payload, repeats a failed build once without the plugin in a new adapter process that loads the configuration and its imports from scratch, and reports `available: false` with a fixed reason code instead of failing the build when the API, hook or graph is unavailable. The reason is one of the stable codes in the Rust crate contract; the adapter never copies error text, source content, project paths or credentials into it or into its logs. Shared decoding lives in `adapters/common.mjs` and is covered by the adapter tests with a wrapper around the real `@rspack/core` that removes or reshapes the plugin API.
- Adapters never write project source, configuration or lockfiles; build output goes to the bundlewhy run directory. Vite keeps a configured relative or absolute root for the diagnostic build and collection context; when no root is configured, it uses the selected project root. Configuration summaries contain option names and summarized values, never environment values.
- On Windows, Vite receives ordinary drive and UNC paths instead of Rust's extended-length filesystem paths. Apply the conversion to selected project/configuration/output paths, configured roots and resolved collection roots, while preserving symlink selection and root protection. Leave device namespaces and non-Windows paths unchanged.
- The Rust binary embeds the adapter files and writes them into each run directory, so the installed adapter version always matches the binary.
- Distribution: the public `@delino/bundlewhy` launcher resolves a platform package for macOS arm64 (`darwin-arm64`), Linux x64 with glibc (`linux-x64-gnu`) and Windows x64 (`win32-x64-msvc`) and executes its binary without a shell, forwarding arguments, stdio, exit codes and signals. Unsupported platforms and missing platform packages report a structured error with reinstall guidance; there is no download or compile fallback. Release artifacts publish exact Node.js and platform requirements and the frozen engine matrix. Rollback installs a previous version.
- The workspace package stays private. Release staging creates a public `@delino/bundlewhy` manifest with exact-version optional dependencies on `@delino/bundlewhy-darwin-arm64`, `@delino/bundlewhy-linux-x64-gnu` and `@delino/bundlewhy-win32-x64-msvc`. Each native package declares its `os`, `cpu` and, for Linux, `libc: ["glibc"]`. This is platform-specific npm packaging of the CLI, not a Node-API addon.

## Release and bootstrap

`scripts/release.mjs` in this package owns staging, tarball checks and publication. Generated packages and tarballs live under `packages/bundlewhy/dist/release` and are never tracked. The launcher and binary versions must agree. Every package contains the root license and notice; native packages also include collected Rust and UI dependency license texts. `licenses/cargo.json` and `licenses/npm.json` preserve exact-version upstream license texts and source revision URLs for dependencies whose published archives omit their license file. Remove an entry when the locked dependency supplies that text; missing text without an exact fallback fails packaging. Package contents exclude fixtures, source maps, development scripts and credentials.

The one-time local bootstrap publishes metadata-only `0.0.0` packages under the `bootstrap` tag for all four names. Remove any `latest` tag npm creates for the first version. These packages contain no runtime and do not establish product availability. Configure each package with `npm trust github <package> --repo delinoio/bundlewhy --file release.yml --allow-publish --yes`. Account login and 2FA are required; credentials stay local and are never copied into the repository or GitHub secrets.

The `release.yml` workflow runs only on `v*` tag pushes. It requires a tag matching the workspace and Rust version on a commit reachable from `main`. It builds and checks native tarballs on macOS arm64, Ubuntu x64 and Windows x64. The publish job runs only after all three platform jobs succeed, grants `id-token: write`, and publishes with npm OIDC provenance, without an npm token. Platform packages publish before the launcher. A repeated run skips an already published version only when its registry integrity equals the local tarball; a mismatch or registry error fails. If registry processing delays verification, rerun the failed publish job with the original artifacts after the version is visible; do not rebuild artifacts for an already published version. The `latest` tag is reserved for usable stable releases.

Each native job installs the actual launcher and platform tarballs in an isolated directory, verifies the CLI version, and analyzes and exports both engine fixtures with that installed binary. This checks local tarball installation, not installation from the public registry. After publication, verify the registry versions and install the public package on each supported platform before recording public installation acceptance. Public guides retain their unavailable notice until a usable release is published.

## Storage

None beyond the run directory chosen by the user.

## Security

Adapters execute project configuration and plugins with the user's permissions. They do not read environment values into collections or logs.

## Logging

Adapters report progress and errors as JSON lines; Rust records them in the run log without source content.

## Build and Test

`pnpm --filter @delino/bundlewhy test` runs launcher and adapter tests, including the adapter unit tests that live next to the adapters (`crates/bundlewhy/adapters/*.test.mjs`). `pnpm --filter @delino/bundlewhy test:acceptance` builds the Rust binary, runs both fixtures end to end and verifies that fixture files are unchanged. Acceptance removes its generated web `dist` output after success or failure while preserving the original failure diagnostic. Fixtures pin `vite` `8.3.4` and `@rspack/core` `2.2.9` through this package's development dependencies.

Acceptance records include saved engine problem codes. For the committed repository fixtures, they also include error messages with fixture and temporary directories replaced by placeholders. Custom `--project` runs omit messages because build errors can contain private source text. Affected PR, main-push and manual CI also validate Windows native tarball installation and both fixture builds before release.

## Dependencies and Integrations

- [Rust foundation](crates-bundlewhy-foundation.md)

## Change Triggers

Adapter protocol or collection changes update the Rust collection types and this contract together. Engine version changes update the matrix in the Rust contract and public docs.

## References

- [Project index](project-bundlewhy.md)
- [Repository defaults](repository-defaults.md)
