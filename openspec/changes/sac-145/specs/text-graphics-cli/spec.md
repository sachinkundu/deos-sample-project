## Purpose

This capability lets people draw common text art in a terminal and see clear help for each choice.

## ADDED Requirements

### Requirement: Accept a graphic name

The tool SHALL use the name `textgfx`. The command form SHALL be `textgfx <graphic>`. The graphic name SHALL be `heart`, `star`, `smile`, or `cat`. Each name SHALL match in lower case as shown.

#### Scenario: Ask for a heart

- **WHEN** a person runs `textgfx heart`.
- **THEN** the tool draws the heart graphic.

#### Scenario: Ask for a cat

- **WHEN** a person runs `textgfx cat`.
- **THEN** the tool draws the cat graphic.

### Requirement: Draw the built-in graphics

The tool SHALL draw the chosen graphic with the exact plain text shown below. The art SHALL use only ASCII text. It SHALL keep all shown spaces and line breaks.

The heart graphic SHALL be:

```text
 **   **
**** ****
 ********
  ******
   ****
    **
```

The star graphic SHALL be:

```text
    *
    *
*********
  *****
 *     *
```

The smile graphic SHALL be:

```text
  _____
 /     \
| o   o |
|   ^   |
| \___/ |
 \_____/
```

The cat graphic SHALL be:

```text
 /\_/\
( o.o )
 > ^ <
```

#### Scenario: Draw the exact smile

- **WHEN** a person runs `textgfx smile`.
- **THEN** the tool writes the smile graphic with the shown spaces and line breaks.

#### Scenario: Keep the cat as plain text

- **WHEN** a person runs `textgfx cat`.
- **THEN** each byte of the graphic is ASCII text.

### Requirement: Report a successful result

For a graphic command, the tool SHALL write only the chosen graphic and a last newline to standard output. It SHALL write nothing to standard error. It SHALL exit with status `0`.

#### Scenario: Finish a valid command

- **WHEN** a person runs `textgfx star`.
- **THEN** the tool writes only the star graphic and a last newline to standard output and exits with status `0`.

### Requirement: Show command help

When a person runs `textgfx`, `textgfx help`, or `textgfx --help`, the tool SHALL show help. The help SHALL state the command form. It SHALL list `heart`, `star`, `smile`, and `cat`. It SHALL write the help to standard output, write nothing to standard error, and exit with status `0`.

#### Scenario: Show help with no graphic name

- **WHEN** a person runs `textgfx` with no arguments.
- **THEN** the tool shows the command form and all four graphic names and exits with status `0`.

#### Scenario: Ask for help

- **WHEN** a person runs `textgfx --help`.
- **THEN** the tool shows the command form and all four graphic names and exits with status `0`.

### Requirement: Reject a bad command

The tool SHALL reject an unknown graphic name. It SHALL also reject any extra argument. For either error, it SHALL write a clear error and a last newline to standard error. The error SHALL tell the person to run `textgfx --help`. The tool SHALL write nothing to standard output and exit with status `2`.

#### Scenario: Reject an unknown graphic

- **WHEN** a person runs `textgfx moon`.
- **THEN** the tool writes an unknown graphic error and help hint to standard error and exits with status `2`.

#### Scenario: Reject an extra argument

- **WHEN** a person runs `textgfx heart blue`.
- **THEN** the tool writes an extra argument error and help hint to standard error and exits with status `2`.
