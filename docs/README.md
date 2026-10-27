# Documentation Catalog

`docs/` is the source of truth for repository contracts. The bundlewhy project owns the local analysis CLI, web UI, adapters and public guides.

## Repository contracts

- [Technology defaults](repository-defaults.md)
- [Development and CI](repository-workflow-contract.md)
- [Configuration and secrets](repository-environment-contract.md)
- [Licensing](repository-license-contract.md)
- [Dependency security](repository-dependency-security-contract.md)

## Templates

- [Project index](project-template.md)
- [Domain contract](domain-template.md)

## Project catalog

### bundlewhy

- [project-bundlewhy](project-bundlewhy.md)
- [crates-bundlewhy-foundation](crates-bundlewhy-foundation.md)
- [apps-bundlewhy-web-contract](apps-bundlewhy-web-contract.md)
- [packages-bundlewhy-distribution-contract](packages-bundlewhy-distribution-contract.md)
- [protos-bundlewhy-v1-contract](protos-bundlewhy-v1-contract.md)
- [Public guides](apps-bundlewhy-docs-foundation.md)

## Instruction update policy

Keep feature behavior in its owning contract. Update `AGENTS.md` only when development procedures, directory ownership or development rules change. Keep validation evidence and issue or pull request traceability in GitHub records and CI logs, rather than instruction files or documentation. See [root instructions](../AGENTS.md).
