## Purpose

This capability lets people do basic math and change temperatures from the command line.

## ADDED Requirements

### Requirement: Accept math commands

The CLI SHALL accept `calc math <operation> <left> <right>`. It SHALL accept `add`, `subtract`, `multiply`, and `divide` as operation names. For any accepted values, `add` SHALL compute left plus right, `subtract` SHALL compute left minus right, `multiply` SHALL compute left times right, and `divide` SHALL compute left divided by right. Each value SHALL be a base-ten integer or decimal with an optional leading sign. The CLI SHALL accept only finite values and SHALL not accept exponent form.

#### Scenario: Add two values

- **WHEN** a person runs `calc math add 7 5`.
- **THEN** the CLI writes `12` to standard output and exits with status 0.

#### Scenario: Subtract two values

- **WHEN** a person runs `calc math subtract 7 5`.
- **THEN** the CLI writes `2` to standard output and exits with status 0.

#### Scenario: Multiply two values

- **WHEN** a person runs `calc math multiply 7 5`.
- **THEN** the CLI writes `35` to standard output and exits with status 0.

#### Scenario: Divide two values

- **WHEN** a person runs `calc math divide 7 2`.
- **THEN** the CLI writes `3.5` to standard output and exits with status 0.

### Requirement: Format successful results

For any successful command, the CLI SHALL write one result and a newline to standard output. It SHALL write nothing to standard error. It SHALL round a result to no more than six places after the decimal point. It SHALL remove zeros from the end of the fractional part and remove a decimal point with no digits after it. If the rounded result is zero, it SHALL write `0`.

#### Scenario: Round a long result

- **WHEN** a person runs `calc math divide 2 3`.
- **THEN** the CLI writes `0.666667` and a newline to standard output.

#### Scenario: Remove an empty fractional part

- **WHEN** a person runs `calc math add 1.5 0.5`.
- **THEN** the CLI writes `2` and a newline to standard output.

### Requirement: Reject invalid math input

The CLI SHALL reject an unknown math operation and write `Error: unknown math operation.` to standard error. It SHALL reject a missing or extra math argument and write `Usage: calc math <add|subtract|multiply|divide> <left> <right>` to standard error. It SHALL reject a value that is not a finite decimal number and write `Error: value must be a finite decimal number.` to standard error. For each of these input errors, it SHALL write nothing to standard output and exit with status 2.

#### Scenario: Reject an unknown operation

- **WHEN** a person runs `calc math power 2 3`.
- **THEN** the CLI writes `Error: unknown math operation.` to standard error, writes nothing to standard output, and exits with status 2.

#### Scenario: Reject a value in exponent form

- **WHEN** a person runs `calc math add 1e2 3`.
- **THEN** the CLI writes `Error: value must be a finite decimal number.` to standard error, writes nothing to standard output, and exits with status 2.

#### Scenario: Reject a missing value

- **WHEN** a person runs `calc math add 2`.
- **THEN** the CLI writes the math usage text to standard error, writes nothing to standard output, and exits with status 2.

### Requirement: Reject division by zero

The CLI SHALL reject division by numeric zero. It SHALL write `Error: cannot divide by zero.` to standard error, write nothing to standard output, and exit with status 1.

#### Scenario: Divide by zero

- **WHEN** a person runs `calc math divide 7 0`.
- **THEN** the CLI writes `Error: cannot divide by zero.` to standard error, writes nothing to standard output, and exits with status 1.

### Requirement: Accept temperature commands

The CLI SHALL accept `calc temp <value> <from> <to>`. It SHALL accept only `C`, `F`, and `K` as unit names. Unit names SHALL be case-sensitive. The value SHALL follow the same number rules as a math value. The source and target units MAY be the same.

#### Scenario: Keep a value in the same unit

- **WHEN** a person runs `calc temp 20 C C`.
- **THEN** the CLI writes `20` to standard output and exits with status 0.

### Requirement: Change Celsius and Fahrenheit

