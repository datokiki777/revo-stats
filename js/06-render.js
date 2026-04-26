import { formatMoney, formatDate, escapeHtml } from './03-utils.js';
import { UI } from './01-config.js';

export function renderSummary(stats) {
  document.getElementById('incomeValue').textContent = formatMoney(stats.income);
  document.getElementById('expenseValue').textContent = formatMoney(stats.expenses);
  document.getElementById('netValue').textContent = formatMoney(stats.net);
  document.getElementById('feeValue').textContent = formatMoney(stats.fees);
}

export function renderMonthlyStats(months, selectedMonthIndex = 0) {
  const root = document.getElementById('monthlyStats');

  if (!months.length) {
    root.className = 'monthly-list empty-state';
    root.textContent = 'No data yet';
    return;
  }

  const index = Math.max(0, Math.min(selectedMonthIndex, months.length - 1));
  const item = months[index];
  const net = Number(item.income || 0) - Number(item.expenses || 0);
  const monthLabel = formatMonthLabel(item.monthKey);

  root.className = 'monthly-list monthly-slider';
  root.innerHTML = `
    <article class="month-card month-card-single">
      <div class="month-top">
        <button class="month-nav-btn" type="button" data-month-nav="prev">‹</button>

        <div class="month-head-center">
          <div class="month-title">${escapeHtml(monthLabel)}</div>
          <div class="month-meta">${item.count} transactions • ${index + 1}/${months.length}</div>
        </div>

        <button class="month-nav-btn" type="button" data-month-nav="next">›</button>
      </div>

      <div class="month-lines">
        <div class="month-line">
          <span>Income</span>
          <strong class="month-amount income">${formatMoney(item.income)}</strong>
        </div>

        <div class="month-line">
          <span>Expenses</span>
          <strong class="month-amount expense">${formatMoney(item.expenses)}</strong>
        </div>

        <div class="month-line">
          <span>Net</span>
          <strong class="month-amount net">${formatMoney(net)}</strong>
        </div>

        <div class="month-line">
          <span>Fees</span>
          <strong class="month-amount fee">${formatMoney(item.fees)}</strong>
        </div>
      </div>
    </article>
  `;
}

export function renderTransactions(transactions, expandedMerchants = {}) {
  const root = document.getElementById('transactionsList');

  const groups = groupTransactionsByMerchant(transactions);
  document.getElementById('visibleCount').textContent = `${groups.length} groups`;

  if (!groups.length) {
    root.className = 'tx-list empty-state';
    root.textContent = 'No transactions match current filters';
    return;
  }

  root.className = 'tx-list';

  root.innerHTML = groups.map((group) => {
    const isOpen = !!expandedMerchants[group.key];
    const totalClass = group.total >= 0 ? 'income' : 'expense';

    const childrenHtml = group.items.map((tx) => {
      const amountClass = tx.amount >= 0 ? 'income' : 'expense';
      const feeText = Number(tx.fee || 0) === 0
        ? ''
        : `Fee: ${formatMoney(tx.fee, tx.currency || 'EUR')}`;

      return `
        <article class="tx-row child-tx-row">
          <div class="tx-left">
            <div class="tx-main">
              <div class="tx-sub">
                ${escapeHtml(formatDate(tx.dateCompleted))} • ${escapeHtml(tx.type || 'Unknown type')}
              </div>

              <div class="tx-meta-line">
                <span class="badge">${escapeHtml(tx.currency || '—')}</span>
                <span class="badge">${escapeHtml(tx.state || '—')}</span>
                <span class="badge">${escapeHtml(tx.category || 'Other')}</span>
              </div>
            </div>
          </div>

          <div class="tx-right">
            <div class="amount ${amountClass}">
              ${formatMoney(tx.amount, tx.currency || 'EUR')}
            </div>

            ${feeText ? `<div class="tx-fee">${feeText}</div>` : ''}
          </div>
        </article>
      `;
    }).join('');

    return `
      <article class="merchant-card">
        <div class="merchant-summary">
          <div
            class="merchant-summary-left"
            data-merchant-toggle="${escapeHtml(group.key)}"
          >
            <div class="merchant-name">${escapeHtml(group.name)}</div>

            <div class="merchant-sub">
              ${group.count} transactions • Last: ${escapeHtml(formatDate(group.lastDate))}
            </div>
          </div>

          <div class="merchant-summary-right">
            <button
              class="change-type-btn merchant-change-btn"
              type="button"
              data-change-merchant="${escapeHtml(group.key)}"
            >
              Change
            </button>

            <div class="merchant-total ${totalClass}">
              ${formatMoney(group.total, group.currency || 'EUR')}
            </div>
          </div>
        </div>

        <div class="merchant-children ${isOpen ? 'open' : ''}">
          ${childrenHtml}
        </div>
      </article>
    `;
  }).join('');
}

