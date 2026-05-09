// scripts/ai-visual-diff.js
// ============================================================
// MODULE 3.3 — AI-Assisted Visual Diff Analysis
// Sends screenshot pairs to Claude Vision and classifies diffs
// Output: test-results/ai-diff-report.json + .md
// ============================================================

const fs = require('fs');
const path = require('path');

const SNAPSHOT_DIR = 'tests/module3.spec.js-snapshots';
const DIFF_DIR = 'test-results/ai-diff';
const REPORT_PATH = 'test-results/ai-visual-report.md';

// ---- Find snapshot pairs (baseline vs actual) ----
function findSnapshotPairs() {
  const pairs = [];
  if (!fs.existsSync(SNAPSHOT_DIR)) {
    console.log('⚠️ No snapshots directory found. Run tests first.');
    return pairs;
  }
  const files = fs.readdirSync(SNAPSHOT_DIR).filter(f => f.endsWith('.png'));
  for (const baseline of files) {
    const actualPath = path.join('test-results', baseline.replace('.png', '-actual.png'));
    if (fs.existsSync(actualPath)) {
      pairs.push({
        name: baseline,
        baseline: path.join(SNAPSHOT_DIR, baseline),
        actual: actualPath,
      });
    }
  }
  return pairs;
}

// ---- Convert image to base64 ----
function toBase64(imagePath) {
  const buffer = fs.readFileSync(imagePath);
  return buffer.toString('base64');
}

// ---- Ask Claude to classify the diff ----
async function classifyDiff(pair) {
  const baselineB64 = toBase64(pair.baseline);
  const actualB64 = toBase64(pair.actual);

  const prompt = `You are a QA engineer performing visual regression analysis.

I will show you two screenshots of the same webpage component:
1. BASELINE — the approved, correct version
2. ACTUAL — the current version from the latest build

Component: ${pair.name}

Analyze the differences carefully and respond with ONLY a JSON object in this format:
{
  "hasDifference": true/false,
  "severity": "none" | "minor" | "major" | "critical",
  "classification": "no_change" | "pixel_shift" | "layout_change" | "color_change" | "content_change" | "missing_element" | "broken",
  "isBug": true/false,
  "description": "One sentence describing what changed",
  "recommendation": "ignore" | "review" | "fix_immediately"
}

Classification guide:
- pixel_shift: Sub-pixel rendering differences, font anti-aliasing — usually NOT a bug
- layout_change: Elements moved, resized, or reordered — likely a bug
- color_change: Colors changed — could be intentional or a bug
- content_change: Text or images changed — likely a bug
- missing_element: An element is gone — critical bug
- broken: Page is broken/white/error — critical bug`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-7',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'text', text: 'BASELINE IMAGE:' },
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: baselineB64 } },
          { type: 'text', text: 'ACTUAL IMAGE:' },
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: actualB64 } },
        ],
      }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  try {
    return JSON.parse(data.content[0].text);
  } catch {
    return { hasDifference: false, severity: 'none', classification: 'no_change', isBug: false, description: 'Could not parse response', recommendation: 'review' };
  }
}

// ---- Generate Markdown report ----
function generateReport(results) {
  const bugs = results.filter(r => r.result.isBug);
  const reviews = results.filter(r => r.result.recommendation === 'review');
  const clean = results.filter(r => !r.result.hasDifference);

  let md = `# 🔍 AI Visual Diff Report\n\n`;
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += `## Summary\n\n`;
  md += `| | Count |\n|---|---|\n`;
  md += `| ✅ No change | ${clean.length} |\n`;
  md += `| ⚠️ Needs review | ${reviews.length} |\n`;
  md += `| 🐛 Bugs found | ${bugs.length} |\n`;
  md += `| Total | ${results.length} |\n\n`;

  if (bugs.length > 0) {
    md += `## 🐛 Bugs Found\n\n`;
    for (const r of bugs) {
      md += `### \`${r.name}\`\n`;
      md += `- **Severity:** ${r.result.severity}\n`;
      md += `- **Type:** ${r.result.classification}\n`;
      md += `- **Description:** ${r.result.description}\n`;
      md += `- **Action:** ${r.result.recommendation}\n\n`;
    }
  }

  if (reviews.length > 0) {
    md += `## ⚠️ Needs Human Review\n\n`;
    for (const r of reviews) {
      md += `- \`${r.name}\`: ${r.result.description}\n`;
    }
    md += '\n';
  }

  if (clean.length > 0) {
    md += `## ✅ No Changes Detected\n\n`;
    md += clean.map(r => `- \`${r.name}\``).join('\n');
    md += '\n';
  }

  return md;
}

// ---- Main ----
async function main() {
  console.log('\n🎨 AI Visual Diff Analysis — Module 3.3');
  console.log('='.repeat(60));

  const pairs = findSnapshotPairs();

  if (pairs.length === 0) {
    console.log('ℹ️ No snapshot pairs to compare. Skipping AI analysis.');
    process.exit(0);
  }

  console.log(`📸 Found ${pairs.length} snapshot pair(s) to analyze\n`);

  const results = [];
  for (const pair of pairs) {
    process.stdout.write(`  Analyzing ${pair.name}... `);
    try {
      const result = await classifyDiff(pair);
      results.push({ name: pair.name, result });
      const icon = result.isBug ? '🐛' : result.hasDifference ? '⚠️' : '✅';
      console.log(`${icon} ${result.classification}`);
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
      results.push({ name: pair.name, result: { hasDifference: true, isBug: false, classification: 'unknown', severity: 'minor', description: err.message, recommendation: 'review' } });
    }
  }

  // Save JSON report
  fs.writeFileSync('test-results/ai-visual-report.json', JSON.stringify(results, null, 2));

  // Save Markdown report
  const md = generateReport(results);
  fs.writeFileSync(REPORT_PATH, md);

  console.log(`\n📄 Reports saved:`);
  console.log(`   ${REPORT_PATH}`);
  console.log(`   test-results/ai-visual-report.json\n`);

  const bugs = results.filter(r => r.result.isBug);
  if (bugs.length > 0) {
    console.log(`❌ ${bugs.length} visual bug(s) found. Check the report.`);
    process.exit(1);
  } else {
    console.log('✅ No visual bugs found.');
  }
}

main();
