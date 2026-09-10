## Why

People need a quick way to solve simple sums and change common units in a terminal. A small tool with clear help and errors makes this work fast and easy.

## What Changes

- Add `calculator <command> <values>` commands that add, subtract, multiply, and divide whole numbers or decimals. Math commands take two values, and unit commands take one. A valid command prints only its result and a line break to standard output, then returns status zero.
- Add commands that change Celsius to Fahrenheit and back.
- Add commands that change degrees to radians and back.
- Add `--help` for the main tool and each command. Help shows a use line, command name, goal, value names, and an example on standard output, then returns status zero. Bad input writes a short error and a help hint to standard error, returns a non-zero status, and does not print a result.

## Capabilities

### New Capabilities

- `calculator-cli`: Do basic math and common unit changes from a terminal, with clear help and errors.

### Modified Capabilities

None.

## Impact

This adds a new command-line program and its tests. It does not change an existing API or stored data.
