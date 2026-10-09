# Compatibility maintenance contract

## Keep these guarantees

- Continue accepting every released 2026 draft format, beginning with format 1. Do not assume the form release number equals the draft format or student PEP version.
- Preserve internal field keys and course identifiers. If a key or code must change, add an explicit old-to-new conversion before validation and test a real-shaped fictional old draft.
- Preserve entered course choices, unlisted-course metadata, project details and exception explanations unless an intentional migration changes them. Explain intentional course/EC changes in the import comparison.
- Recalculate eligibility and credits from the current approved rules. Never trust a saved approval, validation result or snapshot total.
- Compare the prior course rows with the imported rows. Report additions, removals/replacements, changed codes/titles/credits and moves between categories, even when the overall total is unchanged.
- Never invent historical credits. If a snapshot is absent and no archived release can reconstruct the plan, explicitly show an unavailable old total.
- Do not modify the student's original file during import.

## Implementation

`exportDraft` in `src/rules.js` includes a `courseSnapshot` with `snapshotVersion: 1`, stable row IDs, code/title, EC and category, plus form and rule versions. `importDraft` validates the draft, applies existing migrations and returns `importReport`. `app.js` renders and focuses a persistent comparison panel. Snapshot text is escaped; its values are used for comparison only.

`src/compatibility/legacy/` retains unmodified rules/catalogues for releases 0.1.0–0.5.0, which did not record snapshots. `build-history.mjs` wraps those trusted files in isolated namespaces to build `draft-history.js`; no imported code is executed. A malformed draft can fall back to an explicit unavailable comparison.

Do not edit or remove legacy files or existing fixture drafts. `frozen-sha256.json` detects accidental changes to these archives. New fixtures may be added with new manifest entries; do not regenerate the historical entries from the current rules.

New releases save snapshots, so each routine release does not require another full archived engine. Add a fictional saved draft fixture from the release when a new migration is needed. To support a future schema, keep format-1 import and explicitly convert that schema, rather than just replacing the accepted version number.

## Publication gate

The Pages workflow requires all of these before deploying:

1. Syntax checks and curriculum tests.
2. Archived-file integrity, 15 historical import fixtures, snapshot and migration tests.
3. Website build.
4. Browser interaction checks, import change notices, save/reopen, narrow layout, escaped input and PDF export.

A failed job skips deployment; the previous site stays published. This is a test-based safeguard against regressions, not a guarantee against arbitrary changes to code or tests. Keep the gate and extend it when requirements change.

Version 0.7.0 deliberately removes student-entered admission-board decisions and references on import, with an explicit notice. Course choices and credits are unchanged by that removal. New JSON exports exclude those values, and the generated PDF decision always starts blank for the admission board.
