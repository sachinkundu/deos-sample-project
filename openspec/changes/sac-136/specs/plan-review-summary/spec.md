## Purpose

This capability gives people one clear review signal for the plan version they can see.

## ADDED Requirements

### Requirement: Show one summary for the current plan

The plan view SHALL show exactly one short review summary for each plan. The summary SHALL name the current plan version. It SHALL use only the review state for the plan version shown in the view.

#### Scenario: Person views a plan

- **WHEN** a person views a plan.
- **THEN** the view shows one short review summary that names the current plan version.
- **AND** the summary uses the review state for that version.

#### Scenario: Current plan version changes

- **WHEN** the view changes from one plan version to another.
- **THEN** the summary names the new current plan version.
- **AND** the summary uses the review state for the new version.

### Requirement: State if both reviews are done

The review summary SHALL state if both required plan reviews are done.

#### Scenario: One review is not done

- **WHEN** one required plan review is not done.
- **THEN** the summary states that both reviews are not done.

#### Scenario: Both reviews are done

- **WHEN** both required plan reviews are done.
- **THEN** the summary states that both reviews are done.

### Requirement: List open concerns without private details

The review summary SHALL list each open concern for the current plan version. It SHALL leave out private review details.

#### Scenario: Current version has open concerns

- **WHEN** the current plan version has one or more open concerns.
- **THEN** the summary lists each open concern.
- **AND** the list does not show private review details.

### Requirement: Show one exact review badge

The review summary SHALL show exactly one review badge. The badge SHALL be `Ready` only when both required plan reviews are done and no concern is open for the current plan version. The badge SHALL be `Needs work` in every other review state for that version.

#### Scenario: Both reviews are done with no open concern

- **WHEN** both required plan reviews are done.
- **AND** no concern is open for the current plan version.
- **THEN** the badge is `Ready`.

#### Scenario: A review is not done

- **WHEN** at least one required plan review is not done.
- **THEN** the badge is `Needs work`.

#### Scenario: A concern is open

- **WHEN** both required plan reviews are done.
- **AND** at least one concern is open for the current plan version.
- **THEN** the badge is `Needs work`.
