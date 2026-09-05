import { describe, expect, test } from "bun:test";
import { normalizeNameForMCP } from "../normalization";

describe("normalizeNameForMCP", () => {
  test("returns simple valid name unchanged", () => {
    expect(normalizeNameForMCP("my-server")).toBe("my-server");
  });

  test("replaces dots with underscores", () => {
    expect(normalizeNameForMCP("my.server.name")).toBe("my_server_name");
  });

  test("replaces spaces with underscores", () => {
    expect(normalizeNameForMCP("my server")).toBe("my_server");
  });

  test("replaces special characters with underscores", () => {
    expect(normalizeNameForMCP("server@v2!")).toBe("server_v2_");
  });

  test("returns already valid name unchanged", () => {
    expect(normalizeNameForMCP("valid_name-123")).toBe("valid_name-123");
  });

  test("returns empty string for empty input", () => {
    expect(normalizeNameForMCP("")).toBe("");
  });

  test("handles flawra.ai prefix: collapses consecutive underscores and strips edges", () => {
    // "flawra.ai My Server" -> replace invalid -> "flawra_ai_My_Server"
    // starts with "flawra.ai " so collapse + strip -> "flawra_ai_My_Server"
    expect(normalizeNameForMCP("flawra.ai My Server")).toBe(
      "flawra_ai_My_Server"
    );
  });

  test("handles flawra.ai prefix with consecutive invalid chars", () => {
    // "flawra.ai ...test..." -> replace invalid -> "flawra_ai____test___"
    // collapse consecutive _ -> "flawra_ai_test_"
    // strip leading/trailing _ -> "flawra_ai_test"
    expect(normalizeNameForMCP("flawra.ai ...test...")).toBe("flawra_ai_test");
  });

  test("non-flawra.ai name preserves consecutive underscores", () => {
    // "a..b" -> "a__b", no flawra.ai prefix so no collapse
    expect(normalizeNameForMCP("a..b")).toBe("a__b");
  });

  test("non-flawra.ai name preserves trailing underscores", () => {
    expect(normalizeNameForMCP("name!")).toBe("name_");
  });

  test("handles flawra.ai prefix that results in only underscores", () => {
    // "flawra.ai ..." -> replace invalid -> "flawra_ai____"
    // collapse -> "flawra_ai_"
    // strip trailing -> "flawra_ai"
    expect(normalizeNameForMCP("flawra.ai ...")).toBe("flawra_ai");
  });
});
