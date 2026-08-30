## Why

People need a clear terminal tool for basic math and temperature changes. A full spec will help the team agree on its input, output, and errors before work starts.

## What Changes

- Use `calc` with fixed forms for add, subtract, multiply, and divide. Add returns the sum. Subtract takes the right value from the left value. Multiply returns the product. Divide takes the left value over the right value. With no arguments, `calc` opens a loop menu for `+`, `-`, `*`, `/`, temperature changes, `deg2rad`, `rad2deg`, and quit. Bad menu input shows an error and starts the next loop.
- Use `calc convert <value> --from <unit> --to <unit>` to change temperatures between Celsius, Fahrenheit, and Kelvin. Reject a bad change.
- Accept base-ten numbers with an optional leading minus sign. Use one or more digits, with an optional decimal point and one or more digits after it. Reject a plus sign, an exponent, `NaN`, and infinity.
- Round a result to at most three decimal places. If the next digit is five or more, round away from zero. Remove trailing zeros and an empty decimal point. For a fixed command, write only the result and a newline to standard output. Write nothing to standard error and exit with status `0`.
- For a bad fixed command, show an error for an unknown action, a missing argument or option, an extra argument, a repeated option, a bad number, or a bad unit. Write only the error and a newline to standard error. Write nothing to standard output and exit with status `2`.
- For division by zero, write only an error to standard error and exit with status `2`.
- For a value below absolute zero, write only an error to standard error and exit with status `2`.

## Capabilities

### New Capabilities

- `calculator-cli`: Lets people do math and change temperatures. It sets what can go in and what must come out. It sets what will happen if the input is bad.

### Modified Capabilities

None.

## Impact

The project will gain a terminal tool named `calc`. It will read command arguments or menu input. It will write results or clear errors.
