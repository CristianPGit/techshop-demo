// autofix-limited.js
// ============================================================
// LESSON 2.3.2 - Base implementation: retry-limited auto-fixing
// workflow with escalation handler.
//
// Structure maps to the five components from lesson 2.3.1:
//   Step 1: failure trigger context (broken locator + DOM capture)
//   Step 2: Claude invocation (bounded by MAX_AUTOFIX_ATTEMPTS)
//   Step 3: validation (gate before any write)
//   Step 4: codebase write (the permanent fix - the goal)
//   Step 5: escalation (structured report for a human)
// ============================================================

const fs = require('fs');

// DECISION 1: the limit is a named constant at module top level.
// Visible, changeable in one place, self-documenting.
// A bare `1` inside the loop would communicate nothing to the
// next engineer. This name communicates policy.
const MAX_AUTOFIX_ATTEMPTS = 1;

// Exercise 2, Modification 1 target: when true, run every step
// including validation but skip the codebase write and log what
// WOULD have been written. (Learners implement the conditional.)
const DRY_RUN = false;

// ============================================================
// Claude invocation STUB.
// Learners replace this with a real Claude API call in their
// own environment. The stub is toggled by `mode` so both paths
// of the workflow can be demonstrated without an API key:
//   mode: "success" -> returns a hardcoded valid proposal
//   mode: "failure" -> returns null (malformed/no proposal)
// ============================================================
function invokeClaudeForLocator(brokenLocator, domSnapshot, mode = 'success') {
  if (mode === 'failure') {
    return null;
  }
  // Hardcoded proposal for the TechShop checkout fixture:
  // the button's data-testid in the current DOM.
  return 'button[data-testid="place-order-btn"]';
}

// ============================================================
// Step 3: VALIDATION - the gate between proposal and codebase.
// "Valid" means: resolves to EXACTLY ONE element in the snapshot.
// Not zero (element missing), not 2+ (ambiguous selector).
//
// Named limitation: this checks count, not semantic correctness.
// A selector could match exactly one WRONG element. Sufficient
// for the TechShop fixture; semantic validation is the extension
// discussed on the 1:1.
// ============================================================
function validateLocator(proposedLocator, domSnapshot) {
  // Minimal count-based check. queryDOM here is a naive substring
  // match against the snapshot for teaching purposes; in a real
  // implementation use a DOM parser (e.g. jsdom or Playwright's
  // own locator resolution).
  if (!proposedLocator || typeof proposedLocator !== 'string') {
    return false; // DECISION 3: malformed/null is invalid, never a retry reason
  }
  const matches = queryDOM(domSnapshot, proposedLocator);
  return matches.length === 1;
}

// Naive teaching-grade DOM query: counts occurrences of the
// distinguishing attribute in the snapshot string.
function queryDOM(domSnapshot, locator) {
  const attrMatch = locator.match(/\[([^\]]+)\]/);
  if (!attrMatch) return []; // bare tag selectors are rejected as non-specific
  const needle = attrMatch[1].replace(/"/g, '"');
  const occurrences = domSnapshot.split(needle).length - 1;
  return new Array(occurrences).fill(true);
}

// ============================================================
// Step 5: ESCALATION HANDLER.
// Produces the structured report. Four required fields, each
// with a purpose:
//   broken_locator  - what was being looked for
//   dom_snapshot    - the evidence (state at time of failure)
//   failed_proposal - diagnostic: what Claude tried (null is
//                     also informative: nothing stable existed)
//   jira strings    - pre-formatted for a developer who has not
//                     read the test or the log
//
// Scope boundary: this does NOT create the Jira ticket. It
// produces the content. Ticket creation is pipeline integration
// (next lesson). HITL: the AI reached its boundary; a person
// takes over with full context attached.
// ============================================================
function escalate(brokenLocator, domSnapshot, failedProposal) {
  const report = {
    status: 'ESCALATED',
    broken_locator: brokenLocator,
    dom_snapshot: truncate(domSnapshot, 2000),
    failed_proposal: failedProposal || null,
    timestamp: new Date().toISOString(),
    suggested_jira_title: `Auto-fix failed: ${brokenLocator}`,
    suggested_jira_description: buildDescription(brokenLocator, domSnapshot, failedProposal),
  };
  logEscalation(report);
  return report;
}

