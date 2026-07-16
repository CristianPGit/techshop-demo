// autofix-pipeline.js
// ============================================================
// LESSON 2.3.3 - COMPLETE PIPELINE (reference implementation
// for the entire 2.3.x block).
//
// Extends 2.3.2's autofix-limited.js with:
//   - onEscalation callback registration (loose coupling)
//   - createJiraTicket via REST API
//   - credentials from environment variables + guard clause
//
// Design principle enforced throughout: escalation logic and
// notification logic are SEPARATE CONCERNS. escalate() produces
// the report. The registered callback delivers it. Neither
// knows about the other's internals.
//
// Demo modes:
//   node autofix-pipeline.js success   -> fix path, no callback fires
//   node autofix-pipeline.js failure   -> escalation -> callback -> Jira
//   Set JIRA_MOCK=true to print the API payload instead of posting
//   (lets learners run the full path without a Jira instance).
// ============================================================

const fs = require('fs');

const MAX_AUTOFIX_ATTEMPTS = 1;

// ============================================================
// CREDENTIALS - Module 1 rule: tokens are credentials,
// credentials are not source code, source is not a secrets store.
// The guard clause is REQUIRED: silently failing to notify is a
// false green at the process level. Fail loudly at startup,
// never silently at delivery.
// ============================================================
function loadJiraConfig() {
  const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
  const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
  const JIRA_EMAIL = process.env.JIRA_EMAIL;
  const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY;

  if (!JIRA_BASE_URL || !JIRA_API_TOKEN || !JIRA_EMAIL || !JIRA_PROJECT_KEY) {
    throw new Error('Jira credentials not configured. Check environment variables: JIRA_BASE_URL, JIRA_API_TOKEN, JIRA_EMAIL, JIRA_PROJECT_KEY.');
  }
  return { JIRA_BASE_URL, JIRA_API_TOKEN, JIRA_EMAIL, JIRA_PROJECT_KEY };
}

// ============================================================
// CALLBACK REGISTRY - the loose-coupling mechanism.
// escalate() never calls notification code. It returns a report.
// The workflow runner invokes every registered callback when
// status === "ESCALATED". Switching Jira -> Linear, or adding a
// Slack channel, changes ONLY what is registered here.
// ============================================================
const escalationCallbacks = [];

function onEscalation(callback) {
  escalationCallbacks.push(callback);
}

async function fireEscalationCallbacks(report) {
  for (const cb of escalationCallbacks) {
    try {
      await cb(report);
    } catch (err) {
      // One failing channel must not block the others.
      console.error(`Escalation callback failed: ${err.message}`);
    }
  }
}

// ============================================================
// JIRA TICKET CREATION - the delivery step.
// Field mapping (see lesson Part 2):
//   suggested_jira_title  -> summary
//   report body fields    -> description
//   issuetype: always "Bug"  (a failing test is a defect, not a work item)
//   priority:  always "High" (the automated net already failed to catch it)
//   project key: from env, never hardcoded
// ============================================================
async function createJiraTicket(report) {
  const cfg = loadJiraConfig();

  const payload = {
    fields: {
      project: { key: cfg.JIRA_PROJECT_KEY },
      summary: report.suggested_jira_title,
      description: {
        type: 'doc',
        version: 1,
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: report.suggested_jira_description }],
        }],
      },
      issuetype: { name: 'Bug' },      // policy: Bug, never Task
      priority: { name: 'High' },       // policy: High by default
      labels: ['auto-fix', 'playwright', 'escalation'],
    },
  };

  if (process.env.JIRA_MOCK === 'true') {
    console.log('\n[JIRA_MOCK] Payload that would be posted:');
    console.log(JSON.stringify(payload, null, 2));
    return { key: 'QA-1847', url: `${cfg.JIRA_BASE_URL}/browse/QA-1847` };
  }

  const res = await fetch(`${cfg.JIRA_BASE_URL}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${cfg.JIRA_EMAIL}:${cfg.JIRA_API_TOKEN}`).toString('base64')}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Jira API error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return { key: data.key, url: `${cfg.JIRA_BASE_URL}/browse/${data.key}` };
}

// ============================================================
// Everything below is the 2.3.2 workflow, UNCHANGED except that
// the runner fires callbacks after escalation. Note what did
// NOT change: escalate() itself. That is the callback pattern
// paying off - the notification layer was added without touching
// the escalation logic.
// ============================================================

function invokeClaudeForLocator(brokenLocator, domSnapshot, mode = 'success') {
  if (mode === 'failure') {
    // Simulates a weak proposal: class-based selector that will
    // fail count validation (multiple .btn-primary on the page).
    return 'button.btn-primary';
  }
  return 'button[data-testid="place-order-btn"]';
}

