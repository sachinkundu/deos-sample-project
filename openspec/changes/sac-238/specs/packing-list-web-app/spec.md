## Purpose

People can manage a packing list in a desktop web app. The app saves the list and shows which items are left to pack.

## ADDED Requirements

### Requirement: Add packing list items

The app MUST let a person add an item by name. A new item MUST start as not packed.

#### Scenario: Add an item

- **WHEN** a person enters `Passport` and adds the item.
- **THEN** the list shows `Passport` as not packed.

### Requirement: Rename packing list items

The app MUST let a person rename an item. A rename MUST keep the packed state of the item.

#### Scenario: Rename an item

- **GIVEN** `Rain coat` is packed.
- **WHEN** a person renames it to `Jacket`.
- **THEN** the list shows `Jacket` as packed and no longer shows `Rain coat`.

### Requirement: Delete packing list items

The app MUST let a person delete any item. A deleted item MUST no longer appear in the list.

#### Scenario: Delete an item

- **GIVEN** the list has an item named `Socks`.
- **WHEN** a person deletes `Socks`.
- **THEN** `Socks` no longer appears in the list.

### Requirement: Change the packed state

Each item MUST have a control that marks it as packed or not packed. The list MUST make the current state clear.

#### Scenario: Mark an item as packed

- **GIVEN** `Passport` is not packed.
- **WHEN** a person marks `Passport` as packed.
- **THEN** the list shows `Passport` as packed.

#### Scenario: Mark an item as not packed

- **GIVEN** `Passport` is packed.
- **WHEN** a person marks `Passport` as not packed.
- **THEN** the list shows `Passport` as not packed.

### Requirement: Filter items left to pack

The app MUST have an `All` view and a `To pack` view. The `All` view MUST show every item. The `To pack` view MUST show only items that are not packed.

#### Scenario: Show only items left to pack

- **GIVEN** `Passport` is packed and `Socks` is not packed.
- **WHEN** a person opens the `To pack` view.
- **THEN** the list shows `Socks` and does not show `Passport`.

#### Scenario: Show all items

- **GIVEN** `Passport` is packed and `Socks` is not packed.
- **WHEN** a person opens the `All` view.
- **THEN** the list shows both `Passport` and `Socks` with their current state.

### Requirement: Keep the list after a page refresh

The app MUST save item names and packed states in the browser after each list change. It MUST load that saved list when the page starts. A page refresh MUST keep added, renamed, deleted, packed, and unpacked item changes.

#### Scenario: Refresh a saved list

- **GIVEN** the list has `Jacket` as packed and `Socks` as not packed.
- **WHEN** a person refreshes the page.
- **THEN** the list still shows `Jacket` as packed and `Socks` as not packed.

#### Scenario: Keep a deletion after refresh

- **GIVEN** a person has deleted `Socks` from the list.
- **WHEN** the person refreshes the page.
- **THEN** `Socks` does not return.

### Requirement: Support the desktop review

The app MUST provide a clear desktop layout. The final pull request MUST link to a working preview. It MUST include screenshots from the real app. The screenshots MUST form a sequence. The sequence MUST show a new item after it is added, a changed name, both packed states, the `To pack` view, an item gone after it is deleted, and the same saved list after a refresh.

#### Scenario: Review the live app

- **WHEN** a reviewer opens the preview on a desktop screen.
- **THEN** the reviewer can add, rename, delete, pack, unpack, and filter items.

#### Scenario: Review the screenshots

- **WHEN** a reviewer checks the screenshot sequence.
- **THEN** it shows the real add, rename, packed state, filter, delete, and refresh behavior.
