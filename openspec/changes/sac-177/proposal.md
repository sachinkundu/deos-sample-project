## Why

We need a small notes app to test the new review flow. The plan must be easy to check before any design or code work starts.

## What Changes

- Add a web page where a person can add, read, edit, and delete short notes.
- Save each note so it is still there after the page reloads.
- Show clear errors when a note action fails, and keep work that was not saved.
- Cover the main note actions, empty data, invalid text, saved data, and service errors with tests.
- Save the review findings, source links, author replies, and author and reviewer logs as review evidence.
- Make the findings, sources, and replies easy to read, and make each saved log open from the portal.

## Capabilities

### New Capabilities

- `notes-app`: Let a person manage short notes in a web app, save them, and recover from clear errors.

### Modified Capabilities

None.

## Impact

The change will add a browser page, a notes API, saved note data, tests, and review evidence. Cloudflare Workers can serve static files and API routes in one app (https://developers.cloudflare.com/workers/static-assets/). Note data will use D1, which is a serverless SQL database that a Worker can reach through a binding (https://developers.cloudflare.com/d1/get-started/). The portal will link to each saved author and reviewer log.
