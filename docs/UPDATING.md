# Updating the PEP in GitHub

Website: https://dannyscholten.github.io/dds-pep/
Repository: https://github.com/dannyscholten/dds-pep

## A small text or coordinator update

1. Open **Code**, then the appropriate file. Coordinator names and links are in `src/catalogue.json`; most on-screen wording is in `src/app.js`.
2. Click the pencil icon. Change only the intended value/text; preserve quotation marks, commas and surrounding code.
3. If several files need changing together, press `.` on the repository page to open GitHub's editor, then edit and commit them together. This avoids publishing half an update.
4. Update `appVersion` and `releaseDate` in `src/catalogue.json` (for example `0.7.1` and a written date). Update the displayed README release too. The PDF records its generation date; no student PEP version is required.
5. Choose **Commit changes** and write a short description. Commit to `main` for a small completed edit, or use a new branch/pull request for a larger change.
6. Open **Actions**, then the newest **Check and publish PEP** run. Wait for both jobs to turn green.
7. Open the live website, refresh it and verify the change. Save any in-progress draft before refreshing.

A cosmetic edit does not require changing `ruleVersion`. A change to course requirements, EC, inclusion or migration does: for example move `DDS-2026-2027.7` to a new unique rule version. Preserve `schemaVersion: 1` for compatible additions; changing the stored format requires an explicit migration that still accepts format 1.

## Course or rule changes

Use `src/catalogue.json` for the course data and `src/rules.js` for logic. Keep course codes and internal field names stable unless a deliberate mapping is implemented. Do not remove a course simply because it is no longer offered: old plans may still need to refer to it. Clarify whether the change is a correction for the same intake or a new-cohort rule.

Run the tests and review a draft from the earlier version. Check the displayed before/after course list and EC total. Expected academic changes need explicit test updates and a recorded explanation in `src/rule-register.json`; do not delete a failing compatibility test just to make publication pass.

Larger changes are best made on a branch with a pull request. The checks run there, but the live website is updated only after the change reaches `main` and the checks pass again.

## If an update fails

The failed update does not replace the live website. Open the failing Actions job for its error. Correct the file, commit the correction, and a new run starts automatically. The repository's commit history keeps earlier versions available. If a published update needs reverting, restore the previous contents in a new commit and let the same tests/deployment run; do not delete the repository or force-rewrite its history.

To publish again without editing a file, open **Actions → Check and publish PEP → Run workflow** on `main`.

## Initial Pages configuration

Under **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**. The supplied workflow runs tests, builds the standalone HTML and deploys `dist/`. No hosting account, API token, database or custom domain is needed.

## Student-facing changes

Already-open browser tabs keep their loaded form version until refreshed. Students should save their JSON draft first, then refresh and reopen it. The import comparison will explain course/EC changes. Their original download is not overwritten automatically. JSON drafts do not contain signatures or decisions subsequently entered into the PDF.

For another cohort, retain `/2026/` and its 2026 rules. Add a separate cohort form and update the build/routing deliberately; changing a year label alone is insufficient.

GitHub guidance: [editing files](https://docs.github.com/en/repositories/working-with-files/managing-files/editing-files), [Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
