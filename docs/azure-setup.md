# Azure and Microsoft Entra administrator setup

Complete these gates in order. Do not enter an application client secret at any stage.

## Values to record

Keep an administrator worksheet with these values. They are identifiers, not passwords.

| Placeholder           | Meaning                                            |
| --------------------- | -------------------------------------------------- |
| `<TENANT_ID>`         | Microsoft Entra Directory (tenant) ID              |
| `<SUBSCRIPTION_ID>`   | Subscription containing the VM                     |
| `<API_CLIENT_ID>`     | Application ID of `Daichem Tally VM API`           |
| `<SPA_CLIENT_ID>`     | Application ID of `Daichem Tally VM Web`           |
| `<FUNCTION_APP_NAME>` | Globally unique Azure Function App name            |
| `<DEPLOY_CLIENT_ID>`  | Application ID of `Daichem Tally VM GitHub Deploy` |
| `<RESOURCE_GROUP>`    | Resource group containing the target VM            |
| `<VM_NAME>`           | Actual Azure VM resource name                      |

The initial browser URL is:

```text
https://daichem.github.io/tally-vm-portal/
```

Its CORS origin is only:

```text
https://daichem.github.io
```

## Gate 1: confirm tenant users

In **Microsoft Entra admin center → Identity → Users → All users**, confirm every intended operator exists in the same tenant as a **Member** account and can sign in with their Daichem Microsoft 365 address.

They do not need an Azure subscription role, Azure portal access, or individual VM RBAC permission.

## Gate 2: register the protected API

1. Open **Microsoft Entra admin center → Identity → Applications → App registrations**.
2. Select **New registration**.
3. Name it `Daichem Tally VM API`.
4. Select **Accounts in this organizational directory only**.
5. Leave Redirect URI empty and create the registration.
6. Record its **Application (client) ID** as `<API_CLIENT_ID>` and the **Directory (tenant) ID** as `<TENANT_ID>`.
7. Open **Expose an API** and set the Application ID URI to `api://<API_CLIENT_ID>`.
8. Select **Add a scope** and enter:
   - Scope name: `Vm.Access`
   - Who can consent: `Admins only`
   - Admin consent display name: `Access the Tally VM API`
   - Admin consent description: `View and change approved Tally VM power state`
   - State: Enabled
9. Open **App roles → Create app role** and enter:
   - Display name: `VM Operator`
   - Allowed member types: `Users/Groups`
   - Value: `Vm.Operator`
   - Description: `May view, start, and deallocate approved Tally VMs`
   - Enabled: selected
10. Open **Manifest** and ensure the API requests version 2 access tokens. In the current manifest editor, `api.requestedAccessTokenVersion` must be `2`.

No certificate or client secret is required for this API registration.

## Gate 3: register the browser application

1. Return to **App registrations → New registration**.
2. Name it `Daichem Tally VM Web`.
3. Select **Accounts in this organizational directory only**.
4. Create the registration and record its Application ID as `<SPA_CLIENT_ID>`.
5. Open **Authentication → Add a platform → Single-page application**.
6. Add these redirect URIs:
   - `https://daichem.github.io/tally-vm-portal/`
   - `http://localhost:5173/` for local testing
7. Open **API permissions → Add a permission → My APIs → Daichem Tally VM API → Delegated permissions**.
8. Select `Vm.Access`, add the permission, then select **Grant admin consent for Daichem**.
9. Confirm the permission status shows granted.

Do not enable implicit grant and do not create a browser client secret. The authorization-code flow with PKCE is handled by MSAL.

## Gate 4: assign only approved users

1. Open **Enterprise applications → All applications → Daichem Tally VM API**.
2. Under **Properties**, set **Assignment required?** to **Yes** and save.
3. Open **Users and groups → Add user/group**.
4. Select an intended operator.
5. Select the `VM Operator` role and assign it.
6. Repeat for each approved operator.

Direct user assignment is the simplest option and does not give the user Azure resource access. Group-to-application assignment can be used if your Entra licensing supports it.

## Gate 5: create the Azure Function App

In the Azure portal:

1. Select **Create a resource → Function App**.
2. Choose the subscription and a dedicated resource group such as `rg-tally-vm-portal`.
3. Select **Flex Consumption** unless Daichem already has an approved App Service plan.
4. Choose a globally unique `<FUNCTION_APP_NAME>`.
5. Runtime stack: **Node.js**; version: **22 LTS**; operating system: **Linux**.
6. Region: use the same or a nearby region to the target VM.
7. Keep the default storage account or create a dedicated standard general-purpose v2 account.
8. Enable Application Insights unless organizational policy provides another logging destination.
9. Create the Function App.
10. Open **Identity → System assigned**, set Status to **On**, and save. Record the displayed principal/object ID.

