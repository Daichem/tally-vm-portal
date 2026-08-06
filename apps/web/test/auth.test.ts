import { describe, expect, it } from "vitest";
import { isMissingTokenRequestError } from "../src/auth";

describe("isMissingTokenRequestError", () => {
  it("recognizes an interrupted MSAL redirect", () => {
    expect(isMissingTokenRequestError({ errorCode: "no_token_request_cache_error" })).toBe(true);
  });

  it("does not hide other authentication failures", () => {
    expect(isMissingTokenRequestError(new Error("network unavailable"))).toBe(false);
    expect(isMissingTokenRequestError(null)).toBe(false);
  });
});
