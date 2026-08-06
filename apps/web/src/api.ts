import type { RuntimeConfig } from "./config";

export type VmAction = "start" | "deallocate";

export interface VirtualMachineStatus {
  id: string;
  displayName: string;
  powerState: string;
  availableAction: VmAction | null;
}

interface VmListResponse {
  vms: VirtualMachineStatus[];
  observedAt: string;
}

interface ActionResponse {
  id: string;
  action: VmAction;
  status: "accepted";
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export class VmApi {
  readonly #baseUrl: URL;

  constructor(config: RuntimeConfig) {
    this.#baseUrl = new URL(config.apiBaseUrl);
  }

  async list(accessToken: string): Promise<VmListResponse> {
    return this.#request<VmListResponse>("vms", accessToken);
  }

  async act(id: string, action: VmAction, accessToken: string): Promise<ActionResponse> {
    const path = `vms/${encodeURIComponent(id)}/actions`;
    return this.#request<ActionResponse>(path, accessToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
  }

  async #request<T>(path: string, accessToken: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(new URL(path, this.#baseUrl), {
      ...init,
      headers: {
        ...init.headers,
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      throw new ApiError(
        payload.error ?? `The API returned HTTP ${response.status}.`,
        response.status,
      );
    }
    return payload as T;
  }
}
