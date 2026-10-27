# bundlewhy public documentation

## Scope

`apps/public-docs` owns the eight user guides at `docs/bundlewhy` within that app. The Rspress build keeps the existing clean `/bundlewhy/` routes and writes `doc_build`. It does not publish or change DNS. Production hosting for this separate repository is not configured.

## Interfaces and content

The sidebar includes overview, installation, getting started, supported engines, interpreting diagnostics, privacy and export, limitations, and troubleshooting. Preserve the frozen engine matrix, evidence qualifications, privacy boundaries and all known limits. Every guide states that version 0.1.0 is in development and bundlewhy is not yet published to npm. Repository and issue links point to `delinoio/bundlewhy`. No repository-internal paths, credentials or release-availability claims belong in public content.

## Development and validation

`pnpm dev:public-docs` uses the shared port wrapper on fixed loopback port `46302`; conflicts fail. `pnpm --filter bundlewhy-docs test` builds the guides and checks route artifacts, article headings, required links, availability notices and HTML links. Mutation tests verify the availability guards. No deployment credentials are needed.

## Dependencies

See [project ownership](project-bundlewhy.md), [Rust contract](crates-bundlewhy-foundation.md), and [workflow](repository-workflow-contract.md).