No always-ready instances are required for this low-volume portal.

## Gate 6: give the Function only VM power permissions

Create a custom Azure role at the subscription level using the template in `infra/vm-power-operator-role.example.json`. Replace `<SUBSCRIPTION_ID>` before importing it under **Subscription → Access control (IAM) → Add → Add custom role → Start from JSON**.

Then, for each approved VM:

1. Open the VM resource itself.
2. Select **Access control (IAM) → Add role assignment**.
3. Select the custom role `Daichem Tally VM Function Operator`.
4. Assign access to **Managed identity**.
5. Choose the Function App and save.

Assigning at each VM resource is narrower than assigning at the resource group. Do not assign `Owner` or `Contributor` to either the Function or end users.

## Gate 7: configure the Function

Open **Function App → Settings → Environment variables → App settings** and add:

| Name                    | Value               |
| ----------------------- | ------------------- |
| `AZURE_SUBSCRIPTION_ID` | `<SUBSCRIPTION_ID>` |
| `ENTRA_TENANT_ID`       | `<TENANT_ID>`       |
| `ENTRA_API_CLIENT_ID`   | `<API_CLIENT_ID>`   |
| `ENTRA_SPA_CLIENT_ID`   | `<SPA_CLIENT_ID>`   |
| `ENTRA_API_AUDIENCE`    | `<API_CLIENT_ID>`   |
| `REQUIRED_SCOPE`        | `Vm.Access`         |
| `REQUIRED_APP_ROLE`     | `Vm.Operator`       |
| `VM_TARGETS_JSON`       | JSON shown below    |

Example `VM_TARGETS_JSON`, entered as a single line:

```json
[
  {
    "id": "tally",
    "displayName": "Tally VM",
    "resourceGroup": "<RESOURCE_GROUP>",
    "name": "<VM_NAME>"
  }
]
```

The `id` and `displayName` may be shown to authorized browser users. The resource group and VM name remain server-side.

Under **Function App → API → CORS**:

1. Remove `*` if present.
2. Add exactly `https://daichem.github.io`.
3. Do not include `/tally-vm-portal/` because a CORS origin never contains a path.
4. Save.

## Gate 8: create secretless GitHub deployment identity

1. In **App registrations**, create a single-tenant registration named `Daichem Tally VM GitHub Deploy` with no redirect URI.
2. Record its Application ID as `<DEPLOY_CLIENT_ID>`.
3. Open **Certificates & secrets → Federated credentials → Add credential**.
4. Select the **GitHub Actions deploying Azure resources** scenario.
5. Enter:
   - Organization: `Daichem`
   - Repository: `tally-vm-portal`
   - Entity type: `Environment`
   - Environment: `production`
   - Credential name: `github-production`
6. Create the credential. Do not create a client secret.
7. Open the Function App resource → **Access control (IAM) → Add role assignment**.
8. Assign **Website Contributor** to the `Daichem Tally VM GitHub Deploy` service principal at this Function App resource only.

If organizational policy blocks Website Contributor deployment, use a custom deployment role containing only the Microsoft.Web deployment actions approved by your Azure security team.

## Gate 9: configure and run GitHub deployments

Follow [GitHub configuration](github-configuration.md) to enter the recorded values. Then:

1. Run **Actions → Deploy Azure Function API → Run workflow**.
2. Confirm the deployment succeeds and the Function App lists `listVms` and `changeVmState`.
3. Run **Actions → Deploy web portal → Run workflow**.
4. Visit `https://daichem.github.io/tally-vm-portal/`.
5. Sign in with one assigned operator and verify status retrieval.
6. Sign in with an unassigned tenant test account and verify the API returns an authorization message.
7. Test start/deallocate only during an approved maintenance window.

## Adding a custom domain later

When `tally.daichem.com` is ready:

1. Add `https://tally.daichem.com/` to the SPA redirect URIs.
2. Add `https://tally.daichem.com` to Function CORS.
3. Configure the GitHub Pages custom domain and DNS CNAME.
4. Verify HTTPS and sign-in.
5. Optionally remove the original GitHub Pages redirect URI and CORS origin.

No code or architecture change is required.

## Microsoft references

- [Add app roles and receive them in tokens](https://learn.microsoft.com/en-us/entra/identity-platform/howto-add-app-roles-in-apps)
- [Assign users or groups to an enterprise application](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/assign-user-or-group-access-portal)
- [Use Azure Login with GitHub Actions OIDC](https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure-openid-connect)
- [Azure Functions Flex Consumption](https://learn.microsoft.com/en-us/azure/azure-functions/flex-consumption-plan)
- [Create Azure custom roles](https://learn.microsoft.com/en-us/azure/role-based-access-control/custom-roles)
