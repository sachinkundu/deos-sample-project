## Context

See `proposal.md` for motivation and `specs/google-search-summary/spec.md` for the required behavior. This is a new command-line path with three external boundaries: Google search, article pages, and a language model. Each boundary can be slow, unavailable, or return untrusted content. The repository provides no service-specific design guidance for this change, so the design keeps provider and runtime details behind small interfaces and defines the observable command behavior at the coordinator boundary.

The command is a single, synchronous user operation. It does not need persistent state, background work, or a server. Search results and article text exist in memory only for the duration of the invocation.

## Goals / Non-Goals

**Goals:**

- Isolate command parsing, Google search, article reading, and language-model calls so each can be tested independently.
- Bound network work and model input while retaining enough material for a grounded summary.
- Produce exactly two short paragraphs on standard output for success, and one clear error on standard error for failure.
- Treat all remote content as untrusted and prevent result URLs or article text from controlling the tool.

**Non-Goals:**

- An interactive prompt, web interface, search history, cache, or stored article corpus.
- Ranking the web independently of Google's result order.
- Returning citations, links, raw search results, or article text to the user.
- Supporting search providers other than Google in this change.
- Guaranteeing that every remote page can be read, including paywalled, authenticated, script-only, or non-text pages.

## Decisions

### Component diagram

```text
User
  |
  v
search-summary CLI
  | parses positional words and presents output/errors
  v
Summary coordinator (45-second invocation deadline)
  |-----------> Google search gateway -----------> Google search
  |-----------> Article reader ------------------> result web pages
  |-----------> Summary generator ---------------> language model
  |<----------- two-paragraph validator
  v
stdout on success / stderr on failure
```

The CLI owns argument parsing, stream selection, and process exit status. The coordinator owns the use-case sequence, a monotonic invocation deadline, and cancellation. Three injected adapters own external I/O: a Google search gateway, an article reader, and a summary generator. The two-paragraph validator is deterministic and has no network access.

This separation makes the coordinator testable with fixed adapter responses and prevents provider response shapes from leaking into command behavior. Embedding all HTTP and model calls in the CLI was considered, but rejected because partial article failures and output repair would be difficult to test without invoking external services.

### Input and command contract

All positional argument tokens after the command name are joined with one space and trimmed to form the query. A query containing no non-whitespace character is invalid. Invalid input causes no network calls, writes `A search term is required.` to standard error, and exits with status `2`.

On success, standard output contains only paragraph one, one blank line, and paragraph two, followed by a newline; the process exits with status `0`. Any operational failure writes one user-facing error to standard error, writes no summary to standard output, and exits with status `1`. Provider credentials, response bodies, article text, and model prompts must never appear in user-facing errors.

Accepting a single quoted argument was considered, but joining positional tokens also supports the natural `search-summary several words` form without changing the meaning of quoted input.

### Google results and article selection

The Google search gateway uses a configured Google search API and returns organic results in Google's order. It does not scrape Google result HTML. Each result is normalized to a rank, title, absolute URL, and optional snippet. Scraping was rejected because page markup changes would make the command fragile and could turn consent or challenge pages into search data.

The coordinator examines at most the first five distinct eligible results. An eligible result has an `http` or `https` URL and is not a duplicate after URL normalization. The article reader follows at most three redirects, accepts HTML or plain-text responses up to 2 MiB, extracts main readable text, collapses repeated whitespace, and retains at most 12,000 characters per article and 40,000 characters in total. It fetches no more than three pages concurrently. These limits bound latency, memory, and model cost; they are implementation constants rather than user options.

Before every request, including redirects, the reader resolves the destination and rejects loopback, link-local, private-network, and non-HTTP(S) targets. This prevents an untrusted search result from using the CLI as a private-network fetcher. Unsupported content, unsafe destinations, HTTP failures, timeouts, and pages with no extractable main text are skipped individually. Remaining articles preserve Google rank order.

Using search snippets alone was considered, but rejected because the requirement is to read useful articles. Fetching every result was also rejected because it creates unbounded latency and model input without a corresponding requirement.

