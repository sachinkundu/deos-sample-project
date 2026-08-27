## Purpose

This capability gives people a safe and clear view of a plan's review state before they approve it.

## ADDED Requirements

### Requirement: Give a short summary for the current plan version

The review summary SHALL name the current plan version and contain no more than 150 words. All review results and fix states in the summary SHALL apply to that version.

#### Scenario: Person views the review summary

- **WHEN** a person views the review summary for a plan.
- **THEN** the summary names the current plan version.
- **AND** the full summary contains no more than 150 words.
- **AND** each shown review result and fix state applies to that version.

#### Scenario: The plan version changes

- **WHEN** a new plan version becomes current.
- **THEN** the summary names the new current version.
- **AND** the summary does not treat results from an older version as results for the new version.

### Requirement: Show both review results

The review summary SHALL name each of the two required plan reviews and show a separate result for each one. Each result SHALL state if that review is not done, passed, or found a concern.

#### Scenario: One review is not done

- **WHEN** one required review is done and the other is not done for the current version.
- **THEN** the summary names each review and shows its result.
- **AND** the summary makes clear that both reviews are not yet done.

#### Scenario: Both reviews are done

- **WHEN** both required reviews are done for the current version.
- **THEN** the summary names each review and shows its result.
- **AND** the summary makes clear that both reviews are done.

### Requirement: Show fix states

For each required review, the review summary SHALL state if no fix is needed, a fix is open, or a fix was applied.

#### Scenario: A review calls for a fix

- **WHEN** a required review has a fix that is still open.
- **THEN** the summary shows that the fix is open for that review.

#### Scenario: A fix was applied

- **WHEN** a fix from a required review was applied to the current plan version.
- **THEN** the summary shows that the fix was applied for that review.

### Requirement: Show open concerns without private details

If a required review has an open concern, the review summary SHALL show a short, safe summary of that concern. It SHALL NOT show private review details or raw review output.

#### Scenario: A review has an open concern

- **WHEN** a required review has an open concern for the current version.
- **THEN** the summary shows a short, safe summary of the open concern.
- **AND** the summary does not show private review details or raw review output.

### Requirement: Show if the plan is ready

The review summary SHALL mark the current plan version as ready only when both required reviews are done and no concern is open. In all other cases, it SHALL mark the plan as not ready.

#### Scenario: The plan is ready

- **WHEN** both required reviews are done for the current version.
- **AND** neither review has an open concern.
- **THEN** the summary marks the current plan version as ready.

#### Scenario: The plan is not ready

- **WHEN** a required review is not done or has an open concern for the current version.
- **THEN** the summary marks the current plan version as not ready.
