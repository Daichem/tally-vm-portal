# Daichem Tally VM Portal

A platform-independent web portal that lets explicitly authorized Daichem users view and change the power state of approved Azure virtual machines.

The browser application is deployed with GitHub Pages. It signs users in with Microsoft Entra ID and calls an Azure Function API. The API validates the Entra access token and application role, then uses its managed identity to perform narrowly scoped VM operations. No Azure client secret is stored in the browser, repository, or GitHub Actions.

## Architecture

```text
User browser
  -> GitHub Pages web app
  -> Microsoft Entra ID sign-in
  -> Azure Function API with bearer token
  -> Function managed identity
  -> Approved Azure VMs only
```

End users do not need Azure portal or Azure resource access. Access is granted by assigning the `Vm.Operator` application role to selected users in Microsoft Entra ID.

## Repository layout

- `apps/web`: static Vite/TypeScript browser application
- `apps/api`: Azure Functions Node.js API
- `docs`: architecture, setup, deployment, and operating instructions
- `.github/workflows`: validation and deployment automation

## Local development

Requirements:

- Node.js 22
- pnpm 11
- Azure Functions Core Tools 4, only when running the API locally

Install and validate:

```sh
pnpm install
pnpm check
```

Create local configuration files from the committed examples:

```sh
cp apps/web/public/config.example.json apps/web/public/config.json
cp apps/api/local.settings.example.json apps/api/local.settings.json
```

Start the web application:

```sh
pnpm --filter @daichem/tally-vm-web dev
```

See [Azure setup](docs/azure-setup.md) for the administrator-controlled cloud configuration, [GitHub configuration](docs/github-configuration.md) for deployment settings, and [costs](docs/costs.md) for the expected operating-cost model.

## Security properties

- Single-tenant Entra authentication
- Explicit `Vm.Operator` application-role authorization
- JWT issuer, audience, scope, calling-client, and role validation in the API
- Managed identity instead of an Azure client secret
- Server-side allow-list for VM identifiers
- Explicit `start` or `deallocate` commands instead of a race-prone blind toggle
- GitHub Actions OIDC for deployment instead of an Azure publish-profile secret

Tenant and application client identifiers are identifiers, not credentials, and are necessarily observable during browser authentication. Subscription IDs, resource groups, VM names, role assignments, and managed-identity permissions remain on the API side.

## License

Copyright (c) Daichem. All rights reserved. No license is granted to use, copy, modify, or distribute this software except with Daichem's written permission.
