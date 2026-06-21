import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildLaunchCommand } from "../src/cli/launch.js";

describe("launch command", () => {
  it("spawns pi directly on non-Windows platforms", () => {
    const result = buildLaunchCommand(["--version"], "linux", {});

    assert.deepEqual(result, {
      command: "pi",
      args: ["--version"],
    });
  });

  it("prefers a native pi.exe on Windows", () => {
    const root = mkdtempSync(join(tmpdir(), "ppi-launch-test-"));
    try {
      const piExe = join(root, "pi.exe");
      writeFileSync(piExe, "");
      writeFileSync(join(root, "pi.ps1"), "");

      const result = buildLaunchCommand(["--version"], "win32", { Path: root });

      assert.deepEqual(result, {
        command: piExe,
        args: ["--version"],
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("uses the npm PowerShell shim on Windows", () => {
    const root = mkdtempSync(join(tmpdir(), "ppi-launch-test-"));
    try {
      const piPs1 = join(root, "pi.ps1");
      writeFileSync(piPs1, "");

      const result = buildLaunchCommand(["use", "work"], "win32", { Path: root });

      assert.deepEqual(result, {
        command: "powershell.exe",
        args: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", piPs1, "use", "work"],
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("falls back to a quoted cmd.exe command on Windows", () => {
    const result = buildLaunchCommand(["x&y", "%PATH%", 'quote"test'], "win32", {
      comspec: "C:\\Windows\\System32\\cmd.exe",
    });

    assert.deepEqual(result, {
      command: "C:\\Windows\\System32\\cmd.exe",
      args: ["/d", "/s", "/c", '""pi" "x&y" "%PATH%" "quote\\"test""'],
      windowsVerbatimArguments: true,
    });
  });

  it("preserves special characters through the PowerShell shim on Windows", { skip: process.platform !== "win32" }, () => {
    const root = mkdtempSync(join(tmpdir(), "ppi-launch-test-"));
    try {
      const piPs1 = join(root, "pi.ps1");
      writeFileSync(piPs1, "Write-Output ($args | ConvertTo-Json -Compress)\n");
      const piArgs = ["hello world", "x&y", "%PATH%", 'quote"test', "slash\\"];

      const result = buildLaunchCommand(piArgs, "win32", { Path: root });
      const completed = spawnSync(result.command, result.args, { encoding: "utf-8" });

      assert.equal(completed.status, 0, completed.stderr);
      assert.deepEqual(JSON.parse(completed.stdout), piArgs);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
