// ============================================================
// bugs.js — Bug Injection Panel for QA Training
// Lets students toggle known bugs to make tests fail,
// practice detection, and demo auto-fixing/visual regression.
// ============================================================

const BUGS = [
  // ── Visual bugs ─────────────────────────────────────────
  {
    id: 'bug-primary-color',
    label: 'Change primary color → red',
    section: 'Visual Bugs (Module 3)',
    apply: () => document.documentElement.style.setProperty('--primary', '#ff4444'),
    revert: () => document.documentElement.style.removeProperty('--primary'),
  },
  {
    id: 'bug-hero-gradient',
    label: 'Break hero background',
    section: 'Visual Bugs (Module 3)',
    apply: () => {
      const hero = document.querySelector('[data-testid="hero"]');
      if (hero) hero.style.background = '#0f0f13';
    },
    revert: () => {
      const hero = document.querySelector('[data-testid="hero"]');
      if (hero) hero.style.background = '';
    },
  },
  {
    id: 'bug-hide-logo',
    label: 'Hide navbar logo',
    section: 'Visual Bugs (Module 3)',
    apply: () => {
      const logo = document.querySelector('[data-testid="logo"]');
      if (logo) logo.style.visibility = 'hidden';
    },
    revert: () => {
      const logo = document.querySelector('[data-testid="logo"]');
      if (logo) logo.style.visibility = '';
    },
  },
  // ── Content bugs ────────────────────────────────────────
  {
    id: 'bug-wrong-prices',
    label: 'Wrong product prices (×10)',
    section: 'Content Bugs (Module 2 & 3)',
    apply: () => {
      document.querySelectorAll('[data-testid^="product-price-"]').forEach(el => {
        if (!el.dataset.original) el.dataset.original = el.textContent;
        const num = parseFloat(el.textContent.replace('$', '')) * 10;
        el.textContent = '$' + num.toFixed(2);
      });
    },
    revert: () => {
      document.querySelectorAll('[data-testid^="product-price-"]').forEach(el => {
        if (el.dataset.original) { el.textContent = el.dataset.original; delete el.dataset.original; }
      });
    },
  },
  {
    id: 'bug-duplicate-card',
    label: 'Duplicate first product card',
    section: 'Content Bugs (Module 2 & 3)',
    apply: () => {
      const grid = document.querySelector('[data-testid="product-grid"]');
      if (!grid || grid.dataset.duplicated) return;
      const first = grid.firstElementChild;
      if (first) { const clone = first.cloneNode(true); clone.dataset.bugClone = 'true'; grid.prepend(clone); grid.dataset.duplicated = 'true'; }
    },
    revert: () => {
      const clone = document.querySelector('[data-bug-clone="true"]');
      if (clone) clone.remove();
      const grid = document.querySelector('[data-testid="product-grid"]');
      if (grid) delete grid.dataset.duplicated;
    },
  },
  {
    id: 'bug-empty-names',
    label: 'Clear all product names',
    section: 'Content Bugs (Module 2 & 3)',
    apply: () => {
      document.querySelectorAll('[data-testid^="product-name-"]').forEach(el => {
        if (!el.dataset.original) el.dataset.original = el.textContent;
        el.textContent = '';
      });
    },
    revert: () => {
      document.querySelectorAll('[data-testid^="product-name-"]').forEach(el => {
        if (el.dataset.original) { el.textContent = el.dataset.original; delete el.dataset.original; }
      });
    },
  },
  // ── Locator / DOM bugs ───────────────────────────────────
  {
    id: 'bug-rename-add-to-cart',
    label: 'Rename add-to-cart test IDs',
    section: 'Locator Bugs (Module 2)',
    apply: () => {
      document.querySelectorAll('[data-testid^="add-to-cart-"]').forEach(el => {
        el.dataset.testidOriginal = el.dataset.testid;
        el.dataset.testid = el.dataset.testid.replace('add-to-cart-', 'add-btn-');
      });
    },
    revert: () => {
      document.querySelectorAll('[data-testid^="add-btn-"]').forEach(el => {
        if (el.dataset.testidOriginal) { el.dataset.testid = el.dataset.testidOriginal; delete el.dataset.testidOriginal; }
      });
    },
  },
  {
    id: 'bug-remove-cart-count',
    label: 'Remove cart count element',
    section: 'Locator Bugs (Module 2)',
    apply: () => {
      document.querySelectorAll('[data-testid="cart-count"]').forEach(el => {
        el.dataset.hiddenForBug = 'true';
        el.setAttribute('data-testid', 'cart-count-broken');
      });
    },
    revert: () => {
      document.querySelectorAll('[data-testid="cart-count-broken"]').forEach(el => {
        el.setAttribute('data-testid', 'cart-count');
        delete el.dataset.hiddenForBug;
      });
    },
  },
  {
    id: 'bug-break-filter',
    label: 'Break category filter (no-op)',
    section: 'Locator Bugs (Module 2)',
    apply: () => {
      const sel = document.querySelector('[data-testid="category-filter"]');
      if (sel) { sel.dataset.origOnchange = sel.getAttribute('onchange') || ''; sel.setAttribute('onchange', ''); }
    },
    revert: () => {
      const sel = document.querySelector('[data-testid="category-filter"]');
      if (sel && sel.dataset.origOnchange !== undefined) {
        sel.setAttribute('onchange', sel.dataset.origOnchange);
        delete sel.dataset.origOnchange;
      }
    },
  },
  {
    id: 'bug-hide-checkout-btn',
    label: 'Hide checkout button',
    section: 'Locator Bugs (Module 2)',
    apply: () => {
      const btn = document.querySelector('[data-testid="checkout-btn"]') || document.querySelector('[data-testid="place-order-btn"]');
      if (btn) btn.style.display = 'none';
    },
    revert: () => {
      const btn = document.querySelector('[data-testid="checkout-btn"]') || document.querySelector('[data-testid="place-order-btn"]');
      if (btn) btn.style.display = '';
    },
  },
];

