# Lending Card

[![Validate](https://img.shields.io/github/actions/workflow/status/tschoehuijs/lending-card/check.yml?label=Validate&logo=github&style=flat)](https://github.com/tschoehuijs/lending-card/actions/workflows/check.yml)
[![Stars](https://img.shields.io/github/stars/tschoehuijs/lending-card?style=flat)](https://github.com/tschoehuijs/lending-card/stargazers)
[![Release](https://img.shields.io/github/v/release/tschoehuijs/lending-card?label=release&style=flat)](https://github.com/tschoehuijs/lending-card/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-green?style=flat)](LICENSE)

A custom dashboard card for Home Assistant that shows **what you lent out, who borrowed it, and when it is due back**.

[![Open your Home Assistant instance and search for Lending Card in HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=tschoehuijs&repository=lending-card&category=plugin)

## Features

- **Compact individual tiles** with item name, borrower and optional due date. No date row is shown when no due date is set.
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

<img width="539" height="626" alt="image" src="https://github.com/user-attachments/assets/35eead23-97d1-465c-9210-eecf9d7852f2" />

## Installation

1. Open **HACS** in your Home Assistant instance.
2. Search for **Lending Card**.
3. Click **Download**, then refresh your browser.
4. Edit your dashboard, add **Lending Card**, and select your to-do list entity.

If needed, register `/hacsfiles/lending-card/lending-card.js` as a **JavaScript module** under dashboard resources. Do not add a duplicate resource.

## Configuration

All these options are available in the visual editor; YAML is optional.

```yaml
type: custom:lending-card
entity: todo.lending
title: Lending
hide_completed: true
columns: 2
sort: due
