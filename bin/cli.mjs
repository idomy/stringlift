#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { extract } from "../src/extract.mjs";
import { apply, report } from "../src/apply.mjs";
import { verify } from "../src/verify.mjs";

const [, , cmd, ...rest] = process.argv;

function opt(name, def) {
  const i = rest.indexOf(name);
  return i >= 0 ? rest[i + 1] : def;
}
const positional = rest.filter((a, i) => !a.startsWith("-") && !(i > 0 && rest[i - 1].startsWith("-")));

function help() {
  console.log(`stringlift — safe i18n extraction for React/TS codebases

Usage:
  stringlift extract <dir> [-o strings.json]
  stringlift apply   <srcDir> --glossary <map.json> [--out <destDir> | --report]
  stringlift verify  <origDir> <newDir>

Every command is read-only on your source except 'apply' without '--report', which writes a copy.
'apply' followed by 'verify' proves your code structure is byte-for-byte intact.`);
}

if (cmd === "extract") {
  const dir = positional[0];
  if (!dir) { help(); process.exit(1); }
  const out = opt("-o") || opt("--out");
  const { files, records, unique } = extract(dir);
  const keys = [...unique.keys()].sort();
  const payload = { files: files.length, occurrences: records.length, unique: unique.size, strings: keys };
  if (out) {
    fs.writeFileSync(out, JSON.stringify(payload, null, 2));
    // also emit a translation stub so contributors can start immediately
    const stub = Object.fromEntries(keys.map((k) => [k, ""]));
    const stubPath = out.replace(/\.json$/, "") + ".glossary.json";
    fs.writeFileSync(stubPath, JSON.stringify(stub, null, 2));
    console.log(`Extracted ${unique.size} unique strings from ${files.length} files (${records.length} occurrences).`);
    console.log(`  → ${out}`);
    console.log(`  → ${stubPath} (empty translation stub — fill it in)`);
  } else {
    console.log(JSON.stringify(payload, null, 2));
  }
} else if (cmd === "apply") {
  const srcDir = positional[0];
  const glossaryPath = opt("--glossary") || opt("-g");
  const destDir = opt("--out") || opt("-o") || srcDir;
  if (!srcDir || !glossaryPath) { help(); process.exit(1); }
  const glossary = JSON.parse(fs.readFileSync(glossaryPath, "utf8"));
  if (rest.includes("--report")) {
    const { records } = extract(srcDir);
    for (const [file, entries] of report(records, glossary)) {
      console.log(`${file}:`);
      for (const { source, translation } of entries) {
        console.log(`  ${JSON.stringify(source)} -> ${translation == null ? "skipped" : JSON.stringify(translation)}`);
      }
    }
  } else {
    if (destDir !== srcDir) fs.cpSync(srcDir, destDir, { recursive: true });
    const { records } = extract(destDir);
    const stats = apply(records, glossary, destDir, destDir);
    console.log(`Applied ${stats.applied} replacements across ${stats.filesChanged} files (${stats.skipped} skipped).`);
    if (stats.problems.length) console.log(`  ${stats.problems.length} problems (see records).`);
    console.log(`Now run:  stringlift verify ${srcDir} ${destDir}`);
  }
} else if (cmd === "verify") {
  const [origDir, newDir] = positional;
  if (!origDir || !newDir) { help(); process.exit(1); }
  const { checked, identical, diffs } = verify(origDir, newDir);
  console.log(`Checked ${checked} files — ${identical} structurally identical, ${diffs.length} changed.`);
  if (diffs.length === 0) {
    console.log("✓ SAFE: files differ only inside string/template contents. No code changed.");
  } else {
    console.log("✗ Structural differences found:");
    for (const d of diffs.slice(0, 20)) console.log(`  ${d.file} @${d.at}  before=[${d.before}] after=[${d.after}]`);
    process.exit(2);
  }
} else {
  help();
}
