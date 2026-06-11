# Structured Prompt Template — Handout

**Workshop:** AI-Assisted Test Case Generation (W1)
**Use this template** to turn any acceptance-criteria-shaped ticket into a complete first-draft test suite.

> **Core shift:** You are not writing test cases. You are designing the instruction that generates them. Every component below is load-bearing — remove one and the output degrades visibly.

---

## The template (copy and fill the `[brackets]`)

```
[ROLE]
You are a senior QA engineer working on a B2B SaaS product.
Generate a complete test suite for the following feature.

[ACCEPTANCE CRITERIA]
[paste AC here, verbatim from the ticket]

[CONSTRAINTS]
- Cover every AC item with at least one positive and one negative test case.
- Include edge cases for: empty inputs, boundary values, API failures, concurrent access.
- Format each test case as: ID | Preconditions | Steps | Expected result | Covered AC item.
- Flag any AC that is ambiguous or untestable.

[CONTEXT]
Base currency: [currency].
User role: [role].
Environment: [staging | production].
```

---

## Why each block matters

| Block | What it does | What breaks if you remove it |
|---|---|---|
| **Role** | Anchors the model in a QA mindset — preconditions, traceability, edge-case thinking. | Output reads like a feature description, not a test suite. |
| **Acceptance Criteria** | The only source of truth for what to test. Paste verbatim — don't paraphrase. | Model invents requirements that aren't in the ticket. |
| **Constraints** | Forces coverage breadth: negative paths, edge cases, ambiguity flags. | Output is happy-path only. No FX failure. No boundary tests. No export coverage. |
| **Format** | Makes the output auditable line-by-line against the AC. | Prose blob. Impossible to swap with a partner for a coverage audit. |
| **Context** | Tells the model your domain reality: currency, role, environment. | Model assumes defaults — almost always **USD, admin, production**. Wrong for most real tickets. |

---

## The most common mistake

> **Pasting the AC and nothing else.**
> The model fills the gaps with assumptions — usually the wrong ones.

Worked example of degradation (run this yourself once to feel the difference):

1. Run the full template on `TS-100`. Note the output.
2. Delete the `[CONSTRAINTS]` block. Run again. Compare.
3. Restore constraints; delete `[CONTEXT]`. Run again. Compare.

You'll see: no constraints → happy-path only. No context → wrong currency, wrong role, wrong environment in every precondition.

---

## Progression — pick your depth (Stage 4)

| Level | What you do with the template |
|---|---|
| **★ Basic** | Use as-is. Plain-text test cases. Count generated cases vs AC items. |
| **★★ Intermediate** | Adapt `[CONTEXT]` to your project (real currency, real role, real env). Verify coverage manually, flag gaps. |
| **★★★ Advanced** | Add a persona to `[ROLE]`. Extend `[CONSTRAINTS]` with project-specific risks. Request **JSON output** ready for import into your test management tool. Then run a second prompt that audits the first output for coverage gaps. |

---

## JSON output extension (★★★)

Append this to your prompt when you want machine-readable output:

```
Return the test suite as a JSON array. Each element:
{
  "id": "TC-001",
  "title": "...",
  "preconditions": ["..."],
  "steps": ["..."],
  "expected_result": "...",
  "covered_ac": [1, 4],
  "priority": "P0|P1|P2",
  "type": "positive|negative|edge"
}
Return ONLY the JSON array. No prose, no markdown fences.
```

---

## Coverage audit prompt (★★★, second pass)

Run this immediately after the first generation, in the same chat:

```
You just generated a test suite for the acceptance criteria above.
Audit your own output:
1. For each AC item, list the test case IDs that cover it.
2. List any AC item with zero coverage.
3. List any AC item with only positive coverage (no negative case).
4. Flag any test case that does not map to a specific AC item.
5. Propose new test cases to close every gap you found.
```

---

## Watch for these failure patterns

| Pattern | How to fix in the prompt |
|---|---|
| Model assumes base currency is **USD** even when your store is GBP/EUR/etc. | Pin it explicitly in `[CONTEXT]`: `Base currency: GBP.` Don't rely on the AC mentioning it. |
| No FX API failure tests. | The constraint block already lists "API failures" — if it's still missing, add a line: `Generate at least 2 test cases for FX API timeout/error.` |
| All test cases use the admin role. | Add to `[CONTEXT]`: explicit role + at least one unauthorized-role negative case in constraints. |
| Generic, vague preconditions ("user is logged in"). | Add to `[CONSTRAINTS]`: `Preconditions must reference specific data state, not just authentication.` |

---

## Before you leave the session

You should have:
- [ ] This template, filled in for your ticket.
- [ ] A draft test suite generated from your ticket.
- [ ] A coverage audit (yours or your peer's) with documented gaps.
- [ ] One named ticket you will run this on before W2.

**Next workshop:** W2 — Building a QA Agent That Runs Without You. The template you adapted today becomes the skill file for the agent you'll build next session.
