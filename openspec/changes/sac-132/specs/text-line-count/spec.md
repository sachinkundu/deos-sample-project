## Purpose

This capability gives people a clear line count for a text file from the command line.

## ADDED Requirements

### Requirement: Report the line count

The tool SHALL accept a text file and write its line count to standard output. Each newline ends a line. Any text after the last newline is also a line.

#### Scenario: Count a normal file

- **WHEN** a person gives the tool a text file with three lines
- **THEN** the tool writes `3` to standard output

#### Scenario: Count an empty file

- **WHEN** a person gives the tool an empty text file
- **THEN** the tool writes `0` to standard output
