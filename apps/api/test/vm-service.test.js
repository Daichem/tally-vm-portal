import assert from "node:assert/strict";
import test from "node:test";
import { availableAction, powerStateFromInstanceView, VmService } from "../src/lib/vm-service.js";

const target = {
  id: "tally",
  displayName: "Tally VM",
  resourceGroup: "rg-tally",
  name: "TallyOnline-0",
};

test("powerStateFromInstanceView finds the power status independent of ordering", () => {
  assert.equal(
    powerStateFromInstanceView({
      statuses: [{ code: "ProvisioningState/succeeded" }, { code: "PowerState/running" }],
    }),
    "running",
  );
});

test("availableAction uses explicit state transitions", () => {
  assert.equal(availableAction("running"), "deallocate");
  assert.equal(availableAction("deallocated"), "start");
  assert.equal(availableAction("starting"), null);
});

test("act starts only a configured deallocated VM", async () => {
  const calls = [];
  const client = {
    virtualMachines: {
      async instanceView() {
        return { statuses: [{ code: "PowerState/deallocated" }] };
      },
      async beginStart(resourceGroup, name) {
        calls.push([resourceGroup, name]);
      },
    },
  };
  const service = new VmService(client, [target]);
  await service.act(target, "start");
  assert.deepEqual(calls, [["rg-tally", "TallyOnline-0"]]);
});

test("act rejects a stale or incompatible request", async () => {
  const client = {
    virtualMachines: {
      async instanceView() {
        return { statuses: [{ code: "PowerState/running" }] };
      },
    },
  };
  const service = new VmService(client, [target]);
  await assert.rejects(
    () => service.act(target, "start"),
    (error) => error.status === 409,
  );
});
