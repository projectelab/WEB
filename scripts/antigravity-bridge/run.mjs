#!/usr/bin/env node

import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";

export const SCRUBBED_WEB_DEPLOY_ENV_KEYS = Object.freeze([
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_KEY",
  "CLOUDFLARE_EMAIL",
  "CF_API_TOKEN",
  "CF_ACCOUNT_ID",
  "WRANGLER_API_TOKEN",
]);

export function buildBridgeEnvironment(source = process.env) {
  const env = { ...source };
  for (const key of SCRUBBED_WEB_DEPLOY_ENV_KEYS) {
    delete env[key];
  }
  return env;
}

export function runBridge(issueNumber) {
  if (!/^\d+$/.test(String(issueNumber || ""))) {
    throw new Error(`Issue number must be numeric, received "${issueNumber}".`);
  }

  const here = path.dirname(fileURLToPath(import.meta.url));
  const bridge = path.join(here, "bridge.mjs");
  const result = spawnSync(process.execPath, [bridge, String(issueNumber)], {
    cwd: process.cwd(),
    env: buildBridgeEnvironment(),
    stdio: "inherit",
  });

  if (result.error) throw new Error("Could not start WEB bridge.");
  if (result.status !== 0) {
    throw new Error(`WEB bridge exited with code ${result.status}.`);
  }
}

async function main() {
  const [, , issueNumber] = process.argv;
  try {
    runBridge(issueNumber);
  } catch (error) {
    console.error(`[web-bridge-runner] ${error.message}`);
    process.exitCode = 1;
  }
}

const isMain =
  process.argv[1] != null && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMain) await main();
