# Handoff: migrate `package-lock.json` to lockfileVersion 3

**Status:** done (commit `4891d7b`, branch `chore/lockfile-v3`) · **Type:** one-time chore · **Owner:** Daniel Svane

## Why this exists

`package-lock.json` is currently **`lockfileVersion: 2`** (the npm 7/8 era
format). A v2 lockfile stores the dependency tree **twice**: the modern flat
`packages` map *and* a legacy v1-style nested `dependencies` tree. When the
resolved tree shifts even slightly, npm reshuffles that legacy section
wholesale, so a one-package bump produces a multi-thousand-line diff full of
seemingly-unrelated packages.

We hit this bumping `react-aria-components` 1.4 → 1.18 (commit `0d24bbf`):

| Operation | Lockfile diff |
|-----------|---------------|
| No dependency change (`npm i --package-lock-only`) | **9 lines** |
| The RAC bump alone | **+6076 / −9232**, ~1328 "unrelated" entries |

So the churn is **inherent to the v2 format**, not to that particular bump —
*every* future dependency change will do the same. `lockfileVersion: 3` drops
the legacy `dependencies` section entirely, so future diffs stay proportional
to what actually changed. The local toolchain is already **npm 11.6.2** (which
defaults to v3), so we're carrying v2 only because npm preserves an existing
file's version.

## Goal

Convert `package-lock.json` to `lockfileVersion: 3` in a single isolated
commit, and pin the npm version so teammates/CI don't silently regenerate it
back to v2 (or produce inconsistent diffs).

## Steps

1. **Branch** off the current working branch (`customkeyboards` at time of
   writing). Do this with a clean working tree — no other staged changes, so
   the (large, one-time) lockfile diff is the *only* thing in the commit.

2. **Regenerate the lockfile as v3** without changing any dependency:
   ```bash
   npm install --lockfile-version 3 --package-lock-only --ignore-scripts
   ```
   Confirm: `grep -m1 lockfileVersion package-lock.json` → `3`. Expect a large
   one-time diff (the legacy section being dropped). That's the whole point —
   it pays the churn once so subsequent diffs are small.

3. **Pin npm** so this doesn't regress. Add to `package.json`:
   ```jsonc
   "packageManager": "npm@11.6.2",   // or the team's agreed npm version (must be ≥7)
   "engines": { "npm": ">=7" }
   ```
   (Optionally enable Corepack in CI so `packageManager` is enforced.)

4. **Verify** nothing else moved:
   ```bash
   npm ci            # clean install strictly from the lockfile — must succeed
   npx tsc --noEmit  # clean
   npm run lint      # clean (check the exact script name in package.json)
   npm run build     # app build succeeds
   npm run storybook # boots; spot-check a story
   ```

5. **Commit alone**, e.g.:
   ```
   chore(deps): migrate package-lock.json to lockfileVersion 3

   v2 stores the tree twice (modern packages map + legacy nested
   dependencies), so any resolve reshuffles the legacy section and every
   dependency change produced multi-thousand-line diffs. v3 drops the
   legacy section; future lockfile diffs now track real changes. Pinned
   npm via packageManager/engines so the format stays put. See
   docs/lockfile-v3-migration.md.
   ```

## Risks / caveats

- **npm ≥ 7 required to read v3.** Anyone on npm 6 or older can't use the
  lockfile. Given local is npm 11 this is almost certainly fine — but confirm
  **CI** and any teammates are on npm ≥ 7 before merging.
- **No runtime/`node_modules` change.** This is purely the lockfile *format*;
  resolved versions are identical. `npm ci` succeeding is the proof.
- **Merge timing.** The one-time diff is huge and will conflict with any other
  in-flight branch that touches `package-lock.json`. Land it when the lockfile
  is otherwise quiet, and rebase open branches onto it promptly.
- **Don't bundle** anything else into this commit — its value is being a
  reviewable "format-only, no resolution change" change.

## Done when

- `package-lock.json` is `lockfileVersion: 3`, committed alone.
- npm is pinned (`packageManager` + `engines.npm`).
- `npm ci` + tsc + lint + build + storybook all green.
- A follow-up trivial dependency change produces a *small* lockfile diff
  (sanity check the format actually fixed the problem).
