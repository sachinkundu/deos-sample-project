## Why

People need a quick way to track what to pack for a trip. This small desktop app also gives the team a clear test of the full flow from an idea to a pull request.

## What Changes

- Add a desktop web app for a packing list.
- Let people add items that start as not packed, rename them with no change to packed state, and delete them.
- Let people mark an item as packed or not packed.
- Add a filter that shows all items or only items left to pack.
- Save the list and each packed state in the browser so they stay after a page refresh.
- Share a working preview and screenshots that show the app's real add, edit, pack, filter, delete, and refresh behavior.

## Capabilities

### New Capabilities

- `packing-list-web-app`: Manage and save a packing list in a desktop web app, with packed state and a filter for items left to pack.

### Modified Capabilities

None.

## Impact

This adds a desktop web page, saved browser data, app checks, a live preview, and screenshots for review. Phone and mobile layouts are out of scope. It does not change an existing API or shared server data.
