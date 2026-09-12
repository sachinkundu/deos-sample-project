## Why

A sandbox choice needs issue labels when work starts. A test must show that each start event has labels from that issue and does not keep old labels.

## What Changes

- Add a test that moves an issue with the `slow-ok` label to Todo and checks that its start event has that label.
- Start a second issue with no `slow-ok` label and check that its start event does not have that label.

## Capabilities

### New Capabilities

- `sandbox-start-label-check`: Check that each sandbox start event has the labels from the issue that caused the start.

### Modified Capabilities

None.

## Impact

This adds setup and checks to the test suite. It does not change the sandbox start flow or a public API.
