## Why

People need one clear view before they approve a plan. They need to know if both plan reviews are done, what still needs care, and which plan version the reviews cover.

## What Changes

- Add a short review summary for the current plan version.
- Show the result and fix state for each of the two required plan reviews.
- Show any open concern in safe terms without private review details.
- Mark the plan as ready only when both reviews for the current version are done and no concern is open.

## Capabilities

### New Capabilities

- `plan-review-readiness`: Covers the plan version, both review results, fix states, open concerns, and the final ready state.

### Modified Capabilities

None.

## Impact

Each plan will gain a review summary before approval. The summary will use the review results, fix states, and current plan version while keeping private review details out of view.
