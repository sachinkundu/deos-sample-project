## Why

People need a simple way to track daily costs in euros. This small desktop app also gives the team a clear test of the full flow from an idea to a pull request.

## What Changes

- Add a one-screen desktop web app for expenses.
- Let people add, edit, and delete an expense with a name, euro amount, and one of four fixed categories: `Food`, `Travel`, `Bills`, or `Other`. Reject other category values and show this behavior in the review proof.
- Let people filter expenses by category and see the euro total for the list on screen. Show this behavior in the review proof.
- Reject blank names, blank or nonnumeric amounts, amounts that are zero or less, and amounts with more than two decimal places. Show a clear message and include this behavior in the review proof.
- Save expenses in the browser so changes stay after a page refresh. Show the saved data after a refresh in the review proof.
- Share a working static preview and real screenshots of the key behavior.

## Capabilities

### New Capabilities

- `expense-tracker-web-app`: Manage and save expenses in a desktop web app, with fixed categories, category filters, and a total for the visible list.

### Modified Capabilities

None.

## Impact

This adds a desktop web page, saved browser data, app checks, a static preview, and screenshots for review. Phone layouts, login, shared data, and outside services are out of scope. It does not change an existing API.
