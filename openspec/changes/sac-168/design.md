## Context

See `proposal.md` for motivation and `specs/temperature-cli/spec.md` for the command contract. This is a new, stateless command: it receives arguments and writes one result or one error before exiting. There is no existing API or stored data to migrate. The main design constraints are to preserve the value of every accepted decimal exactly through conversion, meet the absolute error tolerance without an undocumented input range, and keep validation and stream selection in a deterministic order.

## Goals / Non-Goals

**Goals:**

- Give the command a small boundary layer with explicit validation, safe error rendering, and exit behavior.
- Keep both conversion formulas in a side-effect-free component that can be tested independently.
- Use an exact internal representation for accepted decimal input and a bounded-error output algorithm.
- Keep documentation and automated tests aligned with the public command boundary.

**Non-Goals:**

- Adding interactive prompts, configuration, localization, or conversion scales other than Celsius and Fahrenheit.
- Persisting conversions or introducing a service, API, or shared storage model.
- Creating a general units-conversion framework for this two-mode command.

## Component Diagram

```text
Shell / process launcher
          |
          v
+------------------------+       validation failure       +----------------+
| CLI controller         |------------------------------->| Safe error     |
| - validation order     |                                | renderer       |
| - exit status          |                                +-------+--------+
| - stream ownership     |                                        |
+-----------+------------+                                        v
            |                                                   stderr
            | validated mode and exact decimal
            v
+------------------------+       non-finite result signal
| Exact conversion core  |-------------------------------> Safe error renderer
| - arbitrary integers   |
| - rational formulas    |
+-----------+------------+
            |
            | finite rational result
            v
+------------------------+
| Decimal formatter      |-------------------------------> stdout
| - integer rounding     |                                  + exit 0
+------------------------+

Automated tests exercise the exact core and the process boundary.
The run guide documents the same process boundary.
```

The CLI controller is the only component that reads process arguments, writes to process streams, or selects an exit status. The conversion core accepts an already validated exact decimal and returns a rational result without I/O. The formatter uses integer operations to turn that rational into one bounded-error decimal line. This separation lets formula and precision tests stay independent from shell behavior while command-level tests verify exact stdout, stderr, and status behavior.

## Event Flow

1. The process launcher passes all tokens after `temperature` to the CLI controller.
2. The controller requires a first token. If absent, it reports a missing mode and stops.
3. The controller maps the first token to one of the two exact mode names. An unmatched token is reported as an unknown mode before value validation.
4. For a recognized mode, the controller requires exactly one remaining token. Too few or too many values use the same mode-specific arity error.
5. The controller first recognizes `NaN`, `Infinity`, `+Infinity`, and `-Infinity` as non-finite values. Otherwise, it requires the complete value token to match `[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)`; a partial match is not accepted.
6. The decimal parser removes the sign and decimal point to create a signed arbitrary-precision integer coefficient `N`, plus a non-negative scale `S` equal to the number of fractional digits. The exact input value is `N / 10^S`; parsing never passes through binary floating point.
7. The core constructs the exact rational result. Celsius to Fahrenheit produces `(9N + 160 * 10^S) / (5 * 10^S)`. Fahrenheit to Celsius produces `5 * (N - 32 * 10^S) / (9 * 10^S)`. The denominator is always positive.
8. The controller accepts only the core's finite-result variant. A non-finite-result signal is routed to the dedicated error path before formatting or writing standard output. The exact production core cannot overflow to infinity, but keeping this boundary makes the required failure behavior explicit and testable.
9. The formatter rounds the exact rational to 10 fractional decimal places using arbitrary-precision integer division: scale the absolute numerator by `10^10`, divide by the denominator, and round to nearest with ties away from zero based on the remainder. It then inserts the decimal point, trims trailing fractional zeros, and normalizes rounded negative zero to `0`. The maximum absolute rounding error is `0.00000000005`, below the required `0.000000001`.
10. Only after all checks and formatting succeed, the controller writes the formatted number plus one line break to standard output and exits with status `0`. Standard error remains untouched.

Every expected failure short-circuits the flow before success formatting. The controller writes one short error line to standard error, writes nothing to standard output, and exits with status `2`, consistently treating these as command-use or numeric-domain errors.

## Minimal Data Model

All data is process-local and immutable after validation; nothing is persisted.

| Type | Fields | Invariant |
|---|---|---|
| `Mode` | `celsius-to-fahrenheit` or `fahrenheit-to-celsius` | Exactly the two public mode tokens are representable. |
| `ExactDecimal` | `coefficient: integer`, `scale: non-negative integer` | The coefficient is arbitrary precision and the value is exactly `coefficient / 10^scale`. |
| `ConversionRequest` | `mode: Mode`, `value: ExactDecimal` | The mode is known and the complete input token has passed decimal and finite-value validation. |
| `RationalResult` | `numerator: integer`, `denominator: positive integer` | Both integers are arbitrary precision, so every production result is finite and exact. |
| `ConversionOutcome` | finite `RationalResult` or non-finite-result failure | The controller must branch on the variant before invoking the formatter. |
| `CliError` | `kind`, optional raw offending token | The renderer, never the parser or core, converts an untrusted token to safe display text. |

The data model does not contain a binary floating-point value. Fraction reduction is optional because the formatter operates correctly on an unreduced numerator and denominator; avoiding mandatory greatest-common-divisor work keeps processing linear apart from the required big-integer division.

## Decisions

### Use a thin controller around a pure exact conversion core

