## Why

New test runs should use the faster sandbox unless a label allows a slow one. A clear default also keeps the run record, sandbox record, and portal in sync.

## What Changes

- Choose the `Standard-2` sandbox tier for a new test run when the run has no `slow-ok` label.
- Save `Standard-2` as the tier on both the test run and its sandbox.
- Show `Standard-2` for the run in the portal.

## Capabilities

### New Capabilities

- `test-run-sandbox`: Choose, save, and show the default sandbox tier for a test run.

### Modified Capabilities

None.

## Impact

This changes the default sandbox choice for new test runs without a `slow-ok` label. It also affects the saved run data, saved sandbox data, and portal display.