function validateLocator(proposedLocator, domSnapshot) {
  if (!proposedLocator || typeof proposedLocator !== 'string') return false;
  const matches = queryDOM(domSnapshot, proposedLocator);
  return matches.length === 1;
}

function queryDOM(domSnapshot, locator) {
  const attrMatch = locator.match(/\[([^\]]+)\]/);
  if (attrMatch) {
    const occurrences = domSnapshot.split(attrMatch[1]).length - 1;
    return new Array(occurrences).fill(true);
  }
  // class-based selectors: count occurrences of the class token
  const classMatch = locator.match(/\.([\w-]+)/);
  if (classMatch) {
    const occurrences = domSnapshot.split(classMatch[1]).length - 1;
    return new Array(occurrences).fill(true);
  }
  return [];
}

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
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync('test-results/escalation-report.json', JSON.stringify(report, null, 2));
  return report; // NOTE: no notification code here. Separate concerns.
}

function buildDescription(brokenLocator, domSnapshot, failedProposal) {
  return [
    'Automated locator fix could not be validated. Human investigation needed.',
    '',
    `Broken locator: ${brokenLocator}`,
    `Claude's proposal: ${failedProposal || 'none (null response)'}`,
    '',
    'DOM snapshot at time of failure (truncated):',
    truncate(domSnapshot, 1500),
    '',
    `Escalated at: ${new Date().toISOString()}`,
  ].join('\n');
}

function truncate(text, max) {
  return text.length > max ? text.slice(0, max) + '\n...[truncated]' : text;
}

function writeLocatorToFile(brokenLocator, newLocator, testFilePath) {
  const source = fs.readFileSync(testFilePath, 'utf-8');
  fs.writeFileSync(testFilePath, source.replace(brokenLocator, newLocator));
  console.log(`✅ Codebase updated: ${brokenLocator} -> ${newLocator}`);
}

async function autoFixLocator(brokenLocator, testFilePath, domSnapshot, stubMode = 'success') {
  console.log(`\n🤖 Auto-fix pipeline started for: ${brokenLocator}`);
  let proposal = null;
  let attempt = 0;

  while (attempt < MAX_AUTOFIX_ATTEMPTS) {
    proposal = invokeClaudeForLocator(brokenLocator, domSnapshot, stubMode);
    attempt++;
    console.log(`   Attempt ${attempt}: Claude proposed ${proposal || 'null'}`);

    if (proposal === null) break;

    if (validateLocator(proposal, domSnapshot)) {
      writeLocatorToFile(brokenLocator, proposal, testFilePath);
      return { status: 'FIXED', newLocator: proposal, attempts: attempt };
    }
    console.log(`   Validation failed: resolves to ${queryDOM(domSnapshot, proposal).length} elements (need exactly 1)`);
  }

  const report = escalate(brokenLocator, domSnapshot, proposal);
  await fireEscalationCallbacks(report); // callbacks fire HERE, outside escalate()
  return report;
}

module.exports = { autoFixLocator, onEscalation, createJiraTicket, escalate, validateLocator };

// ============================================================
// DEMO RUNNER
// ============================================================
if (require.main === module) {
  const mode = process.argv[2] || 'success';

  // Register the Jira callback - THE lesson 2.3.3 addition.
  onEscalation(async (report) => {
    const ticket = await createJiraTicket(report);
    console.log(`\n🎫 Jira ticket created: ${ticket.url}`);

    // Exercise 2 target: learners add a second channel here,
    // e.g. the CI-readable structured console summary - WITHOUT
    // touching escalate().
  });

  const domSnapshot = `
    <form class="checkout-form" data-testid="checkout-form" id="checkout-form">
      <input type="email" class="form-input" id="input-email" data-testid="input-email" placeholder="Email Address" required />
      <button type="submit" class="btn btn-primary btn-full" data-testid="place-order-btn">Place Order</button>
    </form>
    <a href="index.html" class="btn btn-primary" data-testid="back-home">Back to Home</a>`;

  // Demo-only env so the guard clause passes; JIRA_MOCK prints
  // the payload instead of posting. Real usage: set real values
  // in CI secrets and remove JIRA_MOCK.
  process.env.JIRA_MOCK = 'true';
  process.env.JIRA_BASE_URL = process.env.JIRA_BASE_URL || 'https://company.atlassian.net';
  process.env.JIRA_API_TOKEN = process.env.JIRA_API_TOKEN || 'demo-token';
  process.env.JIRA_EMAIL = process.env.JIRA_EMAIL || 'qa@company.com';
  process.env.JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || 'QA';

  autoFixLocator(
    'button[data-testid="confirm-order-btn"]',
    'tests/fixtures/checkout.spec.js',
    domSnapshot,
    mode
  ).then(result => console.log('\nFinal status:', result.status));
}
