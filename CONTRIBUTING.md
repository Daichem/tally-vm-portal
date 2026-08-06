# Contributing

Create a branch, make a focused change, and open a pull request against `main`.

Before pushing:

```sh
pnpm install
pnpm check
```

Production configuration belongs in Azure Function App settings or non-secret GitHub Actions variables as documented. Never commit a local settings file, runtime `config.json`, VM resource name, resource group, credential, access token, or publish profile.

Changes to authentication, authorization, VM targeting, deployment identity, CORS, or Azure RBAC require an explicit security review in the pull request.
