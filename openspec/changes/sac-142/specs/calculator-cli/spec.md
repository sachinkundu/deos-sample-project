## Purpose

This capability lets people do basic math and change temperatures from the command line. It gives stable results and clear errors.

## ADDED Requirements

### Requirement: Accept calculator commands

The tool SHALL use the name `calculator`. It SHALL accept these command forms. It SHALL use the shown argument and option order.

- `calculator add <left> <right>`
- `calculator subtract <left> <right>`
- `calculator multiply <left> <right>`
- `calculator divide <left> <right>`
- `calculator convert <value> --from <unit> --to <unit>`

Each number SHALL be a base-ten value with an optional leading minus sign. It SHALL have one or more digits and MAY have a decimal point followed by one or more digits. The tool SHALL not accept a plus sign, an exponent, `NaN`, or infinity. Unit names SHALL be `celsius`, `fahrenheit`, or `kelvin` and SHALL be case-sensitive. Any other number or unit SHALL be a bad value and SHALL cause an error.

#### Scenario: Accept a whole number and a decimal

- **WHEN** a person runs `calculator add -2 3.5`.
- **THEN** the tool accepts both values and runs the add action.

#### Scenario: Reject an unsupported number form

- **WHEN** a person runs `calculator add 1e2 4`.
- **THEN** the tool reports that `1e2` is not a valid number.

### Requirement: Add two numbers

The `add` action SHALL return the sum of `left` and `right`.

#### Scenario: Add two values

- **WHEN** a person runs `calculator add 7.5 2`.
- **THEN** the tool writes `9.5` to standard output.

### Requirement: Subtract two numbers

The `subtract` action SHALL return `right` subtracted from `left`.

#### Scenario: Subtract two values

- **WHEN** a person runs `calculator subtract 7 10`.
- **THEN** the tool writes `-3` to standard output.

### Requirement: Multiply two numbers

The `multiply` action SHALL return the product of `left` and `right`.

#### Scenario: Multiply two values

- **WHEN** a person runs `calculator multiply 2.5 4`.
- **THEN** the tool writes `10` to standard output.

### Requirement: Divide two numbers

The `divide` action SHALL return `left` divided by `right`. The tool SHALL reject zero as `right`.

#### Scenario: Divide two values

- **WHEN** a person runs `calculator divide 9 4`.
- **THEN** the tool writes `2.25` to standard output.

#### Scenario: Reject division by zero

- **WHEN** a person runs `calculator divide 5 0`.
- **THEN** the tool reports that it cannot divide by zero.

### Requirement: Convert Celsius temperatures

When the source unit is `celsius`, the tool SHALL use these formulas, where `C` is the input value:

- To `fahrenheit`: `F = (C × 9 / 5) + 32`
- To `kelvin`: `K = C + 273.15`

#### Scenario: Convert Celsius to Fahrenheit

- **WHEN** a person runs `calculator convert 100 --from celsius --to fahrenheit`.
- **THEN** the tool writes `212` to standard output.

#### Scenario: Convert Celsius to Kelvin

- **WHEN** a person runs `calculator convert 0 --from celsius --to kelvin`.
- **THEN** the tool writes `273.15` to standard output.

### Requirement: Convert Fahrenheit temperatures

When the source unit is `fahrenheit`, the tool SHALL use these formulas, where `F` is the input value:

- To `celsius`: `C = (F - 32) × 5 / 9`
- To `kelvin`: `K = (F - 32) × 5 / 9 + 273.15`

#### Scenario: Convert Fahrenheit to Celsius

- **WHEN** a person runs `calculator convert 32 --from fahrenheit --to celsius`.
- **THEN** the tool writes `0` to standard output.

#### Scenario: Convert Fahrenheit to Kelvin

- **WHEN** a person runs `calculator convert 32 --from fahrenheit --to kelvin`.
- **THEN** the tool writes `273.15` to standard output.

### Requirement: Convert Kelvin temperatures

When the source unit is `kelvin`, the tool SHALL use these formulas, where `K` is the input value:

- To `celsius`: `C = K - 273.15`
- To `fahrenheit`: `F = (K - 273.15) × 9 / 5 + 32`

#### Scenario: Convert Kelvin to Celsius

- **WHEN** a person runs `calculator convert 273.15 --from kelvin --to celsius`.
- **THEN** the tool writes `0` to standard output.

#### Scenario: Convert Kelvin to Fahrenheit

- **WHEN** a person runs `calculator convert 273.15 --from kelvin --to fahrenheit`.
- **THEN** the tool writes `32` to standard output.

### Requirement: Reject invalid temperature changes

The source and target units SHALL differ. The tool SHALL reject a source value below absolute zero. Absolute zero SHALL be `-273.15` Celsius, `-459.67` Fahrenheit, or `0` Kelvin. A change with the same units, a value below these limits, or an unknown unit SHALL be a bad change and SHALL cause an error.

#### Scenario: Reject the same source and target unit

- **WHEN** a person runs `calculator convert 20 --from celsius --to celsius`.
- **THEN** the tool reports that the source and target units must differ.

#### Scenario: Reject a value below absolute zero

- **WHEN** a person runs `calculator convert -1 --from kelvin --to celsius`.
- **THEN** the tool reports that the value is below absolute zero.

#### Scenario: Reject an unknown unit

- **WHEN** a person runs `calculator convert 20 --from celsius --to rankine`.
- **THEN** the tool reports that `rankine` is not a valid unit.

### Requirement: Format successful results

The tool SHALL find the exact result before it rounds. If that result has more than six digits after the decimal point, the tool SHALL round it to six digits. If the next digit is five or more, it SHALL round away from zero. It SHALL remove trailing zeros after the decimal point and SHALL remove a decimal point with no digits after it. On success, it SHALL write only the result and a newline to standard output, SHALL write nothing to standard error, and SHALL exit with status `0`.

#### Scenario: Round a repeating result

- **WHEN** a person runs `calculator divide 2 3`.
- **THEN** the tool writes `0.666667` and a newline to standard output.
- **AND** the tool writes nothing to standard error.
- **AND** the tool exits with status `0`.

#### Scenario: Remove trailing zeros

- **WHEN** a result is `4.500000` after rounding.
- **THEN** the tool writes `4.5` and a newline to standard output.

### Requirement: Report all errors

The tool SHALL report an error when the action is not known, a required argument is missing, an extra argument is given, an option is missing, or an option is repeated. The same error response SHALL apply to each bad number, bad unit, division by zero, and value below absolute zero. For each error required by this spec, the tool SHALL write one clear message and a newline to standard error. It SHALL write nothing to standard output and SHALL exit with status `2`.

#### Scenario: Reject an unknown action

- **WHEN** a person runs `calculator power 2 3`.
- **THEN** the tool reports that `power` is not a valid action.
- **AND** the tool writes nothing to standard output.
- **AND** the tool exits with status `2`.

#### Scenario: Reject a missing value

- **WHEN** a person runs `calculator add 2`.
- **THEN** the tool reports that the add action needs two values.
- **AND** the tool writes nothing to standard output.
- **AND** the tool exits with status `2`.

#### Scenario: Reject a repeated option

- **WHEN** a person gives the `convert` action two `--from` options.
- **THEN** the tool reports that `--from` may be given only once.
- **AND** the tool writes nothing to standard output.
- **AND** the tool exits with status `2`.