### Grounded summary generation and format enforcement

Each accepted article is assigned a stable invocation-local source identifier in rank order. The summary generator receives the query plus an ordered list of source identifier, title, URL, and extracted text. The prompt labels article content as untrusted reference material, instructs the model to ignore instructions found inside it, prohibits adding facts not supported by that material, and requests exactly two paragraphs with no title, bullets, or preamble.

For this command, a short paragraph is one to three sentences and no more than 600 characters after trimming. The validator normalizes line endings, trims outer whitespace, splits on blank lines, and accepts only two non-empty paragraphs that meet those bounds and contain no heading or list prefix. If the first response fails validation, the summary generator gets one corrective request containing the validation reason and the same source material. A second invalid response is a summary failure. The CLI always renders validated paragraphs itself rather than printing a raw provider response.

A single bounded synthesis request was chosen over per-article summaries followed by a second synthesis because the input is already limited and the extra model stage would add cost and another failure point. One corrective request was chosen over silently reshaping arbitrary output because merging or splitting model prose can change meaning; unlimited retries were rejected because they make cost and latency unpredictable.

### Deadlines and cancellation

The CLI starts one 45-second wall-clock deadline when it begins handling the command, before argument parsing. Invalid input still stops immediately. For valid input, argument parsing, all external calls, article extraction, validation, and rendering must finish within that deadline. The limits are fixed implementation constants:

| Stage | Timeout |
|---|---|
| Google search request | 5 seconds total. |
| Article collection | 15 seconds for the whole phase. Each page gets at most 8 seconds, including DNS resolution, redirects, response reading, and text extraction. |
| Initial language-model request | 18 seconds. |
| Corrective language-model request | 10 seconds. |

Every operation receives the earliest of its stage deadline and the invocation deadline. Each page request also receives the article-phase deadline, so a second concurrency batch cannot extend that phase. The corrective request shares the original 45-second deadline: it receives at most 10 seconds and only the invocation time that remains after search, article collection, the initial model call, and validation. If no time remains, the coordinator skips the corrective call and returns a summary failure. Stage budgets do not reserve time or reset the total deadline; unused time from an earlier stage can be used later only up to the later stage's own cap.

On any deadline, the coordinator cancels in-flight work and starts no new work. A search timeout maps to `search_failed`. Article timeouts remain per-page failures: completed useful articles may proceed, but no useful article at the phase deadline maps to `no_useful_articles`. Expiry during or after model generation maps to `generation_failed`. The coordinator and adapters accept an injected monotonic clock and cancellation signal so tests can advance time and assert each boundary without sleeping.

Independent adapter timeouts without an overall deadline were considered, but rejected because their worst-case sum could exceed a predictable command latency, especially when a corrective model call is needed.

### Minimal data model

The following records are ephemeral values, not persisted entities:

| Record | Required fields | Purpose |
|---|---|---|
| `InvocationContext` | `deadlineAt`, cancellation signal | Propagates the one invocation deadline through the coordinator and adapters. |
| `SearchRequest` | `query` | Carries the normalized user term. |
| `SearchResult` | `rank`, `title`, `url`, optional `snippet` | Provider-neutral Google result used for selection. |
| `Article` | `sourceId`, `rank`, `title`, `url`, `text` | Safe, bounded input extracted from one useful result. |
| `SummaryRequest` | `query`, ordered `articles` | Complete grounded input to the language model. |
| `Summary` | exactly two `paragraphs` | Validated success value rendered by the CLI. |
| `Failure` | `kind`, `userMessage`, optional internal `cause` | Separates stable user output from diagnostic detail. |

`Failure.kind` is one of `invalid_input`, `search_failed`, `no_useful_articles`, `generation_failed`, or `invalid_summary`. Provider-specific exceptions are translated at their adapter boundary. No record needs a database identifier or survives process exit.

### Event flow

