#!/usr/bin/env node
/**
 * apply-renames.mjs — execute rename-plan.json (git mv + MDX edits).
 *   node scripts/apply-renames.mjs scripts/rename-plan.json [--only <slug>]
 * Re-runnable: skips a move whose source is gone and target already exists.
 */
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { dirname } from 'node:path';
import { execFileSync } from 'node:child_process';

const planPath = process.argv[2];
const oi = process.argv.indexOf('--only');
const only = oi > -1 ? process.argv[oi + 1] : null;
const scope = only ? `posts/${only}/` : null;
const plan = JSON.parse(await readFile(planPath, 'utf8'));
const exists = async (p) => { try { await access(p); return true; } catch { return false; } };

let moved = 0;
for (const { from, to } of plan.moves) {
  if (scope && !to.includes(scope)) continue;
  if (!(await exists(from))) { if (await exists(to)) continue; console.warn(`SKIP missing: ${from}`); continue; }
  await mkdir(dirname(to), { recursive: true });
  execFileSync('git', ['mv', from, to]);
  moved++;
}

let edits = 0;
for (const { file, replacements } of plan.edits) {
  let text = await readFile(file, 'utf8');
  let changed = false;
  for (const { find, replace } of replacements) {
    if (scope && !replace.includes(scope)) continue;
    if (text.includes(find)) { text = text.split(find).join(replace); changed = true; edits++; }
  }
  if (changed) await writeFile(file, text);
}

console.log(`moved ${moved} files, applied ${edits} edits`);
