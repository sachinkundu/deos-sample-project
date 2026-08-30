## Purpose

This capability lets people do basic math, change angles, and change temperatures from a terminal. It also gives clear output and errors.

## ADDED Requirements

### Requirement: Accept calculator commands and numbers

The tool SHALL use the name `calc`. It SHALL accept `calc add <left> <right>` and `calc subtract <left> <right>`. It SHALL accept `calc multiply <left> <right>` and `calc divide <left> <right>`. It SHALL accept `calc deg2rad <value>` and `calc rad2deg <value>`. The convert form SHALL be `calc convert <value> --from <unit> --to <unit>`. Its units SHALL be `celsius`, `fahrenheit`, and `kelvin`.

Each number SHALL use base ten. It SHALL have an optional leading minus sign, one or more digits, and an optional decimal point with one or more digits after it. The tool SHALL reject a leading plus sign, exponent form, `NaN`, and infinity.

When `calc` has no arguments, it SHALL open a loop menu. The menu SHALL offer the four math signs. It SHALL also offer `convert`, `deg2rad`, `rad2deg`, and `quit`. The tool SHALL read the values needed for a choice. It SHALL show the result and then show the menu again. For a bad choice or value, it SHALL write an error to standard error and show the menu again. The `quit` choice SHALL end the loop with status `0`.

#### Scenario: Accept a fixed command

- **WHEN** a person runs `calc add -2.5 4`
- **THEN** the tool accepts the action and both numbers

#### Scenario: Start loop mode

- **WHEN** a person runs `calc` with no arguments
- **THEN** the tool shows the loop menu and waits for a choice

#### Scenario: Use an action in loop mode

- **WHEN** a person selects `+` and enters `2` and `3`
- **THEN** the tool writes `5` and shows the loop menu again

#### Scenario: Reject bad loop input

- **WHEN** a person enters a bad number in loop mode
- **THEN** the tool writes an error to standard error and shows the loop menu again

#### Scenario: Reject exponent form

- **WHEN** a person runs `calc add 1e2 3`
- **THEN** the tool reports a bad number

### Requirement: Add numbers

For the `add` action and the `+` menu choice, the tool SHALL return the sum of the left and right values.

#### Scenario: Add two values

- **WHEN** a person runs `calc add 2 3`
- **THEN** the tool writes `5` as the result

### Requirement: Subtract numbers

For the `subtract` action and the `-` menu choice, the tool SHALL subtract the right value from the left value.

#### Scenario: Subtract the right value

- **WHEN** a person runs `calc subtract 9 4`
- **THEN** the tool writes `5` as the result

### Requirement: Multiply numbers

For the `multiply` action and the `*` menu choice, the tool SHALL return the product of the left and right values.

#### Scenario: Multiply two values

- **WHEN** a person runs `calc multiply 2.5 4`
- **THEN** the tool writes `10` as the result

### Requirement: Divide numbers

For the `divide` action and the `/` menu choice, the tool SHALL divide the left value by the right value. It SHALL reject zero as the right value.

#### Scenario: Divide by a nonzero value

- **WHEN** a person runs `calc divide 9 4`
- **THEN** the tool writes `2.25` as the result

#### Scenario: Reject division by zero

- **WHEN** a person runs `calc divide 9 0`
- **THEN** the tool reports division by zero

### Requirement: Convert angles

For `deg2rad`, the tool SHALL multiply the value by pi. It SHALL then divide that value by 180. For `rad2deg`, the tool SHALL multiply the value by 180. It SHALL then divide that value by pi. The same rules SHALL apply to the matching loop choices.

#### Scenario: Change degrees to radians

- **WHEN** a person runs `calc deg2rad 180`
- **THEN** the tool writes `3.142` as the result

#### Scenario: Change radians to degrees

- **WHEN** a person runs `calc rad2deg 3.141592653589793`
- **THEN** the tool writes `180` as the result

### Requirement: Convert from Celsius

The tool SHALL use `(C * 9 / 5) + 32` to change Celsius to Fahrenheit. It SHALL use `C + 273.15` to change Celsius to Kelvin.

#### Scenario: Change Celsius to Fahrenheit

