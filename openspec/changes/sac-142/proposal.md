## Why

People need a clear terminal tool for basic math and temperature changes. A full spec will help the team agree on its input, output, and errors before work starts.

## What Changes

- Use `calc` with fixed forms for add, subtract, multiply, divide, `deg2rad`, and `rad2deg`. Add returns the sum. Subtract takes the right value from the left value. Multiply returns the product. Divide takes the left value over the right value. To change degrees to radians, multiply by pi and divide by 180. To change radians to degrees, multiply by 180 and divide by pi. With no arguments, `calc` opens a loop menu for `+`, `-`, `*`, `/`, temperature changes, `deg2rad`, `rad2deg`, and quit. After an action, show its result and start the next loop. Bad menu input shows an error and starts the next loop. Quit exits with status `0`.
- Use `calc convert <value> --from <unit> --to <unit>` to change temperatures between Celsius, Fahrenheit, and Kelvin. From Celsius, use `(C * 9 / 5) + 32` for Fahrenheit and `C + 273.15` for Kelvin. From Fahrenheit, use `(F - 32) * 5 / 9` for Celsius and add `273.15` to that result for Kelvin. From Kelvin, use `K - 273.15` for Celsius and use `(K - 273.15) * 9 / 5 + 32` for Fahrenheit. Reject an unknown unit, equal source and target units, and a value below absolute zero.
- Accept base-ten numbers with an optional leading minus sign. Use one or more digits, with an optional decimal point and one or more digits after it. Reject a plus sign, an exponent, `NaN`, and infinity.
- Round a result to at most three decimal places. If the next digit is five or more, round away from zero. Remove trailing zeros and an empty decimal point. For a fixed command, write only the result and a newline to standard output. Write nothing to standard error and exit with status `0`.
- For a bad fixed command, show an error for an unknown action, a missing argument or option, an extra argument, a repeated option, a bad number, a bad unit, or equal source and target units. Write only the error and a newline to standard error. Write nothing to standard output and exit with status `2`.
- For division by zero, write only an error to standard error and exit with status `2`.
- For a value below absolute zero, write only an error to standard error and exit with status `2`.

## Capabilities

### New Capabilities

- `calculator-cli`: Lets people do math and change temperatures. It sets what can go in and what must come out. It sets what will happen if the input is bad.

### Modified Capabilities

None.

## Impact

The project will gain a terminal tool named `calc`. It will read command arguments or menu input. It will write results or clear errors.
