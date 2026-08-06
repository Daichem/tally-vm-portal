import "./styles.css";
import { ApiError, type VirtualMachineStatus, type VmAction, VmApi } from "./api";
import { EntraAuth } from "./auth";
import { loadRuntimeConfig } from "./config";

function element<T extends HTMLElement>(id: string): T {
  const value = document.getElementById(id);
  if (!value) throw new Error(`Expected page element '#${id}'.`);
  return value as T;
}

const signInPanel = element<HTMLElement>("sign-in-panel");
const dashboard = element<HTMLElement>("dashboard");
const accountMenu = element<HTMLElement>("account-menu");
const accountName = element<HTMLElement>("account-name");
const vmList = element<HTMLElement>("vm-list");
const notice = element<HTMLElement>("notice");

let auth: EntraAuth;
let api: VmApi;

function showNotice(message: string, kind: "info" | "error" = "info"): void {
  notice.textContent = message;
  notice.dataset.kind = kind;
  notice.hidden = false;
}

function clearNotice(): void {
  notice.hidden = true;
  notice.textContent = "";
}

function displayState(state: string): string {
  return state
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function renderMachines(machines: VirtualMachineStatus[]): void {
  vmList.replaceChildren();
  if (machines.length === 0) {
    showNotice("No virtual machines are configured for this portal.", "error");
    return;
  }

  for (const vm of machines) {
    const card = document.createElement("article");
    card.className = "vm-card";

    const heading = document.createElement("div");
    heading.className = "vm-heading";
    const title = document.createElement("h2");
    title.textContent = vm.displayName;
    const badge = document.createElement("span");
    badge.className = `state state-${vm.powerState.toLowerCase()}`;
    badge.textContent = displayState(vm.powerState);
    heading.append(title, badge);

    const detail = document.createElement("p");
    detail.textContent =
      vm.availableAction === null
        ? "This VM is transitioning or unavailable. Refresh shortly."
        : vm.availableAction === "start"
          ? "The VM is deallocated. Starting it will resume Azure compute charges."
          : "The VM is running. Deallocation stops Azure compute charges after shutdown.";

    const button = document.createElement("button");
    button.type = "button";
    button.className =
      vm.availableAction === "deallocate" ? "button button-danger" : "button button-primary";
    button.disabled = vm.availableAction === null;
    button.textContent = vm.availableAction === "deallocate" ? "Deallocate VM" : "Start VM";
    if (vm.availableAction) {
      button.addEventListener(
        "click",
        () => void performAction(vm, vm.availableAction as VmAction, button),
      );
    }

    card.append(heading, detail, button);
    vmList.append(card);
  }
}

async function refresh(): Promise<void> {
  clearNotice();
  vmList.setAttribute("aria-busy", "true");
  try {
    const token = await auth.accessToken();
    const response = await api.list(token);
    renderMachines(response.vms);
  } catch (error) {
    handleApiError(error);
  } finally {
    vmList.removeAttribute("aria-busy");
  }
}

async function performAction(
  vm: VirtualMachineStatus,
  action: VmAction,
  button: HTMLButtonElement,
): Promise<void> {
  const verb = action === "start" ? "start" : "deallocate";
  if (!window.confirm(`Confirm that you want to ${verb} ${vm.displayName}.`)) return;

  button.disabled = true;
  clearNotice();
  try {
    const token = await auth.accessToken();
    await api.act(vm.id, action, token);
    showNotice(`${vm.displayName}: ${displayState(action)} request accepted. Refreshing status…`);
    window.setTimeout(() => void refresh(), 3000);
  } catch (error) {
    button.disabled = false;
    handleApiError(error);
  }
}

function handleApiError(error: unknown): void {
  if (error instanceof ApiError && error.status === 403) {
    showNotice("Your account is signed in but is not assigned the Vm.Operator role.", "error");
  } else if (error instanceof ApiError && error.status === 401) {
    showNotice("Your session is not authorized. Sign out, then sign in again.", "error");
  } else {
    showNotice(error instanceof Error ? error.message : "An unexpected error occurred.", "error");
  }
}

function showAuthenticated(): void {
  const account = auth.account;
  signInPanel.hidden = true;
  dashboard.hidden = false;
  accountMenu.hidden = false;
  accountName.textContent = account?.name ?? account?.username ?? "Signed in";
}

async function bootstrap(): Promise<void> {
  try {
    const config = await loadRuntimeConfig();
    auth = new EntraAuth(config);
    api = new VmApi(config);
    await auth.initialize();

    element<HTMLButtonElement>("sign-in").addEventListener("click", async () => {
      clearNotice();
      try {
        await auth.signIn();
      } catch (error) {
        showNotice(error instanceof Error ? error.message : "Sign-in failed.", "error");
      }
    });
    element<HTMLButtonElement>("sign-out").addEventListener("click", () => void auth.signOut());
    element<HTMLButtonElement>("refresh").addEventListener("click", () => void refresh());

    if (auth.account) {
      showAuthenticated();
      await refresh();
    }
  } catch (error) {
    signInPanel.hidden = true;
    const panel = element<HTMLElement>("fatal-error");
    element<HTMLElement>("fatal-error-message").textContent =
      error instanceof Error ? error.message : "Unable to initialize the portal.";
    panel.hidden = false;
  }
}

void bootstrap();
