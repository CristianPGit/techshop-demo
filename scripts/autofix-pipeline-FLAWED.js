// autofix-pipeline-FLAWED.js
// ============================================================
// EXERCISE 1 - PIPELINE AUDIT (lesson 2.3.3)
// This implementation contains exactly FOUR flaws.
// Find each one, name the principle it violates, and write the
// corrected version of the affected line or block.
// Do not run this in a real environment.
// ============================================================

const fs = require('fs');

const MAX_AUTOFIX_ATTEMPTS = 1;

const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY;

async function createJiraTicket(report) {
  const payload = {
    fields: {
      project: { key: JIRA_PROJECT_KEY },
      summary: report.suggested_jira_title,
      description: {
        type: 'doc',
        version: 1,
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: report.suggested_jira_description }],
        }],
      },
      issuetype: { name: 'Task' },
      priority: { name: 'High' },
    },
  };

  const res = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`qa@company.com:ATATT3xFfGF0aBcD-hardcoded-token-9921`).toString('base64')}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return { key: data.key, url: `${JIRA_BASE_URL}/browse/${data.key}` };
}

async function escalate(brokenLocator, domSnapshot, failedProposal) {
  const report = {
    status: 'ESCALATED',
    broken_locator: brokenLocator,
    dom_snapshot: domSnapshot,
    failed_proposal: failedProposal || null,
    timestamp: new Date().toISOString(),
    suggested_jira_title: `Auto-fix failed: ${brokenLocator}`,
    suggested_jira_description: `Broken: ${brokenLocator}\nProposal: ${failedProposal}\n\n${domSnapshot}`,
  };

  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync('test-results/escalation-report.json', JSON.stringify(report, null, 2));

  await createJiraTicket(report);

  return report;
}

function validateLocator(proposedLocator, domSnapshot) {
  if (!proposedLocator || typeof proposedLocator !== 'string') return false;
  const attrMatch = proposedLocator.match(/\[([^\]]+)\]/);
  if (!attrMatch) return false;
  const occurrences = domSnapshot.split(attrMatch[1]).length - 1;
  return occurrences === 1;
}

function invokeClaudeForLocator(brokenLocator, domSnapshot) {
  return null; // stub
}

function writeLocatorToFile(brokenLocator, newLocator, testFilePath) {
  const source = fs.readFileSync(testFilePath, 'utf-8');
  fs.writeFileSync(testFilePath, source.replace(brokenLocator, newLocator));
}

async function autoFixLocator(brokenLocator, testFilePath, domSnapshot) {
  let proposal = null;
  let attempt = 0;

  while (attempt < MAX_AUTOFIX_ATTEMPTS) {
    proposal = invokeClaudeForLocator(brokenLocator, domSnapshot);
    attempt++;

    if (proposal === null) break;

    if (validateLocator(proposal, domSnapshot)) {
      writeLocatorToFile(brokenLocator, proposal, testFilePath);
      return { status: 'FIXED', newLocator: proposal, attempts: attempt };
    }
  }

  return escalate(brokenLocator, domSnapshot, proposal);
}

module.exports = { autoFixLocator };
