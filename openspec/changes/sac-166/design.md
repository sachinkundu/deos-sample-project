## Context

This is a new, stateless command-line program; there is no existing API or stored data to preserve. The approved behavior is defined by [proposal.md](proposal.md) and [specs/calculator-cli/spec.md](specs/calculator-cli/spec.md). The implementation must keep standard output machine-friendly while providing help and failures on the specified streams.

No repository-specific framework or external dependency is required by the checked inputs. The design therefore uses one executable, the language runtime's standard library, and pure calculation functions. All numeric inputs and results use IEEE 754 binary64 values. This format provides the required decimal, infinity, overflow, and π behavior without introducing a decimal or units library.

## Goals / Non-Goals

**Goals:**

- Give every command one shared route from argument parsing through validation, calculation, formatting, and output.
- Make command names, arity, help text, and examples data-driven so routing and help cannot acquire separate command lists.
- Define validation order, output ownership, numeric representation, and failure behavior precisely enough for deterministic implementation and tests.
- Keep calculations pure and independently testable from process arguments and output streams.

**Non-Goals:**

- Interactive input, expressions, command aliases, localization, configuration, networking, or persistence.
- Arbitrary-precision or exact decimal arithmetic.
- A reusable public library API beyond the internal separation needed to test the CLI.

## Decisions

The design uses one table-driven execution pipeline, explicit outcome values, binary64 calculations, and centralized formatting. The sections below give each decision, rationale, and rejected alternatives.

## Component Diagram

### Decision: Use a table-driven, single-process architecture

The executable contains a process adapter, a command registry/router, shared validation, pure calculators, and an output adapter. There are no services or external calls.

```mermaid
flowchart LR
    Shell[Shell argv] --> Entry[Process adapter]
    Entry --> Router[Command registry and router]
    Router --> Help[Help renderer]
    Router --> Validate[Arity and number validation]
    Validate --> Calculate[Pure arithmetic and conversion functions]
    Calculate --> Format[Result formatter]
    Help --> Emit[Output adapter]
    Format --> Emit
    Router --> Failure[Failure builder]
    Validate --> Failure
    Calculate --> Failure
    Failure --> Emit
    Emit --> Streams[stdout / stderr / exit status]
```

The command registry is the single source of truth for the eight names. Each entry supplies its operand count and names, short goal, example, and calculator function. The main help iterates this registry, and command help renders the selected entry. Adding a command therefore requires one registry entry plus its pure calculator.

Alternatives considered:

- Separate hand-written subcommand branches would duplicate arity checks, failure handling, and help metadata.
- A third-party CLI framework would supply routing and help, but the checked requirements are small and do not justify a dependency or framework-specific parsing behavior.

## Minimal Data Model

### Decision: Model execution as a value and emit once

The core returns exactly one outcome to the process adapter. It does not write directly to either stream. The minimal in-memory model is:

| Type | Fields | Purpose |
| --- | --- | --- |
| `CommandSpec` | `name`, `operandNames`, `goal`, `example`, `calculate(values)` | Registry entry used by routing, help, arity validation, and execution. |
| `Outcome.Success` | finite binary64 `value` | Calculation completed and is ready for formatting. |
| `Outcome.Help` | rendered `text` | Main or command help completed successfully. |
| `Outcome.Failure` | `kind`, short `reason` | Expected input or calculation failure. |

Arguments and outcomes exist only for one invocation; nothing is persisted. `operandNames.length` is the command arity, so arity is not stored twice. Failure kinds are `missing-command`, `unknown-command`, `wrong-arity`, `not-a-number`, `non-finite-input`, `division-by-zero`, and `non-finite-result`.

The process adapter emits only after it receives a complete outcome:

- `Success`: format the value, append one line break, write it to standard output, leave standard error empty, and exit `0`.
- `Help`: write the rendered help to standard output, leave standard error empty, and exit `0`.
- Expected `Failure`: leave standard output empty; write the reason and `Run 'calculator --help' for help.` to standard error; exit `2`.
- Unexpected internal exception: catch it only at the process boundary, leave standard output empty, write a short internal-error reason and the same help hint to standard error, and exit `1`.

Buffering the small result/help/error text until the outcome is known prevents a failed operation from leaking a partial result. Printing from each parser or calculator branch was rejected because it makes the empty-standard-output guarantee difficult to enforce.

## Event Flow

### Decision: Route and validate in a fixed order

The event flow for each invocation is:

```mermaid
flowchart TD
    Start[Receive argv] --> MainHelp{Exactly --help?}
    MainHelp -- yes --> RenderMain[Render main help]
    MainHelp -- no --> HasCommand{Command token present?}
    HasCommand -- no --> Missing[Failure: command is required]
    HasCommand -- yes --> Lookup{Known command?}
    Lookup -- no --> Unknown[Failure: unknown command]
    Lookup -- yes --> CommandHelp{Exactly command --help?}
    CommandHelp -- yes --> RenderCommand[Render command help]
    CommandHelp -- no --> Arity{Exact operand count?}
    Arity -- no --> WrongArity[Failure: command needs N values]
    Arity -- yes --> Parse[Parse every full operand token]
    Parse --> Numeric{All numeric?}
    Numeric -- no --> NotNumber[Failure: token is not a number]
    Numeric -- yes --> FiniteInput{All finite?}
    FiniteInput -- no --> BadInput[Failure: token is not a finite number]
    FiniteInput -- yes --> Zero{Divide by +0 or -0?}
    Zero -- yes --> DivideZero[Failure: division by zero]
    Zero -- no --> Evaluate[Evaluate selected function]
    Evaluate --> FiniteResult{Result finite?}
    FiniteResult -- no --> BadResult[Failure: result is not finite]
    FiniteResult -- yes --> Success[Format and emit success]
```