The controller performs ordered validation and owns all process effects; the core constructs one of two rational formulas. This makes formula correctness independent from shell behavior and allows process tests to focus on the public contract.

**Alternative considered:** Put parsing, formulas, output, and exits in one command function. That is shorter initially, but couples arithmetic tests to process streams and makes partial-output mistakes easier.

### Parse decimal text into an exact coefficient and scale

The parser consumes the whole token under the explicit grammar in the event flow. Arbitrary-precision integers preserve all digits supplied by the user, including integers beyond a binary floating-point type's exact range. The formulas then remain exact rational operations for every accepted finite decimal.

**Alternative considered:** Parse into the language's ordinary binary floating-point type. Even round-trip-safe output would preserve only the already-rounded binary input; for large decimals, the absolute error could exceed `0.000000001`.

### Render rational results with 10-place integer rounding

Ten fractional places with round-to-nearest gives a worst-case absolute error of `5 * 10^-11`. Trimming zeros keeps exact common results as `32`, `212`, `0`, `50`, and `-40` without weakening the bound. Integer quotient and remainder operations make the bound independent of result magnitude.

**Alternative considered:** Fixed binary floating-point formatting or a fixed nine-place decimal. Binary formatting inherits input error, while nine-place rounding has less margin at the required boundary.

### Keep untrusted tokens on one safe error line

When an error needs to identify a mode or value, the renderer quotes at most the first 64 Unicode code points. It leaves only printable ASCII from U+0020 through U+007E unchanged except quote and backslash, which are escaped. Every other code point is emitted as an ASCII `\u{HEX}` escape, and a static `...` suffix marks truncation. Therefore newlines, carriage returns, terminal escapes, Unicode separators, and other control characters cannot create a second line or terminal control sequence. Errors that do not need a token omit it.

**Alternative considered:** Interpolate raw argument text. A crafted token could inject line breaks or terminal escape sequences and violate the concise single-line error contract.

### Buffer the success line until validation is complete

The command constructs the complete success line in memory and writes it only after result validation. Error paths never reuse the success stream. All specified failures use exit status `2`; success alone uses `0`.

**Alternative considered:** Print intermediate or converted values as soon as they are available. A later failure could leave partial standard output, violating the command contract.

### Test both the pure core and the spawned command

Core tests use exact fractions to cover both formulas, very large coefficients beyond binary exact-integer ranges, long fractional inputs, rounding carries, ties, and finite-result handling. Process tests independently capture standard output, standard error, and exit status for every bad-input scenario, both modes, signed and decimal values, exact common values, and tolerance-based non-integral results. An injected non-finite outcome tests the controller's otherwise unreachable defensive branch. Error tests include newline, escape, non-ASCII, and overlength tokens. The run-guide examples are also process tests so names and stream behavior cannot drift unnoticed.

**Alternative considered:** Test only the conversion function. That would not verify validation precedence, safe error rendering, stream isolation, line endings, formatting, or exit statuses.

## Failure Modes

| Failure | Detection and precedence | Required behavior |
|---|---|---|
| Missing mode | No argument tokens; checked first | Standard error says a mode is required; stdout stays empty; exit `2`. |
| Unknown mode | First token is not either exact mode; checked before arity | Standard error identifies the safely rendered mode; stdout stays empty; exit `2`. |
| Wrong value count | Known mode has zero or more than one value token | Standard error says that mode requires exactly one value; stdout stays empty; exit `2`. |
| Not a number | Complete token fails the decimal grammar and is not a recognized non-finite token | Standard error identifies the safely rendered token as not a number; stdout stays empty; exit `2`. |
| Non-finite input | Token is `NaN` or positive or negative infinity | Standard error says the value is not finite; stdout stays empty; exit `2`. |
| Non-finite result | Core returns the non-finite-result variant | Standard error says the result is not finite; stdout stays empty; exit `2`. |
| Resource or unexpected internal failure | Entrypoint safety boundary catches a failure before a success write | Standard error gives a short static failure without raw exception text; stdout stays empty when no write began; exit non-zero. Stream-device failures themselves cannot guarantee a diagnostic on an unavailable stream. |

Fixed precedence makes multi-error invocations deterministic: mode existence, known mode, arity, special non-finite token, decimal syntax, conversion outcome, then formatting. Every error renderer returns exactly one newline-terminated line and never includes a stack trace or unsanitized argument or exception text.

## Risks / Trade-offs

- [Arbitrary-precision work grows with the input token] → Use only multiplication by small constants, powers of ten, and one required division; rely on the process launcher's argument-size limit rather than add an unspecified numeric range.
- [Repeating rational results need approximation for display] → Round the exact fraction to 10 decimal places with a proven maximum absolute error of `0.00000000005`.
- [Formatter carry and negative-zero cases are easy to mishandle] → Base rounding on quotient and remainder, then test ties, carry into the integer part, signed near-zero results, and exact integers.
- [Raw arguments can contain terminal controls] → Route every displayed token through the bounded printable-ASCII renderer and keep generic internal errors static.
- [A process stream can fail during its final write] → Keep each response to one short buffered line and return non-zero when the runtime reports the write failure; no program can guarantee output on a failed device.

## Migration Plan

This is an additive command with no data migration. Release the command entrypoint together with its exact conversion core, process tests, and run guide so no undocumented or untested interface is exposed. Validate common conversions, large and high-precision decimals, and all specified error paths before publishing the executable. Rollback consists of removing the new command and its matching guide and tests; there is no state to transform or recover.
