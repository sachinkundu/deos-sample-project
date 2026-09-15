## Purpose

People can do basic math in a web page that works well on phone and desktop screens. They can use buttons or a keyboard.

## ADDED Requirements

### Requirement: Enter numbers with buttons or a keyboard

The page MUST show buttons for the digits `0` through `9` and a decimal point. It MUST also accept those same values from a keyboard. The display MUST show the current number as it is entered. Each number MUST have no more than one decimal point.

#### Scenario: Enter a decimal with buttons

- **WHEN** a person selects `1`, `.`, and `5` with the on-screen buttons.
- **THEN** the display shows `1.5`.

#### Scenario: Enter a decimal with the keyboard

- **WHEN** a person types `2.25` on a keyboard.
- **THEN** the display shows `2.25`.

#### Scenario: Ignore a second decimal point

- **WHEN** the current number is `1.5` and the person enters another decimal point.
- **THEN** the current number stays `1.5`.

### Requirement: Calculate four basic operations

The page MUST let a person add, subtract, multiply, or divide with a button. The matching keys MUST be `+`, `-`, `*`, and `/`. The page MUST calculate when the person selects the equals button or presses `Enter` or `=`. The display MUST show the right result. A basic decimal sum MUST not show extra digits caused by binary math.

#### Scenario: Add decimal numbers with buttons

- **WHEN** a person enters `1.5 + 2.25` and selects the equals button.
- **THEN** the display shows `3.75`.

#### Scenario: Subtract to a negative result

- **WHEN** a person enters `7 - 10` and selects the equals button.
- **THEN** the display shows `-3`.

#### Scenario: Multiply with the keyboard

- **WHEN** a person types `2.5 * 4` and presses `Enter`.
- **THEN** the display shows `10`.

#### Scenario: Divide decimal numbers

- **WHEN** a person enters `7.5 / 2.5` and calculates the result.
- **THEN** the display shows `3`.

#### Scenario: Hide a binary math artifact

- **WHEN** a person calculates `0.1 + 0.2`.
- **THEN** the display shows `0.3`.

### Requirement: Clear all calculator state

The page MUST have a clear button. The `Escape` key MUST run the same action. Clear MUST remove any entered value, selected operation, result, or error and return the display to `0`.

#### Scenario: Clear a calculation with the button

- **WHEN** a person selects clear after entering part or all of a calculation.
- **THEN** the display shows `0` and no prior value or operation affects the next calculation.

#### Scenario: Clear a calculation with the keyboard

- **WHEN** a person presses `Escape` after a result or error appears.
- **THEN** the display shows `0` and the next calculation starts with no prior state.

### Requirement: Report division by zero and allow recovery

The page MUST NOT show a numeric result for division by zero. It MUST show the message `Cannot divide by zero`. The person MUST be able to use clear or `Escape` to remove the error and start a new calculation.

#### Scenario: Divide by zero

- **WHEN** a person calculates `8 / 0`.
- **THEN** the display shows `Cannot divide by zero` and does not show a numeric result.

#### Scenario: Recover from division by zero

- **GIVEN** the display shows `Cannot divide by zero`.
- **WHEN** the person selects clear and then calculates `8 / 2`.
- **THEN** the display shows `4`.

### Requirement: Fit phone and desktop screens

The page MUST keep the full display and all controls visible at viewport widths from 320 CSS pixels through desktop sizes. It MUST not need horizontal page scrolling at those widths. Each button MUST be at least 44 by 44 CSS pixels. Text in the display and controls MUST be at least 16 CSS pixels tall. There MUST be at least 8 CSS pixels of open space between controls. The 320 CSS pixel check follows the W3C reflow rule: https://www.w3.org/TR/WCAG22/#reflow

#### Scenario: Use the calculator at phone width

- **WHEN** the page is shown in a viewport that is 320 CSS pixels wide.
- **THEN** the display and every control fit without overlap, clipping, or horizontal page scrolling, and each button and gap meets its set size.

#### Scenario: Use the calculator at desktop width

- **WHEN** the page is shown in a desktop viewport.
- **THEN** the calculator stays clear, centered, and ready for button or keyboard input, with text and buttons at their set sizes.

### Requirement: Provide final review proof

The final review MUST link to a working preview of the calculator. It MUST include a short recording or image sequence that shows a full calculation made with buttons. The proof MUST show each button as the person selects it. It MUST also show a full calculation made with keys. A visible key overlay or event trace MUST show each pressed key. The proof MUST show the clear action and the division-by-zero error. Tests MUST cover all four math actions, decimal entry, button and keyboard input, clear, and recovery from division by zero.

#### Scenario: Review the working calculator

- **WHEN** a reviewer opens the preview link and checks the visual proof.
- **THEN** the preview works and the proof shows each button action, each key press, the right results, clear, and the error case.

#### Scenario: Verify both input methods

- **WHEN** a reviewer watches the recording or views the image sequence.
- **THEN** each button selection is visible and a key overlay or event trace shows each key press.

#### Scenario: Run the calculator checks

- **WHEN** the automated checks run.
- **THEN** they cover all four operations, both input methods, decimal entry, clear, and division-by-zero recovery.
