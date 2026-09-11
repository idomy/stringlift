import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { extractVueFile } from "../src/extract-vue.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "bin", "cli.mjs");
const demo = path.join(root, "examples", "demo-app");
const glossary = path.join(root, "examples", "demo.glossary.json");
const out = fs.mkdtempSync(path.join(os.tmpdir(), "stringlift-test-"));

let failures = 0;
const ok = (cond, msg) => { console.log((cond ? "  ok  - " : "  FAIL- ") + msg); if (!cond) failures++; };

// extract
const extracted = JSON.parse(execFileSync("node", [cli, "extract", demo], { encoding: "utf8" }));
ok(extracted.unique === 11, `extract finds 11 unique strings (got ${extracted.unique})`);
ok(!extracted.strings.some((s) => /flex|grid|className/.test(s)), "extract excludes CSS classes");
ok(!extracted.strings.includes("system"), "extract excludes comparison operands");
ok(extracted.strings.includes("{0} items selected"), "extract normalises template literals");

// apply
execFileSync("node", [cli, "apply", demo, "--glossary", glossary, "--out", out], { encoding: "utf8" });
const translated = fs.readFileSync(path.join(out, "src", "App.tsx"), "utf8");
ok(translated.includes("Benvenuto nella demo"), "apply translates JSX text");
ok(translated.includes('data-testid="search-box"'), "apply leaves data-testid untouched");
ok(translated.includes('className="flex flex-col gap-4 rounded-xl border p-4"'), "apply leaves className untouched");
ok(translated.includes("`${count} elementi selezionati`"), "apply rebuilds template literal");

// verify
const verifyOut = execFileSync("node", [cli, "verify", demo, out], { encoding: "utf8" });
ok(/0 changed/.test(verifyOut) && /SAFE/.test(verifyOut), "verify proves no structural change");

const vueSrc = fs.readFileSync(path.join(root, "examples", "demo-vue", "App.vue"), "utf8");
const vueRecs = extractVueFile("App.vue", vueSrc);
const vueTexts = vueRecs.map((r) => r.text.trim());
ok(vueTexts.includes("Welcome to the Vue demo"), "vue: finds template text node");
ok(vueTexts.includes("Search items"), "vue: finds placeholder attr");
ok(vueTexts.includes("Search box"), "vue: finds title attr");
ok(vueTexts.includes("Company logo"), "vue: finds alt attr");
ok(vueTexts.includes("Increment counter"), "vue: finds aria-label attr");
ok(!vueTexts.some((t) => /flex|col|rounded/.test(t)), "vue: excludes class attr");
ok(!vueTexts.some((t) => /^dynamic$/.test(t)), "vue: excludes :placeholder binding");
ok(!vueTexts.some((t) => /settings\/account/.test(t)), "vue: excludes href");
ok(vueTexts.includes("Open settings"), "vue: finds anchor text");
// unique: one occurrence each; check text/attr kinds present and offsets valid
ok(vueRecs.some((r) => r.kind === "text") && vueRecs.some((r) => r.kind === "attr"), "vue: uses text and attr kinds");
const sliceMatch = (r) => {
  const s = vueSrc.slice(r.start, r.end).trim();
  return s === r.text.trim() || s === '"' + r.text.trim() + '"'; // attr locs include the surrounding quotes
};
ok(vueRecs.every(sliceMatch), "vue: absolute offsets slice to record text");

fs.rmSync(out, { recursive: true, force: true });
console.log(failures === 0 ? "\nAll tests passed." : `\n${failures} test(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
