## Why

People need a fast way to make common text art in a terminal. A small tool can draw it for them and show which kinds are ready to use.

## What Changes

- Add a command-line tool with the form `textgfx <graphic>`. Accept only the lower-case names `heart`, `star`, `smile`, and `cat`.
- Draw each named graphic with the fixed ASCII design in the spec. Keep every shown space and line break.
- For a valid graphic command, write only the graphic and a last newline to standard output. Write no error, and exit with status `0`.
- Show help for `textgfx`, `textgfx help`, and `textgfx --help`. Write the command form and all four names to standard output, write no error, and exit with status `0`.
- Reject an unknown name or an extra argument. Write a clear error, a help hint, and a last newline only to standard error, and exit with status `2`.

## Capabilities

### New Capabilities

- `text-graphics-cli`: Draws the four text graphics and sets the help, output, and error rules.

### Modified Capabilities

None.

## Impact

The project will gain one small command-line tool. It will write plain text to standard output or write an error to standard error.
