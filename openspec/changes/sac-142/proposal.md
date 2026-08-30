## Why

People need a fast way to do math in a terminal. They need to change a temperature from one scale to the next. The tool should be clear. The same input should give the same result. Bad input should show what went wrong.

## What Changes

- Use `calculator` with fixed command forms for add, subtract, multiply, and divide. Each action takes a left value and then a right value.
- Use `calculator convert <value> --from <unit> --to <unit>` to change temperatures between Celsius, Fahrenheit, and Kelvin. Reject a bad change.
- Accept base-ten numbers with an optional leading minus sign. Use one or more digits, with an optional decimal point and one or more digits after it. Reject a plus sign, an exponent, `NaN`, and infinity.
- Round a result to at most six decimal places. If the next digit is five or more, round away from zero. Remove trailing zeros and an empty decimal point. Write only the result and a newline to standard output. Write nothing to standard error and exit with status `0`.
- Show an error for an unknown action, a missing argument or option, an extra argument, a repeated option, a bad number, or a bad unit. Write only the error and a newline to standard error. Write nothing to standard output and exit with status `2`.
- For division by zero, write only an error to standard error and exit with status `2`.
- For a value below absolute zero, write only an error to standard error and exit with status `2`.

## Capabilities

### New Capabilities

- `calculator-cli`: Lets people do math and change temperatures. It sets what can go in and what must come out. It sets what will happen if the input is bad.

### Modified Capabilities

None.

## Impact

The project will gain a tool that runs in a terminal. It will read a command and write one result. The result will go to standard output. An error will go to standard error.
