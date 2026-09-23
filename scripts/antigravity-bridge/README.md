# WEB Antigravity Bridge v1

## Purpose

This bridge lets ChatGPT/controller turn a GitHub Issue in `projectelab/WEB` into one isolated Antigravity engineering job.

Flow:

`ChatGPT -> WEB Issue -> local temporary checkout -> safe runner -> isolated worktree -> agy -> scoped checks -> branch -> PR -> controller review`

The bridge never merges and never deploys production.

## Why WEB stays separate from LAB

`projectelab/WEB` is the canonical repository for DESORDEN WEB. `projectelab/LAB` remains exclusively LAB.

No WEB source code, build output or deployment state is copied into LAB.

## Local bootstrap on Windows

WEB does not need a permanent clone on the PC.

Use a technical checkout under `%TEMP%`:

```powershell
$web = Join-Path $env:TEMP "projectelab-WEB"

if (-not (Test-Path "$web\.git")) {
  git clone https://github.com/projectelab/WEB.git $web
}

Set-Location $web
git status --short
git fetch origin
git switch main
git pull --ff-only origin main
```

If `git status --short` is not empty, stop and inspect the checkout. Do not clean or reset it automatically.

## Run one job

The controller creates an Issue in `projectelab/WEB` and gives you its number.

Use the safe runner:

```powershell
node scripts/antigravity-bridge/run.mjs <issue-number>
```

Example:

```powershell
node scripts/antigravity-bridge/run.mjs 12
```

`run.mjs` removes common Cloudflare/Wrangler deployment credential variables from the bridge process environment before starting the worker. The worker then reads the Issue, validates the job contract, creates a worktree and feature branch, invokes Antigravity once, validates the exact staged paths, pushes the branch and opens a PR.

`bridge.mjs` is the low-level worker. Prefer `run.mjs` for normal operation.

## Job contract

The Issue body must contain a fenced JSON block matching `job-schema.json`.

Example:

```json
{
  "schema_version": "1",
  "repo": "projectelab/WEB",
  "base_sha": "<40-char current WEB main SHA>",
  "objective": "Reduce the mobile hero spacing without changing copy or navigation.",
  "model": "gpt-oss-120b-medium",
  "validation_level": "L1",
  "allowed_paths": ["public/", "src/", "tests/"],
  "forbidden": [],
  "pr_title": "fix(web): refine mobile hero spacing"
}
```

## Model policy

Default executor:

```text
gpt-oss-120b-medium
```

Escalation model:

```text
claude-sonnet-4-6
```

The requested model must be in the bridge allow-list and also appear in `agy models`.

## Security gates

The bridge:

- accepts only `projectelab/WEB`;
- accepts only allowed Issue authors;
- refuses dirty canonical checkouts;
- never executes the agent on `main`;
- creates an isolated worktree from the requested `base_sha`;
- claims the Issue with an exclusive local lock plus `bridge-running` label;
- invokes Antigravity once per job;
- passes explicit `allowed_paths` and validation level to the agent;
- stages changes before validating the exact changed file set;
- uses `git diff --cached --check` before commit;
- uses normal push only;
- sanitizes remote failure comments;
- preserves failed worktrees for diagnosis;
- never uses `--dangerously-skip-permissions`;
- starts through a runner that strips common Cloudflare/Wrangler deployment credentials from the inherited environment.

## Direct deployment is prohibited

Antigravity must not:

- run `wrangler deploy`;
- run `npm run deploy`;
- deploy directly to Cloudflare;
- push directly to `main`;
- merge a PR;
- retrieve or rotate secrets;
- force-push;
- delete data.

The bridge adds these rules to every WEB agent prompt. The safe runner also removes common Cloudflare credential variables before the worker starts.

## Publication flow

Production publication remains controlled by the existing GitHub workflow.

1. Bridge creates a WEB PR.
2. ChatGPT/controller reviews the diff and checks.
3. User explicitly authorizes publication.
4. Controller merges the approved PR to `main`.
5. `.github/workflows/deploy-cloudflare.yml` runs tests and deploys Cloudflare.
6. Controller verifies the workflow and `https://www.desorden.cat/`.

A modification request is not publication authorization.

## Failure recovery

Failed worktrees are deliberately preserved outside the canonical checkout.

Inspect them with:

```powershell
git worktree list
```

Remove only after inspection:

```powershell
git worktree remove <path> --force
```

A forcibly terminated process can leave this lock:

```text
.git\web-bridge-lock-<issue-number>
```

Delete a stale lock only after confirming no bridge process is still using that Issue.