function buildDescription(brokenLocator, domSnapshot, failedProposal) {
  return [
    'Automated locator fix could not be validated. Human investigation needed.',
    '',
    `Broken locator: ${brokenLocator}`,
    `Claude's proposal: ${failedProposal || 'none (null response - no stable signal found)'}`,
    '',
    'DOM snapshot at time of failure (truncated):',
    truncate(domSnapshot, 1500),
    '',
    'Next step: verify whether the element was removed, renamed as part',
    'of a behavior change, or restructured. If renamed intentionally,',
    'update the locator and consider whether the change needs QA review.',
  ].join('\n');
}

function truncate(text, max) {
  return text.length > max ? text.slice(0, max) + '\n...[truncated]' : text;
}

function logEscalation(report) {
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync('test-results/escalation-report.json', JSON.stringify(report, null, 2));
  console.log(`\n🔺 ESCALATED - report written to test-results/escalation-report.json`);
}

// ============================================================
// Step 4: CODEBASE WRITE - the permanent fix. The goal of the
// entire workflow. Reached ONLY after validation passes.
// Writing before validating is the anti-pattern from 2.3.1:
// an unvalidated locator in source looks like a deliberate
// engineering decision and pollutes the audit trail.
// ============================================================
function writeLocatorToFile(brokenLocator, newLocator, testFilePath) {
  const source = fs.readFileSync(testFilePath, 'utf-8');
  const updated = source.replace(brokenLocator, newLocator);
  fs.writeFileSync(testFilePath, updated);
  console.log(`✅ Codebase updated: ${brokenLocator} -> ${newLocator} in ${testFilePath}`);
}

// ============================================================
// MAIN WORKFLOW
// ============================================================
function autoFixLocator(brokenLocator, testFilePath, domSnapshot, stubMode = 'success') {
  console.log(`\n🤖 Auto-fix workflow started for: ${brokenLocator}`);
  console.log(`   Attempt limit: ${MAX_AUTOFIX_ATTEMPTS}`);

  let proposal = null;
  let attempt = 0;

  // Step 2: bounded invocation. The limit is enforced HERE, at
  // the invocation step - before any write can occur.
  while (attempt < MAX_AUTOFIX_ATTEMPTS) {
    proposal = invokeClaudeForLocator(brokenLocator, domSnapshot, stubMode);
    attempt++;
    console.log(`   Attempt ${attempt}: Claude proposed ${proposal || 'null'}`);

    // DECISION 3: null/malformed short-circuits to escalation.
    // A null response is not a retry reason - a second identical
    // request produces variation, not convergence.
    if (proposal === null) {
      break;
    }

    // Step 3: validate BEFORE write.
    if (validateLocator(proposal, domSnapshot)) {
      // DECISION 2: exit on success happens HERE, inside the
      // check - terminal by structure. If the limit is ever
      // raised, no attempts continue after a successful fix.
      writeLocatorToFile(brokenLocator, proposal, testFilePath);
      return { status: 'FIXED', newLocator: proposal, attempts: attempt };
    }
    console.log(`   Validation failed for: ${proposal}`);
  }

  // Step 5: limit reached (or null response) without a valid fix.
  return escalate(brokenLocator, domSnapshot, proposal);
}

module.exports = { autoFixLocator, validateLocator, escalate, MAX_AUTOFIX_ATTEMPTS };

// ============================================================
// DEMO RUNNER
//   node autofix-limited.js success   -> fix path
//   node autofix-limited.js failure   -> escalation path
// ============================================================
if (require.main === module) {
  const mode = process.argv[2] || 'success';

  // TechShop checkout DOM snapshot (relevant section).
  const domSnapshot = `
    <form class="checkout-form" data-testid="checkout-form" id="checkout-form">
      <input type="email" class="form-input" id="input-email" data-testid="input-email" placeholder="Email Address" required />
      <button type="submit" class="btn btn-primary btn-full" data-testid="place-order-btn">Place Order</button>
    </form>
    <a href="index.html" class="btn btn-primary" data-testid="back-home">Back to Home</a>`;

  const result = autoFixLocator(
    'button[data-testid="confirm-order-btn"]', // broken: testid changed in a UI update
    'tests/fixtures/checkout.spec.js',          // the fixture file (see lesson assets)
    domSnapshot,
    mode
  );

  console.log('\nResult:', JSON.stringify(result, null, 2));
}
