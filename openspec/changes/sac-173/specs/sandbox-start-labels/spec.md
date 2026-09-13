## Purpose

Each issue start event shows if the issue has the `slow-ok` label. The sandbox choice can use this fact right away.

## ADDED Requirements

### Requirement: Send the current slow sandbox label with each start

When moving a test issue to Todo starts work, the new start event MUST include `slow-ok` if the issue has that label. If the issue starts again with no `slow-ok` label, the new event MUST NOT include it. The new event MUST use the label state at the time of its start. It MUST NOT copy the label state from a past event.

#### Scenario: Start an issue with the slow label

- **GIVEN** a test issue has the `slow-ok` label
- **WHEN** the issue moves to Todo and a start event is sent
- **THEN** that start event includes `slow-ok`

#### Scenario: Start the issue again without the slow label

- **GIVEN** a past start event for the test issue included `slow-ok`
- **AND** the issue no longer has the `slow-ok` label
- **WHEN** the issue starts again and a new start event is sent
- **THEN** the new start event does not include `slow-ok`

### Requirement: Test both starts

The project MUST have a test that checks both start events. It MUST check the event from the labeled start. It MUST then check the new event from a start with no `slow-ok` label.

#### Scenario: Run the start label test

- **WHEN** the start label test runs
- **THEN** it proves that the first event includes `slow-ok` and the second event does not
