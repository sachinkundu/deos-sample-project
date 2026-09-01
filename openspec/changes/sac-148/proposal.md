## Why

People need a fast way to learn from web search results. A small command-line tool can find useful pages and sum them up, so people do not need to open each page.

## What Changes

- Add a command-line tool that takes a search term made of one or more words.
- Search Google with that term and read useful articles from the results.
- Use a language model to write a clear summary based on those articles.
- Print the summary as two short paragraphs.
- Show a clear error when the term is missing or the summary cannot be made.

## Capabilities

### New Capabilities

- `google-search-summary`: Covers search input, Google search, article use, the two-paragraph summary, and errors.

### Modified Capabilities

None.

## Impact

The project will gain a command-line tool named `search-summary`. It will need access to Google search, web pages, and a language model. It will write a summary or a clear error.
