## Why

People need a small place to keep text they use again. This app is also a canary for the full flow with real D1 and R2 data. Cloud data lets saved snippets stay after a refresh or a move to a new browser.

## What Changes

- Use one desktop screen for the app.
- Let people save a title and plain text, see saved titles, pick one to read, and delete it. Keep other snippets when one is deleted, and keep that result after a refresh or in a new browser. Show this flow in the review proof.
- Reject blank titles and blank text. Show a clear message for bad input or a failed load, save, read, or delete. Include one such message in the review proof.
- Send save, list, read, and delete requests through a Worker API. Use D1 for the snippet list and R2 for each text body. Load the same saved data after a refresh or in a new browser, and show matching D1 and R2 results in the review proof.
- Publish the app to the supported temporary Worker environment for review. Capture real browser views and direct proof from both cloud stores, then remove the test resources while keeping the proof in the pull request.

## Capabilities

### New Capabilities

- `text-snippet-shelf`: Save, list, read, and delete plain text snippets on one desktop screen, with D1 and R2 as the saved cloud stores.

### Modified Capabilities

None.

## Impact

This adds a desktop web page, a Worker API, a D1 table, R2 objects, app checks, and review proof. The test uses a short-lived cloud environment. Login, sharing tools, search, rich text, file uploads, phone layouts, and a live release are out of scope.
