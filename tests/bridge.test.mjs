import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

import {
  REPO,
  WEB_RUNTIME_PROHIBITIONS,
  acquireLock,
  assertSafeObjective,
  buildAgyArgs,
  buildResultComment,
  lockFilePath,
  parseJobBody,
  releaseLock,
  sanitizeRemoteText,
  validateJob,
  validateRepo,
  validateStagedPaths,
} from "../scripts/antigravity-bridge/bridge.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function job(overrides = {}) {
  return {
    schema_version: "1",
    repo: "projectelab/WEB",
    base_sha: "a".repeat(40),
    objective: "Adjust mobile hero spacing",
    model: "gpt-oss-120b-medium",
    validation_level: "L1",
    allowed_paths: ["public/"],
    forbidden: [],
    pr_title: "fix(web): adjust hero spacing",
    ...overrides,
  };
}

test("parses the machine-readable Issue job", () => {
  const body = `## Job\n\`\`\`json\n${JSON.stringify(job())}\n\`\`\``;
  assert.equal(parseJobBody(body).repo, REPO);
});

test("job contract is pinned to projectelab/WEB", () => {
  assert.doesNotThrow(() => validateJob(job()));
  assert.throws(() => validateJob(job({ repo: "projectelab/LAB" })), /projectelab\/WEB/);
});

test("validation level and base SHA are enforced", () => {
  assert.throws(() => validateJob(job({ validation_level: "bridge" })), /L1, L2, L3, L4, L5/);
  assert.throws(() => validateJob(job({ base_sha: "abc" })), /40-character Git SHA/);
});

test("allowed_paths rejects traversal and absolute paths", () => {
  assert.throws(() => validateJob(job({ allowed_paths: ["../secret"] })), /Unsafe allowed_paths/);
  assert.throws(() => validateJob(job({ allowed_paths: [path.resolve("secret")] })), /Unsafe allowed_paths/);
});

test("direct deployment and main mutation objectives are rejected", () => {
  assert.throws(
    () => assertSafeObjective(job({ objective: "Run wrangler deploy now" })),
    /forbidden operation/
  );
  assert.throws(
    () => assertSafeObjective(job({ objective: "Merge to main automatically" })),
    /forbidden operation/
  );
});

test("Antigravity prompt always contains WEB runtime prohibitions", () => {
  const args = buildAgyArgs(job());
  const prompt = args[args.indexOf("-p") + 1];
  for (const rule of WEB_RUNTIME_PROHIBITIONS) {
    assert.ok(prompt.includes(rule), rule);
  }
  assert.ok(args.includes("--output-format"));
  assert.ok(args.includes("json"));
  assert.ok(!args.includes("--dangerously-skip-permissions"));
});

test("repo validation accepts only the canonical WEB origin", () => {
  const runner = (argv) => {
    if (argv.includes("--show-toplevel")) return "C:\\tmp\\web";
    if (argv.includes("get-url")) return "https://github.com/projectelab/WEB.git";
    throw new Error(`Unexpected argv ${argv.join(" ")}`);
  };
  assert.equal(validateRepo(runner), "C:\\tmp\\web");

  const badRunner = (argv) => {
    if (argv.includes("--show-toplevel")) return "C:\\tmp\\web";
    if (argv.includes("get-url")) return "https://github.com/desorden-ai/WEBL.git";
    throw new Error(`Unexpected argv ${argv.join(" ")}`);
  };
  assert.throws(() => validateRepo(badRunner), /Git origin must be exactly/);
});

test("staged scope gate rejects newly-created out-of-scope files", () => {
  assert.doesNotThrow(() => validateStagedPaths(["public/index.html"], ["public/"]));
  assert.throws(
    () => validateStagedPaths(["public/index.html", "secrets.txt"], ["public/"]),
    /outside allowed_paths/
  );
});

test("local Issue lock is exclusive", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "web-bridge-test-"));
  const gitDir = path.join(dir, ".git");
  const fs = await import("fs");
  fs.mkdirSync(gitDir);
  const lock = lockFilePath(dir, 99);
  const fd = acquireLock(lock);
  try {
    assert.throws(() => acquireLock(lock), /already claimed/);
  } finally {
    releaseLock(fd, lock);
    rmSync(dir, { recursive: true, force: true });
  }
});

test("remote result sanitization removes common secret forms", () => {
  const comment = buildResultComment({
    status: "failed",
    error: "Authorization: Bearer SECRET123 OPENAI_API_KEY=SECRET123 sk-example-secret",
  });
  assert.ok(!comment.includes("SECRET123"));
  assert.ok(!comment.includes("sk-example-secret"));
  assert.ok(comment.includes("<redacted"));
});

test("schema and implementation preserve no-deploy contract", () => {
  const schema = JSON.parse(
    readFileSync(path.join(root, "scripts/antigravity-bridge/job-schema.json"), "utf-8")
  );
  assert.equal(schema.properties.repo.const, "projectelab/WEB");

  const source = readFileSync(
    path.join(root, "scripts/antigravity-bridge/bridge.mjs"),
    "utf-8"
  );
  assert.ok(source.includes('"git", "diff", "--cached", "--name-only"'));
  assert.ok(source.includes('"git", "diff", "--cached", "--check"'));
  assert.ok(!/spawnCmd\(\[\s*["'](?:npx|wrangler)["'][\s\S]*?deploy/.test(source));
});
