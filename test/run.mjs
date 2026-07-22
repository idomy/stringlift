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

// verify
const verifyOut = execFileSync("node", [cli, "verify", demo, out], { encoding: "utf8" });
ok(/0 changed/.test(verifyOut) && /SAFE/.test(verifyOut), "verify proves no structural change");

fs.rmSync(out, { recursive: true, force: true });
console.log(failures === 0 ? "\nAll tests passed." : `\n${failures} test(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
