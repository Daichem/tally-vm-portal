# Architecture and security boundaries

## Components

| Component                 | Publicly reachable     | Holds credentials         | Responsibility                                             |
| ------------------------- | ---------------------- | ------------------------- | ---------------------------------------------------------- |
| GitHub Pages              | Yes                    | No                        | UI and Entra browser sign-in                               |
| Microsoft Entra ID        | Yes                    | Microsoft-managed         | Authentication and `Vm.Operator` assignment                |
| Azure Function API        | Yes, authenticated API | No client secret          | Token validation, authorization, VM allow-list, audit logs |
| Function managed identity | No user interface      | Azure-managed identity    | Calls Azure Resource Manager                               |
| Azure VM                  | No change required     | Existing VM configuration | Target resource                                            |

The webpage being publicly retrievable is not the authorization boundary. The API authorizes every request independently.

## Request flow

1. The browser loads static HTML, CSS, JavaScript, and non-secret Entra identifiers from GitHub Pages.
2. MSAL sends the user to the tenant-specific Microsoft sign-in service.
3. Entra issues an API access token only for the registered API scope.
4. The browser sends the token as an `Authorization: Bearer` header.
5. The API verifies the token signature using Microsoft signing keys and validates:
   - issuer and tenant
   - API audience
   - calling SPA client ID (`azp` or `appid`)
   - delegated `Vm.Access` scope
   - assigned `Vm.Operator` application role
   - token lifetime and subject
6. The API maps the public VM alias to a server-side Azure resource-group and VM name.
7. The Function managed identity invokes the approved Azure Compute operation.

## Information exposure

Browser-visible values:

- Entra tenant ID
- SPA application client ID
- API scope/application identifier
- Azure Function public hostname
- generic public VM alias and display label returned by the API

Server-side values:

- Azure subscription ID
- resource-group names
- actual VM resource names
- managed-identity object ID and Azure RBAC assignments
- authorized-user assignments

The browser-visible values are routing identifiers, not credentials. Hashing or encrypting them in JavaScript would not provide confidentiality because the browser must recover and transmit the original values.

## Authorization model

Users are assigned the API application role, not Azure VM permissions. Only the Function managed identity receives Azure RBAC. This has two benefits:

- operators do not gain Azure portal or general subscription access;
- removing a user from the application role removes portal authorization without changing Azure RBAC.

The backend also refuses unconfigured VM aliases and uses explicit `start` or `deallocate` actions. It re-reads the current power state before submitting the operation, which prevents a stale UI from performing the opposite action.

## Secret lifecycle

There is no application client secret to renew:

- user sessions are refreshed through MSAL and Entra;
- Azure runtime access uses managed identity;
- GitHub deployment uses a short-lived Azure token obtained through workload identity federation (OIDC).

The only emergency revocation points are the Entra app-role assignments, the GitHub federated credential, the Function managed-identity RBAC assignment, and the Function App itself.
