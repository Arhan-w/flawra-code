import { describe, expect, test } from "bun:test";
import {
  getXDGStateHome,
  getXDGCacheHome,
  getXDGDataHome,
  getUserBinDir,
} from "../xdg";

// Platform-agnostic: path.join yields backslashes on Windows.
const norm = (p: string) => p.replace(/\\/g, "/");

describe("getXDGStateHome", () => {
  test("returns ~/.local/state by default", () => {
    expect(norm(getXDGStateHome({ homedir: "/home/user" }))).toBe("/home/user/.local/state");
  });

  test("respects XDG_STATE_HOME env var", () => {
    const result = getXDGStateHome({
      homedir: "/home/user",
      env: { XDG_STATE_HOME: "/custom/state" },
    });
    expect(result).toBe("/custom/state");
  });

  test("uses custom homedir from options", () => {
    expect(norm(getXDGStateHome({ homedir: "/opt/home" }))).toBe("/opt/home/.local/state");
  });
});

describe("getXDGCacheHome", () => {
  test("returns ~/.cache by default", () => {
    expect(norm(getXDGCacheHome({ homedir: "/home/user" }))).toBe("/home/user/.cache");
  });

  test("respects XDG_CACHE_HOME env var", () => {
    const result = getXDGCacheHome({
      homedir: "/home/user",
      env: { XDG_CACHE_HOME: "/tmp/cache" },
    });
    expect(result).toBe("/tmp/cache");
  });
});

describe("getXDGDataHome", () => {
  test("returns ~/.local/share by default", () => {
    expect(norm(getXDGDataHome({ homedir: "/home/user" }))).toBe("/home/user/.local/share");
  });

  test("respects XDG_DATA_HOME env var", () => {
    const result = getXDGDataHome({
      homedir: "/home/user",
      env: { XDG_DATA_HOME: "/custom/data" },
    });
    expect(result).toBe("/custom/data");
  });
});

describe("getUserBinDir", () => {
  test("returns ~/.local/bin", () => {
    expect(norm(getUserBinDir({ homedir: "/home/user" }))).toBe("/home/user/.local/bin");
  });

  test("uses custom homedir from options", () => {
    expect(norm(getUserBinDir({ homedir: "/opt/me" }))).toBe("/opt/me/.local/bin");
  });
});

describe("path construction", () => {
  test("all paths end with correct subdirectory", () => {
    const home = "/home/test";
    expect(norm(getXDGStateHome({ homedir: home }))).toMatch(/\.local\/state$/);
    expect(norm(getXDGCacheHome({ homedir: home }))).toMatch(/\.cache$/);
    expect(norm(getXDGDataHome({ homedir: home }))).toMatch(/\.local\/share$/);
    expect(norm(getUserBinDir({ homedir: home }))).toMatch(/\.local\/bin$/);
  });

  test("respects HOME via homedir override", () => {
    expect(norm(getXDGStateHome({ homedir: "/Users/me" }))).toBe("/Users/me/.local/state");
  });
});
