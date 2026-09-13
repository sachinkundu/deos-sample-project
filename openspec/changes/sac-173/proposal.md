## Why

The sandbox choice needs issue labels as soon as work starts. A test must prove that each start event has the labels for that start, so an old label cannot affect a later choice.

## What Changes

- Add a test that moves an issue with the `slow-ok` label to Todo and checks that the new start event includes that label.
- Start the issue again with no `slow-ok` label and check that the new start event does not include it.

## Capabilities

### New Capabilities

- `sandbox-start-labels`: Show the current `slow-ok` label state in each issue start event.

### Modified Capabilities

None.

## Impact

This adds test coverage for issue start events. It does not change an API or stored data.
