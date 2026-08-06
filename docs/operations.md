# Operations runbook

## Grant an operator access

1. Confirm the person is an active Daichem tenant user.
2. Open **Microsoft Entra admin center → Enterprise applications → Daichem Tally VM API → Users and groups**.
3. Add the user with the `VM Operator` role.
4. Ask the user to sign out and back in if they already had the portal open.

No Azure resource role is assigned to the person.

## Revoke an operator

Remove the user assignment from the API enterprise application. Existing access tokens are short-lived; for urgent revocation, also revoke the user's Entra sessions or disable the account according to Daichem policy.

## Change the VM allow-list

Treat the API configuration and Azure RBAC assignment as a pair:

1. Grant the Function managed identity the custom role on the new VM.
2. Add the new server-side target to `VM_TARGETS_JSON`.
3. Restart the Function App so cached configuration is reloaded.
4. Test status retrieval before allowing a power operation.

To remove a VM, remove it from `VM_TARGETS_JSON`, restart the Function, then remove the corresponding managed-identity role assignment.

## Investigate a failed operation

1. Record the approximate time, user, public target alias, and displayed message. Never ask for a token.
2. Open **Function App → Monitoring → Log stream** or the linked Application Insights resource.
3. Find `VM status requested` or `VM power action requested` at that time.
4. Check the Function managed identity still has the custom role on the VM.
5. Check the VM is not locked, undergoing maintenance, or in a transitional state.
6. Check the user still has the `Vm.Operator` role and the SPA still has admin consent for `Vm.Access`.

## Emergency disablement

Use the narrowest suitable control:

- remove one user's API application-role assignment;
- disable the `Vm.Operator` app role or set the enterprise application to disabled for all users;
- stop the Function App;
- remove the Function managed-identity VM role assignment;
- remove the GitHub federated credential to stop deployments.

Disabling GitHub Pages alone hides the UI but does not disable the API, so it is not the primary incident-response control.

## Cost behavior

Starting a VM resumes its Azure compute charges. Deallocating stops VM compute charges after Azure completes the operation, but attached disks, backup, reserved public IP resources, and other storage/network resources can continue to incur charges.
