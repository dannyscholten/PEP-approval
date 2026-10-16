# Draft imports and future updates

Version 0.9.5 is the first intended student release, using draft format 2. Earlier development versions were not distributed to students. The form contains no historical-version comparison or migration checks.

Current imports validate the file structure and cohort, restore permitted fields, and recalculate all course requirements and credit totals. Saved validation and snapshot totals never grant approval. The original imported file is never modified. Current draft round trips and curriculum-planner PEP exports are tested.

Exports retain form and rule versions, stable field/course identifiers and a course snapshot. From this student release onward, future updates must preserve released drafts. Before changing a released field, course or format, add the necessary conversion and tests; explain any resulting selection or EC changes to students. Preserve a fictional fixture of the student-released format when preparing the next update.

The publishing checks cover syntax, curriculum rules, current draft imports, browser behaviour and PDF export. A failed check prevents deployment.
