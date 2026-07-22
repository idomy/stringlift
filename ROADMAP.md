# Roadmap

`stringlift` follows one principle: **never change anything but the text, and prove it.**
Every feature below must keep `verify` green.

## v0.1 — the safe core (done)
- [x] AST extraction of user-facing strings (JSX text, UI attributes, render-position expressions, template literals)
- [x] CSS / logic / identifier exclusion heuristics
- [x] Offset-safe application from a glossary (entity- and escape-aware)
- [x] AST-skeleton verification proving no structural change
- [x] CLI: `extract`, `apply`, `verify`
- [x] Real-world case study (Paperclip, ~6,000 strings, 431 files)

## v0.2 — trust & ergonomics
- [ ] Unit tests + fixtures for every heuristic decision
- [ ] `--report` output: per-file diff of what would change, before writing
- [ ] Config file (`stringlift.config.json`): custom attribute allow/skip lists
- [ ] Better template handling: reorderable placeholders with a lint for lost `${…}`
- [ ] Preserve existing i18n: skip strings already inside `t()` / `<Trans>`

## v0.3 — the retrofit-to-keys mode
- [ ] `extract --keys`: emit `t("auto.key")` calls + a resource file, instead of in-place translation
- [ ] Pluggable key naming (path-based, hash-based, content-based)
- [ ] i18next / react-intl / lingui output adapters

## v0.4 — framework adapters
- [ ] Vue single-file components
- [ ] Svelte
- [ ] Angular templates
- [ ] Plain `.ts`/`.js` string tables

## v0.5 — assisted translation (optional, opt-in)
- [ ] `translate` command: pluggable engine (LLM or service)
- [ ] Runs `verify` automatically; **refuses to write output that fails**
- [ ] Glossary memory: consistent terminology across runs
- [ ] Locale packs contributed by the community

## Non-goals
- Being a runtime i18n library — that's i18next/react-intl's job.
- Guessing. When unsure, `stringlift` skips and tells you.
