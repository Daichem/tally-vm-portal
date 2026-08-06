import { ComputeManagementClient } from "@azure/arm-compute";
import { DefaultAzureCredential } from "@azure/identity";

const ACTIONABLE = Object.freeze({
  deallocated: "start",
  stopped: "start",
  running: "deallocate",
});

export function powerStateFromInstanceView(instanceView) {
  const status = instanceView.statuses?.find((item) => item.code?.startsWith("PowerState/"));
  return status?.code?.slice("PowerState/".length) ?? "unknown";
}

export function availableAction(powerState) {
  return ACTIONABLE[powerState] ?? null;
}

export class VmService {
  constructor(client, targets) {
    this.client = client;
    this.targets = targets;
    this.byId = new Map(targets.map((target) => [target.id, target]));
  }

  target(id) {
    return this.byId.get(id);
  }

  async state(target) {
    const view = await this.client.virtualMachines.instanceView(target.resourceGroup, target.name);
    return powerStateFromInstanceView(view);
  }

  async list() {
    return Promise.all(
      this.targets.map(async (target) => {
        try {
          const powerState = await this.state(target);
          return {
            id: target.id,
            displayName: target.displayName,
            powerState,
            availableAction: availableAction(powerState),
          };
        } catch {
          return {
            id: target.id,
            displayName: target.displayName,
            powerState: "unavailable",
            availableAction: null,
          };
        }
      }),
    );
  }

  async act(target, action) {
    const currentState = await this.state(target);
    const expectedAction = availableAction(currentState);
    if (action !== expectedAction) {
      const error = new Error(
        `The requested action is not valid while the VM is '${currentState}'. Refresh and try again.`,
      );
      error.status = 409;
      throw error;
    }

    if (action === "start") {
      await this.client.virtualMachines.beginStart(target.resourceGroup, target.name);
    } else {
      await this.client.virtualMachines.beginDeallocate(target.resourceGroup, target.name);
    }
  }
}

export function createVmService(config) {
  const credential = new DefaultAzureCredential();
  const client = new ComputeManagementClient(credential, config.subscriptionId);
  return new VmService(client, config.targets);
}
