## Purpose

People can manage a reading queue on one desktop screen. The app saves each book and shows its place in the reading flow.

## ADDED Requirements

### Requirement: Add a book

The app MUST let a person add a book with a title and author. Each new book MUST start in `To read`. A valid book MUST appear in the list after it is added.

#### Scenario: Add a valid book

- **WHEN** a person adds `Kindred` by `Octavia E. Butler`.
- **THEN** the list shows `Kindred`, `Octavia E. Butler`, and `To read`.

### Requirement: Edit a book

The app MUST let a person change the title and author of a book. A saved edit MUST replace the old title and author. It MUST keep the current status.

#### Scenario: Edit a book

- **GIVEN** `Dune` by `Frank Herbert` is in `Reading`.
- **WHEN** a person changes the title to `Dune Messiah` and keeps the same author.
- **THEN** the list shows `Dune Messiah` by `Frank Herbert` in `Reading` and no longer shows `Dune`.

### Requirement: Delete a book

The app MUST let a person delete any book. A deleted book MUST no longer appear in the queue and MUST NOT be included in its prior status count.

#### Scenario: Delete a book

- **GIVEN** `Kindred` is in `To read`.
- **WHEN** a person deletes `Kindred`.
- **THEN** `Kindred` no longer appears, and the `To read` count goes down by one.

### Requirement: Validate book details

The app MUST reject an add or edit when the title or author is blank or has only spaces. It MUST show a clear message that says which field to fix. A rejected add MUST NOT add a book. A rejected edit MUST NOT change the saved book.

#### Scenario: Reject a blank title

- **WHEN** a person tries to add a book with a blank title and `Ursula K. Le Guin` as the author.
- **THEN** the app says that a title is needed and does not add the book.

#### Scenario: Reject a blank author during an edit

- **GIVEN** `Kindred` by `Octavia E. Butler` is in `Reading`.
- **WHEN** a person tries to replace the author with spaces.
- **THEN** the app says that an author is needed and keeps `Octavia E. Butler` as the saved author.

### Requirement: Change book status

Each book MUST have a control that can move it to `To read`, `Reading`, or `Finished`. The list MUST make the current status clear. A status change MUST update the book at once.

#### Scenario: Start reading a book

- **GIVEN** `Kindred` is in `To read`.
- **WHEN** a person moves it to `Reading`.
- **THEN** the list shows `Kindred` in `Reading` and not in `To read`.

#### Scenario: Finish a book

- **GIVEN** `Kindred` is in `Reading`.
- **WHEN** a person moves it to `Finished`.
- **THEN** the list shows `Kindred` in `Finished` and not in `Reading`.

#### Scenario: Move a book back

- **GIVEN** `Kindred` is in `Finished`.
- **WHEN** a person moves it to `To read`.
- **THEN** the list shows `Kindred` in `To read` and not in `Finished`.

### Requirement: Filter books by status

The app MUST provide an `All` filter and one filter for each status. `All` MUST show every book. A status filter MUST show only books in that status. The selected filter MUST be clear.

#### Scenario: Show books that are being read

- **GIVEN** `Kindred` is in `Reading` and `Dune` is in `To read`.
- **WHEN** a person selects the `Reading` filter.
- **THEN** the list shows `Kindred`, does not show `Dune`, and marks `Reading` as selected.

#### Scenario: Show all books

- **GIVEN** `Kindred` is in `Reading` and `Dune` is in `To read`.
- **WHEN** a person selects the `All` filter.
- **THEN** the list shows both books and marks `All` as selected.

#### Scenario: Show an empty status

- **GIVEN** no books are in `Finished`.
- **WHEN** a person selects the `Finished` filter.
- **THEN** the app shows an empty state and marks `Finished` as selected.

### Requirement: Show a count for each status

The app MUST always show a count for `To read`, `Reading`, and `Finished`. Each count MUST cover all saved books in that status, even when a filter hides some books. The counts MUST update after a book is added, deleted, or moved. A status with no books MUST show `0`.

#### Scenario: Count all status groups

- **GIVEN** two books are in `To read`, one is in `Reading`, and none are in `Finished`.
- **WHEN** a person views the queue.
- **THEN** the counts show `2` for `To read`, `1` for `Reading`, and `0` for `Finished`.

#### Scenario: Keep all counts while a filter is active

- **GIVEN** `Kindred` is in `Reading` and `Dune` is in `To read`.
- **WHEN** a person selects the `Reading` filter.
- **THEN** the counts still show `1` for `Reading` and `1` for `To read`.

#### Scenario: Update counts after a move

- **GIVEN** one book is in `To read` and none are in `Reading`.
- **WHEN** a person moves that book to `Reading`.
- **THEN** the `To read` count changes to `0` and the `Reading` count changes to `1`.

### Requirement: Keep the queue after a page refresh

The app MUST save valid titles, authors, and statuses in browser-local storage after each add, edit, delete, or status change. It MUST load the saved queue when the page starts. A page refresh MUST keep all saved fields and MUST NOT bring back a deleted book.

#### Scenario: Refresh a saved queue

- **GIVEN** `Kindred` by `Octavia E. Butler` is in `Finished` and `Dune` by `Frank Herbert` is in `Reading`.
- **WHEN** a person refreshes the page.
- **THEN** both books still appear with the same titles, authors, and statuses, and the status counts are right.

#### Scenario: Keep a deletion after refresh

- **GIVEN** a person has deleted `Dune` from the queue.
- **WHEN** the person refreshes the page.
- **THEN** `Dune` does not return.

### Requirement: Stay within the canary scope

The app MUST use one desktop screen and browser-local data. It MUST NOT require login, a phone layout, a server, or an outside service. The review build MUST use the supported static preview path.

#### Scenario: Open the desktop preview

- **WHEN** a reviewer opens the static preview on a desktop screen.
- **THEN** the reviewer can manage, move, filter, and count books without a login or an outside service.

### Requirement: Provide review proof

The final pull request MUST link to a working preview. It MUST include real browser screenshots that show the key behavior. The proof MUST show add, edit, delete, validation, all three statuses, filtering, counts, and saved data after a refresh.

#### Scenario: Review the browser proof

- **WHEN** a reviewer checks the preview and screenshots.
- **THEN** the proof shows book changes, a clear invalid-entry message, status moves, a filter with the right counts, and the same saved queue after a refresh.
