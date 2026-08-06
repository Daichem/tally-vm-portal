import { createRemoteJWKSet, errors, jwtVerify } from "jose";

const keySets = new Map();

function keySetFor(tenantId) {
  let keySet = keySets.get(tenantId);
  if (!keySet) {
    keySet = createRemoteJWKSet(
      new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`),
    );
    keySets.set(tenantId, keySet);
  }
  return keySet;
}

function values(value) {
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string");
  return typeof value === "string" ? [value] : [];
}

export function validateClaims(payload, config) {
  if (payload.tid !== config.tenantId) {
    throw new AuthorizationError("Token tenant is not allowed.", 401);
  }

  const callingClient = payload.azp ?? payload.appid;
  if (callingClient !== config.spaClientId) {
    throw new AuthorizationError("Token calling client is not allowed.", 401);
  }

  const scopes = typeof payload.scp === "string" ? payload.scp.split(" ") : [];
  if (!scopes.includes(config.requiredScope)) {
    throw new AuthorizationError("Required delegated permission is missing.", 403);
  }

  if (!values(payload.roles).includes(config.requiredRole)) {
    throw new AuthorizationError("Required application role is missing.", 403);
  }

  if (typeof payload.sub !== "string" || payload.sub === "") {
    throw new AuthorizationError("Token subject is missing.", 401);
  }

  return Object.freeze({
    subject: payload.sub,
    tenantId: payload.tid,
    username:
      typeof payload.preferred_username === "string"
        ? payload.preferred_username
        : typeof payload.upn === "string"
          ? payload.upn
          : undefined,
  });
}

export class AuthorizationError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function authorizeRequest(request, config) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new AuthorizationError("Bearer authentication is required.", 401);
  }
  const token = authorization.slice("Bearer ".length).trim();
  if (!token) {
    throw new AuthorizationError("Bearer authentication is required.", 401);
  }

  try {
    const { payload } = await jwtVerify(token, keySetFor(config.tenantId), {
      issuer: `https://login.microsoftonline.com/${config.tenantId}/v2.0`,
      audience: config.audience,
      algorithms: ["RS256"],
      clockTolerance: 60,
    });
    return validateClaims(payload, config);
  } catch (error) {
    if (error instanceof AuthorizationError) throw error;
    if (error instanceof errors.JOSEError) {
      throw new AuthorizationError("Access token validation failed.", 401);
    }
    throw error;
  }
}
