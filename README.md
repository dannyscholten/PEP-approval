# DDS Personal Education Plan

[Open the PEP form](https://dannyscholten.github.io/dds-pep/) · [Cohort 2026 link](https://dannyscholten.github.io/dds-pep/2026/) · [Update guide](docs/UPDATING.md) · [Publishing status](https://github.com/dannyscholten/dds-pep/actions)

Personal Education Plan for the VU Master Drug Discovery Sciences, cohort 2026: BADD, DSDD and PTDD. Version 0.7.1.

The form checks programme composition, credits and required information. Students export their JSON draft and download a PDF for the existing review/submission process. The downloaded PDF has an editable admission-board decision field and two digital-signature fields. Academic decisions and exceptions still require the relevant board/coordinator.

## Update the form directly in GitHub

1. Open the relevant file below and click the pencil icon.
2. Make the change, then **Commit changes**. A commit to `main` starts the checks and publication. For a larger change, create a branch and pull request first.
3. Open **Actions → Check and publish PEP**. The checks and deployment must both turn green. A failed check leaves the previously published website in place.
4. Refresh the live form and check the version/date. Students with an open plan should save their draft before refreshing.

| What to change | File |
| --- | --- |
| Course titles, codes, EC, coordinator names, links, version/date | [src/catalogue.json](src/catalogue.json) |
| Visible form wording and behaviour | [src/app.js](src/app.js) |
| VU colours, spacing and print styles | [src/style.css](src/style.css) |
| Curriculum checks and draft migration | [src/rules.js](src/rules.js) |
| Downloaded PDF layout and fields | [src/pdf-export.js](src/pdf-export.js) |
| Deployment automation | [.github/workflows/pages.yml](.github/workflows/pages.yml) |

Do not edit a generated `index.html`: GitHub builds it from these source files. Detailed examples and recovery instructions are in the [update guide](docs/UPDATING.md).

## Saved-draft compatibility

Draft format 1 remains supported for the 2026 cohort. New drafts record their form/rule version and the course list and EC shown at save time. On import, the form compares that record with the recalculated programme and shows additions, removals, credit changes and moves between sections. The original JSON file is never modified. Snapshot values are used for the comparison only, never as validation or approval.

For releases 0.1.0–0.5.0, frozen historical rules reconstruct the old course list and total. If the earlier total cannot be established, the form explicitly says it is unavailable and asks the student to compare their previous PDF.

Each publication runs curriculum tests, 15 historical draft fixtures, migration and snapshot tests, browser import tests and PDF-export checks. Keep the frozen files and fixture checks when making updates. See [compatibility maintenance](docs/COMPATIBILITY.md).

## Data and hosting

The application processes entries in the browser and does not upload student data. JSON drafts and PDFs are downloaded to the user's chosen location. GitHub hosts the public website and source; its normal website access logging applies. Never commit actual student drafts, signed PEPs, certificates or keys to this repository. All supplied fixtures/examples are fictional.

The stable 2026 route is `/dds-pep/2026/`. Keep the 2026 programme available when a later cohort is introduced; do not silently replace its rules with another intake's requirements.

## Local development

Use Node.js 24:

```sh
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

`dist/index.html` is a self-contained file and also works offline. GitHub Pages serves only `dist`, not the source or test-output folders. Browser tests generate fictional PDFs in `qa/`; they are not deployed.

The PDF libraries/font licences are in `src/vendor/`. The repository includes the VU logo from the supplied PEP template.

## Version 0.7.0

One PDF-for-approval download replaces the print buttons. Export/open draft controls and concise fold-out help are available at both ends of the form. The admission-board decision is entered only in the PDF, starts blank, and has no reference field. Older drafts still reopen; removed board text produces a notice without changing the selected courses or EC. The form includes the coordinator/submission instructions and issue-report link.

## Version 0.7.1

The downloaded PDF includes the submission instructions and a clickable examination-board submission link. The form and VU-background PDF explicitly state that VU bachelor Farmaceutische Wetenschappen are not allowed to follow any of the Principles courses. The Major programme heading is now Compulsory courses, without the repeated subtitle. Curriculum calculations and saved-draft format are unchanged.
