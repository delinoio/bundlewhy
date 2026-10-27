# bundlewhy

Explain why Vite or Rspack could not apply an optimization to a client production build. bundlewhy runs a local diagnostic build and serves a local web report. It never changes project source or configuration.

Version 0.1.0 is in development and is not yet published to npm.

## Development

Use Node.js 24, pnpm 10.26.2 and the Rust toolchain in `rust-toolchain`.

```sh
pnpm install --frozen-lockfile
pnpm --filter bundlewhy-web build
cargo build -p bundlewhy
cargo run -p bundlewhy -- engines
```

Run `cargo test` for Rust, `pnpm test` for the UI, adapters, launcher and guides, and `pnpm test:tooling` for formatting fixtures. Run `pnpm --filter @delino/bundlewhy test:acceptance` for real Vite and Rspack analysis and HTML export. Remove generated `dist` directories after validation.

`pnpm proto:generate` regenerates Go and TypeScript bindings. `pnpm proto:lint` checks schemas. `pnpm dev:public-docs` serves the guides on fixed loopback port 46302; conflicts fail.

Read the [project contract](docs/project-bundlewhy.md), [documentation catalog](docs/README.md) and [public guides](apps/public-docs/docs/bundlewhy/index.md). Public hosting and release publication are not configured by this transfer.

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
