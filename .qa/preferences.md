# QA Architect — Calibration Preferences

These standing preferences are read before generating any QA output. Apply them every time.

## Output format (always)
- **Lead with a titled header:** `🧪 QA Test Plan — <short title>`
- **Add a "Grounded in the ticket" line** right under the header: one sentence tying the plan to
  the real source — the bug/behavior, the file, and the acceptance criteria. Example:
  > Grounded in the ticket: bug in `js/cart.js` (float artifacts like `19.989999…`); ACs = exactly
  > 2 decimal places + no regression to add-to-cart flow.
- **Be concise and clear.** No filler, no restating the obvious. Trim prose.
- **Use tables** for the test cases (one row per case). Keep columns tight: ID · Title · Steps · Expected.
- **Use relevant emojis** as section/status markers (🧪 plan, ✅ happy, 🚧 sad, 🔬 edge, ♻️ regression,
  🔒 security, ⚠️ expected-failure). Keep them meaningful, not decorative spam.
- Group **Happy → Sad → Edge** (plus regression/security/non-functional when relevant), **P1 first**.
- Call out **expected failures** explicitly when the code under test already contains the bug.

## Exploratory / browser QA (always)
- **Screenshot-confirm every validation or "missing X" claim.** Before reporting that a form
  skips validation, gives no feedback, or is missing an element, verify it against an actual
  **screenshot** — never solely a text/accessibility-tree snapshot. Snapshot greps produce
  false negatives (e.g. searching "invalid" while the UI says "Wrong email"). Pixels are ground
  truth; retract and correct any finding the screenshot disproves.

## Automation workflow (always)
- **Loop every automated test to green.** After writing or editing any spec, run it,
  read the result, fix failures, and re-run until it PASSES. Never hand back a red or
  unverified spec. Use the `/qa-architect:qa-architect` workflow (and its `automate-tests`
  flow) as the vehicle.
- **Report pass/fail counts plainly** from a real run — don't claim green without one.
- **Honest expected-failures beat false greens.** If code under test isn't built yet,
  pin it with `test.fixme`/skip and a one-line note; never fake a pass.

## Example shape
🧪 QA Test Plan — <title>

Grounded in the ticket: <one-line context>; ACs = <criteria>.

✅ Happy Path
| ID | Title | Steps | Expected |
| ... |

🚧 Sad Path / 🔬 Edge / ♻️ Regression
| ... |
