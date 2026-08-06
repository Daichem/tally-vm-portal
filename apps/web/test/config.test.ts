import { describe, expect, it } from "vitest";
import { parseRuntimeConfig } from "../src/config";

const valid = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  spaClientId: "22222222-2222-4222-8222-222222222222",
  apiBaseUrl: "https://function.example/api",
  apiScope: "api://33333333-3333-4333-8333-333333333333/Vm.Access",
};

describe("runtime configuration", () => {
  it("normalizes the API base URL", () => {
    expect(parseRuntimeConfig(valid).apiBaseUrl).toBe("https://function.example/api/");
  });

  it("rejects insecure remote APIs", () => {
    expect(() =>
      parseRuntimeConfig({ ...valid, apiBaseUrl: "http://function.example/api" }),
    ).toThrow(/HTTPS/);
  });

  it("rejects unexpected API scopes", () => {
    expect(() => parseRuntimeConfig({ ...valid, apiScope: "User.Read" })).toThrow(/Vm.Access/);
  });
});
