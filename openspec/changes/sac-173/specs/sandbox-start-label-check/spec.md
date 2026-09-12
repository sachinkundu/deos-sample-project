## Purpose

This check shows that each start event has the current issue labels. The sandbox choice can then use those labels from the start.

## ADDED Requirements

### Requirement: Check labels on each start event

The test MUST put `slow-ok` on one test issue and move that issue to Todo. The start event for that move MUST list `slow-ok` in its issue labels. The test MUST move a second issue to Todo with no `slow-ok` label. The start event for that move MUST NOT list `slow-ok`. The test MUST match each start event to the issue that caused it.

#### Scenario: Start an issue with the slow label

- **GIVEN** a test issue has the `slow-ok` label
- **WHEN** the test moves the issue to Todo and gets its start event
- **THEN** the event issue labels include `slow-ok`

#### Scenario: Start a second issue without the slow label

- **GIVEN** a second test issue does not have the `slow-ok` label
- **WHEN** the test moves the issue to Todo and gets its start event
- **THEN** the event issue labels do not include `slow-ok`
