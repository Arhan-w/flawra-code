import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { getAPIProvider, isFirstPartyFlawRABaseUrl } from "../providers";

describe("getAPIProvider", () => {
  const envKeys = [
    "FLAWRA_CODE_USE_BEDROCK",
    "FLAWRA_CODE_USE_VERTEX",
    "FLAWRA_CODE_USE_FOUNDRY",
  ] as const;
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of envKeys) savedEnv[key] = process.env[key];
  });

  afterEach(() => {
    for (const key of envKeys) {
      if (savedEnv[key] !== undefined) {
        process.env[key] = savedEnv[key];
      } else {
        delete process.env[key];
      }
    }
  });

  test('returns "firstParty" by default', () => {
    delete process.env.FLAWRA_CODE_USE_BEDROCK;
    delete process.env.FLAWRA_CODE_USE_VERTEX;
    delete process.env.FLAWRA_CODE_USE_FOUNDRY;
    expect(getAPIProvider()).toBe("firstParty");
  });

  test('returns "bedrock" when FLAWRA_CODE_USE_BEDROCK is set', () => {
    process.env.FLAWRA_CODE_USE_BEDROCK = "1";
    expect(getAPIProvider()).toBe("bedrock");
  });

  test('returns "vertex" when FLAWRA_CODE_USE_VERTEX is set', () => {
    process.env.FLAWRA_CODE_USE_VERTEX = "1";
    expect(getAPIProvider()).toBe("vertex");
  });

  test('returns "foundry" when FLAWRA_CODE_USE_FOUNDRY is set', () => {
    process.env.FLAWRA_CODE_USE_FOUNDRY = "1";
    expect(getAPIProvider()).toBe("foundry");
  });

  test("bedrock takes precedence over vertex", () => {
    process.env.FLAWRA_CODE_USE_BEDROCK = "1";
    process.env.FLAWRA_CODE_USE_VERTEX = "1";
    expect(getAPIProvider()).toBe("bedrock");
  });

  test("bedrock wins when all three env vars are set", () => {
    process.env.FLAWRA_CODE_USE_BEDROCK = "1";
    process.env.FLAWRA_CODE_USE_VERTEX = "1";
    process.env.FLAWRA_CODE_USE_FOUNDRY = "1";
    expect(getAPIProvider()).toBe("bedrock");
  });

  test('"true" is truthy', () => {
    process.env.FLAWRA_CODE_USE_BEDROCK = "true";
    expect(getAPIProvider()).toBe("bedrock");
  });

  test('"0" is not truthy', () => {
    process.env.FLAWRA_CODE_USE_BEDROCK = "0";
    expect(getAPIProvider()).toBe("firstParty");
  });

  test('empty string is not truthy', () => {
    process.env.FLAWRA_CODE_USE_BEDROCK = "";
    expect(getAPIProvider()).toBe("firstParty");
  });
});

describe("isFirstPartyFlawRABaseUrl", () => {
  const originalBaseUrl = process.env.ANTHROPIC_BASE_URL;
  const originalUserType = process.env.USER_TYPE;

  afterEach(() => {
    if (originalBaseUrl !== undefined) {
      process.env.ANTHROPIC_BASE_URL = originalBaseUrl;
    } else {
      delete process.env.ANTHROPIC_BASE_URL;
    }
    if (originalUserType !== undefined) {
      process.env.USER_TYPE = originalUserType;
    } else {
      delete process.env.USER_TYPE;
    }
  });

  test("returns true when ANTHROPIC_BASE_URL is not set", () => {
    delete process.env.ANTHROPIC_BASE_URL;
    expect(isFirstPartyFlawRABaseUrl()).toBe(true);
  });

  test("returns true for api.anthropic.com", () => {
    process.env.ANTHROPIC_BASE_URL = "https://api.anthropic.com";
    expect(isFirstPartyFlawRABaseUrl()).toBe(true);
  });

  test("returns false for custom URL", () => {
    process.env.ANTHROPIC_BASE_URL = "https://my-proxy.com";
    expect(isFirstPartyFlawRABaseUrl()).toBe(false);
  });

  test("returns false for invalid URL", () => {
    process.env.ANTHROPIC_BASE_URL = "not-a-url";
    expect(isFirstPartyFlawRABaseUrl()).toBe(false);
  });

  test("returns true for staging URL when USER_TYPE is ant", () => {
    process.env.ANTHROPIC_BASE_URL = "https://api-staging.anthropic.com";
    process.env.USER_TYPE = "ant";
    expect(isFirstPartyFlawRABaseUrl()).toBe(true);
  });

  test("returns true for URL with path", () => {
    process.env.ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1";
    expect(isFirstPartyFlawRABaseUrl()).toBe(true);
  });

  test("returns true for trailing slash", () => {
    process.env.ANTHROPIC_BASE_URL = "https://api.anthropic.com/";
    expect(isFirstPartyFlawRABaseUrl()).toBe(true);
  });

  test("returns false for subdomain attack", () => {
    process.env.ANTHROPIC_BASE_URL = "https://evil-api.anthropic.com";
    expect(isFirstPartyFlawRABaseUrl()).toBe(false);
  });
});
