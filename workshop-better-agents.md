# Creating Better Agents in Claude Code

*Workshop plan — ~60 minutes, 6 sections + hands-on exercise.*

---

## 1. Why agents at all? (5 min)

A **subagent** is a separate Claude conversation with its own system prompt, tools, and context window. The main session delegates a task and gets back only the conclusion.

Three reasons to use one:

| Reason | Example |
|---|---|
| 🧹 **Context isolation** | Test runs, log digging, broad searches — thousands of lines of output stay out of your main conversation |
| ⚡ **Parallelism** | Three agents explore three subsystems at once |
| 🔍 **Unbiased verification** | A reviewer in a fresh context isn't anchored to the author's assumptions |

**Anti-goal:** don't delegate single-fact lookups ("what's in package.json?"). Spawning an agent costs setup time and tokens — if you know the file, just read it.

---

## 2. Anatomy of an agent (10 min)

An agent is one markdown file: **YAML frontmatter + a system prompt**.

**Where it lives (priority order):**

| Location | Scope |
|---|---|
| `.claude/agents/*.md` | Project — checked into git, shared with the team |
| `~/.claude/agents/*.md` | Personal — all your projects |
| Plugin `agents/` dir | Distributed with a plugin |

**The frontmatter fields that matter:**

| Field | What it does |
|---|---|
| `name` | Unique id, lowercase-with-hyphens (required) |
| `description` | When to delegate to it — this drives auto-invocation (required) |
| `tools` / `disallowedTools` | Allowlist / denylist; omit to inherit everything |
| `model` | `haiku` / `sonnet` / `opus` / `inherit` (default) |
| `effort` | Reasoning effort override: `low` … `max` |
| `memory` | `user` / `project` / `local` — agent keeps notes across sessions |
| `isolation: worktree` | Runs in a temporary git worktree — safe parallel file edits |
| `skills` | Preload skill content at startup |
| `maxTurns` | Hard cap on agentic turns |

**A complete real example:**

```markdown
---
name: test-triager
description: >
  Analyzes failing Playwright test output and classifies each failure as
  product bug, broken selector, or flaky/timing issue. Use proactively
  whenever a test run has failures.
tools: Read, Grep, Glob, Bash
model: sonnet
---

You are a QA test-triage specialist for a Playwright suite.

Given failing test output:
1. Read the failing spec and the page object it uses.
2. Classify each failure: PRODUCT BUG / BROKEN SELECTOR / FLAKY.
3. For selector breaks, find the current selector in the app source
   and propose the fix.

Return a compact table: test name, classification, evidence (file:line),
proposed fix. Return raw findings only — no greetings, no summary prose.
```

---

## 3. The description is the API (10 min)

Claude reads every agent's `description` and compares it to the task at hand — **that's how auto-delegation works**. The description isn't documentation; it's the routing function.

**Bad vs good:**

> ❌ `description: Helps with tests`
>
> ✅ `description: Analyzes failing Playwright output and classifies each failure as product bug, broken selector, or flaky. Use proactively whenever a test run has failures.`

Three things that make a description work:

1. **Say when, not just what** — "Use when the user asks to QA a PR…"
2. **"Use proactively"** — this phrase encourages Claude to delegate without being asked
3. **`<example>` blocks** — show a user message and the expected delegation; Claude pattern-matches on them

**Three ways to invoke an agent:**

| Method | Behavior |
|---|---|
| Natural language ("triage these failures") | Claude decides to delegate based on descriptions |
| `@test-triager do X` | Guaranteed — that agent runs |
| `claude --agent test-triager` | Agent becomes the whole session |

---

## 4. Scoping: tools, model, permissions (10 min)

**Least privilege for tools.** A reviewer that can edit files will eventually edit files:

```yaml
tools: Read, Grep, Glob        # read-only reviewer
disallowedTools: Write, Edit   # or: inherit everything except writes
```

MCP tools scope the same way — `mcp__github` matches all tools from that server.

**Model: inherit by default.** Override only with intent:

| Choose | When |
|---|---|
| `inherit` (default) | Almost always — matches the session's quality bar |
| `haiku` / lower `effort` | Mechanical, high-volume work: format sweeps, log scans |
| `opus` / higher `effort` | The hardest judge/verify steps only |

**Permissions:** an agent can set `permissionMode`, but the parent session's mode can override it (e.g. a parent in `bypassPermissions` wins). Don't rely on the agent to be stricter than its caller.

---

## 5. Five best practices — plus two from the field (10 min)

From Anthropic's official guidance:

1. **Single responsibility** — one agent, one job. A "do everything" agent auto-delegates for nothing.
2. **Detailed system prompts** — the prompt is the agent's *only* guidance; it doesn't see your conversation.
3. **Precise descriptions** — they are the delegation trigger (section 3).
4. **Restrict tools** — security *and* focus: fewer tools, fewer wrong turns.
5. **Version-control project agents** — check `.claude/agents/` into git so the team iterates on them like code.

Two field-tested additions:

6. **Agents return data, not chat.** The final message is the *result* handed back to the caller — say so in the prompt: "Return the raw table, no greetings, no summary prose."
7. **Iterate on the agent, don't route around it.** When an agent misbehaves, fix its prompt or description — the same discipline as fixing a flaky test instead of retrying it.

---

## 6. Beyond one agent (5 min)

One line each — pointers for the curious:

- **Background by default** — agents now run in the background; the session picks up the result when it's ready.
- **Resumable agents** — message a finished agent by id to continue it *with its context intact* instead of starting fresh.
- **Nested agents** — an agent can spawn its own sub-agents (depth-limited) for multi-stage work.
- **Worktree isolation** — `isolation: worktree` lets parallel agents edit files without colliding.

**When to use what:**

| Mechanism | Use it for |
|---|---|
| **Agent** | Isolated task, separate context, restricted tools |
| **Skill** | Reusable instructions loaded into the *main* session |
| **Hook** | Deterministic automation — *must* happen, no LLM judgment |
| **CLAUDE.md** | Standing project context, loaded every session |

---

## 7. Hands-on exercise (10 min)

Using the TechShop demo repo:

1. Create `.claude/agents/flaky-test-triager.md` — frontmatter + prompt from section 2 as the starting point.
2. Run the test suite so a couple of tests fail; ask Claude in plain language to "figure out why the tests are failing" — watch whether it auto-delegates.
3. **Tighten the loop:** if it didn't delegate, sharpen the `description`; if the agent wandered, cut its `tools` list. Re-run.

That loop — *write → invoke → tighten description and tools → re-run* — is the whole craft.

---

## Closing

> **Start with one narrow agent. Check it into git. Iterate on it like code.**
