#!/usr/bin/env node
// Screenshot one or more Storybook stories for visual verification.
//
// This is the source of truth for "how do I look at a UI change" — the prose in
// DESIGN-SYSTEM.md ("Verifying UI changes") just points here. There's no mock RPC
// transport, so the live app can't render the editor without hardware; Storybook
// is how we see components. See the design-system doc for when to use this.
//
//   npm run shoot -- --list                 list every story id
//   npm run shoot -- --list combo            list story ids matching "combo"
//   npm run shoot -- <story-id> [<id> ...]   screenshot each (PNG path printed)
//   npm run shoot -- --out ./shots <id>      write into ./shots instead of /tmp
//
// It reuses a Storybook already on :6006, or starts one (--ci --quiet) and leaves
// it running so the next call is instant. Drives agent-browser, which must be
// installed globally (`npm i -g agent-browser`; `agent-browser doctor` to check).

import { execFileSync, spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = 6006;
const BASE = `http://localhost:${PORT}`;

const argv = process.argv.slice(2);

function takeFlagValue(name, fallback) {
  const i = argv.indexOf(name);
  if (i === -1) return fallback;
  const value = argv[i + 1];
  argv.splice(i, value === undefined ? 1 : 2);
  return value ?? fallback;
}

const outDir = takeFlagValue("--out", "/tmp");
const wantList = argv.includes("--list");
if (wantList) argv.splice(argv.indexOf("--list"), 1);
const positionals = argv.filter((a) => !a.startsWith("--"));

async function storybookUp() {
  try {
    const res = await fetch(`${BASE}/iframe.html`, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureStorybook() {
  if (await storybookUp()) return;
  console.error("Starting Storybook (this happens once; it stays running)…");
  // --ci: don't open a browser; --quiet: drop the dependency-version noise.
  const child = spawn("npm", ["run", "storybook", "--", "--ci", "--quiet"], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await sleep(1500);
    if (await storybookUp()) {
      console.error(`Storybook ready on ${BASE}`);
      return;
    }
  }
  throw new Error("Storybook did not come up within 90s");
}

async function listStories(filter) {
  const res = await fetch(`${BASE}/index.json`);
  const { entries } = await res.json();
  const ids = Object.values(entries)
    .filter((e) => e.type === "story")
    .map((e) => e.id)
    .filter((id) => !filter || id.toLowerCase().includes(filter.toLowerCase()))
    .sort();
  for (const id of ids) console.log(id);
  if (ids.length === 0) console.error(`No stories match "${filter}".`);
}

function ab(args) {
  // agent-browser drives a persistent default session, so open → screenshot
  // target the same tab across calls.
  execFileSync("agent-browser", args, { stdio: ["ignore", "ignore", "inherit"] });
}

async function shoot(id) {
  // singleStory + shortcuts=false strip the remaining Storybook chrome from the
  // iframe; viewMode=story renders the component (not the docs page).
  const url = `${BASE}/iframe.html?id=${id}&viewMode=story&singleStory=true&shortcuts=false`;
  const out = `${outDir.replace(/\/$/, "")}/${id}.png`;
  ab(["open", url]);
  // Wait for the story to actually render. Storybook compiles each story on
  // demand (Vite), showing a spinner first — `body.sb-show-preparing-story`
  // flips to `sb-show-main` once the story is mounted. This is reliable cold or
  // warm, unlike a fixed settle, `wait --text` (flaky on story iframes), or
  // `wait --load networkidle` (HMR keeps a socket open).
  ab(["wait", "--fn", "document.body.classList.contains('sb-show-main')"]);
  ab(["wait", "200"]); // tiny paint settle
  ab(["screenshot", out]);
  console.log(out);
}

try {
  execFileSync("agent-browser", ["--version"], { stdio: "ignore" });
} catch {
  console.error("agent-browser not found. Install it: npm i -g agent-browser");
  process.exit(1);
}

await ensureStorybook();

if (wantList || positionals.length === 0) {
  await listStories(positionals[0]);
  if (!wantList) {
    console.error("\nPass one or more story ids to screenshot them.");
  }
  process.exit(0);
}

for (const id of positionals) await shoot(id);