1. The CLI starts the 45-second invocation deadline, then joins and trims positional arguments. If the result is empty, it emits the input error and stops.
2. The coordinator sends the normalized query and invocation deadline to the Google search gateway with its 5-second stage deadline. A gateway failure stops the operation as `search_failed`.
3. The coordinator normalizes, deduplicates, and selects up to five eligible results in Google rank order.
4. The article reader fetches selected pages within the 15-second phase deadline and 8-second per-page deadlines, with bounded concurrency, URL safety, response, extraction, and text-size limits. Individual page failures are recorded only as internal diagnostics and skipped.
5. If no article yields usable text, the coordinator stops as `no_useful_articles`; otherwise it builds an ordered `SummaryRequest`.
6. The summary generator sends the bounded sources to the language model with an 18-second cap. The validator accepts the result or permits one corrective request capped at 10 seconds and the remaining invocation time.
7. The CLI prints the validated paragraphs and exits successfully. Any generation or final validation failure follows the operational error path instead.

### Failure modes

| Condition | Handling | User-visible result |
|---|---|---|
| Missing or whitespace-only query | Stop before external I/O. | `A search term is required.` and exit `2`. |
| Google credentials/configuration rejected, quota exceeded, timeout, or provider error | Do not attempt article reads or model generation; retain provider detail only for sanitized diagnostics. | `Could not search Google. Try again later.` and exit `1`. |
| Google returns no eligible results | Treat as no useful article. | `Could not make a summary because no useful articles were found.` and exit `1`. |
| One or more result pages are unsafe, unavailable, oversized, unsupported, or unreadable | Skip failed pages and continue with successful pages. | No error if at least one useful article remains. |
| Every selected page fails or has no usable main text | Do not call the language model. | `Could not make a summary because no useful articles were found.` and exit `1`. |
| Language-model authentication, quota, timeout, or provider failure | Do not print a partial response. | `Could not make a summary. Try again later.` and exit `1`. |
| Invocation deadline expires after at least one article was read | Cancel in-flight work, start no further calls, and discard any partial model response. | `Could not make a summary. Try again later.` and exit `1`. |
| Model output remains invalid after one corrective request | Discard it rather than rewriting it locally. | `Could not make a summary. Try again later.` and exit `1`. |
| Unexpected internal exception | Convert at the CLI boundary; never expose a stack trace or secret in normal output. | `Could not make a summary. Try again later.` and exit `1`. |

Diagnostics may identify the failing stage, result rank, URL host, and provider status class, but must exclude credentials, full URLs with query strings, fetched text, prompts, and model output. This gives implementation operators enough context without leaking user or remote content.

## Risks / Trade-offs

- [A page may block automated reads or require client-side rendering] -> Skip it and continue; fail clearly only when no useful article remains.
- [Five results or text truncation may omit relevant evidence] -> Preserve Google order and truncate only after main-text extraction; the fixed bounds keep one invocation predictable.
- [Remote article text may contain prompt-injection instructions] -> Treat it as delimited untrusted data, give higher-priority grounding instructions, and never enable tools in the model call.
- [An LLM can still produce unsupported claims] -> Supply only selected article text, request source-bound synthesis, use a low-variance generation mode when supported, and reject structural violations. The tool does not claim formal factual verification.
- [Strict paragraph validation can reject otherwise readable prose] -> Allow one bounded corrective request and use simple, documented limits that can be tested deterministically.
- [Concurrent page reads can increase transient load] -> Cap concurrency at three, fetch each selected URL once, and honor adapter timeouts and response-size limits.
- [Fixed deadlines may reject a result that would succeed on a slow network] -> Keep the stage caps subordinate to one 45-second deadline and return the existing clear stage-appropriate error instead of waiting unpredictably.

## Migration Plan

This is an additive command with no stored data or schema migration. Release the executable with the Google search and language-model adapters configured through the repository's established runtime configuration mechanism. Before making it available, smoke-test missing input, a query with readable results, no useful results, a partial page-read failure, and a model failure.

Rollback consists of withdrawing the `search-summary` command or reverting its release. Because invocations are stateless and create no persistent records, rollback requires no data repair.