// ── Persist active bugs across page loads ────────────────────
function getActiveBugs() {
  try { return JSON.parse(localStorage.getItem('techshop-bugs') || '[]'); } catch { return []; }
}
function saveActiveBugs(ids) {
  localStorage.setItem('techshop-bugs', JSON.stringify(ids));
}

function applyActiveBugs() {
  const active = getActiveBugs();
  active.forEach(id => {
    const bug = BUGS.find(b => b.id === id);
    if (bug) { try { bug.apply(); } catch (e) { /* element not on this page */ } }
  });
}

// ── Build the panel UI ───────────────────────────────────────
function buildBugPanel() {
  const toggle = document.createElement('button');
  toggle.className = 'bug-panel-toggle';
  toggle.title = 'Bug Injection Panel (QA Training)';
  toggle.setAttribute('data-testid', 'bug-panel-toggle');
  toggle.textContent = '🐛';

  const panel = document.createElement('div');
  panel.className = 'bug-panel';
  panel.setAttribute('data-testid', 'bug-panel');

  const title = document.createElement('div');
  title.className = 'bug-panel-title';
  title.textContent = '🐛 Bug Injection Panel';
  panel.appendChild(title);

  let lastSection = '';
  const active = getActiveBugs();

  BUGS.forEach(bug => {
    if (bug.section !== lastSection) {
      const label = document.createElement('div');
      label.className = 'bug-section-label';
      label.textContent = bug.section;
      panel.appendChild(label);
      lastSection = bug.section;
    }

    const row = document.createElement('button');
    row.className = 'bug-toggle' + (active.includes(bug.id) ? ' active' : '');
    row.setAttribute('data-testid', 'bug-toggle-' + bug.id);
    row.setAttribute('data-bug-id', bug.id);

    const dot = document.createElement('span');
    dot.className = 'bug-toggle-indicator';
    row.appendChild(dot);

    const lbl = document.createElement('span');
    lbl.style.flex = '1';
    lbl.style.textAlign = 'left';
    lbl.textContent = bug.label;
    row.appendChild(lbl);

    row.addEventListener('click', () => {
      const ids = getActiveBugs();
      if (ids.includes(bug.id)) {
        ids.splice(ids.indexOf(bug.id), 1);
        row.classList.remove('active');
        try { bug.revert(); } catch (e) { /* ok */ }
      } else {
        ids.push(bug.id);
        row.classList.add('active');
        try { bug.apply(); } catch (e) { /* ok */ }
      }
      saveActiveBugs(ids);
    });

    panel.appendChild(row);
  });

  const reset = document.createElement('button');
  reset.className = 'bug-reset';
  reset.setAttribute('data-testid', 'bug-reset');
  reset.textContent = 'Reset All Bugs';
  reset.addEventListener('click', () => {
    BUGS.forEach(bug => { try { bug.revert(); } catch (e) { /* ok */ } });
    saveActiveBugs([]);
    panel.querySelectorAll('.bug-toggle').forEach(r => r.classList.remove('active'));
  });
  panel.appendChild(reset);

  toggle.addEventListener('click', () => panel.classList.toggle('open'));

  document.body.appendChild(toggle);
  document.body.appendChild(panel);
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  applyActiveBugs();
  buildBugPanel();
});