function groupTransactionsByMerchant(transactions) {
  const map = new Map();

  for (const tx of transactions) {
    const name = normalizeMerchantName(tx.description || 'Unknown');
    const key = name.toLowerCase();
    const currency = tx.currency || 'EUR';

    if (!map.has(key)) {
      map.set(key, {
        key,
        name,
        currency,
        count: 0,
        total: 0,
        lastDate: tx.dateCompleted || '',
        items: []
      });
    }

    const group = map.get(key);
    group.count += 1;
    group.total += Number(tx.amount || 0);
    group.items.push(tx);

    if ((tx.dateCompleted || '') > (group.lastDate || '')) {
      group.lastDate = tx.dateCompleted || '';
    }
  }

  const groups = [...map.values()];

  groups.forEach((group) => {
    group.items.sort((a, b) => {
      const da = new Date(a.dateCompleted || 0).getTime();
      const db = new Date(b.dateCompleted || 0).getTime();
      return db - da;
    });
  });

  groups.sort((a, b) => {
    const da = new Date(a.lastDate || 0).getTime();
    const db = new Date(b.lastDate || 0).getTime();
    return db - da;
  });

  return groups;
}

function normalizeMerchantName(description) {
  const text = String(description || '').trim();

  if (!text) return 'Unknown';

  const lower = text.toLowerCase();

  if (lower.includes('aldi')) return 'ALDI';
  if (lower.includes('lidl')) return 'LIDL';
  if (lower.includes('rewe')) return 'REWE';
  if (lower.includes('netto')) return 'NETTO';
  if (lower.includes('edeka')) return 'EDEKA';
  if (lower.includes('kaufland')) return 'KAUFLAND';
  if (lower.includes('penny')) return 'PENNY';
  if (lower.includes('burger king')) return 'Burger King';
  if (lower.includes('mcdonald')) return 'McDonald’s';
  if (lower.includes('subway')) return 'Subway';
  if (lower.includes('deutsche bahn') || lower.includes(' db ')) return 'Deutsche Bahn';
  if (lower.includes('ruhrbahn')) return 'Ruhrbahn';
  if (lower.includes('uber')) return 'Uber';
  if (lower.includes('bolt')) return 'Bolt';

  return text;
}

export function renderFilterOptions({ types, currencies }) {
  const typeSelect = document.getElementById('typeFilter');
  const currencySelect = document.getElementById('currencyFilter');

  typeSelect.innerHTML = `
    <option value="all">All types</option>
    ${types.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join('')}
  `;

  currencySelect.innerHTML = `
    <option value="all">All currencies</option>
    ${currencies.map((currency) => `<option value="${escapeHtml(currency)}">${escapeHtml(currency)}</option>`).join('')}
  `;
}

export function renderMeta({ importsCount, txCount, statusText }) {
  document.getElementById('importCount').textContent = String(importsCount);
  document.getElementById('txCount').textContent = String(txCount);
  document.getElementById('statusText').textContent = statusText;
}

export function renderSelectedImportLabel(imports, selectedId) {
  const el = document.getElementById('selectedImportName');
  if (!el) return;

  if (!selectedId) {
    el.textContent = 'All imports';
    return;
  }

  const found = imports.find((imp) => imp.id === selectedId);
  el.textContent = found ? found.fileName : 'All imports';
}

export function renderImportModal(imports, selectedId) {
  const root = document.getElementById('modalImportList');
  if (!root) return;

  if (!imports.length) {
    root.className = 'modal-import-list empty-state';
    root.textContent = 'No imports yet';
    return;
  }

  root.className = 'modal-import-list';
  root.innerHTML = imports
    .map((imp) => {
      const active = imp.id === selectedId;

      return `
        <div class="modal-import-card">
          <div class="modal-import-main" data-select-import="${imp.id}">
            <div class="modal-import-name">${escapeHtml(imp.fileName)}</div>
            <div class="modal-import-sub">
              ${imp.rowCount} rows • ${escapeHtml((imp.dateFrom || '').slice(0, 10))} → ${escapeHtml((imp.dateTo || '').slice(0, 10))}
            </div>
            <div class="modal-import-date muted">
              ${escapeHtml((imp.importedAt || '').slice(0, 10))}
            </div>
          </div>

          <div class="modal-import-actions">
            <button
              class="import-btn ${active ? 'active' : ''}"
              type="button"
              data-select-import="${imp.id}"
            >
              ${active ? 'Selected' : 'View'}
            </button>

            <button
              class="import-btn danger"
              type="button"
              data-delete-import="${imp.id}"
            >
              Delete
            </button>
          </div>
        </div>
      `;
    })
    .join('');
}

export function renderTypeFilterLabel(typeValue) {
  const el = document.getElementById('typeFilterLabel');
  if (!el) return;

  el.textContent = typeValue === 'all' ? 'All types' : typeValue;
}

export function renderTypeModal(selectedType) {
  const root = document.getElementById('typeModalList');
  if (!root) return;

  const options = [
    'all',
    'Food',
    'Tickets',
    'Transport',
    'Shopping',
    'Transfers',
    'Cash',
    'Fees',
    'Other'
  ];

  root.innerHTML = options.map((item) => {
    const active = item === selectedType;
    const label = item === 'all' ? 'All types' : item;

    return `
      <button
        class="type-option ${active ? 'active' : ''}"
        type="button"
        data-type-option="${item}"
      >
        ${escapeHtml(label)}
      </button>
    `;
  }).join('');
}

function formatMonthLabel(monthKey) {
  const months = {
    '01': 'January',
    '02': 'February',
    '03': 'March',
    '04': 'April',
    '05': 'May',
    '06': 'June',
    '07': 'July',
    '08': 'August',
    '09': 'September',
    '10': 'October',
    '11': 'November',
    '12': 'December'
  };

  const [year, month] = String(monthKey || '').split('-');
  return `${months[month] || monthKey} ${year || ''}`.trim();
}