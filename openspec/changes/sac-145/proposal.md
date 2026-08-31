## Why

People need a fast way to make common text art in a terminal. A small tool can show ready-made art with a short command and save the need to draw it by hand.

## What Changes

- Add a `textgfx` tool that can draw a heart, smile, or cat.
- Add a list command that shows all graphic names.
- Show clear help when a person asks for it or gives no command.
- Send clear errors when a graphic name or command form is not valid.

## Capabilities

### New Capabilities

- `text-graphics-cli`: Covers the command forms, the built-in text art, help, lists, and errors.

### Modified Capabilities

None.

## Impact

The project will gain a small command-line tool named `textgfx`. It will write text art and help to standard output. It will write errors to standard error.
