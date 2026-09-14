#!/usr/bin/env node

import { spawnSync } from "child_process";
import { closeSync, openSync, unlinkSync } from "fs";
import path from "path";
import { pathToFileURL } from "url";

export const REPO = "projectelab/WEB";
export const DEFAULT_MODEL = "gpt-oss-120b-medium";
export const VALIDATION_LEVELS = new Set(["L1", "L2", "L3", "L4", "L5"]);

export const ALLOWED_MODELS = new Set(
  process.env.BRIDGE_ALLOWED_MODELS
    ? process.env.BRIDGE_ALLOWED_MODELS.split(",").map((value) => value.trim()).filter(Boolean)
    : ["gpt-oss-120b-medium", "claude-sonnet-4-6"]
);

export const ALLOWED_AUTHORS = new Set(
  process.env.BRIDGE_ALLOWED_AUTHORS
    ? process.env.BRIDGE_ALLOWED_AUTHORS.split(",").map((value) => value.trim()).filter(Boolean)
    : ["projectelab", "projectelab-bot"]
);

export const FORBIDDEN_OBJECTIVE_PATTERNS = [
  "automatic merge",
  "merge to main",
  "git push origin main",
  "production deploy",
  "production deployment",
  "wrangler deploy",
  "npm run deploy",
  "force push",
  "secret retrieval",
  "secret rotation",
  "data deletion",
  "destructive db",
];

export const WEB_RUNTIME_PROHIBITIONS = [
  "Do not merge any PR.",
  "Do not push directly to main.",
  "Do not run wrangler deploy or npm run deploy.",
  "Do not deploy to Cloudflare or any production environment.",
  "Do not retrieve, print, rotate, or modify secrets.",
  "Do not force-push or delete data.",
];

const CLAIM_LABEL = "bridge-running";

function log(message) {
  console.log(`[web-bridge] ${message}`);
}

function logError(message) {
  console.error(`[web-bridge] ${message}`);
}

