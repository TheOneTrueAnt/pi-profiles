import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildLaunchCommand } from "../src/cli/launch.js";

describe("launch command", () => {
  it("spawns pi directly on non-Windows platforms", () => {
    const result = buildLaunchCommand(["--version"], "linux", undefined);

    assert.deepEqual(result, {
      command: "pi",
      args: ["--version"],
    });
  });

  it("launches pi through cmd.exe on Windows", () => {
    const result = buildLaunchCommand(["use", "work"], "win32", "C:\\Windows\\System32\\cmd.exe");

    assert.deepEqual(result, {
      command: "C:\\Windows\\System32\\cmd.exe",
      args: ["/d", "/s", "/c", "pi", "use", "work"],
    });
  });

  it("falls back to cmd.exe on Windows when ComSpec is missing", () => {
    const result = buildLaunchCommand(["--version"], "win32", "");

    assert.deepEqual(result, {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", "pi", "--version"],
    });
  });
});
