# Contributing

NexusContent is in early development. Architectural consistency is more
important than feature count.

Before contributing, read `README.md` in full, especially the `Architectural
Rules` and `Design Test` sections.

## Contribution Requirements

New contributions should:

* preserve provider independence
* preserve framework independence in Core
* include appropriate tests
* include documentation
* avoid unnecessary dependencies
* avoid provider specific logic in Core
* avoid premature abstractions

## Development Workflow

```text
Create feature branch
       ↓
Implement change
       ↓
Run tests
       ↓
Run type checks
       ↓
Build example project
       ↓
Open pull request
       ↓
CI
       ↓
Review
       ↓
Merge
```

Direct unreviewed changes to the primary branch should be avoided.

## Commands

```bash
npm run typecheck     # Type check the package and tests
npm test              # Run the test suite
npm run build         # Build the package into dist/
npm run build --workspace @nexuscontent/example-astro-basic  # Build the example
```

## Environment Variables

See `.env.example`. Never commit secrets. Provide secrets through environment
variables or the deployment platform's secret management system.
