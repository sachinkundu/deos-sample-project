## 1. Project and Test Setup

- [x] 1.1 Add the Vite-based static application package, locked dependencies (`big.js`, Vitest, Playwright, and Wrangler), and scripts for development, unit tests, browser tests, evidence capture, and production builds.
- [x] 1.2 Configure Vitest for the pure calculator module and Playwright to start and exercise the built application in supported desktop and 320 CSS-pixel projects.
- [x] 1.3 Create the semantic HTML entry point with an `aria-live="polite"` output and native `type="button"` controls for digits, decimal, all four operators, equals, and clear, each carrying its shared action metadata.

## 2. Calculator State and Arithmetic

- [x] 2.1 Implement `src/calculator.js` with the initial state, action types, display derivation, and deterministic reducer transitions for digit and single-decimal entry across entering, awaiting-right-operand, result, and error phases.
- [x] 2.2 Implement operator selection and explicit calculation transitions, including operator replacement before a right operand, ignored premature or repeated equals, ignored implicit chaining, result reuse as a left operand, and fresh digit/decimal entry after a result.
- [x] 2.3 Normalize only trailing decimal points at operand boundaries and implement strict `big.js` arithmetic with exact addition, subtraction, and multiplication, 20-place round-half-up division, ordinary decimal notation, and negative-zero normalization.
- [x] 2.4 Implement locked `divide_by_zero` and defensive `result_unavailable` states with their exact display messages, ignored non-clear actions, cleared pending operands, and full reset through the shared clear action.

## 3. Browser Interaction and Presentation

- [x] 3.1 Implement `src/main.js` so button clicks and recognized keyboard values dispatch exactly one shared calculator action and rendering always derives from the returned reducer state.
- [x] 3.2 Map digits, decimal, `+`, `-`, `*`, `/`, `Enter`, `=`, and `Escape`; prevent defaults for recognized keys, ignore composing and Control/Meta/Alt-modified input, preserve shifted `+`/`*`, and leave unrelated keys unchanged.
- [x] 3.3 Render current entries, results, and exact error text into the output and add observable short-lived pressed feedback for mapped keyboard actions plus active feedback for pointer actions.
- [x] 3.4 Add the four-column responsive CSS Grid layout with a centered `min(100%, 24rem)` panel, contained/wrapping display text, at least 44-by-44 CSS-pixel controls, at least 16 CSS-pixel text, and at least 8 CSS-pixel control gaps without horizontal page overflow.
- [x] 3.5 Render the completed calculation above its result or error, using readable operator symbols, and remove it on clear or fresh entry.

## 4. Reducer and Arithmetic Checks

- [x] 4.1 Add table-driven Vitest coverage for all four operations, button-equivalent action streams, keyboard-equivalent action streams, decimal entry, duplicate-decimal rejection, negative results, operator replacement, and clear from partial and result states.
- [x] 4.2 Prove exact and formatted arithmetic with `0.1 + 0.2`, `1234567890123 + 1`, `1 / 10000000`, `1000000000000000000000 * 1`, a repeating quotient rounded to 20 places, and trailing-decimal operands such as `1. + 2` and `1 + 2.`.
- [x] 4.3 Prove transition and error boundaries: `8 + =` remains pending, `8 + 2 =` is `10`, repeated equals is inert, `0.0` division enters the exact zero-division error, error actions are ignored, defensive arithmetic failure shows `Result unavailable`, and clear permits a fresh successful calculation.

## 5. End-to-End Behavior Checks

- [x] 5.1 Add Playwright scenarios using real controls and key events to prove decimal entry by both input modes, addition, subtraction, multiplication, division, `Enter`, keyboard `=`, and the exact visible results.
- [x] 5.2 Add Playwright scenarios proving button clear and `Escape` erase partial/result/error state, division by zero shows only `Cannot divide by zero`, and clearing then calculating `8 / 2` displays `4`.
- [x] 5.3 Add a 320 CSS-pixel geometry check for document overflow, control containment, clipping, overlap, minimum button dimensions, text sizing, and 8-pixel gaps, plus a desktop check that the complete panel remains centered and within its maximum width.

## 6. Reproducible Review Evidence

- [x] 6.1 Add a dedicated Playwright evidence scenario with deliberate action pauses and a test-context-only key-event overlay that is absent from production assets.
- [x] 6.2 Make the evidence scenario assert and capture an image sequence or recording of `1.5 + 2.25 =` by buttons with visible presses, `2.5 * 4 Enter` with every key visible, clear returning to `0`, and `8 / 0 =` followed by clear and successful `8 / 2 =` recovery.
- [x] 6.3 Fail evidence capture when an expected display, pressed-state frame, key trace, or media artifact is missing so review proof cannot be published from a partial run.

## 7. Preview Delivery

- [ ] 7.1 Add a protected trusted-branch preview workflow that runs the complete checks and production build before deploying `dist` to the `sac-225-calculator` Cloudflare Pages project on branch `review-sac-225`, with a `workflow_dispatch` rerun path and credentials confined to the deployment job. Omitted from this implementation at the human reviewer's request after the completed implementation could not be published with the workflow file; the existing maintainer-deployed immutable preview and evidence are retained.
- [x] 7.2 Capture the deployment's unique immutable URL, fail unless that exact URL passes an HTTPS smoke test, and retain the prior successful deployment when build, check, deployment, or smoke testing fails.
- [x] 7.3 Prepare final-review output that links the smoke-tested immutable preview, successful automated-check results, and the matching evidence recording or image sequence.

## 8. Final Verification

- [x] 8.1 On the final implementation tree, rerun the unit suite, full Playwright behavior and responsive suites, and production build; confirm all checks pass without modifying generated production assets afterward.
- [x] 8.2 Recapture exactly five final-state screenshots against the final tree: desktop button addition, desktop negative subtraction with expression, desktop keyboard multiplication, desktop division-by-zero, and 320px clear-based recovery.
