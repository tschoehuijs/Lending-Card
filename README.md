# Lending Card

[![Validate](https://img.shields.io/github/actions/workflow/status/tschoehuijs/lending-card/check.yml?label=Validate&logo=github&style=flat)](https://github.com/tschoehuijs/lending-card/actions/workflows/check.yml)
[![Stars](https://img.shields.io/github/stars/tschoehuijs/lending-card?style=flat)](https://github.com/tschoehuijs/lending-card/stargazers)
[![Release](https://img.shields.io/github/v/release/tschoehuijs/lending-card?label=release&style=flat)](https://github.com/tschoehuijs/lending-card/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-green?style=flat)](LICENSE)

A custom dashboard card for Home Assistant that shows **what you lent out, who borrowed it, and when it is due back**.

[![Open your Home Assistant instance and add this repository in HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=tschoehuijs&repository=lending-card&category=plugin)

## Features

- **Individual tiles** with item name, borrower and optional due date.
- **Add and edit loans** directly in the card.
- **Mark returned** and undo a return without deleting the item.
- **Hide returned items**, or display them in gray.
- **Overdue highlighting** and sorting by due date, item name or borrower.
- **Visual configuration editor** with a Home Assistant to-do entity selector.
- Configurable title and 1–4 columns, with responsive narrow-card layouts.
- Home Assistant theme colors; no external JavaScript dependencies or build step.

## How the list is used

Designed for **Local to-do**, for example `todo.lending`:

- Item name / summary → object lent out.
- Description → borrower name only.
- Due date → optional expected return date.
- Incomplete → on loan; completed → returned.

A loan date is not displayed: the to-do item API does not expose the creation date. The card does not infer it from entity timestamps or add hidden description metadata.

## Installation

1. Open **HACS → menu → Custom repositories**.
2. Add `https://github.com/tschoehuijs/lending-card` with category **Dashboard**.
3. Download **Lending Card**, then reload the browser.
4. Edit your dashboard, add **Lending Card**, and select your to-do list.

If needed, register `/hacsfiles/lending-card/lending-card.js` as a **JavaScript module** under dashboard resources. Do not add a duplicate resource.

The button above opens the custom-repository installation flow. It does **not** mean the repository has been accepted into the default HACS catalog.

## Configuration

All these options are available in the visual editor; YAML is optional.

```yaml
type: custom:lending-card
entity: todo.lending
title: Lending
hide_completed: true
columns: 2
sort: due
```

- `hide_completed`: hide returned loans; defaults to `true`.
- `columns`: 1–4; defaults to `2`.
- `sort`: `due`, `item` or `borrower`; defaults to `due`.
- Active loans appear before returned loans. Undated active loans sort last when sorting by due date.

## Usage and refresh behavior

Use **Add loan** or the pencil button to enter an item, borrower and optional due date. **Mark returned** completes the underlying item. Disable **Hide returned items** to access **Returned · Undo**.

Updates use the item's UID, so duplicate item names can be edited independently.

The card refreshes after its own writes, on selected entity state changes, every 30 seconds while visible, and when the page becomes visible. External edits without an entity state update may take up to 30 seconds to appear. The refresh button updates manually.

Existing datetime deadlines retain their time when only the borrower or item name changes. Explicitly changing the date converts the deadline to date-only. Clearing a deadline sends `due_date: null`; if your HA version rejects it, the error is displayed and the edit form remains open. The card never deletes and recreates a loan to work around this.

## Repository setup — browser only

Create a public repository named **lending-card**, with a description and topics such as `home-assistant`, `hacs`, `lovelace` and `custom-card`.

Upload the original card package, then apply the files from the release update package, preserving their paths:

```text
lending-card.js
hacs.json
README.md
LICENSE
CHANGELOG.md
tests/
  lending-card.test.cjs
.github/
  workflows/
    check.yml
    release.yml
```

The README badges and installation button target **tschoehuijs/lending-card**, matching the owner shown in the supplied screenshot and the previously selected repository name. If you use another owner or repository name, replace these references throughout this README.

For hidden `.github` folders, use **Add file → Create new file**, enter the complete path (for example `.github/workflows/release.yml`), and paste the corresponding file content.

## Validation workflow

**Validate** runs on pushes, pull requests and manual requests. It checks JavaScript syntax and executes the mocked Node tests. A passing badge means these checks passed, not that the card has been tested in a live Home Assistant browser.

## Publish a release — no local CLI needed

1. Commit all card changes and update `const VERSION` in `lending-card.js`, for example to `1.0.0` for the first release.
2. Update the version comment and changelog to match.
3. Open **Actions → Release → Run workflow**.
4. Select the branch containing the version you want to publish.
5. Enter the matching tag, for example **v1.0.0**, and run it.

The workflow checks the tag against the card's `VERSION`, validates the HACS filename, checks JavaScript syntax, runs the mocked tests, then publishes a GitHub release with generated notes and **lending-card.js** attached. It creates the tag at the checked-out commit if necessary. No personal access token is required: it uses the workflow's `GITHUB_TOKEN`.

Alternatively, pushing a tag matching `v*.*.*` starts the same workflow. Only stable `vMAJOR.MINOR.PATCH` tags are accepted. Existing releases are not overwritten. If a tag already exists, it must point to the checked-out commit. A rerun after a partially failed publication may require reviewing the existing draft/release first.

The release badge has no version to show until the first release exists. The validation badge needs an initial workflow run.

## Testing status

The card has not been tested in a live Home Assistant instance. The release workflow and mocked tests are provided for execution in your repository; they have not been executed here. Package structure, YAML parsing and embedded shell syntax have been checked locally.

First test in HA: select the list, add a temporary loan, edit it, mark it returned, show returned loans, undo the return, and check mobile/light/dark layouts.

The visual editor uses HA's internal `ha-form` component; future frontend changes may require maintenance. Other to-do providers may lack descriptions or due-date support.

## License

MIT. See [LICENSE](LICENSE).
