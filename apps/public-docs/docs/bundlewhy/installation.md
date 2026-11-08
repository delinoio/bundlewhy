# Install bundlewhy

:::info Availability
bundlewhy 0.1.0 is available on npm. Version 0.0.0 contains no executable. Use version 0.1.0 or newer for the CLI.
:::

## Requirements

- Node.js 22.18 or newer. bundlewhy runs your project's build through Node.js.
- A local Vite or Rspack project at a version listed on the [supported engines](/bundlewhy/supported-engines) page, with its dependencies installed.
- A desktop browser for the local web UI.

## Supported platforms

| Platform      | Architecture |
| ------------- | ------------ |
| macOS         | arm64        |
| Linux (glibc) | x64          |
| Windows       | x64          |

Other platforms are not supported in 0.1.0. On an unsupported platform, or when the platform package is missing, the launcher reports an error with reinstall guidance. It does not download or compile a fallback.

## Run through npm

Run bundlewhy through npm without a global install:

```sh
npx @delino/bundlewhy@0.1.0 --version
npx @delino/bundlewhy@0.1.0 analyze --out-dir ./bundlewhy-runs
```

Version 0.0.0 only reserves the package names and contains no executable. Use the commands above to select the first executable release.

## Build from source

Building bundlewhy from the repository source is intended for contributors who work on bundlewhy itself. It is not a supported installation path for application developers.

## Update or roll back

bundlewhy has no self-update. To update, run a newer version. To roll back, install or run a previous version. Each version reads only the result format it writes; see [troubleshooting](/bundlewhy/troubleshooting#result-and-report-problems) if an older or newer bundlewhy cannot open a saved run.

## Next steps

- [Getting started](/bundlewhy/getting-started)
- [Supported engines](/bundlewhy/supported-engines)
