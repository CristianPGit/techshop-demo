/**
 * TS-111 — Region-based VAT/GST tax calculation (★★★ Advanced)
 * Linear: TRI-37 | Workshop: AI-Assisted Test Case Generation (W1)
 *
 * AC:
 *  1. Rate resolved from shipping country (and state/province where applicable).
 *  2. Tax-inclusive regions show prices with tax baked in; exclusive add a line.
 *  3. Valid VAT/GST ID removes tax after format validation.
 *  4. Mixed carts taxed per line by category, then summed.
 *  5. Tax breakdown (rate, base, amount per category) shown and stored.
 */
const REGIONS = {
  AT: { rate: 0.20, inclusive: true,  label: 'VAT' },
  DE: { rate: 0.19, inclusive: true,  label: 'VAT' },
  GB: { rate: 0.20, inclusive: true,  label: 'VAT' },
  'US-CA': { rate: 0.0725, inclusive: false, label: 'Sales Tax' },
  AU: { rate: 0.10, inclusive: true,  label: 'GST' },
};

const VAT_ID = /^[A-Z]{2}[0-9A-Z]{8,12}$/;

function taxForLine(line, region, exempt) {
  const cfg = REGIONS[region];
  if (!cfg || exempt || line.category === 'zero-rated') {
    return { rate: 0, base: round2(line.amount), tax: 0, category: line.category };
  }
  const tax = cfg.inclusive
    ? line.amount - line.amount / (1 + cfg.rate)   // extract from gross
    : line.amount * cfg.rate;                       // add on net
  return { rate: cfg.rate, base: round2(line.amount), tax: round2(tax), category: line.category };
}

function calculateTax(lines, region, vatId) {
  const exempt = !!vatId && VAT_ID.test(vatId);
  const breakdown = lines.map(l => taxForLine(l, region, exempt));
  const totalTax = round2(breakdown.reduce((s, b) => s + b.tax, 0));
  return { exempt, region, breakdown, totalTax };
}

function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

module.exports = { calculateTax, taxForLine, REGIONS, VAT_ID };
