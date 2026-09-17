## Purpose

People can manage expenses in euros on one desktop screen. The app saves each expense and can show one category at a time.

## ADDED Requirements

### Requirement: Add an expense

The app MUST let a person add an expense with a name, amount, and category. The category MUST be one of `Food`, `Travel`, `Bills`, or `Other`. A valid expense MUST appear in the list after it is added.

#### Scenario: Add a valid expense

- **WHEN** a person adds `Lunch` with an amount of `12.50` and a category of `Food`.
- **THEN** the list shows `Lunch`, `€12.50`, and `Food`.

### Requirement: Edit an expense

The app MUST let a person change the name, amount, and category of an expense. A saved edit MUST replace the old values in the list.

#### Scenario: Edit all expense fields

- **GIVEN** the list has `Train` with an amount of `20.00` and a category of `Travel`.
- **WHEN** a person changes it to `Power bill` with an amount of `45.75` and a category of `Bills`.
- **THEN** the list shows `Power bill`, `€45.75`, and `Bills` and no longer shows the old values.

### Requirement: Delete an expense

The app MUST let a person delete any expense. A deleted expense MUST no longer appear in the list.

#### Scenario: Delete an expense

- **GIVEN** the list has an expense named `Lunch`.
- **WHEN** a person deletes `Lunch`.
- **THEN** `Lunch` no longer appears in the list.

### Requirement: Validate expense details

The app MUST reject an add or edit when the name is blank, the amount is blank, the amount is not a number, the amount is zero or less, the amount has more than two decimal places, or the category is not one of the fixed choices. It MUST show a clear message that tells the person what to fix. A rejected add MUST NOT add an expense. A rejected edit MUST NOT change the saved expense.

#### Scenario: Reject a blank name

- **WHEN** a person tries to add an expense with a blank name, an amount of `12.50`, and a category of `Food`.
- **THEN** the app shows a message that a name is needed and does not add the expense.

#### Scenario: Reject an invalid amount

- **GIVEN** the list has `Lunch` with an amount of `12.50` and a category of `Food`.
- **WHEN** a person tries to change its amount to `0`.
- **THEN** the app shows a message that the amount must be more than zero and keeps the saved amount of `€12.50`.

#### Scenario: Reject too many decimal places

- **WHEN** a person tries to add `Snack` with an amount of `1.999` and a category of `Food`.
- **THEN** the app shows a message that the amount can have no more than two decimal places and does not add the expense.

### Requirement: Filter expenses by category

The app MUST provide an `All` filter and one filter for each fixed category. `All` MUST show every expense. A category filter MUST show only expenses in that category. The selected filter MUST be clear.

#### Scenario: Show one category

- **GIVEN** the list has `Lunch` in `Food` and `Train` in `Travel`.
- **WHEN** a person selects the `Food` filter.
- **THEN** the list shows `Lunch`, does not show `Train`, and marks `Food` as selected.

#### Scenario: Show all categories

- **GIVEN** the list has `Lunch` in `Food` and `Train` in `Travel`.
- **WHEN** a person selects the `All` filter.
- **THEN** the list shows both expenses and marks `All` as selected.

### Requirement: Show the visible euro total

The app MUST show a total for the expenses in the current list. It MUST update the total after an expense is added, edited, or deleted and after the filter changes. It MUST format the total in euros with two decimal places. An empty list MUST have a total of `€0.00`.

#### Scenario: Total all expenses

- **GIVEN** the list has `Lunch` at `€12.50` and `Train` at `€20.00`.
- **WHEN** the `All` filter is selected.
- **THEN** the total is `€32.50`.

#### Scenario: Total the filtered list

- **GIVEN** `Lunch` at `€12.50` is in `Food` and `Train` at `€20.00` is in `Travel`.
- **WHEN** a person selects the `Food` filter.
- **THEN** the total is `€12.50`.

#### Scenario: Total an empty filtered list

- **GIVEN** there are no expenses in `Bills`.
- **WHEN** a person selects the `Bills` filter.
- **THEN** the list is empty and the total is `€0.00`.

### Requirement: Keep expenses after a page refresh

The app MUST save valid expenses in browser-local storage after each add, edit, or delete. It MUST load those expenses when the page starts. A page refresh MUST keep all saved fields and MUST NOT bring back a deleted expense.

#### Scenario: Refresh saved expenses

- **GIVEN** the list has `Lunch` at `€12.50` in `Food` and `Power bill` at `€45.75` in `Bills`.
- **WHEN** a person refreshes the page.
- **THEN** both expenses still appear with the same names, amounts, and categories.

#### Scenario: Keep a deletion after refresh

- **GIVEN** a person has deleted `Lunch` from the list.
- **WHEN** the person refreshes the page.
- **THEN** `Lunch` does not return.

### Requirement: Stay within the canary scope

The app MUST use a single desktop screen and browser-local data. It MUST NOT require login, a phone layout, a server, or an outside service. The review build MUST be published through the supported static preview path.

#### Scenario: Open the desktop preview

- **WHEN** a reviewer opens the static preview on a desktop screen.
- **THEN** the reviewer can manage, filter, and total expenses without a login or an outside service.

### Requirement: Provide review proof

The final pull request MUST link to a working preview. It MUST include real browser screenshots that show the key behavior. The proof MUST show add, edit, delete, validation, filtering, the visible total, and saved data after a refresh.

#### Scenario: Review the browser proof

- **WHEN** a reviewer checks the preview and screenshots.
- **THEN** the proof shows expense changes, a clear invalid-entry message, a category filter with the right total, and the same saved data after a refresh.
