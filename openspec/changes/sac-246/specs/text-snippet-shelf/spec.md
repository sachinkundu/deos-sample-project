## Purpose

People can keep named text snippets on one desktop screen. Each saved title and text body stays in cloud storage and can be read in a new browser.

## ADDED Requirements

### Requirement: Save a snippet

The app MUST let a person save a snippet with a title and plain text. It MUST send the save through the Worker API. Its title MUST appear in the snippet list after the save succeeds.

#### Scenario: Save two snippets

- **WHEN** a person saves `Greeting` with `Hello, team!` and `Sign-off` with `Kind regards`.
- **THEN** the list shows `Greeting` and `Sign-off` as two snippets.

### Requirement: Reject bad input

The app MUST reject a save when the title or text is blank or has only spaces. It MUST show a clear message that names the field to fix. A rejected save MUST NOT add data to D1 or R2.

#### Scenario: Reject a blank title

- **WHEN** a person tries to save a snippet with a blank title and `Hello` as its text.
- **THEN** the app says that a title is needed and does not add the snippet.

#### Scenario: Reject blank text

- **WHEN** a person tries to save `Empty note` with only spaces as its text.
- **THEN** the app says that text is needed and does not add the snippet.

### Requirement: List and read saved snippets

The app MUST show the title of each saved snippet in a list. A person MUST be able to pick one title and read that snippet's full text on the same screen. The app MUST treat the saved body as plain text, not rich text or markup.

#### Scenario: Read the right text

- **GIVEN** `Greeting` has the text `Hello, team!` and `Sign-off` has the text `Kind regards`.
- **WHEN** a person picks `Sign-off` from the list.
- **THEN** the reading area shows `Kind regards` and does not show `Hello, team!` as the selected text.

#### Scenario: Show markup as plain text

- **GIVEN** a snippet has `<b>Hello</b>` as its saved text.
- **WHEN** a person opens that snippet.
- **THEN** the reading area shows the tags as text and does not make `Hello` bold.

### Requirement: Delete one snippet

The app MUST let a person delete a saved snippet through the Worker API. A successful delete MUST remove its D1 row and R2 object. It MUST remove the title and text from the screen and MUST NOT change other snippets.

#### Scenario: Delete one of two snippets

- **GIVEN** `Greeting` and `Sign-off` are saved.
- **WHEN** a person deletes `Greeting`.
- **THEN** `Greeting` is gone, while `Sign-off` can still be picked and read.

### Requirement: Keep data in D1 and R2

The app MUST send save, list, read, and delete requests through the Worker API. The Worker MUST use D1 as the saved index for each snippet title and R2 object key. It MUST use R2 for the full text body tied to that key. The list MUST come from D1, and a selected body MUST come from R2. The app MUST load the saved index when it starts.

#### Scenario: Use the Worker API

- **WHEN** a person saves, lists, reads, or deletes a snippet.
- **THEN** the app sends that request through the Worker API and uses its result.

#### Scenario: Read a body from its stored key

- **GIVEN** D1 links the `Greeting` snippet to an R2 object that contains `Hello, team!`.
- **WHEN** a person opens `Greeting`.
- **THEN** the Worker reads that R2 object and returns `Hello, team!`.

### Requirement: Keep saved data across browser sessions

Saved snippets MUST remain after a page refresh and in a fresh browser context that opens the same test app. A deleted snippet MUST stay deleted in both cases.

#### Scenario: Refresh two saved snippets

- **GIVEN** `Greeting` and `Sign-off` are saved.
- **WHEN** a person refreshes the page.
- **THEN** both titles remain, and each title opens the same saved text.

#### Scenario: Open a fresh browser context

- **GIVEN** `Greeting` is saved and `Sign-off` was deleted.
- **WHEN** a fresh browser context opens the same test app.
- **THEN** `Greeting` can still be read and `Sign-off` does not return.

### Requirement: Report failed actions

If the app cannot load, save, read, or delete a snippet, it MUST show a clear message for that action. It MUST NOT show success for a failed action.

#### Scenario: Report a failed save

- **WHEN** the cloud save fails.
- **THEN** the app says that the snippet was not saved and does not show a success state.

#### Scenario: Report a failed delete

- **GIVEN** `Greeting` is saved.
- **WHEN** the delete of `Greeting` fails.
- **THEN** the app says that `Greeting` was not deleted and does not show a success state.

### Requirement: Stay within the canary scope

The app MUST use one desktop screen and MUST NOT require a login. It MUST NOT add sharing tools, search, rich text editing, or file uploads. Review use MUST run in the supported temporary Worker environment with one D1 binding, one R2 binding, and built static assets.

#### Scenario: Open the desktop app

- **WHEN** a reviewer opens the temporary app on a desktop screen.
- **THEN** the reviewer can save, list, read, and delete snippets on that screen without a login.

### Requirement: Provide review proof and remove test resources

The final pull request MUST keep real browser screenshots for the main flow and a clear bad-input or failed-action message. The proof MUST show the same saved data after a refresh or in a fresh browser context. It MUST also include a D1 readback and R2 list or object check that match the browser data. The temporary test resources MUST be removed after the proof is published. The saved proof MUST remain available in the pull request after removal.

#### Scenario: Review the full canary proof

- **WHEN** a reviewer checks the pull request after the test environment is removed.
- **THEN** its saved proof shows two snippets, the right selected text, one deletion with the other snippet kept, a clear error, data kept across sessions, and matching checks from D1 and R2.
