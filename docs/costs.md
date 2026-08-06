# Cost implications

Prices and included quotas can change by region and agreement. Confirm current rates in the linked provider calculators before production approval.

## Expected incremental costs

| Component                                 | Expected model                                                                                                                |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Public GitHub repository                  | Included with GitHub Free for organizations                                                                                   |
| GitHub Pages                              | Included for public repositories                                                                                              |
| GitHub Actions                            | Standard GitHub-hosted runners are free for public repositories, subject to GitHub's acceptable-use limits                    |
| Entra app registrations                   | No separate charge for the three registrations used here                                                                      |
| Direct user-to-app-role assignments       | No premium group-assignment feature required                                                                                  |
| Group-to-app-role assignment              | Requires Microsoft Entra ID P1 or P2 for benefiting users; avoid this initially if current Microsoft 365 licensing is unknown |
| Function managed identity and Azure RBAC  | No separate charge                                                                                                            |
| Azure Function Flex Consumption           | Usage-based; on-demand executions receive a subscription-level monthly free grant on eligible paid consumption subscriptions  |
| Function storage and Application Insights | Usually small for this traffic, but not guaranteed to be zero                                                                 |
| Existing Azure VM                         | Existing compute/storage/network rates continue                                                                               |

Microsoft currently documents a Flex Consumption on-demand free grant of 250,000 executions and 100,000 GB-seconds per month per eligible subscription. A small internal portal is likely to remain below those execution quantities, but storage, logs, network use, and subscription eligibility can still produce charges.

Do not configure always-ready Function instances for the initial deployment; they have baseline charges and are unnecessary for occasional administrative use.

## VM power-state costs

- Starting the VM resumes compute billing.
- Deallocating the VM stops compute billing after the operation completes.
- Managed disks, snapshots, backup, reserved public IP addresses, and other attached services can remain billable while the VM is deallocated.
- A normal operating schedule and user behavior will have much more cost impact than the portal itself.

## Authentication licensing

Users need working accounts in the Daichem Entra tenant, but they do not need Azure subscription roles. Start with direct assignment of each approved user to `Vm.Operator`. If Daichem already licenses Microsoft 365 Business Premium, E3/E5, EMS, or another package containing Entra ID P1/P2, group assignment may already be covered; confirm this in **Microsoft Entra admin center → Billing → Licenses**.

## GitHub plan decision

The selected public repository avoids a GitHub Team subscription. The static webpage is publicly downloadable, but the API independently requires a valid single-tenant token and application role. Paying for a private source repository would not hide the tenant/client identifiers embedded in the deployed browser application.

## References

- [GitHub plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans)
- [GitHub Pages availability](https://docs.github.com/en/pages/getting-started-with-github-pages)
- [Azure Functions pricing](https://azure.microsoft.com/pricing/details/functions/)
- [Flex Consumption billing](https://learn.microsoft.com/en-us/azure/azure-functions/flex-consumption-plan#billing)
- [Entra application user and group assignment](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/assign-user-or-group-access-portal)
