import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

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

// report
const reportDir = path.join(out, "report-app");
const reportGlossary = path.join(out, "report.glossary.json");
fs.cpSync(demo, reportDir, { recursive: true });
fs.writeFileSync(reportGlossary, JSON.stringify({ "Welcome to the demo": "Benvenuto nella demo" }));
const reportFile = path.join(reportDir, "src", "App.tsx");
const beforeReport = fs.readFileSync(reportFile, "utf8");
const reportOut = execFileSync("node", [cli, "apply", reportDir, "--glossary", reportGlossary, "--report"], { encoding: "utf8" });
const afterReport = fs.readFileSync(reportFile, "utf8");
ok(reportOut.includes(`${path.join("src", "App.tsx")}:\n`) && reportOut.includes('"Welcome to the demo" -> "Benvenuto nella demo"'), "report lists translations per file");
ok(reportOut.includes('"Main heading" -> skipped'), "report marks strings missing from the glossary as skipped");
ok(afterReport === beforeReport, "report leaves source files unchanged");

// verify
const verifyOut = execFileSync("node", [cli, "verify", demo, out], { encoding: "utf8" });
ok(/0 changed/.test(verifyOut) && /SAFE/.test(verifyOut), "verify proves no structural change");

fs.rmSync(out, { recursive: true, force: true });
console.log(failures === 0 ? "\nAll tests passed." : `\n${failures} test(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
