# Lending Card

A theme-aware Home Assistant dashboard card for tracking items lent to other people.

## Features

- Individual tiles showing the item, borrower and optional due date.
- Add and edit loans directly in the card.
- Mark returned, or undo a return. No deletion or recreation of items.
- Hide returned items in the visual editor, or show them in gray.
- Overdue highlighting; active items sort before returned items.
- Sort by due date, item name or borrower.
- Native Home Assistant visual configuration form with a to-do entity selector.
- Configurable title and 1–4 tile columns; responsive narrow-card layout.
- No build tools, CDN dependencies, custom integration, helpers or automations required.

## Data mapping

Use a **Local to-do** list, such as `todo.lending`:

- Summary / item name = the object lent out.
- Description = the borrower's name, without extra metadata.
- Due = optional return date.
- `needs_action` = on loan; `completed` = returned.

The Home Assistant to-do item API does not expose a creation date. This card therefore does not display a loan date, infer it from entity timestamps, or add hidden metadata to descriptions.

## Publish on GitHub — browser only

1. Create a **public** repository named **lending-card**.
2. Add a description, for example: "Home Assistant card for tracking lent items and borrowers".
3. Add topics such as `home-assistant`, `hacs`, `lovelace`, `custom-card`, and `todo`.
4. Extract the supplied ZIP on your computer.
5. In GitHub choose **Add file → Upload files**. Upload the extracted contents into the repository root, not a parent folder or the ZIP itself.
6. The root must contain `lending-card.js`, `hacs.json`, `README.md`, `LICENSE`, and `CHANGELOG.md`.
7. Optionally upload `.github/workflows/check.yml` and `tests/lending-card.test.cjs`, preserving their directories. GitHub's file picker may hide the `.github` directory; you can instead use **Add file → Create new file** with that full path and paste its contents.
8. The optional workflow checks JavaScript syntax and runs mocked unit tests automatically on pushes and pull requests.
9. Optionally publish a GitHub release tagged `v1.0.0`. The JavaScript is in the root, so no build or release attachment is needed.

This prepares a HACS **custom repository**. It does not automatically submit the project to HACS's default catalog.

## Install through HACS

1. Open **HACS → menu → Custom repositories**.
2. Paste your GitHub repository URL.
3. Choose **Dashboard** as the category (called `plugin` internally).
4. Add the repository, find **Lending Card**, and download it.
5. Reload Home Assistant in your browser.
6. If the card is not available, check **Settings → Dashboards → Resources** (advanced mode may be needed). Add `/hacsfiles/lending-card/lending-card.js` as a **JavaScript module** if HACS did not register it. Do not add duplicate resources.
7. Edit a dashboard, choose **Add card**, and search for **Lending Card**.
8. Select `todo.lending` and set **Hide returned items** as desired.

No Home Assistant restart should be needed for this frontend-only card.

## Optional YAML

```yaml
type: custom:lending-card
entity: todo.lending
title: Lending
hide_completed: true
columns: 2
sort: due
```

`sort` accepts `due`, `item`, or `borrower`. Returned loans always appear after active loans. Loans without due dates sort last among active loans when sorting by due date.

## Use

- **Add loan** opens an inline form. Item name and borrower are required; due date is optional.
- The pencil edits a loan. Updates use the item's UID, so duplicate item names are safe.
- **Mark returned** completes the underlying to-do item.
- **Returned · Undo** reopens it. Turn off **Hide returned items** to see this button.
- Refresh manually with the refresh button.

The card refreshes after its own changes, when the selected entity's state object changes, every 30 seconds while the page is visible, and when the page becomes visible again. An external edit that does not update the entity state can therefore take up to 30 seconds to appear. This version does not claim a real-time item subscription.

Existing datetime deadlines are displayed with their time. Editing only the name or borrower preserves the original deadline exactly. Explicitly changing the date converts the deadline to a date-only deadline.

Clearing an existing due date sends `due_date: null` to Home Assistant. If your HA version rejects this, the card shows the backend error and keeps the edit form open; it never deletes and recreates an item as a workaround. Changing a due date to another date remains available.

## Validation and limitations

This initial version has been statically reviewed against Home Assistant's documented card and to-do APIs. It has **not been run against a live Home Assistant instance**. The included Node tests mock the browser and backend; they are not a substitute for live UI testing. Their first execution is intended through the included GitHub Actions workflow.

First test: choose your list, check the tiles, add a temporary loan, edit its borrower/date, mark it returned, disable hiding returned items, and undo the return. Also check your theme and mobile layout.

The visual editor uses HA's `ha-form` component. Internal frontend components are not a guaranteed stable public API, so future HA releases may require updates. The primary target is Local to-do; other providers may not support descriptions or due dates.

No repository has been published or release created by this download. You publish it using the browser steps above.

## Reference documentation

- [To-do integration](https://www.home-assistant.io/integrations/todo/)
- [To-do entity model](https://contributors.home-assistant.io/core/entities/todo/)
- [Custom cards](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/)
- [HACS dashboard requirements](https://hacs.xyz/docs/publish/plugin/)
- [HACS general requirements](https://hacs.xyz/docs/publish/start/)

## License

MIT. See LICENSE.
