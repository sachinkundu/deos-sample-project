## Why

People need one clear sign before they approve a plan. The sign must reflect the plan version they can see.

## What Changes

- Show one short review summary for each plan.
- State if both plan reviews are done.
- List each open concern but leave out private review details.
- Show `Ready` only when both reviews are done and no concern is open.
- Show `Needs work` for every other review state.
- Name the current plan version in the summary.

## Capabilities

### New Capabilities

- `plan-review-summary`: Covers the review summary, safe concern list, version, and exact badge state for a plan.

### Modified Capabilities

None.

## Impact

Each plan view will gain one review summary and badge. The view will use the review state and open concerns for the current plan version.
