import {
  AccountInfo,
  BrowserAuthErrorCodes,
  InteractionRequiredAuthError,
  PublicClientApplication,
} from "@azure/msal-browser";
import type { RuntimeConfig } from "./config";

export function isMissingTokenRequestError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "errorCode" in error &&
    error.errorCode === BrowserAuthErrorCodes.noTokenRequestCacheError
  );
}

export class EntraAuth {
  readonly #client: PublicClientApplication;
  readonly #redirectUri: string;
  readonly #scope: string;

  constructor(config: RuntimeConfig) {
    this.#scope = config.apiScope;
    this.#redirectUri = new URL(".", window.location.href).toString();
    this.#client = new PublicClientApplication({
      auth: {
        clientId: config.spaClientId,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
        redirectUri: this.#redirectUri,
        postLogoutRedirectUri: this.#redirectUri,
      },
      cache: {
        cacheLocation: "localStorage",
      },
    });
  }

  async initialize(): Promise<void> {
    await this.#client.initialize();
    let redirectResult;
    try {
      redirectResult = await this.#client.handleRedirectPromise();
    } catch (error) {
      if (!isMissingTokenRequestError(error)) {
        throw error;
      }

      // A previous interrupted redirect can leave an authorization response in
      // the URL without the PKCE request metadata needed to redeem it. Remove
      // only this application's MSAL cache and callback URL so the user can
      // start a clean sign-in instead of leaving the portal permanently stuck.
      await this.#client.clearCache();
      window.history.replaceState({}, document.title, this.#redirectUri);
      redirectResult = null;
    }
    if (redirectResult?.account) {
      this.#client.setActiveAccount(redirectResult.account);
    } else if (!this.#client.getActiveAccount()) {
      this.#client.setActiveAccount(this.#client.getAllAccounts()[0] ?? null);
    }
  }

  get account(): AccountInfo | null {
    return this.#client.getActiveAccount();
  }

  async signIn(): Promise<void> {
    await this.#client.loginRedirect({
      scopes: [this.#scope],
      prompt: "select_account",
    });
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
      await this.#client.acquireTokenRedirect({
        account,
        scopes: [this.#scope],
      });
      throw new Error("The Microsoft authentication redirect did not start.");
    }
  }

  async signOut(): Promise<void> {
    await this.#client.logoutRedirect({ account: this.account ?? undefined });
  }
}
