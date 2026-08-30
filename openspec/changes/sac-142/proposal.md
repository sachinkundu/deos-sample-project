## Why

People need a fast way to do math in a terminal. They need to change a temperature from one scale to the next. The tool should be clear. The same input should give the same result. Bad input should show what went wrong.

## What Changes

- Add, subtract, multiply, and divide numbers.
- Change temperatures between Celsius, Fahrenheit, and Kelvin, and reject a bad change.
- Set which numbers the tool can use.
- Set how the tool rounds and shows a result.
- Show errors for bad command forms, bad numbers, and bad units.
- For division by zero, show an error on standard error and fail.
- For a value below absolute zero, show an error on standard error and fail.

## Capabilities

### New Capabilities

- `calculator-cli`: Lets people do math and change temperatures. It sets what can go in and what must come out. It sets what will happen if the input is bad.

### Modified Capabilities

None.

## Impact

The project will gain a tool that runs in a terminal. It will read a command and write one result. The result will go to standard output. An error will go to standard error.