For Celsius to Fahrenheit, the CLI SHALL multiply the Celsius value by 9, divide by 5, and add 32. For Fahrenheit to Celsius, it SHALL subtract 32, multiply by 5, and divide by 9.

#### Scenario: Change Celsius to Fahrenheit

- **WHEN** a person runs `calc temp 100 C F`.
- **THEN** the CLI writes `212` to standard output and exits with status 0.

#### Scenario: Change Fahrenheit to Celsius

- **WHEN** a person runs `calc temp 32 F C`.
- **THEN** the CLI writes `0` to standard output and exits with status 0.

### Requirement: Change Celsius and Kelvin

For Celsius to Kelvin, the CLI SHALL add 273.15. For Kelvin to Celsius, it SHALL subtract 273.15.

#### Scenario: Change Celsius to Kelvin

- **WHEN** a person runs `calc temp 0 C K`.
- **THEN** the CLI writes `273.15` to standard output and exits with status 0.

#### Scenario: Change Kelvin to Celsius

- **WHEN** a person runs `calc temp 273.15 K C`.
- **THEN** the CLI writes `0` to standard output and exits with status 0.

### Requirement: Change Fahrenheit and Kelvin

For Fahrenheit to Kelvin, the CLI SHALL subtract 32, multiply by 5, divide by 9, and add 273.15. For Kelvin to Fahrenheit, it SHALL subtract 273.15, multiply by 9, divide by 5, and add 32.

#### Scenario: Change Fahrenheit to Kelvin

- **WHEN** a person runs `calc temp 32 F K`.
- **THEN** the CLI writes `273.15` to standard output and exits with status 0.

#### Scenario: Change Kelvin to Fahrenheit

- **WHEN** a person runs `calc temp 273.15 K F`.
- **THEN** the CLI writes `32` to standard output and exits with status 0.

### Requirement: Reject invalid temperature input

The CLI SHALL reject a unit other than `C`, `F`, or `K` and write `Error: unit must be C, F, or K.` to standard error. It SHALL reject a missing or extra temperature argument and write `Usage: calc temp <value> <from> <to>` to standard error. It SHALL reject an invalid value with the same value error used for math input. For each of these input errors, it SHALL write nothing to standard output and exit with status 2.

#### Scenario: Reject an unknown unit

- **WHEN** a person runs `calc temp 20 C R`.
- **THEN** the CLI writes `Error: unit must be C, F, or K.` to standard error, writes nothing to standard output, and exits with status 2.

#### Scenario: Reject a missing unit

- **WHEN** a person runs `calc temp 20 C`.
- **THEN** the CLI writes the temperature usage text to standard error, writes nothing to standard output, and exits with status 2.

### Requirement: Reject temperatures below absolute zero

The CLI SHALL reject a source value below absolute zero. The lowest valid values SHALL be -273.15 Celsius, -459.67 Fahrenheit, and 0 Kelvin. For a lower value, the CLI SHALL write `Error: temperature is below absolute zero.` to standard error, write nothing to standard output, and exit with status 1.

#### Scenario: Reject Celsius below absolute zero

- **WHEN** a person runs `calc temp -273.16 C K`.
- **THEN** the CLI writes `Error: temperature is below absolute zero.` to standard error, writes nothing to standard output, and exits with status 1.

#### Scenario: Accept absolute zero

- **WHEN** a person runs `calc temp 0 K C`.
- **THEN** the CLI writes `-273.15` to standard output and exits with status 0.

### Requirement: Reject an unknown command group

The CLI SHALL reject a first argument other than `math` or `temp`. It SHALL write `Usage: calc <math|temp> ...` to standard error, write nothing to standard output, and exit with status 2.

#### Scenario: Reject an unknown command group

- **WHEN** a person runs `calc convert 20 C F`.
- **THEN** the CLI writes `Usage: calc <math|temp> ...` to standard error, writes nothing to standard output, and exits with status 2.
