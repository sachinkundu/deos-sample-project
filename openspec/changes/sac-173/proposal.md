## Why

The sandbox choice needs issue labels as soon as work starts. A test must prove that each start event has the labels for that start, so an old label cannot affect a later choice.

## What Changes

- Add a test for the first start. Give the issue the `slow-ok` label. Move it to Todo. Check that the new start event has the label.
- Start the issue again with no `slow-ok` label. Check that the new event does not have it.

## Capabilities

### New Capabilities

- `sandbox-start-labels`: Show the current `slow-ok` label state in each issue start event.

### Modified Capabilities

None.

## Impact

This adds test coverage for issue start events. It does not change an API or stored data.
