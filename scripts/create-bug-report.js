// scripts/create-bug-report.js
// ============================================================
// MODULE 2.3.3 — Fallback: Create Jira/Linear Bug Report
// Called when auto-fix has exhausted all attempts
// ============================================================

const fs = require('fs');

const RUN_URL = process.env.RUN_URL || 'https://github.com';

// ---- Read failure log ----
function readFailures() {
  const jsonReport = 'test-results/results.json';
  if (!fs.existsSync(jsonReport)) return [];
  const results = JSON.parse(fs.readFileSync(jsonReport, 'utf-8'));
  const failures = [];
  for (const suite of results.suites || []) {
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        if (test.status === 'failed') {
          failures.push({
            title: spec.title,
            error: test.results?.[0]?.error?.message || 'Unknown',
          });
        }
      }
    }
  }
  return failures;
}

// ---- Ask Claude to write the bug report ----
async function generateBugReport(failures) {
  const failureText = failures.map(f => `- ${f.title}: ${f.error}`).join('\n');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are a QA engineer writing a bug report after automated test failures that could not be auto-fixed.

FAILING TESTS:
${failureText}

CI RUN URL: ${RUN_URL}

Write a concise, professional bug report. Respond with ONLY a JSON object:
{
  "title": "Short descriptive title (max 80 chars)",
  "priority": "high" | "medium" | "low",
  "description": "2-3 sentence description of what failed and the impact",
  "stepsToReproduce": ["step 1", "step 2", "step 3"],
  "expectedResult": "What should happen",
  "actualResult": "What actually happened",
  "labels": ["playwright", "automation", "regression"]
}`,
      }],
    }),
  });

  const data = await response.json();
  try {
    return JSON.parse(data.content[0].text);
  } catch {
    return {
      title: 'Playwright Tests Failed — Auto-fix Unsuccessful',
      priority: 'high',
      description: `${failures.length} test(s) failed and could not be automatically fixed after 2 attempts.`,
      stepsToReproduce: ['Run npm test', 'Check CI logs'],
      expectedResult: 'All tests pass',
      actualResult: failureText,
      labels: ['playwright', 'automation'],
    };
  }
}

// ---- Create Linear issue ----
async function createLinearIssue(report) {
  if (!process.env.LINEAR_API_KEY) {
    console.log('ℹ️ LINEAR_API_KEY not set — skipping Linear.');
    return null;
  }

  const query = `
    mutation CreateIssue($title: String!, $description: String!) {
      issueCreate(input: {
        title: $title
        description: $description
        priority: 1
      }) {
        success
        issue { id identifier url }
      }
    }
  `;

  const description = `${report.description}\n\n**CI Run:** ${RUN_URL}\n\n**Steps to Reproduce:**\n${report.stepsToReproduce.map((s,i) => `${i+1}. ${s}`).join('\n')}\n\n**Expected:** ${report.expectedResult}\n**Actual:** ${report.actualResult}`;

  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': process.env.LINEAR_API_KEY },
    body: JSON.stringify({ query, variables: { title: `🐛 ${report.title}`, description } }),
  });

  const data = await res.json();
  return data?.data?.issueCreate?.issue;
}

// ---- Create Jira issue ----
async function createJiraIssue(report) {
  if (!process.env.JIRA_API_TOKEN || !process.env.JIRA_BASE_URL) {
    console.log('ℹ️ JIRA credentials not set — skipping Jira.');
    return null;
  }

  const res = await fetch(`${process.env.JIRA_BASE_URL}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64')}`,
    },
    body: JSON.stringify({
      fields: {
        project: { key: process.env.JIRA_PROJECT_KEY || 'QA' },
        summary: `🐛 ${report.title}`,
        description: {
          type: 'doc', version: 1,
          content: [{ type: 'paragraph', content: [{ type: 'text', text: report.description }] }],
        },
        issuetype: { name: 'Bug' },
        priority: { name: report.priority === 'high' ? 'High' : 'Medium' },
        labels: report.labels,
      },
    }),
  });

  const data = await res.json();
  return data.key ? { id: data.key, url: `${process.env.JIRA_BASE_URL}/browse/${data.key}` } : null;
}

// ---- Main ----
async function main() {
  console.log('\n📋 Bug Report Generator — Module 2.3.3');
  console.log('='.repeat(60));

  const failures = readFailures();
  if (failures.length === 0) {
    console.log('ℹ️ No failures found in report. Exiting.');
    return;
  }

  console.log(`❌ ${failures.length} unresolved failure(s). Generating bug report...`);

  const report = await generateBugReport(failures);
  console.log('\n📄 Bug Report Generated:');
  console.log(`   Title: ${report.title}`);
  console.log(`   Priority: ${report.priority}`);

  // Save report locally always
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync('test-results/bug-report.json', JSON.stringify(report, null, 2));
  console.log('   Saved: test-results/bug-report.json');

  // Try Linear
  const linearIssue = await createLinearIssue(report);
  if (linearIssue) console.log(`   ✅ Linear issue created: ${linearIssue.url}`);

  // Try Jira
  const jiraIssue = await createJiraIssue(report);
  if (jiraIssue) console.log(`   ✅ Jira ticket created: ${jiraIssue.url}`);

  if (!linearIssue && !jiraIssue) {
    console.log('\n⚠️ No issue tracker configured. Bug report saved locally only.');
    console.log('   Set LINEAR_API_KEY or JIRA_API_TOKEN + JIRA_BASE_URL in GitHub Secrets.');
  }
}

main();
