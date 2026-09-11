## Why

People need a quick way to change a heat value without a web page. A small command makes this task fast and easy.

## What Changes

- Add a `temperature` command with `celsius-to-fahrenheit` and `fahrenheit-to-celsius` modes. Each mode takes one value.
- Let people use signed whole or decimal values. Use `(C × 9 / 5) + 32` and `(F - 32) × 5 / 9`. Keep each result within `0.000000001` of the formula result.
- On success, print only the new number and a line break to standard output. Leave standard error empty and return status zero.
- Reject a missing or unknown mode, the wrong number of values, text, NaN, infinity, and a result that is not finite. For each failure, leave standard output empty, write a short cause to standard error, and return a non-zero status.
- Add a short run guide with the command form, both modes, one example for each mode, and the output and error rules. Add tests for common values and the bad input cases in the spec.

## Capabilities

### New Capabilities

- `temperature-cli`: Change heat values in either way from a terminal, with clear output and errors.

### Modified Capabilities

None.

## Impact

This adds a new command-line tool, a short user guide, and tests. It does not change an API or stored data.
