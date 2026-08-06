const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TARGET_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/;

function required(environment, name) {
  const value = environment[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Required application setting '${name}' is missing.`);
  }
  return value.trim();
}

function requiredGuid(environment, name) {
  const value = required(environment, name);
  if (!GUID_PATTERN.test(value)) {
    throw new Error(`Application setting '${name}' must be a GUID.`);
  }
  return value;
}

function parseTargets(raw) {
  let value;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    throw new Error(`VM_TARGETS_JSON is not valid JSON: ${error.message}`, { cause: error });
  }
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("VM_TARGETS_JSON must contain at least one VM target.");
  }

  const seen = new Set();
  return value.map((item, index) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`VM target at index ${index} must be an object.`);
    }
    const target = item;
    for (const field of ["id", "displayName", "resourceGroup", "name"]) {
      if (typeof target[field] !== "string" || target[field].trim() === "") {
        throw new Error(`VM target at index ${index} is missing '${field}'.`);
      }
    }
    const id = target.id.trim();
    if (!TARGET_ID_PATTERN.test(id)) {
      throw new Error(`VM target id '${id}' must be a lowercase URL-safe identifier.`);
    }
    if (seen.has(id)) {
      throw new Error(`VM target id '${id}' is duplicated.`);
    }
    seen.add(id);
    return Object.freeze({
      id,
      displayName: target.displayName.trim(),
      resourceGroup: target.resourceGroup.trim(),
      name: target.name.trim(),
    });
  });
}

export function readConfig(environment = process.env) {
  const apiClientId = requiredGuid(environment, "ENTRA_API_CLIENT_ID");
  const audience = environment.ENTRA_API_AUDIENCE?.trim() || apiClientId;
  return Object.freeze({
    subscriptionId: requiredGuid(environment, "AZURE_SUBSCRIPTION_ID"),
    tenantId: requiredGuid(environment, "ENTRA_TENANT_ID"),
    apiClientId,
    spaClientId: requiredGuid(environment, "ENTRA_SPA_CLIENT_ID"),
    audience,
    requiredScope: environment.REQUIRED_SCOPE?.trim() || "Vm.Access",
    requiredRole: environment.REQUIRED_APP_ROLE?.trim() || "Vm.Operator",
    targets: Object.freeze(parseTargets(required(environment, "VM_TARGETS_JSON"))),
  });
}
