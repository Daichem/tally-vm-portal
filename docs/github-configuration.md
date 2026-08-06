# GitHub repository configuration

Repository: `Daichem/tally-vm-portal`

All required GitHub configuration values are non-secret identifiers. Never add an Azure client secret, Function host key, publish profile, access token, actual VM name, or resource-group name to GitHub.

## Repository variables

Open **Settings → Secrets and variables → Actions → Variables** and create:

| Variable                 | Value                                                    |
| ------------------------ | -------------------------------------------------------- |
| `ENTRA_TENANT_ID`        | API/SPA tenant Directory ID                              |
| `ENTRA_SPA_CLIENT_ID`    | `Daichem Tally VM Web` Application ID                    |
| `ENTRA_API_SCOPE`        | `api://<API_CLIENT_ID>/Vm.Access`                        |
| `API_BASE_URL`           | `https://<FUNCTION_APP_DEFAULT_HOSTNAME>/api/`           |
| `AZURE_DEPLOY_CLIENT_ID` | `Daichem Tally VM GitHub Deploy` Application ID          |
| `AZURE_TENANT_ID`        | Azure tenant Directory ID                                |
| `AZURE_SUBSCRIPTION_ID`  | Azure subscription ID used by the deployment login       |
| `AZURE_FUNCTIONAPP_NAME` | Function App resource name, without `.azurewebsites.net` |

Copy `FUNCTION_APP_DEFAULT_HOSTNAME` from the Function App's **Overview → Default domain** value. Flex Consumption apps can use a secure unique hostname such as `name-random.eastus-01.azurewebsites.net`; do not construct this URL from the Function App name.

The deployment workflows are intentionally skipped while required variables are absent.

## Environments

1. Open **Settings → Environments**.
2. Create `production` if the API workflow has not created it automatically.
3. Restrict deployment branches to `main`.
4. GitHub Pages creates the `github-pages` environment automatically.

Manual approvals are optional for this small deployment. If enabled, ensure at least one administrator other than the workflow actor can approve deployments.

## Pages

Open **Settings → Pages** and ensure the build/deployment source is **GitHub Actions**. The workflow publishes the contents of `apps/web/dist`; no `gh-pages` branch is used.

The initial URL is `https://daichem.github.io/tally-vm-portal/`. The build uses relative assets, so a later custom domain does not require a code change.

## Recommended repository rules

After the initial `main` branch is created, add a branch ruleset for `main`:

- require a pull request before merging;
- require the `Format, test, and build` status check;
- require the CodeQL check;
- block force pushes and deletion;
- require conversation resolution;
- allow repository administrators to bypass only for emergencies.

On GitHub Free for organizations, rule availability can change. Enable every listed protection shown by the current repository settings.

## Security settings

Under **Settings → Code security and analysis**, enable the no-cost options available to this public repository:

- Dependabot alerts;
- Dependabot security updates;
- secret scanning and push protection;
- CodeQL default or advanced setup. This repository already supplies advanced setup in `.github/workflows/codeql.yml`.

Do not enable a second CodeQL default setup if GitHub reports that advanced setup is active.
