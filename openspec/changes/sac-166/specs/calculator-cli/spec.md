## Purpose

People can use this tool for basic math and common unit changes from a terminal. It also gives clear help and errors.

## ADDED Requirements

### Requirement: Use a stable command form

The tool MUST run as `calculator <command> <values>`. It MUST provide `add`, `subtract`, `multiply`, `divide`, `celsius-to-fahrenheit`, `fahrenheit-to-celsius`, `degrees-to-radians`, and `radians-to-degrees`. Math commands MUST take two values. Unit commands MUST take one value. For a valid math or unit command, the tool MUST write only the result and a line break to standard output. It MUST end with a zero status.

#### Scenario: Run a math command

- **WHEN** a person runs `calculator add 2 3`
- **THEN** the tool prints `5`

#### Scenario: Run a unit command

- **WHEN** a person runs `calculator celsius-to-fahrenheit 0`
- **THEN** the tool prints `32`

### Requirement: Calculate with whole numbers and decimals

Math commands MUST work with whole numbers and decimal numbers. Values MAY be positive or negative. The tool MUST add, subtract, multiply, or divide the first value by the second value.

#### Scenario: Add decimal numbers

- **WHEN** a person runs `calculator add 1.5 2.25`
- **THEN** the tool prints `3.75`

#### Scenario: Subtract a negative number

- **WHEN** a person runs `calculator subtract 5 -2`
- **THEN** the tool prints `7`

#### Scenario: Multiply decimal numbers

- **WHEN** a person runs `calculator multiply 2.5 4`
- **THEN** the tool prints `10`

#### Scenario: Divide numbers

- **WHEN** a person runs `calculator divide 7.5 2.5`
- **THEN** the tool prints `3`

### Requirement: Convert temperatures in both ways

The tool MUST use `(C × 9 / 5) + 32` to change Celsius to Fahrenheit. It MUST use `(F - 32) × 5 / 9` to change Fahrenheit to Celsius. These commands MUST work with whole numbers and decimals. Values MAY be positive or negative.

#### Scenario: Change Celsius to Fahrenheit

- **WHEN** a person runs `calculator celsius-to-fahrenheit 100`
- **THEN** the tool prints `212`

#### Scenario: Change Fahrenheit to Celsius

- **WHEN** a person runs `calculator fahrenheit-to-celsius 32`
- **THEN** the tool prints `0`

### Requirement: Convert angles in both ways

The tool MUST use `degrees × π / 180` to change degrees to radians. It MUST use `radians × 180 / π` to change radians to degrees. These commands MUST work with whole numbers and decimals. Values MAY be positive or negative.

#### Scenario: Change degrees to radians

- **WHEN** a person runs `calculator degrees-to-radians 180`
- **THEN** the tool prints a result within `0.000000000001` of π

#### Scenario: Change radians to degrees

- **WHEN** a person runs `calculator radians-to-degrees 3.141592653589793`
- **THEN** the tool prints a result within `0.000000000001` of `180`

### Requirement: Show useful help

The tool MUST show a short use line and all command names when run with `--help`. Each command MUST accept `--help`. Its help MUST show its name, goal, value names, and one example. Help MUST go to standard output and end with a success status.

#### Scenario: Show main help

- **WHEN** a person runs `calculator --help`
- **THEN** the command succeeds and shows how to select each command

#### Scenario: Show help for one command

- **WHEN** a person runs `calculator divide --help`
- **THEN** the command succeeds and shows the two value names and a divide example

### Requirement: Report bad input clearly

The tool MUST reject an unknown command. It MUST reject too few or too many values. Each input value MUST be a finite number in the chosen number format. The tool MUST reject NaN, positive infinity, and negative infinity. It MUST also reject division by zero. Each result MUST be finite in the chosen number format. The tool MUST reject an operation or unit change if its result is not finite, such as an operation that overflows that format. For each failure, it MUST write a short reason and a hint to run `calculator --help` to standard error. It MUST give a non-zero status. It MUST NOT print a result.

#### Scenario: Reject an unknown command

- **WHEN** a person runs `calculator power 2 3`
- **THEN** the tool fails and says that `power` is not a known command

#### Scenario: Reject a missing value

- **WHEN** a person runs `calculator add 2`
- **THEN** the tool fails and says that `add` needs two values

#### Scenario: Reject an extra value

- **WHEN** a person runs `calculator add 2 3 4`
- **THEN** the tool fails and says that `add` needs two values

#### Scenario: Reject a value that is not a number

- **WHEN** a person runs `calculator multiply two 3`
- **THEN** the tool fails and says that `two` is not a number

#### Scenario: Reject NaN

- **WHEN** a person runs `calculator add NaN 3`
- **THEN** the tool fails and says that `NaN` is not a finite number

#### Scenario: Reject infinity

- **WHEN** a person runs `calculator celsius-to-fahrenheit Infinity`
- **THEN** the tool fails and says that `Infinity` is not a finite number

#### Scenario: Reject negative infinity

- **WHEN** a person runs `calculator radians-to-degrees -Infinity`
- **THEN** the tool fails and says that `-Infinity` is not a finite number

#### Scenario: Reject division by zero

- **WHEN** a person runs `calculator divide 4 0`
- **THEN** the tool fails and says that division by zero is not allowed

#### Scenario: Reject a result that is not finite

- **WHEN** a person multiplies two finite values whose product overflows the chosen number format
- **THEN** the tool fails and says that the result is not finite

#### Scenario: Reject a unit result that is not finite

- **WHEN** a person changes a finite Celsius value whose Fahrenheit result overflows the chosen number format
- **THEN** standard output is empty, standard error gives the short reason that the result is not finite and a hint to run `calculator --help`, and the tool ends with a non-zero status
