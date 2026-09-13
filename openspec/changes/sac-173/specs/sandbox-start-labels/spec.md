## Purpose

Each issue start event shows if the issue has the `slow-ok` label. The sandbox choice can use this fact right away.

## ADDED Requirements

### Requirement: Send the current slow sandbox label with each start

Each new start event MUST use the `slow-ok` label state from that start. It MUST include `slow-ok` if the issue has that label. It MUST NOT include `slow-ok` if the issue does not have it. It MUST NOT copy the label state from a past event.

#### Scenario: Start an issue with the slow label

- **GIVEN** a test issue has the `slow-ok` label
- **WHEN** the issue moves to Todo and sends a start event
- **THEN** the event includes `slow-ok`

#### Scenario: Start the issue again without the slow label

- **GIVEN** a past start event included `slow-ok`
- **AND** the issue no longer has the `slow-ok` label
- **WHEN** the issue starts again and sends a new event
- **THEN** the new event does not include `slow-ok`

### Requirement: Test both starts

The project MUST have a test for both starts. It MUST check the event from the labeled start. It MUST then check the event from a start with no `slow-ok` label.

#### Scenario: Run the start label test

- **WHEN** the start label test runs
- **THEN** the first event includes `slow-ok` and the second event does not
