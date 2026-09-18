## Purpose

This capability lets a person keep a small set of short notes and see what went wrong when an action fails.

## ADDED Requirements

### Requirement: Show saved notes

The app MUST load and show all saved notes when the page opens. It MUST show an empty state when there are no notes. A page reload MUST get the saved list again.

#### Scenario: Read saved notes

- **GIVEN** two notes have been saved.
- **WHEN** a person opens the app.
- **THEN** the app shows both notes.

#### Scenario: Show the empty state

- **GIVEN** no notes have been saved.
- **WHEN** a person opens the app.
- **THEN** the app says that there are no notes yet.

#### Scenario: A load fails

- **GIVEN** saved notes cannot be loaded.
- **WHEN** a person opens the app.
- **THEN** the app says that the notes could not be loaded and offers a retry action.

### Requirement: Add a short note

The app MUST let a person add a note with text that has at least one non-space character and no more than 500 characters. It MUST save valid text before it shows the new note as saved.

#### Scenario: Add a valid note

- **WHEN** a person submits valid note text.
- **THEN** the app saves the note, shows it in the list, and clears the new note field.
- **AND** the note is still in the list after a page reload.

#### Scenario: Reject invalid new text

- **WHEN** a person submits blank text or text with more than 500 characters.
- **THEN** the app does not save a note and explains how to fix the text.

#### Scenario: A new note cannot be saved

- **GIVEN** a person has entered valid note text.
- **WHEN** the save fails.
- **THEN** the app keeps the entered text and says that the note was not saved.

### Requirement: Edit a saved note

The app MUST let a person change the text of a saved note. The same text rules used for a new note MUST apply to an edit. The app MUST show the new text as saved only after the save succeeds.

#### Scenario: Save a valid edit

- **GIVEN** a saved note is open for edit.
- **WHEN** a person submits valid new text.
- **THEN** the app saves and shows the new text.
- **AND** the new text is still shown after a page reload.

#### Scenario: Reject invalid edited text

- **GIVEN** a saved note is open for edit.
- **WHEN** a person submits blank text or text with more than 500 characters.
- **THEN** the app does not change the saved note and explains how to fix the text.

#### Scenario: An edit cannot be saved

- **GIVEN** a person has entered valid new text for a saved note.
- **WHEN** the save fails.
- **THEN** the app keeps the new text open for edit and says that the change was not saved.

### Requirement: Delete a saved note

The app MUST let a person delete a saved note. It MUST remove the note from the list only after the delete succeeds.

#### Scenario: Delete a note

- **GIVEN** a note has been saved.
- **WHEN** a person deletes the note.
- **THEN** the app removes it from the list.
- **AND** the note stays gone after a page reload.

#### Scenario: A note cannot be deleted

- **GIVEN** a note has been saved.
- **WHEN** the delete fails.
- **THEN** the app keeps the note in the list and says that it was not deleted.

### Requirement: Return clear API results

The notes API MUST support listing, adding, editing, and deleting notes. Each success MUST return a suitable success status and the saved note data when the browser needs it. Each failure MUST return a suitable error status and a short message that says what failed. Error messages MUST NOT expose a stack trace, query text, or secret data.

#### Scenario: A note request succeeds

- **WHEN** the browser sends a valid note request.
- **THEN** the API returns a success status and the data needed to show the result.

#### Scenario: A note request is invalid

- **WHEN** the browser sends invalid note text or names a note that does not exist.
- **THEN** the API returns an error status and a short message that explains the issue.

#### Scenario: The note service fails

- **WHEN** the API cannot finish a valid note request.
- **THEN** it returns a server error status and a safe message that says the action failed.
