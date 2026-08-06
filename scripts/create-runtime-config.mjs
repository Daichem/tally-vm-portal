import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const required = ["ENTRA_TENANT_ID", "ENTRA_SPA_CLIENT_ID", "API_BASE_URL", "ENTRA_API_SCOPE"];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length > 0) {
  throw new Error(`Missing runtime configuration variables: ${missing.join(", ")}`);
}

const output = path.resolve(process.env.WEB_CONFIG_OUTPUT || "apps/web/dist/config.json");
const config = {
  tenantId: process.env.ENTRA_TENANT_ID.trim(),
  spaClientId: process.env.ENTRA_SPA_CLIENT_ID.trim(),
  apiBaseUrl: process.env.API_BASE_URL.trim(),
  apiScope: process.env.ENTRA_API_SCOPE.trim(),
};

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(config, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
console.log(`Created browser runtime configuration at ${output}`);
