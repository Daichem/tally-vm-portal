import assert from "node:assert/strict";
import test from "node:test";
import { AuthorizationError, validateClaims } from "../src/lib/auth.js";

const config = {
  tenantId: "tenant",
  spaClientId: "spa",
  requiredScope: "Vm.Access",
  requiredRole: "Vm.Operator",
};

const validClaims = {
  tid: "tenant",
  azp: "spa",
  scp: "Vm.Access",
  roles: ["Vm.Operator"],
  sub: "subject",
  preferred_username: "operator@daichem.com",
};

test("validateClaims accepts the assigned operator", () => {
  assert.deepEqual(validateClaims(validClaims, config), {
    subject: "subject",
    tenantId: "tenant",
    username: "operator@daichem.com",
  });
});

for (const [name, claims, status] of [
  ["wrong tenant", { ...validClaims, tid: "another" }, 401],
  ["wrong client", { ...validClaims, azp: "another" }, 401],
  ["missing scope", { ...validClaims, scp: "User.Read" }, 403],
  ["missing role", { ...validClaims, roles: [] }, 403],
]) {
  test(`validateClaims rejects ${name}`, () => {
    assert.throws(
      () => validateClaims(claims, config),
      (error) => error instanceof AuthorizationError && error.status === status,
    );
  });
}
