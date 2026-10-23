# DDS Personal Education Plan

[Open the PEP form](https://dannyscholten.github.io/PEP-approval/) · [Cohort 2026 link](https://dannyscholten.github.io/PEP-approval/2026/) · [Update guide](docs/UPDATING.md) · [Publishing status](https://github.com/dannyscholten/PEP-approval/actions)

Personal Education Plan for the VU Master Drug Discovery Sciences, cohort 2026: BADD, DSDD, PTDD and Education. Version 1.3.0.

The form checks programme composition, credits and required information. Students export their JSON draft and download a PDF for the existing review/submission process. The downloaded PDF has a digital-signature field for the specialisation coordinator. Only a Principles deviation adds editable Admissions Board decision/name/date fields and its signature field. Academic decisions and exceptions still require the relevant board/coordinator.

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
| Curriculum checks and draft imports | [src/rules.js](src/rules.js) |
| Downloaded PDF layout and fields | [src/pdf-export.js](src/pdf-export.js) |
| Deployment automation | [.github/workflows/pages.yml](.github/workflows/pages.yml) |

Do not edit a generated `index.html`: GitHub builds it from these source files. Detailed examples and recovery instructions are in the [update guide](docs/UPDATING.md).

## Saved drafts

Version 0.9.5 is the first intended student release (draft format 2). Earlier versions were not distributed to students, so import does not compare against historical versions or migrate their formats. File validation and current curriculum checks remain. Exported version metadata and course snapshots provide a starting point for compatibility in future updates. See [draft import maintenance](docs/IMPORTS.md).

## Data and hosting

The application processes entries in the browser and does not upload student data. JSON drafts and PDFs are downloaded to the user's chosen location. GitHub hosts the public website and source; its normal website access logging applies. Never commit actual student drafts, signed PEPs, certificates or keys to this repository. All supplied fixtures/examples are fictional.

The stable 2026 route is `/PEP-approval/2026/`. Keep the 2026 programme available when a later cohort is introduced; do not silently replace its rules with another intake's requirements.

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

## Version 0.8.0

At least two of the six constrained courses can be selected, including mandatory path courses. Own constrained courses use that section; other specialisations’ courses remain in General electives. Principles EC are included after previous education is chosen, and major-project EC after registration is chosen. Only omission of a Principles course for a non-VU-FW student requires Admissions Board decision and signature fields. Seven numbered sections, a generation date, coloured warnings/justifications and blue help/summary panels are consistent across the form and PDF. The SMC internship preparation reminder remains, with verification delegated to the internship process. Older drafts retain course selections and show changed placements or totals; obsolete PEP revision and research-area fields no longer appear.

## Version 0.9.0

Host and topic statuses start with Make selection and must explicitly be set for every included project. VU FW PDFs omit Principles entirely and number the remaining sections consecutively. PDF text fields use 9 pt text, the right-aligned total is 13 pt bold, check titles are bold and statuses use green/orange/red. Review items have editable Reviewed boxes: they acknowledge review, not approval, and must be completed before the coordinator's signature locks all fields. Both signatures remain digitally signable.

The summary is headed Total credit count of PEP, with separate Principles/compulsory subtotals. Sections of this PEP provides active-section navigation on desktop and a compact fold-out on mobile. Spacing, help text and review grouping are consistent with VU styling. Draft help is titled How to save draft PEPs.

## Version 0.9.1

Major, minor and literature thesis hosts must be Proposed or Confirmed, with host details entered. Topics still allow Not yet known. Unlisted-course guidance clarifies the General and Alpha/gamma elective types.

## Version 0.9.2

Outlined action icons match the DDS curriculum planner. Buttons and help consistently name Export draft PEP, Import draft PEP or Curriculum Planning, and Review PEP & Generate PDF. The import help identifies the planner's Export for PEP approval option. PEP composition and PDF approval rules are unchanged.

## Version 0.9.3

The header reads Personal Education Plan Approval - Cohort 2026, with Master Drug Discovery Sciences above it, on the form and generated PDF.

## Version 0.9.4

The import button is labelled Import draft PEP at both ends of the form. Instructions, help and save notifications use the same name. Importing PEP exports from the curriculum planner remains supported. The form and PDF title is Personal Education Plan Approval; cohort remains in its dedicated read-only field.

## Version 0.9.5

Import/export help links to the DDS curriculum planner. A welcome dialog explains completing, saving and reviewing the PEP, coordinator signing, conditional Admissions review, and examination-board submission through VU keuzeruimte. It can be reopened with Getting started; its optional dismissal preference is the only new browser-stored value. A live status beside the PDF button explains why download is unavailable or ready. Historical draft comparisons and migration checks have been removed for this first intended student release; current draft and planner imports still validate and recalculate the curriculum.

## Version 0.10.0 — Education specialisation

Education has a separate 60 EC DDS + 60 EC Education curriculum. It includes a fixed 30 EC major (XM_0200), one 6 EC constrained choice, 54 EC compulsory Education courses including three zero-EC components, and 6 EC Education elective space. DDS electives are limited to the Education-specific TER list plus the unused constrained course; an optional Education literature thesis is 6 EC. Minor research projects and alpha/gamma DDS courses are prohibited without exceptions. Wereldburgerschap and deel 2 must be selected together. Unlisted courses require a component choice and individual Examination Board approval. Neither component may be short of 60 EC; excess requires the existing explicit justification and approval route. dr. Daan Geerke preapproves both parts. The form and PDF display both subtotals.

The TER places the year-2 Education tables under the old-curriculum heading. The programme owner explicitly confirmed their applicability to the 2026 intake, the 54+6 EC package, the 60/60 split and the detailed choices before implementation. See [Education decisions](docs/EDUCATION.md). No curriculum-planner or Microsoft approval-workflow changes are included.

## Version 0.10.1

Education has an Add an unlisted course button directly below each year’s elective space. The component is preselected from the button, and unlisted courses are shown in their own DDS or Education section. Editing the component moves the course and updates the subtotals. Curriculum rules and PDF output are unchanged.

## Version 0.10.2

Removed the sentence “Zero-EC components remain compulsory.” from the PDF. The compulsory course list and curriculum rules are unchanged.

## Version 0.10.3

Removed the literature-thesis option for Education. Education PDFs and navigation now refer only to the major research project. Earlier test drafts need no special compatibility handling or correction controls. Research-specialisation thesis options are unchanged. This release also includes removal of the zero-EC remark from the PDF.

## Version 0.10.4

Corrected four Education course codes against the 2026–2027 VU Study Guide: O_MLDIDAC2, O_MLPROZ, O_MLVNON and O_MWRLDBS_1. Updated selections, examples, validation, the Wereldburgerschap paired choice and JSON course snapshots consistently. Credits and curriculum requirements are unchanged.

## Version 0.10.5

When PDF export is unavailable, its explanation appears only in the Download PDF for approval button tooltip. The visible review checklist remains. Course rules and the corrected Study Guide codes are unchanged.

## PEP Builder compatibility (0.10.7)

Use **Export for approval** in [PEP Builder](https://dannyscholten.github.io/PEP-builder/), then **Open draft** in this form. **Save build** files belong in PEP Builder and receive a specific explanatory error here. Builder imports recalculate credits and all approval checks, preserve the course selection and existing explanation, and leave teaching-period metadata out of Additional explanation. The import confirmation shows the recalculated EC total.

The release tests explicitly fictional exports generated by PEP Builder 1.4.5 across specialisations, major routes, Principles selections, unlisted courses, Didactics, excess credits and Education. It does not change academic requirements or the approval/signature process.

## Version 0.11.0

Renamed the repository and Pages site to pep-approval. All course lists use compact one-column tables with course name, code, academic level and EC; selectable courses keep accessible checkboxes/radio buttons. Save draft, Open draft, Export for approval, Reset and icon-only Help match PEP Builder controls. PDF course tables include academic level. Builder exports retain their course/credit semantics; their original target form version is metadata, not a requirement that prevents later UI releases importing them.

The current Builder 1.4.5 export-to-import workflow was exercised through actual browser file downloads for BADD, both DSDD paths, both PTDD paths, and Education with VU-FW and other backgrounds. Course rows, totals and Education’s 60+60 EC split were preserved. Re-run `scripts/check-builder-exchange.cjs` with `BUILDER_HTML` pointing to a current Builder checkout when validating another release.

## Version 1.0.0

- Reduced section and table spacing; minor projects and literature theses use the same course-table layout.
- Predefined electives have Remove controls only. Unlisted courses appear in their own General/Alpha-gamma or DDS/Education table, with the original editing dialog and a red “Unlisted course, needs review” label in the form and generated PDF.
- Principles deviations display an explicit Admissions Board permission and PDF-signature warning.
- Review uses compact check cards and equally prominent student/reviewer headings. Validation and approval rules are unchanged.
- Sidebar credit total is red below 110 or above 120 EC, orange from 110 to below 120, and green at 120. Removed duplicate excess-credit and Alpha/gamma-limit sidebar messages.
- Submission instructions explicitly require emailing the completed PDF to the coordinator. Native PDF review checkboxes and signature fields remain available.

## Version 1.1.0

- Course-picker dialogs replace course selection checkboxes and inline elective dropdowns. Light-blue tables contain only the courses included in the PEP; course names use dark VU blue.
- Optional minor and literature projects are added using buttons. Registration route, host and topic details are edited transactionally in a popup and summarised under the project name. Cancelling does not change the PEP.
- Education keeps its fixed 30 EC major, 60/60 component split, restricted DDS options and paired World citizenship courses. Principles defaults and path preselection are unchanged.
- Curriculum checks, status-message counts, section credit totals and navigation have separate headings. The redundant incomplete banner is removed.
- PDFs list compulsory course names, codes and EC within the curriculum checks. Red unlisted-course labels have a visible border.
- Removed all PDF Reviewed checkboxes. Active justified exceptions share one required, initially blank coordinator explanation field; Principles omissions retain the separate Admissions Board decision/signature. Unlisted-course review alone adds no explanation field: its label and coordinator signature serve as preapproval. Final examination-board approval remains required.
- Adobe Acrobat signing guidance and the distinction between preapproval and final approval are explicit. Coordinator signing still locks all fields; Admissions signing locks only Admissions fields.
- No historical tool-version comparison was added. Current draft and Builder approval-export formats are validated and recalculated using the current curriculum rules.

## Version 1.2.0

- Pickers remain open after adding courses, remove included options, announce additions, and provide top/bottom Close buttons plus Done. A completed Principles selection has no add button.
- The compulsory major uses the same transactional add-details flow as optional projects. Research majors count their 48 EC after saving a route; Education counts its fixed 30 EC after saving the add popup. Removing a major restores the add button and blocks approval until the compulsory project is restored.
- Current Builder Education exports retain their compulsory major on import without any release-version comparison. Explicit not-yet-added major state and SMC acknowledgement survive draft export/import.
- Table actions use the Builder's double-cog and cross icons in real buttons. Action headers align with these controls; unlisted courses link safely to their public syllabus.
- Credit breakdown precedes status messages, Principles warnings have padded borders, and entry/supervision help uses light grey.
- Clicking a dialog backdrop closes it; uncommitted editor changes are discarded. Courses explicitly added through a picker remain in the PEP.
- The SMC research-preparation reminder appears at the bottom of Review only when a major is included and can be acknowledged. Editing/removing the major or changing path resets the acknowledgement. This reminder does not replace internship-coordinator eligibility checks.
- Displayed em/en dashes are replaced with regular hyphens. Academic course codes and credit rules are retained.

## Version 1.3.0

- Combined research projects and literature thesis into one compact table, retaining host/topic details beneath every course name in the tool and PDF.
- Removed repeated selected-course captions and the duplicate VU-FW Principles notice; made edit/remove controls equal size.
- Linked sidebar status counts to the corresponding messages, underlined syllabus links and made draft help grey.
- Grouped Admissions Board and coordinator decision fields before signatures; moved full warning and review statements into coloured cards in a final PDF appendix, with safe overflow pagination. Conditional required fields and signature locks are unchanged.
- Verified domain rules, current Builder exports including Education, browser layout and editable PDF fields.
