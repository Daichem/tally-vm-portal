import {
  AccountInfo,
  InteractionRequiredAuthError,
  PublicClientApplication,
} from "@azure/msal-browser";
import type { RuntimeConfig } from "./config";

export class EntraAuth {
  readonly #client: PublicClientApplication;
  readonly #scope: string;

  constructor(config: RuntimeConfig) {
    this.#scope = config.apiScope;
    this.#client = new PublicClientApplication({
      auth: {
        clientId: config.spaClientId,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
        redirectUri: new URL(".", window.location.href).toString(),
        postLogoutRedirectUri: new URL(".", window.location.href).toString(),
      },
      cache: {
        cacheLocation: "sessionStorage",
      },
    });
  }

  async initialize(): Promise<void> {
    await this.#client.initialize();
    const redirectResult = await this.#client.handleRedirectPromise();
    if (redirectResult?.account) {
      this.#client.setActiveAccount(redirectResult.account);
    } else if (!this.#client.getActiveAccount()) {
      this.#client.setActiveAccount(this.#client.getAllAccounts()[0] ?? null);
    }
  }

  get account(): AccountInfo | null {
    return this.#client.getActiveAccount();
  }

  async signIn(): Promise<AccountInfo> {
    const result = await this.#client.loginPopup({
      scopes: [this.#scope],
      prompt: "select_account",
    });
    this.#client.setActiveAccount(result.account);
    return result.account;
  }

  async accessToken(): Promise<string> {
    const account = this.account;
    if (!account) {
      throw new Error("Sign in is required.");
    }

    try {
      const result = await this.#client.acquireTokenSilent({
        account,
        scopes: [this.#scope],
      });
      return result.accessToken;
    } catch (error) {
      if (!(error instanceof InteractionRequiredAuthError)) {
        throw error;
      }
      const result = await this.#client.acquireTokenPopup({
        account,
        scopes: [this.#scope],
      });
      return result.accessToken;
    }
  }

  async signOut(): Promise<void> {
    await this.#client.logoutPopup({ account: this.account ?? undefined });
  }
}
