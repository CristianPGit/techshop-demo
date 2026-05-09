// scripts/autofix-agent.js
// ============================================================
// MODULE 2.3 — Controlled Auto-fixing Agent
// Reads GitHub Actions failure logs, asks Claude to fix them,
// applies the fix, and retries. Max 2 attempts.
// ============================================================

const fs = require('fs');
const path = require('path');

const MAX_ATTEMPTS = parseInt(process.env.MAX_FIX_ATTEMPTS || '2');
const TEST_FILE = process.env.TEST_FILE || 'tests/module2.spec.js';
const STATE_FILE = '.autofix-state.json';

// ---- Read current attempt count ----
function getState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  }
  return { attempts: 0, history: [] };
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ---- Read the failure log ----
function readFailureLog() {
  const jsonReport = 'test-results/results.json';
  if (!fs.existsSync(jsonReport)) {
    console.log('⚠️ No test results JSON found. Using stderr log.');
    return 'Test results not found. Tests failed to run.';
  }
  const results = JSON.parse(fs.readFileSync(jsonReport, 'utf-8'));
  const failures = [];
  for (const suite of results.suites || []) {
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        if (test.status === 'failed') {
          const err = test.results?.[0]?.error;
          failures.push({
            title: spec.title,
            error: err?.message || 'Unknown error',
            stack: err?.stack || '',
          });
        }
      }
    }
  }
  return JSON.stringify(failures, null, 2);
}

// ---- Read test file ----
function readTestFile() {
  return fs.readFileSync(TEST_FILE, 'utf-8');
}

// ---- Call Claude API ----
async function askClaude(failureLog, testCode, attemptNumber) {
  const prompt = `You are an expert QA engineer. A Playwright test file has failing tests.

FAILURE LOG:
${failureLog}

CURRENT TEST FILE (${TEST_FILE}):
\`\`\`javascript
${testCode}
\`\`\`

This is auto-fix attempt ${attemptNumber} of ${MAX_ATTEMPTS}.

Your task:
1. Analyze the failure log carefully
2. Identify the root cause (broken locator, wrong selector, timing issue, etc.)
3. Propose a minimal fix — change as little as possible
4. Return ONLY the corrected test file content, no explanation, no markdown fences

Rules:
- Prefer data-testid locators over CSS classes or XPath
- Do not change passing tests
- Do not add new tests
- Keep comments intact`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// ---- Main ----
async function main() {
  const state = getState();
  state.attempts += 1;

  console.log(`\n🤖 Auto-fixing Agent — Attempt ${state.attempts} of ${MAX_ATTEMPTS}`);
  console.log('='.repeat(60));

  if (state.attempts > MAX_ATTEMPTS) {
    console.log('❌ Max fix attempts reached. Escalating to bug report...');
    process.exit(1);
  }

  const failureLog = readFailureLog();
  const testCode = readTestFile();

  console.log('📋 Failures found:');
  console.log(failureLog.substring(0, 500) + '...');
  console.log('\n🧠 Asking Claude to analyze and fix...');

  try {
    const fixedCode = await askClaude(failureLog, testCode, state.attempts);

    // Save backup of original
    const backupPath = `${TEST_FILE}.attempt${state.attempts}.bak`;
    fs.copyFileSync(TEST_FILE, backupPath);
    console.log(`✅ Backup saved to ${backupPath}`);

    // Apply fix
    fs.writeFileSync(TEST_FILE, fixedCode);
    console.log(`✅ Fix applied to ${TEST_FILE}`);

    // Record history
    state.history.push({
      attempt: state.attempts,
      timestamp: new Date().toISOString(),
      failures: failureLog.substring(0, 200),
    });
    saveState(state);

    console.log(`\n🔄 Re-running tests now...\n`);
  } catch (err) {
    console.error('❌ Claude API call failed:', err.message);
    process.exit(1);
  }
}

main();
