import { app } from "@azure/functions";
import { authorizeRequest } from "../lib/auth.js";
import { readConfig } from "../lib/config.js";
import { json, publicError, RequestError } from "../lib/http.js";
import { createVmService } from "../lib/vm-service.js";

let services;

function dependencies() {
  if (!services) {
    const config = readConfig();
    services = { config, vmService: createVmService(config) };
  }
  return services;
}

async function withAuthorization(request, context, handler) {
  try {
    const { config, vmService } = dependencies();
    const actor = await authorizeRequest(request, config);
    return await handler({ actor, vmService });
  } catch (error) {
    return publicError(error, context);
  }
}

export async function listVms(request, context) {
  return withAuthorization(request, context, async ({ actor, vmService }) => {
    context.log("VM status requested", { actor: actor.username ?? actor.subject });
    return json(200, {
      vms: await vmService.list(),
      observedAt: new Date().toISOString(),
    });
  });
}

export async function changeVmState(request, context) {
  return withAuthorization(request, context, async ({ actor, vmService }) => {
    const target = vmService.target(request.params.id);
    if (!target) throw new RequestError("Unknown VM identifier.", 404);

    let body;
    try {
      body = await request.json();
    } catch {
      throw new RequestError("Request body must be valid JSON.");
    }
    if (body?.action !== "start" && body?.action !== "deallocate") {
      throw new RequestError("Action must be either 'start' or 'deallocate'.");
    }

    context.log("VM power action requested", {
      actor: actor.username ?? actor.subject,
      target: target.id,
      action: body.action,
    });
    await vmService.act(target, body.action);
    return json(202, { id: target.id, action: body.action, status: "accepted" });
  });
}

app.http("listVms", {
  route: "vms",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: listVms,
});

app.http("changeVmState", {
  route: "vms/{id}/actions",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: changeVmState,
});

export function resetDependenciesForTest() {
  services = undefined;
}