- **WHEN** a person runs `calc convert 0 --from celsius --to fahrenheit`
- **THEN** the tool writes `32` as the result

#### Scenario: Change Celsius to Kelvin

- **WHEN** a person runs `calc convert 0 --from celsius --to kelvin`
- **THEN** the tool writes `273.15` as the result

### Requirement: Convert from Fahrenheit

The tool SHALL use `(F - 32) * 5 / 9` to change Fahrenheit to Celsius. It SHALL use `(F - 32) * 5 / 9 + 273.15` to change Fahrenheit to Kelvin.

#### Scenario: Change Fahrenheit to Celsius

- **WHEN** a person runs `calc convert 32 --from fahrenheit --to celsius`
- **THEN** the tool writes `0` as the result

#### Scenario: Change Fahrenheit to Kelvin

- **WHEN** a person runs `calc convert 32 --from fahrenheit --to kelvin`
- **THEN** the tool writes `273.15` as the result

### Requirement: Convert from Kelvin

The tool SHALL use `K - 273.15` to change Kelvin to Celsius. It SHALL use `(K - 273.15) * 9 / 5 + 32` to change Kelvin to Fahrenheit.

#### Scenario: Change Kelvin to Celsius

- **WHEN** a person runs `calc convert 273.15 --from kelvin --to celsius`
- **THEN** the tool writes `0` as the result

#### Scenario: Change Kelvin to Fahrenheit

- **WHEN** a person runs `calc convert 273.15 --from kelvin --to fahrenheit`
- **THEN** the tool writes `32` as the result

### Requirement: Reject invalid temperature changes

The tool SHALL reject a change when the source and target units are the same. It SHALL reject an unknown unit. It SHALL reject a source value below absolute zero. This means less than `-273.15` Celsius or less than `-459.67` Fahrenheit. It also means less than `0` Kelvin.

#### Scenario: Reject the same source and target unit

- **WHEN** a person runs `calc convert 10 --from celsius --to celsius`
- **THEN** the tool reports that the units must differ

#### Scenario: Reject an unknown unit

- **WHEN** a person runs `calc convert 10 --from celsius --to rankine`
- **THEN** the tool reports a bad unit

#### Scenario: Reject a value below absolute zero

- **WHEN** a person runs `calc convert -1 --from kelvin --to celsius`
- **THEN** the tool reports that the value is below absolute zero

### Requirement: Format successful results

The tool SHALL round a result to at most three decimal places. When the next digit is five or more, it SHALL round away from zero. It SHALL remove trailing zeros. It SHALL also remove an empty decimal point. For a fixed command, it SHALL write only the result and a newline to standard output. It SHALL write nothing to standard error. It SHALL exit with status `0`.

#### Scenario: Round away from zero

- **WHEN** a calculation has the raw result `-1.2345`
- **THEN** the tool writes `-1.235` and a newline to standard output

#### Scenario: Remove trailing zeros

- **WHEN** a calculation has the raw result `2.500`
- **THEN** the tool writes `2.5` and a newline to standard output

### Requirement: Report errors

For a fixed command, the tool SHALL report an error for an unknown action. It SHALL do the same for a missing or extra input. A repeated option, bad number, or bad unit SHALL also be an error. Division by zero SHALL be an error. A value below absolute zero SHALL be an error. Equal source and target units SHALL be an error. The tool SHALL write only the error and a newline to standard error. It SHALL write nothing to standard output. It SHALL exit with status `2`.

#### Scenario: Reject an unknown action

- **WHEN** a person runs `calc power 2 3`
- **THEN** the tool writes only an error and a newline to standard error and exits with status `2`

#### Scenario: Reject a missing option

- **WHEN** a person runs `calc convert 10 --from celsius`
- **THEN** the tool writes only an error and a newline to standard error and exits with status `2`

#### Scenario: Reject an extra argument

- **WHEN** a person runs `calc add 2 3 4`
- **THEN** the tool writes only an error and a newline to standard error and exits with status `2`

#### Scenario: Reject a repeated option

- **WHEN** a person runs `calc convert 10 --from celsius --from kelvin --to fahrenheit`
- **THEN** the tool writes only an error and a newline to standard error and exits with status `2`
