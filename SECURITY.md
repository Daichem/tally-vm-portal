# Security policy

## Reporting

Do not open a public issue for a suspected vulnerability or exposed credential. Contact the Daichem repository owner directly through an approved internal channel and include only the minimum information needed to reproduce the problem.

Never send access tokens, refresh tokens, client secrets, Function host keys, Azure publish profiles, screenshots containing credentials, or complete production configuration.

## Supported version

Only the current `main` branch and current production deployment are supported.

## Credential exposure response

This application does not require a client secret. If any credential is nevertheless committed or logged:

1. revoke or rotate it before removing it from the repository;
2. disable affected deployments or identities if impact is uncertain;
3. review GitHub, Entra, Function, and Azure activity logs;
4. remove it from current files and, when appropriate, repository history;
5. document the incident through Daichem's internal process.
