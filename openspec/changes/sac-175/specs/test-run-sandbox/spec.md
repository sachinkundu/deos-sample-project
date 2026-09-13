## Purpose

New test runs use the right sandbox tier, and people can see the saved choice in the portal.

## ADDED Requirements

### Requirement: Default new test runs to Standard-2

The system MUST choose the `Standard-2` sandbox tier for a new test run when the run has no `slow-ok` label. It MUST use that choice when it creates the sandbox for the run.

#### Scenario: Create a run without the slow-ok label

- **WHEN** a new test run is created without a `slow-ok` label.
- **THEN** the system creates its sandbox with the `Standard-2` tier.

### Requirement: Save one tier for the run and sandbox

For a new test run without a `slow-ok` label, the system MUST save `Standard-2` as the tier on the run. It MUST also save `Standard-2` as the tier on the sandbox linked to that run.

#### Scenario: Save the default tier

- **WHEN** the system creates a new test run without a `slow-ok` label and its sandbox.
- **THEN** the saved test run tier and the saved sandbox tier are both `Standard-2`.

### Requirement: Show the saved tier in the portal

For a new test run without a `slow-ok` label, the portal MUST show `Standard-2` as the saved sandbox tier for that run.

#### Scenario: View a run that uses the default tier

- **WHEN** a person views a new test run that was created without a `slow-ok` label.
- **THEN** the portal shows `Standard-2` for that run.
