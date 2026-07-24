import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { extractFile } from "../src/extract.mjs";

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

// ── fixture: mixed-case-identifiers (extractFile — isolates to one file) ──
const mcCode = fs.readFileSync(path.join(root, "examples", "fixtures", "mixed-case-identifiers.tsx"), "utf8");
const mcRecords = extractFile("mixed-case-identifiers.tsx", mcCode);
const mcStrings = mcRecords.map((r) => r.text.trim());

// Real prose MUST be extracted
ok(mcStrings.includes("Main heading"), "mixed-case: extracts title attr");
ok(mcStrings.includes("Welcome to the app"), "mixed-case: extracts JSX text");
ok(mcStrings.includes("You have items"), "mixed-case: extracts JSX text across elements");
ok(mcStrings.includes("Search projects..."), "mixed-case: extracts placeholder attr");
ok(mcStrings.includes("Show details"), "mixed-case: extracts ternary branch prose");
ok(mcStrings.includes("Hide details"), "mixed-case: extracts ternary branch prose");
ok(mcStrings.includes("Found"), "mixed-case: extracts && right-side prose");
ok(mcStrings.includes("New"), "mixed-case: extracts ternary branch prose");
ok(mcStrings.includes("Old"), "mixed-case: extracts ternary branch prose");
ok(mcStrings.includes("Content"), "mixed-case: extracts JSX text");
ok(mcStrings.includes("fallback"), "mixed-case: extracts ternary alternate prose");
ok(mcStrings.includes("other"), "mixed-case: extracts ternary alternate prose");

// Mixed-case snake_case identifiers MUST be skipped
ok(!mcStrings.includes("User_Name"), "mixed-case: skips User_Name identifier");
ok(!mcStrings.includes("Api_V2"), "mixed-case: skips Api_V2 identifier");
ok(!mcStrings.includes("My_VAR_name"), "mixed-case: skips My_VAR_name identifier");

// Existing snake_case detection must not regress
ok(!mcStrings.includes("error_code"), "mixed-case: skips existing error_code identifier");

fs.rmSync(out, { recursive: true, force: true });
console.log(failures === 0 ? "\nAll tests passed." : `\n${failures} test(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
