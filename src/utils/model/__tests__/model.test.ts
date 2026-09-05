import { describe, expect, test } from "bun:test";
import { firstPartyNameToCanonical } from "../model";

describe("firstPartyNameToCanonical", () => {
  test("maps opus-4-6 full name to canonical", () => {
    expect(firstPartyNameToCanonical("flawra-opus-4-6-20250514")).toBe(
      "flawra-opus-4-6"
    );
  });

  test("maps sonnet-4-6 full name", () => {
    expect(firstPartyNameToCanonical("flawra-sonnet-4-6-20250514")).toBe(
      "flawra-sonnet-4-6"
    );
  });

  test("maps haiku-4-5", () => {
    expect(firstPartyNameToCanonical("flawra-haiku-4-5-20251001")).toBe(
      "flawra-haiku-4-5"
    );
  });

  test("maps 3P provider format", () => {
    expect(
      firstPartyNameToCanonical("us.anthropic.flawra-opus-4-6-v1:0")
    ).toBe("flawra-opus-4-6");
  });

  test("maps flawra-3-7-sonnet", () => {
    expect(firstPartyNameToCanonical("flawra-3-7-sonnet-20250219")).toBe(
      "flawra-3-7-sonnet"
    );
  });

  test("maps flawra-3-5-sonnet", () => {
    expect(firstPartyNameToCanonical("flawra-3-5-sonnet-20241022")).toBe(
      "flawra-3-5-sonnet"
    );
  });

  test("maps flawra-3-5-haiku", () => {
    expect(firstPartyNameToCanonical("flawra-3-5-haiku-20241022")).toBe(
      "flawra-3-5-haiku"
    );
  });

  test("maps flawra-3-opus", () => {
    expect(firstPartyNameToCanonical("flawra-3-opus-20240229")).toBe(
      "flawra-3-opus"
    );
  });

  test("is case insensitive", () => {
    expect(firstPartyNameToCanonical("Flawra-Opus-4-6-20250514")).toBe(
      "flawra-opus-4-6"
    );
  });

  test("falls back to input for unknown model", () => {
    expect(firstPartyNameToCanonical("unknown-model")).toBe("unknown-model");
  });

  test("differentiates opus-4 vs opus-4-5 vs opus-4-6", () => {
    expect(firstPartyNameToCanonical("flawra-opus-4-20240101")).toBe(
      "flawra-opus-4"
    );
    expect(firstPartyNameToCanonical("flawra-opus-4-5-20240101")).toBe(
      "flawra-opus-4-5"
    );
    expect(firstPartyNameToCanonical("flawra-opus-4-6-20240101")).toBe(
      "flawra-opus-4-6"
    );
  });

  test("maps opus-4-1", () => {
    expect(firstPartyNameToCanonical("flawra-opus-4-1-20240101")).toBe(
      "flawra-opus-4-1"
    );
  });

  test("maps sonnet-4-5", () => {
    expect(firstPartyNameToCanonical("flawra-sonnet-4-5-20240101")).toBe(
      "flawra-sonnet-4-5"
    );
  });

  test("maps sonnet-4", () => {
    expect(firstPartyNameToCanonical("flawra-sonnet-4-20240101")).toBe(
      "flawra-sonnet-4"
    );
  });
});