Help is recognized only in the two exact forms above. Negative operands such as `-2` are positional values, not options. An invocation with extra tokens, including tokens after `--help`, follows the normal unknown-command or wrong-arity path instead of silently ignoring input.

Each numeric parser must consume the full token. Its finite grammar accepts signed decimal whole or fractional forms, with an optional decimal exponent, then converts to binary64. It also recognizes the exact tokens `NaN`, `Infinity`, `+Infinity`, and `-Infinity` so they reach the finite-input check and produce the required “not a finite number” reason. A finite-form token that overflows during conversion follows the same path. All other text, including a numeric prefix followed by junk, is “not a number.” Validation reports the first bad operand from left to right.

Alternatives considered:

- Letting a generic option parser process all tokens risks treating negative numbers as flags.
- Validating numeric tokens before arity produces less useful errors for missing or extra operands.

## Calculation Approach

### Decision: Keep calculations direct and verify every returned value

The registry maps commands to pure binary64 functions:

| Command | Calculation |
| --- | --- |
| `add` | `first + second` |
| `subtract` | `first - second` |
| `multiply` | `first * second` |
| `divide` | `first / second`, after rejecting both signs of zero |
| `celsius-to-fahrenheit` | `(value * (9 / 5)) + 32` |
| `fahrenheit-to-celsius` | `(value - 32) * (5 / 9)` |
| `degrees-to-radians` | `value * (π / 180)` |
| `radians-to-degrees` | `value * (180 / π)` |

The four conversion scale factors `9 / 5`, `5 / 9`, `π / 180`, and `180 / π` are computed once as binary64 constants; π is the runtime's full-precision binary64 constant. Each converter multiplies by its scale factor, with the required subtraction before the Fahrenheit-to-Celsius scale and addition after the Celsius-to-Fahrenheit scale. This grouping is algebraically equivalent to the specified formulas but avoids overflowing a numerator that a later division would bring back into range. The shared postcondition checks `isFinite(result)` after every function, including unit conversions; any genuinely non-finite final value becomes `non-finite-result`. Calculators never format or emit values. Arbitrary-precision intermediates were considered, but combined factors solve the avoidable-overflow problem without adding another number representation or dependency.

Binary64 is preferred over arbitrary-precision decimal because angle conversion already requires an approximate π and the specification explicitly requires detection of non-finite overflow in the chosen format. The trade-off is ordinary floating-point rounding, which tests assess with exact expected text only for exactly representable/simple results and with the specified tolerance for angle results.

## Result Formatting and Help

### Decision: Use one canonical result formatter and generated help

The result formatter emits the runtime's shortest round-trippable decimal representation of the finite binary64 result. It removes an unnecessary trailing `.0` and normalizes negative zero to `0`. It adds no labels, units, spaces, or explanatory text. Scientific notation is allowed when it is the shortest faithful representation. This policy gives simple outputs such as `5`, `3.75`, and `180` while retaining useful precision for π-based results.

The help renderer reads only `CommandSpec` metadata. Main help starts with a `calculator <command> <values>` usage line and lists all eight commands. Command help includes a command-specific usage line, command name, goal, operand names, and its example. Renderers always end help text with one line break.

A fixed decimal-place count was rejected because it would either lose angle precision or add misleading zeros. Duplicated static help blocks were rejected because they can drift from accepted command names and arities.

## Failure Modes

### Decision: Standardize expected failures

Expected failures use stable short reasons:

| Failure mode | Detection | Reason template |
| --- | --- | --- |
| No command | No argument in the command position | `a command is required` |
| Unknown command | Registry lookup misses | `<token> is not a known command` |
| Missing or extra values | Operand count differs from registry arity | `<command> needs one value` or `<command> needs two values` |
| Malformed number | Full-token numeric parse fails | `<token> is not a number` |
| Non-finite input | Parsed value is NaN or positive/negative infinity | `<token> is not a finite number` |
| Division by zero | Divisor compares equal to zero, including `-0` | `division by zero is not allowed` |
| Non-finite result | Shared result check sees NaN or infinity | `result is not finite` |
| Unexpected internal error | Exception reaches process boundary | `an internal error occurred` |

Every expected failure takes the same output path: no standard output, the reason plus help hint on standard error, and status `2`. Error text does not include a stack trace. Internal errors use status `1` so defects remain distinguishable from user mistakes while still meeting the non-zero requirement.

## Risks / Trade-offs

- [Binary64 rounds some decimal calculations] → Use shortest round-trippable output, preserve full internal precision, and use tolerance-based assertions where exact decimal text is not required.
- [Runtime numeric parsers and formatters differ] → Wrap both behind shared parser/formatter functions and test full-token parsing, exponent input, signed zero, large magnitudes, and representative decimal/angle outputs.
- [A naive conversion order can overflow before division rescales the value] → Precompute combined binary64 scale factors, then apply the shared finite-result postcondition to the actual returned value.
- [Command metadata can disagree with a calculator signature] → Give calculators one uniform list-of-values interface and derive arity solely from `operandNames`.
- [Direct writes can violate empty standard output on late failure] → Return an `Outcome` and emit once at the process boundary.

## Migration Plan

There is no data or API migration. Add the new executable and its unit and process-level tests, then make the build/install path expose it as `calculator`. Before release, exercise every command, both help paths, and each failure category against captured standard output, standard error, and status. Rollback consists of removing the new executable from the build/install output; no state restoration is needed.
