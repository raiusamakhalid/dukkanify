#!/usr/bin/env node
/**
 * The `prepare` lifecycle, which npm runs after every install.
 *
 * Two jobs with different standing. Building `packages/contracts` is required — both apps
 * import `@dukkanify/contracts` from its `dist`, so a fresh clone that skipped it cannot
 * typecheck, let alone build. Installing git hooks is a local convenience: a build container
 * has no hooks to run, often no `.git` at all, and on Vercel husky is not even on PATH.
 *
 * Written as a script rather than a shell chain because `husky || true` is not portable to
 * Windows, where npm runs scripts through cmd.exe and `true` is not a command. This keeps one
 * behaviour on every platform: contracts must build, hooks are best-effort.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";

const contracts = spawnSync("npm", ["run", "contracts:build"], {
  cwd: root,
  stdio: "inherit",
  shell: isWin,
});
if (contracts.status !== 0) {
  process.exit(contracts.status ?? 1);
}

const hooks = spawnSync("husky", [], { cwd: root, stdio: "inherit", shell: isWin });
if (hooks.status !== 0) {
  console.log("husky not installed — skipping git hooks (expected in CI and on Vercel)");
}
