export interface RuntimeConfig {
  tenantId: string;
  spaClientId: string;
  apiBaseUrl: string;
  apiScope: string;
}

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Runtime configuration is missing '${field}'.`);
  }
  return value.trim();
}

export function parseRuntimeConfig(value: unknown): RuntimeConfig {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Runtime configuration must be a JSON object.");
  }

  const input = value as Record<string, unknown>;
  const tenantId = requiredString(input.tenantId, "tenantId");
  const spaClientId = requiredString(input.spaClientId, "spaClientId");
  const apiScope = requiredString(input.apiScope, "apiScope");
  const apiBaseUrl = new URL(requiredString(input.apiBaseUrl, "apiBaseUrl"));

  if (!GUID_PATTERN.test(tenantId) || !GUID_PATTERN.test(spaClientId)) {
    throw new Error("tenantId and spaClientId must be Microsoft Entra GUID identifiers.");
  }
  if (apiBaseUrl.protocol !== "https:" && apiBaseUrl.hostname !== "localhost") {
    throw new Error("apiBaseUrl must use HTTPS except during localhost development.");
  }
  if (!apiScope.startsWith("api://") || !apiScope.endsWith("/Vm.Access")) {
    throw new Error("apiScope must be the API's exposed Vm.Access scope.");
  }

  if (!apiBaseUrl.pathname.endsWith("/")) {
    apiBaseUrl.pathname += "/";
  }

  return Object.freeze({
    tenantId,
    spaClientId,
    apiBaseUrl: apiBaseUrl.toString(),
    apiScope,
  });
}

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  const configUrl = new URL("./config.json", document.baseURI);
  const response = await fetch(configUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to load ${configUrl.pathname} (${response.status}).`);
  }
  return parseRuntimeConfig(await response.json());
}
