import { formatMoney, formatDate, escapeHtml } from './03-utils.js';
import { UI } from './01-config.js';

export function renderSummary(stats) {
  document.getElementById('incomeValue').textContent = formatMoney(stats.income);
  document.getElementById('expenseValue').textContent = formatMoney(stats.expenses);
  document.getElementById('netValue').textContent = formatMoney(stats.net);
  document.getElementById('feeValue').textContent = formatMoney(stats.fees);
}

export function renderMonthlyStats(months) {
  const root = document.getElementById('monthlyStats');

  if (!months.length) {
    root.className = 'monthly-list empty-state';
    root.textContent = 'No data yet';
    return;
  }

  root.className = 'monthly-list';
  root.innerHTML = months
    .map((item) => {
      return `
        <article class="month-card">
          <div>
            <div class="month-title">${escapeHtml(item.monthKey)}</div>
            <div class="month-meta">${item.count} transactions</div>
          </div>
          <div><strong>Income:</strong> ${formatMoney(item.income)}</div>
          <div><strong>Expenses:</strong> ${formatMoney(item.expenses)}</div>
          <div><strong>Fees:</strong> ${formatMoney(item.fees)}</div>
        </article>
      `;
    })
    .join('');
}

export function renderTransactions(transactions) {
  const root = document.getElementById('transactionsList');
  const visible = transactions.slice(0, UI.maxTransactionsShown);

  document.getElementById('visibleCount').textContent = `${visible.length} shown`;

  if (!visible.length) {
    root.className = 'tx-list empty-state';
    root.textContent = 'No transactions match current filters';
    return;
  }

  root.className = 'tx-list';
root.innerHTML = visible
  .map((tx) => {
    const amountClass = tx.amount >= 0 ? 'income' : 'expense';

    return `
      <article class="tx-row">
        <div class="tx-left">
          <div class="tx-main">
            <div class="tx-desc">${escapeHtml(tx.description || '(No description)')}</div>
            <div class="tx-sub">
              ${escapeHtml(formatDate(tx.dateCompleted))} • ${escapeHtml(tx.type || 'Unknown type')}
            </div>
            <div class="tx-meta-line">
              <span class="badge">${escapeHtml(tx.currency || '—')}</span>
              <span class="badge">${escapeHtml(tx.state || '—')}</span>
            </div>
          </div>
        </div>

        <div class="tx-right">
          <div class="amount ${amountClass}">
            ${formatMoney(tx.amount, tx.currency || 'EUR')}
          </div>
          <div class="tx-fee">
            Fee: ${formatMoney(tx.fee, tx.currency || 'EUR')}
          </div>
        </div>
      </article>
    `;
  })
  .join('');
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

export function renderImports(imports, selectedId) {
  const root = document.getElementById('importsList');

  if (!root) return;

  if (!imports.length) {
    root.className = 'imports-list empty-state';
    root.textContent = 'No imports yet';
    return;
  }

  root.className = 'imports-list';

  root.innerHTML = imports.map((imp) => {
    const isActive = imp.id === selectedId;

    return `
      <div class="import-row">
        <div class="import-main">
          <div class="import-name">${escapeHtml(imp.fileName)}</div>
          <div class="import-sub">
            ${imp.rowCount} rows • ${escapeHtml((imp.dateFrom || '').slice(0, 10))} → ${escapeHtml((imp.dateTo || '').slice(0, 10))}
          </div>
        </div>

        <div class="muted">${escapeHtml((imp.importedAt || '').slice(0, 10))}</div>

        <button
          class="import-btn ${isActive ? 'active' : ''}"
          type="button"
          data-select-import="${imp.id}"
        >
          ${isActive ? 'Selected' : 'View'}
        </button>

        <button
          class="import-btn danger"
          type="button"
          data-delete-import="${imp.id}"
        >
          Delete
        </button>
      </div>
    `;
  }).join('');
}