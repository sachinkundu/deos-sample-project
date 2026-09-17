## Why

People need a simple way to keep track of books they plan to read. This small desktop app also gives the team a clear test of the full flow from an idea to a pull request.

## What Changes

- Add a one-screen desktop web app for a reading queue.
- Let people add, edit, and delete books with a title and author. Include these changes in the review proof.
- Put each new book in `To read`, keep its status when its title or author is edited, and let people move it between `To read`, `Reading`, and `Finished`. Include this flow in the review proof.
- Let people filter the list by status and see the number of books in each status. Deleting a book must reduce the count for its prior status. Include the filter and counts in the review proof.
- Reject blank titles and authors, show a clear message, and keep saved data when an edit is not valid. Include the error in the review proof.
- Save books in the browser so the queue stays after a page refresh. Include the saved queue after a refresh in the review proof.
- Share a working static preview and real screenshots of the key behavior.

## Capabilities

### New Capabilities

- `reading-queue-web-app`: Manage and save a desktop reading queue, with three reading states, status filters, and counts.

### Modified Capabilities

None.

## Impact

This adds a desktop web page, saved browser data, app checks, a static preview, and screenshots for review. Phone layouts, login, shared data, and outside services are out of scope. It does not change an existing API.
