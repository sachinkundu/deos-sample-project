## Purpose

People can change heat values between Celsius and Fahrenheit from a terminal.

## ADDED Requirements

### Requirement: Offer two clear conversion modes

The tool MUST use this form: `temperature <mode> <value>`. It MUST have the modes `celsius-to-fahrenheit` and `fahrenheit-to-celsius`. Each mode MUST take one value.

#### Scenario: Choose Celsius to Fahrenheit

- **WHEN** a person runs `temperature celsius-to-fahrenheit 0`.
- **THEN** the tool uses the Celsius to Fahrenheit mode.

#### Scenario: Choose Fahrenheit to Celsius

- **WHEN** a person runs `temperature fahrenheit-to-celsius 32`.
- **THEN** the tool uses the Fahrenheit to Celsius mode.

### Requirement: Convert finite temperatures

The tool MUST accept whole and decimal values. A value MAY be above or below zero. The tool MUST use `(C × 9 / 5) + 32` to change Celsius to Fahrenheit. It MUST use `(F - 32) × 5 / 9` to change Fahrenheit to Celsius. Each result MUST be within `0.000000001` of the formula result.

#### Scenario: Convert the Celsius freezing point

- **WHEN** a person runs `temperature celsius-to-fahrenheit 0`.
- **THEN** the tool prints `32`.

#### Scenario: Convert the Celsius boiling point

- **WHEN** a person runs `temperature celsius-to-fahrenheit 100`.
- **THEN** the tool prints `212`.

#### Scenario: Convert the Fahrenheit freezing point

- **WHEN** a person runs `temperature fahrenheit-to-celsius 32`.
- **THEN** the tool prints `0`.

#### Scenario: Convert a decimal value

- **WHEN** a person runs `temperature fahrenheit-to-celsius 98.6`.
- **THEN** the tool prints a value within `0.000000001` of `37`.

#### Scenario: Convert the shared negative point

- **WHEN** a person runs `temperature celsius-to-fahrenheit -40`.
- **THEN** the tool prints `-40`.

### Requirement: Keep successful output simple

When the command works, the tool MUST write only the new number and a line break to standard output. It MUST write nothing to standard error. It MUST end with status zero.

#### Scenario: Return a successful conversion

- **WHEN** a person runs `temperature celsius-to-fahrenheit 10`.
- **THEN** standard output has only `50` and a line break, standard error is empty, and the tool ends with status zero.

### Requirement: Report bad input clearly

The tool MUST reject a missing mode or a mode it does not know. It MUST reject a mode with too few or too many values. It MUST reject a value that is not a number. It MUST reject NaN and plus or minus infinity. It MUST reject a result that is not finite. For each failure, it MUST leave standard output empty. It MUST write a short cause to standard error and end with a non-zero status.

#### Scenario: Reject a missing mode

- **WHEN** a person runs `temperature`.
- **THEN** the tool fails and says that a mode is needed.

#### Scenario: Reject an unknown mode

- **WHEN** a person runs `temperature kelvin-to-celsius 273.15`.
- **THEN** the tool fails and says that `kelvin-to-celsius` is not a known mode.

#### Scenario: Reject a missing value

- **WHEN** a person runs `temperature celsius-to-fahrenheit`.
- **THEN** the tool fails and says that this mode needs one value.

#### Scenario: Reject an extra value

- **WHEN** a person runs `temperature fahrenheit-to-celsius 32 40`.
- **THEN** the tool fails and says that this mode needs one value.

#### Scenario: Reject text in place of a number

- **WHEN** a person runs `temperature celsius-to-fahrenheit cold`.
- **THEN** the tool fails and says that `cold` is not a number.

#### Scenario: Reject a value that is not finite

- **WHEN** a person runs either mode with `NaN`, `Infinity`, or `-Infinity`.
- **THEN** the tool fails and says that the value is not finite.

#### Scenario: Reject a result that is not finite

- **WHEN** a finite input would make a result that is not finite.
- **THEN** the tool fails and says that the result is not finite.

### Requirement: Explain how to run and test the tool

The user guide MUST show how to start the tool. It MUST show how to pick either mode. It MUST give one example for each mode. It MUST state where the tool writes a good result and a failed error. The project MUST have automated tests for common values and the bad input cases in this spec.

#### Scenario: Follow the run guide

- **WHEN** a person reads the run guide.
- **THEN** they can find the command form, both mode names, an example for each mode, and the output and error rules.

#### Scenario: Run the automated tests

- **WHEN** the automated tests run.
- **THEN** they check common values in both modes and each bad input case in this spec.
