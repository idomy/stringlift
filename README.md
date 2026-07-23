# stringlift

**Safely retrofit internationalization (i18n) into React / TypeScript apps that were never built for it.**

`stringlift` finds the user-facing text in a codebase, lets you translate it, and then **proves — via an AST comparison — that nothing but the text changed.** No broken layouts, no renamed identifiers, no touched logic.

```bash
npx stringlift extract ./src -o strings.json
# ...fill in strings.glossary.json with translations (by hand or with an LLM)...
npx stringlift apply ./src --glossary strings.glossary.json --report
npx stringlift apply ./src --glossary strings.glossary.json --out ./src-it
npx stringlift verify ./src ./src-it
# ✓ SAFE: files differ only inside string/template contents. No code changed.
```

---

## The problem

Most React apps start out English-only, with text hardcoded straight into the JSX. Adding translations later ("retrofitting i18n") is miserable:

- The strings are **tangled up with code** — inside `className`, ternaries, template literals, comparisons — so a find-and-replace is dangerous.
- Existing tools (`i18next-parser` and friends) assume you **already** wrapped your text in `t()` calls. They don't help the app that has none.
- Doing it by hand across hundreds of files, you *will* eventually break a CSS class or a conditional and not notice until production.

`stringlift` is built for exactly that starting point: **an app with zero i18n**, where you need a machine to tell prose apart from code — and a guarantee that it did no harm.

## What makes it safe

Two ideas do the heavy lifting:

1. **AST extraction, never regex.** `stringlift` parses each file and only pulls strings that are genuinely rendered to the user:
   - JSX text nodes (`<p>Hello</p>`)
   - a curated allow-list of attributes (`title`, `placeholder`, `aria-*`, …)
   - string literals in **render position** — a branch of a `? :` or `&&` inside JSX
   - template literals like `` `${n} items` `` (placeholders preserved)

   It deliberately **ignores** `className` / `style`, comparison operands (`x === "system"`), function arguments, object keys, routes, and anything that looks like a CSS class or an identifier.

2. **A verification harness.** After translating, `stringlift verify` re-parses both trees and compares their **structural skeleton** — every AST node and identifier, with each string and template collapsed to a single opaque token. If the skeletons match, the files differ *only* inside string contents. That is a proof, not a vibe:

   ```
   Checked 431 files — 431 structurally identical, 0 changed.
   ✓ SAFE: files differ only inside string/template contents. No code changed.
   ```

This "verify that an automated edit changed only what it was allowed to" pattern is the point. It's what makes it safe to hand the boring part to a script — or to an LLM.

## Commands

| Command | What it does | Touches your files? |
|---|---|---|
| `stringlift extract <dir> [-o out.json]` | Lists every user-facing string + writes an empty translation stub | Read-only |
| `stringlift apply <src> --glossary <map.json> --report` | Previews translations and skipped strings, grouped by file | Read-only |
| `stringlift apply <src> --glossary <map.json> [--out <dest>]` | Writes a translated copy | Writes `<dest>` |
| `stringlift verify <orig> <new>` | Proves `<new>` differs from `<orig>` only inside strings | Read-only |

The intended loop is **extract -> translate -> apply -> verify**, and you never ship unless `verify` is green.

## Use as a library

```js
import { extract, apply, verify } from "stringlift";

const { unique } = extract("./src");                     // Map<string, {kind, count}>
const glossary = await translate([...unique.keys()]);    // your call — LLM, service, humans
apply(extract("./out").records, glossary, "./out", "./out");
const { diffs } = verify("./src", "./out");              // diffs.length === 0  => safe
```

## Status & limitations (read this)

`stringlift` is **v0.1 and honest about it.** It was extracted from a real project — translating a ~2,900-file React app end to end — so the core is battle-tested, but it is not yet a polished product:

- **React/TSX + JSX only** right now. Vue, Svelte, and Angular are wanted as adapters.
- **Translation is your job.** `stringlift` does the *safe extraction and application*; it does not ship a translation engine. An optional LLM-translate mode (with the same verify guarantee) is on the [roadmap](ROADMAP.md).
- The user-facing/CSS heuristics are good, not perfect. They err toward **skipping** rather than mistranslating, and `verify` is your backstop.
- Template literals are translated per-string with placeholders preserved, so word order across `${…}` can read slightly literal in some languages.

If `stringlift` translates something it shouldn't, or skips something it should catch, that's a bug worth filing — the heuristics improve with real-world cases.

## Contributing

This project grows through real use. The highest-value contributions right now:

- **Framework adapters** — Vue SFC, Svelte, Angular templates.
- **An `extract-to-keys` mode** — emit `t("key")` calls + resource files instead of in-place translation.
- **Heuristic test cases** — a tricky file where extraction gets it wrong is a perfect first PR.
- **An optional LLM translate command** that runs `verify` automatically and refuses to write unsafe output.

See [CONTRIBUTING.md](CONTRIBUTING.md) and the [roadmap](ROADMAP.md). Good first issues are labeled on the tracker.

## Origin

`stringlift` was born translating [Paperclip](https://github.com/paperclipai/paperclip) into Italian — an app with no i18n and ~6,000 hardcoded strings. Doing that safely required exactly this tooling, so it was pulled out into its own project. That translation is the first real-world case study.

## License

[MIT](LICENSE) © Domenico Pace
