#!/usr/bin/env node
/**
 * One-command local stack: Postgres (Docker) → migrate → API + Web.
 * Usage: npm run dev
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";

function run(command, args, opts = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: isWin,
    env: process.env,
    ...opts,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function which(bin) {
  const probe = isWin ? "where" : "which";
  const result = spawnSync(probe, [bin], { encoding: "utf8" });
  return result.status === 0;
}

function dockerCompose(args) {
  if (which("docker")) {
    const probe = spawnSync("docker", ["compose", "version"], {
      encoding: "utf8",
    });
    if (probe.status === 0) {
      run("docker", ["compose", ...args]);
      return;
    }
  }
  if (which("docker-compose")) {
    run("docker-compose", args);
    return;
  }
  console.error(
    "Docker is required. Install Docker Desktop / docker.io, then retry `npm run dev`.",
  );
  process.exit(1);
}

function waitForPostgres(timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const result = spawnSync(
      "docker",
      ["exec", "dukkanify-db", "pg_isready", "-U", "dukkanify"],
      { encoding: "utf8" },
    );
    if (result.status === 0) {
      return;
    }
    spawnSync("sleep", ["1"]);
  }
  console.error("PostgreSQL did not become ready within 60s. Check: docker compose ps");
  process.exit(1);
}

function ensureEnvFiles() {
  const pairs = [
    ["apps/api/.env", "apps/api/.env.example"],
    ["apps/web/.env.local", "apps/web/.env.local.example"],
  ];
  for (const [target, example] of pairs) {
    const targetPath = join(root, target);
    const examplePath = join(root, example);
    if (!existsSync(targetPath) && existsSync(examplePath)) {
      run("cp", [examplePath, targetPath]);
      console.log(`Created ${target} from ${example} — fill in secrets before signing in.`);
    }
  }
}

console.log("→ Ensuring env files…");
ensureEnvFiles();

console.log("→ Starting PostgreSQL (Docker)…");
dockerCompose(["up", "-d"]);

console.log("→ Waiting for database…");
waitForPostgres();

console.log("→ Applying migrations…");
run("npm", ["run", "db:deploy", "-w", "api"]);

console.log("→ Starting API (:4000) and Web (:3000)…");
const child = spawn(
  "npx",
  [
    "concurrently",
    "-n",
    "api,web",
    "-c",
    "cyan,magenta",
    "npm run dev -w api",
    "npm run dev -w web",
  ],
  { cwd: root, stdio: "inherit", shell: isWin, env: process.env },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  }
  process.exit(code ?? 1);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    child.kill(sig);
  });
}
