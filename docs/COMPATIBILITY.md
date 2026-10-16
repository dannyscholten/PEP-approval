# Saved-draft compatibility baseline

Version 0.9.0 is the first student-release baseline, using draft format 2. Pre-release format-1 archives and their migration tests were removed at the programme owner's request; these forms had not been distributed to students. A pre-release test draft is rejected with a clear explanation.

## Guarantees for future updates

- Continue accepting every student-released 2026 draft format, starting with format 2. Preserve field keys and stable course identifiers; add an explicit conversion and fixture test if either changes.
- Preserve selections, project details, unlisted-course metadata and exception explanations. Explain intentional course, category or EC changes in the focused import comparison.
- Recalculate every check and total using current rules. Saved validation and snapshot totals never grant approval.
- Compare saved snapshot rows with current rows, including additions, removals, changed titles/codes/credits and category moves, even if the total stays unchanged.
- If a valid snapshot is unavailable, state that the previous total is unavailable. Do not guess it.
- Never change the student's original file during import.

`src/rules.js` exports form/rule versions and a validated `courseSnapshot`. `app.js` focuses the comparison when a file is opened. Snapshot labels are escaped and snapshot EC serve comparison only.

Keep `src/draft-fixtures/0.9.0-standard.json` unchanged as the baseline. Add fictional fixtures for future released features or migrations; do not regenerate baseline fixtures from the current rules. Snapshot tests simulate future catalogue changes, course removal and category changes. Browser tests cover export/reopen, change notices and untrusted labels.

The GitHub Pages gate runs syntax, curriculum, draft compatibility, browser and PDF-export checks. A failed run leaves the previous live deployment available. Keep these checks and add targeted regression tests for new behaviour.

Version 0.9.1 clears legacy `unknown` host statuses and shows an explicit import notice. Host text, topic statuses, selected courses and EC totals are preserved; each included host must be Proposed or Confirmed before PDF export.
