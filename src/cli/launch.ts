import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { constants } from "node:os";
import { delimiter, join } from "node:path";

interface LaunchCommand {
  command: string;
  args: string[];
  windowsVerbatimArguments?: boolean;
}

export function buildLaunchCommand(
  piArgs: string[],
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
): LaunchCommand {
  if (platform === "win32") {
    const piExe = findOnPath("pi.exe", env);
    if (piExe) return { command: piExe, args: piArgs };

    const piPs1 = findOnPath("pi.ps1", env);
    if (piPs1) {
      return {
        command: "powershell.exe",
        args: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", piPs1, ...piArgs],
      };
    }

    return buildCmdLaunchCommand(piArgs, env);
  }

  return { command: "pi", args: piArgs };
}

function buildCmdLaunchCommand(
  piArgs: string[],
  env: NodeJS.ProcessEnv,
): LaunchCommand {
  const commandLine = `"${["pi", ...piArgs].map(quoteWindowsCmdArg).join(" ")}"`;
  return {
    command: getEnv(env, "ComSpec") || "cmd.exe",
    args: ["/d", "/s", "/c", commandLine],
    windowsVerbatimArguments: true,
  };
}

function quoteWindowsCmdArg(arg: string): string {
  const quoted = arg
    .replace(/(\\*)"/g, "$1$1\\\"")
    .replace(/\\+$/g, "$&$&");
  return `"${quoted}"`;
}

function findOnPath(fileName: string, env: NodeJS.ProcessEnv): string | undefined {
  const pathValue = getEnv(env, "Path");
  if (!pathValue) return undefined;

  for (const dir of pathValue.split(delimiter)) {
    if (!dir) continue;
    const candidate = join(dir, fileName);
    if (existsSync(candidate)) return candidate;
  }

  return undefined;
}

function getEnv(env: NodeJS.ProcessEnv, key: string): string | undefined {
  const foundKey = Object.keys(env).find((envKey) => envKey.toLowerCase() === key.toLowerCase());
  return foundKey ? env[foundKey] : undefined;
}

export function launch(profilePath: string, piArgs: string[]): void {
  const env = { ...process.env, PI_CODING_AGENT_DIR: profilePath };
  const { command, args, windowsVerbatimArguments } = buildLaunchCommand(piArgs);
  const child = spawn(command, args, { env, stdio: "inherit", windowsVerbatimArguments });

  // SIGINT is delivered to the entire foreground process group when the child
  // shares the parent's TTY (stdio: "inherit"), so both parent and child
  // receive it simultaneously. We must NOT forward it — that would double-
  // signal the child. SIGTERM and SIGHUP are sent to the parent specifically,
  // so those we forward.
  for (const sig of ["SIGTERM", "SIGHUP"] as const) {
    process.on(sig, () => child.kill(sig));
  }

  child.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "ENOENT") {
      console.error("pi not found. Install from https://pi.dev");
      process.exit(1);
    }
    throw err;
  });

  child.on("exit", (code, signal) => {
    if (code !== null) {
      process.exit(code);
    }
    // Child was killed by a signal — convention is 128 + signal number.
    const sigNum = signal ? (constants.signals[signal] ?? 1) : 1;
    process.exit(128 + sigNum);
  });
}
