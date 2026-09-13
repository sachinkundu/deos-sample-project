## Purpose

New test runs use the right sandbox tier, and people can see the saved choice in the portal.

## ADDED Requirements

### Requirement: Default new test runs to Standard-2

The system MUST choose the `Standard-2` sandbox tier for a new test run when the run has no `slow-ok` label.

#### Scenario: Create a run without the slow-ok label

- **WHEN** a new test run is created without a `slow-ok` label.
- **THEN** the system creates its sandbox with the `Standard-2` tier.

### Requirement: Save one tier for the run and sandbox

When the system chooses `Standard-2` as the default tier for a new test run, it MUST save that tier on the run and its linked sandbox.

#### Scenario: Save the default tier

- **WHEN** the system creates a new test run and chooses the `Standard-2` default tier.
- **THEN** the saved test run tier and the saved sandbox tier are both `Standard-2`.

### Requirement: Show the saved tier in the portal

The portal MUST show `Standard-2` for a test run that has `Standard-2` as its saved sandbox tier.

#### Scenario: View a run that uses the default tier

- **WHEN** a person views a test run with `Standard-2` as its saved sandbox tier.
- **THEN** the portal shows `Standard-2` for that run.
