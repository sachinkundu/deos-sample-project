## Purpose

This capability lets people draw common text art in a terminal with short commands. It also shows the names they can use and gives clear help.

## ADDED Requirements

### Requirement: Draw a named graphic

The tool SHALL use the name `textgfx`. The form `textgfx <graphic>` SHALL draw one built-in graphic. The graphic names SHALL be `heart`, `smile`, and `cat`. A valid draw command SHALL write only the graphic and a final newline to standard output. It SHALL write nothing to standard error and SHALL exit with status `0`.

#### Scenario: Draw a heart

- **WHEN** a person runs `textgfx heart`.
- **THEN** the tool writes the text below to standard output and adds one final newline.

```text
 **   **
**** ****
*********
 *******
  *****
   ***
    *
```

#### Scenario: Draw a smile

- **WHEN** a person runs `textgfx smile`.
- **THEN** the tool writes the text below to standard output and adds one final newline.

```text
  _____
 /     \
|  o o  |
|   ^   |
|  \_/  |
 \_____/
```

#### Scenario: Draw a cat

- **WHEN** a person runs `textgfx cat`.
- **THEN** the tool writes the text below to standard output and adds one final newline.

```text
 /\_/\
( o.o )
 > ^ <
```

### Requirement: List graphic names

The `textgfx list` command SHALL show each built-in graphic name once. It SHALL sort the names as shown below. It SHALL write the list and a final newline to standard output. It SHALL write nothing to standard error and SHALL exit with status `0`.

#### Scenario: List all graphics

- **WHEN** a person runs `textgfx list`.
- **THEN** the tool writes the list below to standard output and adds one final newline.

```text
cat
heart
smile
```

### Requirement: Show help

The tool SHALL show help for `textgfx --help` and for `textgfx` with no arguments. The help SHALL show the draw form, the list command, the help option, and all built-in graphic names. It SHALL write the help and a final newline to standard output. It SHALL write nothing to standard error and SHALL exit with status `0`.

#### Scenario: Ask for help

- **WHEN** a person runs `textgfx --help`.
- **THEN** the tool writes the help below to standard output and adds one final newline.

```text
Usage: textgfx <graphic>
       textgfx list
       textgfx --help

Graphics:
  cat
  heart
  smile
```

#### Scenario: Run with no arguments

- **WHEN** a person runs `textgfx` with no arguments.
- **THEN** the tool writes the same help as `textgfx --help` to standard output and exits with status `0`.

### Requirement: Report invalid input

The tool SHALL reject an unknown graphic or any extra argument. It SHALL write only one clear error and a final newline to standard error. It SHALL write nothing to standard output and SHALL exit with status `2`.

#### Scenario: Reject an unknown graphic

- **WHEN** a person runs `textgfx star`.
- **THEN** the tool writes `Error: unknown graphic 'star'. Run 'textgfx list' to see valid names.` and a final newline to standard error and exits with status `2`.

#### Scenario: Reject an extra argument

- **WHEN** a person runs `textgfx heart blue`.
- **THEN** the tool writes `Error: expected one graphic name.` and a final newline to standard error and exits with status `2`.
