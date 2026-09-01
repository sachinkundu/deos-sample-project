## Purpose

This capability lets a person search the web and get a short summary of useful articles from a terminal.

## ADDED Requirements

### Requirement: Accept a search term

The tool SHALL accept a search term from a person on the command line.

#### Scenario: Accept a search term

- **WHEN** a person gives the tool a search term.
- **THEN** the tool accepts that term.

#### Scenario: Reject a missing search term

- **WHEN** a person gives the tool no search term.
- **THEN** the tool reports that a search term is required.

### Requirement: Search Google and read useful articles

The tool SHALL search Google for the search term and read useful articles from the results.

#### Scenario: Find useful articles

- **WHEN** Google returns article links for the search term.
- **THEN** the tool reads useful articles from the results.

#### Scenario: Find no useful articles

- **WHEN** the tool cannot find a useful article in the Google results.
- **THEN** the tool reports that it cannot make a summary.

### Requirement: Make a grounded summary

The tool SHALL use a language model to write a clear summary based on the useful articles.

#### Scenario: Sum up useful articles

- **WHEN** the tool has useful articles for the search term.
- **THEN** it uses a language model to write a clear summary based on those articles.

### Requirement: Return two short paragraphs

The tool SHALL return the clear summary as two short paragraphs.

#### Scenario: Return a successful summary

- **WHEN** the tool makes a summary from useful articles.
- **THEN** it returns the summary as two short paragraphs.

### Requirement: Report errors

The tool SHALL show a clear error when the search term is missing or the summary cannot be made.

#### Scenario: Report a missing search term

- **WHEN** the search term is missing.
- **THEN** the tool shows a clear error.

#### Scenario: Report a summary failure

- **WHEN** the summary cannot be made.
- **THEN** the tool shows a clear error.