export function sanitizeRemoteText(value) {
  if (value == null) return "";

  let text = String(value)
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith("at "))
    .join(" ");

  const replacements = [
    [/\b(Authorization\s*:\s*)Bearer\s+\S+/gi, "$1Bearer <redacted>"],
    [/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer <redacted>"],
    [/\b([A-Z][A-Z0-9_]*(?:TOKEN|KEY|SECRET|PASSWORD))\s*=\s*[^\s,;]+/gi, "$1=<redacted>"],
    [/\bgithub_pat_[A-Za-z0-9_]{6,}\b/gi, "<redacted-token>"],
    [/\bgh[pousr]_[A-Za-z0-9_]{6,}\b/gi, "<redacted-token>"],
    [/\bsk-[A-Za-z0-9_-]{6,}\b/gi, "<redacted-token>"],
    [/[A-Za-z]:\\[^\s"'`]+/g, "<path>"],
    [/\/(?:Users|home|tmp|var|opt|workspace|mnt)\/[^\s"'`]+/g, "<path>"],
  ];

  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }

  return text.replace(/\s+/g, " ").trim().slice(0, 400);
}

export function safeErrorSummary(error, fallback = "operation failed") {
  if (!error) return fallback;
  const source =
    typeof error === "string"
      ? error
      : typeof error.safeSummary === "string"
        ? error.safeSummary
        : typeof error.message === "string"
          ? error.message
          : fallback;
  return sanitizeRemoteText(source) || fallback;
}

export function spawnCmd(argv, options = {}) {
  const [cmd, ...args] = argv;
  const result = spawnSync(cmd, args, {
    encoding: "utf-8",
    stdio: "pipe",
    ...options,
  });

  if (result.error) {
    const error = new Error(`Failed to start ${cmd}.`);
    error.safeSummary = `Failed to start ${cmd}.`;
    throw error;
  }

  if (result.status !== 0) {
    const localDetail = sanitizeRemoteText(result.stderr) || "no diagnostic text";
    logError(`${cmd} failed with exit ${result.status}: ${localDetail}`);
    const error = new Error(`${cmd} exited with code ${result.status}.`);
    error.safeSummary = `${cmd} exited with code ${result.status}.`;
    error.exitCode = result.status;
    throw error;
  }

  return (result.stdout || "").trim();
}

export function parseJobBody(body) {
  const match = String(body || "").match(/```json\r?\n([\s\S]*?)\r?\n```/i);
  if (!match) throw new Error("Issue body does not contain a JSON job block.");
  return JSON.parse(match[1]);
}

export function validateJob(job) {
  const required = [
    "schema_version",
    "repo",
    "base_sha",
    "objective",
    "model",
    "validation_level",
    "allowed_paths",
    "forbidden",
    "pr_title",
  ];

  for (const key of required) {
    if (!(key in job) || job[key] === null || job[key] === "") {
      throw new Error(`Job missing required field: ${key}`);
    }
  }

  if (job.schema_version !== "1") {
    throw new Error(`Unsupported schema_version: ${job.schema_version}`);
  }
  if (job.repo !== REPO) {
    throw new Error(`Job repo must be exactly ${REPO}.`);
  }
  if (!/^[0-9a-f]{40}$/i.test(job.base_sha)) {
    throw new Error("base_sha must be a 40-character Git SHA.");
  }
  if (!VALIDATION_LEVELS.has(job.validation_level)) {
    throw new Error("validation_level must be one of L1, L2, L3, L4, L5.");
  }
  if (!Array.isArray(job.allowed_paths) || job.allowed_paths.length === 0) {
    throw new Error("allowed_paths must be a non-empty array.");
  }
  if (!Array.isArray(job.forbidden)) {
    throw new Error("forbidden must be an array.");
  }

  for (const allowedPath of job.allowed_paths) {
    if (
      typeof allowedPath !== "string" ||
      !allowedPath.trim() ||
      path.isAbsolute(allowedPath) ||
      /[\r\n\0]/.test(allowedPath) ||
      allowedPath.split(/[\\/]/).includes("..")
    ) {
      throw new Error(`Unsafe allowed_paths entry: ${sanitizeRemoteText(allowedPath)}`);
    }
  }
}

export function validateAuthor(author, authors = ALLOWED_AUTHORS) {
  if (!authors.has(author)) {
    throw new Error(`Author "${author}" is not in the allow-list.`);
  }
}

export function assertSafeObjective(job) {
  const text = String(job.objective || "");
  const patterns = [...FORBIDDEN_OBJECTIVE_PATTERNS, ...job.forbidden];
  for (const pattern of patterns) {
    let regex;
    try {
      regex = new RegExp(String(pattern), "i");
    } catch {
      throw new Error("Job contains an invalid forbidden pattern.");
    }
    if (regex.test(text)) {
      throw new Error(`Objective contains forbidden operation: ${sanitizeRemoteText(pattern)}`);
    }
  }
}

export function validateModel(job, models = ALLOWED_MODELS) {
  if (!models.has(job.model)) {
    throw new Error(`Model "${job.model}" is not in the allow-list.`);
  }
  return job.model;
}

export function parseAgyModels(output) {
  return new Set(
    String(output || "")
      .split(/\r?\n/)
      .map((line) => line.trim().split(/\s+/)[0])
      .filter(Boolean)
  );
}

export function validateModelAvailable(model, runner = spawnCmd) {
  const available = parseAgyModels(runner(["agy", "models"]));
  if (!available.has(model)) {
    throw new Error(`Model "${model}" is not available in this Antigravity installation.`);
  }
}

export function validateRepo(runner = spawnCmd) {
  const root = runner(["git", "rev-parse", "--show-toplevel"]);
  const origin = runner(["git", "remote", "get-url", "origin"], { cwd: root })
    .replace(/\.git$/i, "")
    .replace(/^git@github\.com:/i, "https://github.com/");
  if (origin !== `https://github.com/${REPO}`) {
    throw new Error(`Git origin must be exactly ${REPO}.`);
  }
  return root;
}

export function ensureCleanRepo(runner = spawnCmd) {
  const status = runner(["git", "status", "--porcelain"]);
  if (status) throw new Error("Canonical WEB checkout is dirty. Refusing to run.");
}

export function validateStagedPaths(files, allowedPaths) {
  for (const file of files) {
    const allowed = allowedPaths.some(
      (allowedPath) =>
        file === allowedPath ||
        file.startsWith(allowedPath.endsWith("/") ? allowedPath : `${allowedPath}/`)
    );
    if (!allowed) throw new Error(`Staged file "${file}" is outside allowed_paths.`);
  }
}

export function buildAgyArgs(job) {
  const prompt = [
    job.objective,
    `Repository: ${REPO}`,
    `Scope: only modify ${job.allowed_paths.join(", ")}`,
    `Validation level: ${job.validation_level}`,
    `Additional forbidden patterns: ${job.forbidden.join(", ") || "none"}`,
    ...WEB_RUNTIME_PROHIBITIONS,
    "Do not expand scope. Do not merge. Return concise structured JSON.",
  ].join("\n");

  return ["-p", prompt, "--model", job.model, "--output-format", "json"];
}

export function lockFilePath(repoRoot, issueNumber) {
  return path.join(repoRoot, ".git", `web-bridge-lock-${issueNumber}`);
}

export function acquireLock(lockPath) {
  try {
    return openSync(lockPath, "wx");
  } catch (error) {
    if (error.code === "EEXIST") {
      throw new Error("This WEB issue is already claimed by a local bridge process.");
    }
    throw error;
  }
}

export function releaseLock(fd, lockPath) {
  try {
    closeSync(fd);
  } catch {}
  try {
    unlinkSync(lockPath);
  } catch {}
}

function fetchIssue(issueNumber) {
  return JSON.parse(
    spawnCmd([
      "gh",
      "issue",
      "view",
      String(issueNumber),
      "--repo",
      REPO,
      "--json",
      "title,body,author,state,labels,number",
    ])
  );
}

function claimIssue(issue, issueNumber, lockPath) {
  const fd = acquireLock(lockPath);
  const labels = (issue.labels || []).map((label) =>
    typeof label === "string" ? label : label.name || ""
  );
  if (labels.includes(CLAIM_LABEL)) {
    releaseLock(fd, lockPath);
    throw new Error("Issue is already marked bridge-running.");
  }

  try {
    spawnCmd([
      "gh",
      "label",
      "create",
      CLAIM_LABEL,
      "--repo",
      REPO,
      "--color",
      "#e4e669",
      "--description",
      "Antigravity WEB bridge is processing this issue",
    ]);
  } catch {
    // Existing label is safe.
  }

  try {
    spawnCmd([
      "gh",
      "issue",
      "edit",
      String(issueNumber),
      "--repo",
      REPO,
      "--add-label",
      CLAIM_LABEL,
    ]);
  } catch (error) {
    releaseLock(fd, lockPath);
    throw error;
  }

  return fd;
}

function releaseIssueClaim(issueNumber) {
  try {
    spawnCmd([
      "gh",
      "issue",
      "edit",
      String(issueNumber),
      "--repo",
      REPO,
      "--remove-label",
      CLAIM_LABEL,
    ]);
  } catch {
    // Best effort: stale label is visible for manual cleanup.
  }
}

function createWorktree(repoRoot, baseSha, branchName, issueNumber) {
  const worktreeDir = path.join(
    path.dirname(repoRoot),
    `.web-bridge-worktree-${issueNumber}-${Date.now()}`
  );
  spawnCmd(["git", "worktree", "add", "-b", branchName, worktreeDir, baseSha], {
    cwd: repoRoot,
  });
  const activeBranch = spawnCmd(["git", "rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: worktreeDir,
  });
  if (activeBranch === "main") {
    throw new Error("Agent worktree must never run on main.");
  }
  return worktreeDir;
}

function cleanupWorktree(repoRoot, worktreeDir) {
  try {
    spawnCmd(["git", "worktree", "remove", worktreeDir, "--force"], { cwd: repoRoot });
  } catch (error) {
    log(`Cleanup warning: ${safeErrorSummary(error)}`);
  }
}

function runAntigravity(job, worktreeDir) {
  const result = spawnSync("agy", buildAgyArgs(job), {
    cwd: worktreeDir,
    encoding: "utf-8",
    stdio: "pipe",
  });

  if (result.error) {
    const error = new Error("Antigravity could not be started.");
    error.safeSummary = "Antigravity could not be started.";
    throw error;
  }
  if (result.status !== 0) {
    logError(
      `Antigravity exit ${result.status}: ${sanitizeRemoteText(result.stderr) || "no diagnostic text"}`
    );
    const error = new Error(`Antigravity exited with code ${result.status}.`);
    error.safeSummary = `Antigravity exited with code ${result.status}.`;
    throw error;
  }

  let payload;
  try {
    payload = JSON.parse(result.stdout || "{}");
  } catch {
    throw new Error("Antigravity returned invalid JSON.");
  }

  if (payload.status && payload.status !== "SUCCESS") {
    throw new Error(`Antigravity status was ${sanitizeRemoteText(payload.status)}.`);
  }
  return payload.status || "SUCCESS";
}

function stageValidateCommitPush(job, worktreeDir, branchName) {
  spawnCmd(["git", "add", "."], { cwd: worktreeDir });
  const staged = spawnCmd(["git", "diff", "--cached", "--name-only"], {
    cwd: worktreeDir,
  });
  const files = staged.split(/\r?\n/).filter(Boolean);
  if (files.length === 0) throw new Error("Agent produced no staged changes.");

  validateStagedPaths(files, job.allowed_paths);
  spawnCmd(["git", "diff", "--cached", "--check"], { cwd: worktreeDir });
  spawnCmd(["git", "commit", "-m", job.pr_title], { cwd: worktreeDir });
  const commit = spawnCmd(["git", "rev-parse", "HEAD"], { cwd: worktreeDir });
  spawnCmd(["git", "push", "origin", branchName], { cwd: worktreeDir });
  return commit;
}

function openPR(branchName, title) {
  return spawnCmd([
    "gh",
    "pr",
    "create",
    "--repo",
    REPO,
    "--title",
    title,
    "--body",
    "Automated Antigravity WEB bridge PR. Review required. Do not merge automatically. Merging to main triggers the Cloudflare production workflow and therefore requires explicit user publication authorization.",
    "--head",
    branchName,
    "--base",
    "main",
    "--no-maintainer-edit",
  ]);
}

export function buildResultComment(result) {
  const lines = [
    "## WEB Bridge Result",
    "",
    `**Status**: ${sanitizeRemoteText(result.status) || "—"}`,
    `**Phase**: ${sanitizeRemoteText(result.phase) || "—"}`,
    `**Branch**: ${sanitizeRemoteText(result.branch) || "—"}`,
    `**Commit**: ${sanitizeRemoteText(result.commit) || "—"}`,
    `**PR**: ${sanitizeRemoteText(result.prUrl) || "—"}`,
    `**Model**: ${sanitizeRemoteText(result.model) || "—"}`,
    `**Validation**: ${sanitizeRemoteText(result.validation) || "—"}`,
    `**Antigravity**: ${sanitizeRemoteText(result.agyStatus) || "—"}`,
    `**Scope**: ${sanitizeRemoteText(result.scope) || "—"}`,
    `**Diff check**: ${sanitizeRemoteText(result.diffCheck) || "—"}`,
    `**Publish**: NOT PERFORMED`,
    `**Risks**: ${sanitizeRemoteText(result.risks) || "none noted"}`,
  ];
  if (result.error) lines.push(`**Error**: ${safeErrorSummary(result.error)}`);
  return lines.join("\n");
}

function postResult(issueNumber, result) {
  try {
    spawnCmd([
      "gh",
      "issue",
      "comment",
      String(issueNumber),
      "--repo",
      REPO,
      "--body",
      buildResultComment(result),
    ]);
  } catch (error) {
    log(`Could not post result comment: ${safeErrorSummary(error)}`);
  }
}

function isReportableIssue(issue) {
  if (!issue || issue.state !== "OPEN") return false;
  const author =
    (typeof issue.author === "object" ? issue.author?.login : issue.author) || "";
  return ALLOWED_AUTHORS.has(author);
}

async function main() {
  const [, , issueNumber] = process.argv;
  if (!issueNumber || !/^\d+$/.test(issueNumber)) {
    logError("Usage: node scripts/antigravity-bridge/bridge.mjs <numeric-issue-number>");
    process.exitCode = 1;
    return;
  }

  let issue = null;
  let phase = "fetch_issue";
  let repoRoot = null;
  let worktree = null;
  let branch = null;
  let lockPath = null;
  let lockFd = null;
  let claimed = false;
  let succeeded = false;
  let model = DEFAULT_MODEL;
  let validation = "—";

  try {
    issue = fetchIssue(issueNumber);
    if (issue.state !== "OPEN") throw new Error("Issue is not open.");

    const author =
      (typeof issue.author === "object" ? issue.author?.login : issue.author) || "";
    validateAuthor(author);

    phase = "preflight";
    repoRoot = validateRepo();
    ensureCleanRepo();

    const job = parseJobBody(issue.body);
    validateJob(job);
    validation = job.validation_level;
    assertSafeObjective(job);
    model = validateModel(job);
    validateModelAvailable(model);

    lockPath = lockFilePath(repoRoot, issueNumber);
    phase = "claim";
    lockFd = claimIssue(issue, issueNumber, lockPath);
    claimed = true;

    phase = "worktree";
    branch = `feat/web-bridge-${issueNumber}-${Date.now()}`;
    worktree = createWorktree(repoRoot, job.base_sha, branch, issueNumber);

    phase = "antigravity";
    const agyStatus = runAntigravity({ ...job, model }, worktree);

    phase = "scope_commit_push";
    const commit = stageValidateCommitPush(job, worktree, branch);

    phase = "open_pr";
    const prUrl = openPR(branch, job.pr_title);
    succeeded = true;

    postResult(issueNumber, {
      status: "success",
      phase: "complete",
      branch,
      commit,
      prUrl,
      model,
      validation,
      agyStatus,
      scope: "passed (exact staged file set)",
      diffCheck: "passed (git diff --cached --check)",
      risks: "Controller review required. Merge to main publishes production and needs explicit user authorization.",
    });

    log(`Completed. PR: ${prUrl}`);
  } catch (error) {
    logError(`${phase}: ${safeErrorSummary(error)}`);
    if (isReportableIssue(issue)) {
      postResult(issueNumber, {
        status: "failed",
        phase,
        branch: branch || "—",
        commit: "—",
        prUrl: "—",
        model,
        validation,
        agyStatus: phase === "antigravity" ? "failed" : "not started",
        scope: phase === "scope_commit_push" ? "failed" : "not reached",
        diffCheck: "not completed",
        risks: worktree
          ? "Worktree preserved locally for diagnosis. No production deployment performed."
          : "Failed before worktree creation. No production deployment performed.",
        error,
      });
    }
    process.exitCode = 1;
  } finally {
    if (claimed) releaseIssueClaim(issueNumber);
    if (lockFd !== null && lockPath) releaseLock(lockFd, lockPath);
    if (succeeded && repoRoot && worktree) {
      cleanupWorktree(repoRoot, worktree);
    } else if (worktree) {
      log(`Preserved failed worktree: ${worktree}`);
    }
  }
}

const isMain =
  process.argv[1] != null && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMain) await main();
