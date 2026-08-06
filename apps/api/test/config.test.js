import assert from "node:assert/strict";
import test from "node:test";
import { readConfig } from "../src/lib/config.js";

const environment = {
  AZURE_SUBSCRIPTION_ID: "11111111-1111-4111-8111-111111111111",
  ENTRA_TENANT_ID: "22222222-2222-4222-8222-222222222222",
  ENTRA_API_CLIENT_ID: "33333333-3333-4333-8333-333333333333",
  ENTRA_SPA_CLIENT_ID: "44444444-4444-4444-8444-444444444444",
  VM_TARGETS_JSON: JSON.stringify([
    { id: "tally", displayName: "Tally VM", resourceGroup: "rg-tally", name: "TallyOnline-0" },
  ]),
};

test("readConfig parses the server-side VM allow-list", () => {
  const config = readConfig(environment);
  assert.equal(config.targets[0].id, "tally");
  assert.equal(config.targets[0].name, "TallyOnline-0");
  assert.equal(config.requiredRole, "Vm.Operator");
  assert.equal(config.audience, environment.ENTRA_API_CLIENT_ID);
});

test("readConfig rejects duplicate public identifiers", () => {
  const duplicated = JSON.parse(environment.VM_TARGETS_JSON);
  duplicated.push({ ...duplicated[0] });
  assert.throws(
    () => readConfig({ ...environment, VM_TARGETS_JSON: JSON.stringify(duplicated) }),
    /duplicated/,
  );
});
