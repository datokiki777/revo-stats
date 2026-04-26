import { STORES, DEFAULT_FILTERS } from './01-config.js';
import {
  openDB,
  dbGetAll,
  dbBulkPut,
  dbPut,
  clearAllAppData,
  dbDelete,
  dbDeleteByIndex
} from './02-db.js';
import { readFileText, parseCSV, normalizeTransactions, buildImportMeta, buildSmartFingerprint } from './04-parser.js';
import {
  calcOverviewStats,
  calcMonthlyStats,
  applyFilters
} from './05-stats.js';
import {
  renderSummary,
  renderMonthlyStats,
  renderTransactions,
  renderMeta,
  renderImportModal,
  renderSelectedImportLabel,
  renderTypeFilterLabel,
  renderTypeModal
} from './06-render.js';
import { bindEvents } from './07-events.js';
import { sortByDateDesc } from './03-utils.js';

const state = {
  transactions: [],
  imports: [],
  selectedImportId: null,
  selectedMonthIndex: 0,
  expandedMerchants: {},
  filters: { ...DEFAULT_FILTERS },
  updateWorker: null,
  updateReady: false
};

async function initApp() {
  try {
    await openDB();
    await loadStateFromDB();
    const rules = await dbGetAll('rules');
window.__categoryRules = rules || [];
    refreshUI();

    bindEvents({
  onFileChange: handleFileChange,
  onSearchInput: handleSearchInput,
  onClearData: handleClearData,
  onSelectImport: handleSelectImport,
  onDeleteImport: handleDeleteImport,
  onOpenImportModal: openImportModal,
  onCloseImportModal: closeImportModal,
  onShowAllImports: handleShowAllImports,
  onOpenTypeModal: openTypeModal,
  onCloseTypeModal: closeTypeModal,
  onTypeSelect: handleTypeSelect,
  onMerchantToggle: handleMerchantToggle,
  onMonthNav: handleMonthNav,
  onChangeType: handleChangeType,
  onChangeMerchant: handleChangeMerchant,
  onDismissUpdate: dismissUpdateModal,
      onApplyUpdate: applyAppUpdate
});

    initTopToggle();

    await registerServiceWorker();

    renderMeta({
      importsCount: state.imports.length,
      txCount: state.transactions.length,
      statusText: 'Ready'
    });
  } catch (error) {
    console.error(error);
    renderMeta({
      importsCount: 0,
      txCount: 0,
      statusText: 'Init failed'
    });
  }
}

async function loadStateFromDB() {
  const [transactions, imports, settings] = await Promise.all([
  dbGetAll(STORES.transactions),
  dbGetAll(STORES.imports),
  dbGetAll(STORES.settings)
]);

  state.transactions = sortByDateDesc(transactions, (item) => item.dateCompleted);
  state.imports = imports.sort((a, b) => (b.importedAt || '').localeCompare(a.importedAt || ''));
  const selectedSetting = settings.find((item) => item.key === 'selectedImportId');
const savedSelectedId = selectedSetting?.value || null;

const exists = imports.some((imp) => imp.id === savedSelectedId);
state.selectedImportId = exists ? savedSelectedId : null;
}

function refreshUI() {
  let baseTransactions = state.transactions;

  if (state.selectedImportId) {
    baseTransactions = baseTransactions.filter(
      (tx) => tx.importId === state.selectedImportId
    );
  }

  const filtered = applyFilters(baseTransactions, state.filters);
const summary = calcOverviewStats(filtered);
const months = calcMonthlyStats(filtered);

if (state.selectedMonthIndex > months.length - 1) {
  state.selectedMonthIndex = 0;
}

const selectedMonth = months[state.selectedMonthIndex];
const monthTransactions = selectedMonth
  ? filtered.filter((tx) => tx.monthKey === selectedMonth.monthKey)
  : filtered;

renderSummary(summary);
renderMonthlyStats(months, state.selectedMonthIndex);
renderTransactions(monthTransactions, state.expandedMerchants);
renderImportModal(state.imports, state.selectedImportId);
renderSelectedImportLabel(state.imports, state.selectedImportId);
renderTypeFilterLabel(state.filters.type);
renderTypeModal(state.filters.type);
restoreFilterValues();

  renderMeta({
    importsCount: state.imports.length,
    txCount: state.transactions.length,
    statusText: 'Ready'
  });
}

function restoreFilterValues() {
  document.getElementById('searchInput').value = state.filters.search;
}

async function handleFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    renderMeta({
      importsCount: state.imports.length,
      txCount: state.transactions.length,
      statusText: 'Reading file...'
    });

    const text = await readFileText(file);
    const rawRows = parseCSV(text);

    const importMeta = buildImportMeta(file.name, []);
    const parsedTransactions = normalizeTransactions(rawRows, importMeta.id);

    const existingFingerprints = new Set(
      state.transactions.map((tx) => tx.fingerprint || buildSmartFingerprint(tx))
    );

    const transactions = [];
    let skippedDuplicates = 0;

    for (const tx of parsedTransactions) {
      const fingerprint = tx.fingerprint || buildSmartFingerprint(tx);

      if (existingFingerprints.has(fingerprint)) {
        skippedDuplicates += 1;
        continue;
      }

      tx.fingerprint = fingerprint;
      existingFingerprints.add(fingerprint);
      transactions.push(tx);
    }

    importMeta.rowCount = transactions.length;
    importMeta.currencies = [...new Set(transactions.map((tx) => tx.currency).filter(Boolean))];

    const dates = transactions
      .map((tx) => tx.dateCompleted)
      .filter(Boolean)
      .sort();

    importMeta.dateFrom = dates[0] || '';
    importMeta.dateTo = dates[dates.length - 1] || '';

    await dbPut(STORES.imports, importMeta);
    await dbBulkPut(STORES.transactions, transactions);

    state.imports.unshift(importMeta);
    state.transactions = sortByDateDesc(
      [...transactions, ...state.transactions],
      (item) => item.dateCompleted
    );

    state.selectedImportId = importMeta.id;

await dbPut(STORES.settings, {
  key: 'selectedImportId',
  value: importMeta.id
});

state.selectedMonthIndex = 0;
state.expandedMerchants = {};

    refreshUI();
    closeImportModal();

    renderMeta({
      importsCount: state.imports.length,
      txCount: state.transactions.length,
      statusText: `Imported ${transactions.length} rows • ${skippedDuplicates} duplicates skipped`
    });
  } catch (error) {
    console.error(error);
    renderMeta({
      importsCount: state.imports.length,
      txCount: state.transactions.length,
      statusText: 'Import failed'
    });
  } finally {
    event.target.value = '';
  }
}

function handleSearchInput(event) {
  state.filters.search = event.target.value || '';
  state.selectedMonthIndex = 0;
  state.expandedMerchants = {};
  refreshUI();
}

function handleTypeSelect(typeValue) {
  state.filters.type = typeValue || 'all';
  state.selectedMonthIndex = 0;
  state.expandedMerchants = {};
  refreshUI();
  closeTypeModal();
}

function handleMerchantToggle(merchantKey) {
  state.expandedMerchants[merchantKey] = !state.expandedMerchants[merchantKey];
  refreshUI();
}

function handleMonthNav(direction) {
  let baseTransactions = state.transactions;

  if (state.selectedImportId) {
    baseTransactions = baseTransactions.filter(
      (tx) => tx.importId === state.selectedImportId
    );
  }

  const filtered = applyFilters(baseTransactions, state.filters);
  const months = calcMonthlyStats(filtered);

  if (!months.length) return;

  if (direction === 'next') {
  state.selectedMonthIndex -= 1;
} else {
  state.selectedMonthIndex += 1;
}

  if (state.selectedMonthIndex < 0) {
    state.selectedMonthIndex = months.length - 1;
  }

  if (state.selectedMonthIndex > months.length - 1) {
    state.selectedMonthIndex = 0;
  }

  state.expandedMerchants = {};
  refreshUI();
}

async function handleChangeType(txId) {
  const tx = state.transactions.find((item) => item.id === txId);
  if (!tx) return;

  const newCategory = window.prompt(
    'Enter category: Food, Tickets, Transport, Shopping, Transfers, Cash, Fees, Other',
    tx.category || 'Other'
  );

  if (!newCategory) return;

  const category = newCategory.trim();
  const remember = window.confirm('Remember this merchant for future imports?');

  const key = String(tx.description || '').trim().toLowerCase();
  if (!key) return;

  let changedCount = 0;

  for (const item of state.transactions) {
    const desc = String(item.description || '').trim().toLowerCase();

    if (desc.includes(key) || key.includes(desc)) {
      item.category = category;
      changedCount += 1;
    }
  }

  await dbBulkPut(STORES.transactions, state.transactions);

  if (remember) {
    const rule = {
      key,
      category
    };

    await dbPut('rules', rule);

    window.__categoryRules = window.__categoryRules || [];
    window.__categoryRules.push(rule);
  }

  refreshUI();

  renderMeta({
    importsCount: state.imports.length,
    txCount: state.transactions.length,
    statusText: `Updated ${changedCount} transactions to ${category}`
  });
}

async function handleChangeMerchant(merchantKey) {
  const matching = state.transactions.filter((tx) => {
    const desc = String(tx.description || '').trim().toLowerCase();
    return desc === merchantKey || desc.includes(merchantKey);
  });

  if (!matching.length) return;

  const currentCategory = matching[0].category || 'Other';
  const result = await askCategoryPicker(currentCategory);

  if (!result) return;

  const { category, remember } = result;
  let changedCount = 0;

  for (const tx of state.transactions) {
    const desc = String(tx.description || '').trim().toLowerCase();

    if (desc === merchantKey || desc.includes(merchantKey)) {
      tx.category = category;
      changedCount += 1;
    }
  }

  await dbBulkPut(STORES.transactions, state.transactions);

  if (remember) {
    const rule = {
      key: merchantKey,
      category
    };

    await dbPut('rules', rule);

    window.__categoryRules = window.__categoryRules || [];
    window.__categoryRules.push(rule);
  }

  state.selectedMonthIndex = 0;
  state.expandedMerchants = {};
  refreshUI();

  renderMeta({
    importsCount: state.imports.length,
    txCount: state.transactions.length,
    statusText: `Updated ${changedCount} transactions to ${category}`
  });
}

function openTypeModal() {
  document.getElementById('typeModal').classList.remove('hidden');
}

function closeTypeModal() {
  document.getElementById('typeModal').classList.add('hidden');
}

async function handleClearData() {
  const ok = await askConfirm(
    'Clear all data?',
    'This will delete all imported files, transactions and saved category rules from this app.',
    'Clear Data'
  );

  if (!ok) return;

  try {
    await clearAllAppData();

    state.transactions = [];
    state.imports = [];
    state.selectedImportId = null;
    state.selectedMonthIndex = 0;
    state.expandedMerchants = {};
    state.filters = { ...DEFAULT_FILTERS };

    window.__categoryRules = [];

    refreshUI();
    closeImportModal();

    renderMeta({
      importsCount: 0,
      txCount: 0,
      statusText: 'All data cleared'
    });
  } catch (error) {
    console.error(error);

    renderMeta({
      importsCount: state.imports.length,
      txCount: state.transactions.length,
      statusText: 'Clear failed'
    });
  }
}

async function handleSelectImport(importId) {
  state.selectedImportId = importId;
  await dbPut(STORES.settings, {
  key: 'selectedImportId',
  value: importId
});
  state.selectedMonthIndex = 0;
  state.expandedMerchants = {};
  refreshUI();
  renderMeta({
  importsCount: state.imports.length,
  txCount: state.transactions.length,
  statusText: 'File selected'
});
  closeImportModal();
}

async function handleShowAllImports() {
  state.selectedImportId = null;
  await dbPut(STORES.settings, {
  key: 'selectedImportId',
  value: null
});
  state.selectedMonthIndex = 0;
  state.expandedMerchants = {};
  refreshUI();
  closeImportModal();
}

async function handleDeleteImport(importId) {
  const ok = await askConfirm(
  'Delete this file?',
  'This will delete this import and all transactions from it.',
  'Delete'
);
  if (!ok) return;

  try {
    await dbDeleteByIndex(STORES.transactions, 'importId', importId);
    await dbDelete(STORES.imports, importId);

    state.transactions = state.transactions.filter((tx) => tx.importId !== importId);
    state.imports = state.imports.filter((imp) => imp.id !== importId);

    if (state.selectedImportId === importId) {
      state.selectedImportId = null;
      await dbPut(STORES.settings, {
  key: 'selectedImportId',
  value: null
});
    }
    state.expandedMerchants = {};

    refreshUI();

    renderMeta({
      importsCount: state.imports.length,
      txCount: state.transactions.length,
      statusText: 'Import deleted'
    });
  } catch (error) {
    console.error(error);
    renderMeta({
      importsCount: state.imports.length,
      txCount: state.transactions.length,
      statusText: 'Delete failed'
    });
  }
}

function openImportModal() {
  document.getElementById('importModal').classList.remove('hidden');
}

function closeImportModal() {
  document.getElementById('importModal').classList.add('hidden');
}

function showUpdateModal() {
  state.updateReady = true;
  document.getElementById('updateModal')?.classList.remove('hidden');
}

function dismissUpdateModal() {
  state.updateReady = false;
  document.getElementById('updateModal')?.classList.add('hidden');
}

function applyAppUpdate() {
  if (!state.updateWorker) return;

  userTriggeredUpdate = true; // 🔥 ეს ამატებს კონტროლს

  state.updateWorker.postMessage({ type: 'SKIP_WAITING' });
  dismissUpdateModal();
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.register('./service-worker.js');

    if (registration.waiting) {
      state.updateWorker = registration.waiting;
      showUpdateModal();
    }

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (
          newWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          state.updateWorker = newWorker;
          showUpdateModal();
        }
      });
    });

    let refreshingAfterUpdate = false;
let userTriggeredUpdate = false;

navigator.serviceWorker.addEventListener('controllerchange', () => {
  if (!userTriggeredUpdate) return; // 🔥 მთავარი ფიქსი

  if (refreshingAfterUpdate) return;
  refreshingAfterUpdate = true;

  window.location.reload();
});
  } catch (error) {
    console.error('SW registration failed:', error);
  }
}

function askConfirm(title, message, confirmText = 'Delete') {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal';

    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-sheet confirm-sheet">
        <div class="modal-sheet-header">
          <h3>${title}</h3>
          <button class="modal-close" type="button" data-confirm-cancel>✕</button>
        </div>

        <p class="confirm-message">${message}</p>

        <div class="confirm-actions">
          <button class="btn" type="button" data-confirm-cancel>Cancel</button>
          <button class="btn danger" type="button" data-confirm-ok>${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelectorAll('[data-confirm-cancel]').forEach((btn) => {
      btn.addEventListener('click', () => {
        modal.remove();
        resolve(false);
      });
    });

    modal.querySelector('[data-confirm-ok]').addEventListener('click', () => {
      modal.remove();
      resolve(true);
    });

    modal.querySelector('.modal-backdrop').addEventListener('click', () => {
      modal.remove();
      resolve(false);
    });
  });
}

function askCategoryPicker(currentCategory = 'Other') {
  return new Promise((resolve) => {
    const categories = [
      'Food',
      'Tickets',
      'Transport',
      'Shopping',
      'Transfers',
      'Cash',
      'Fees',
      'Other'
    ];

    const modal = document.createElement('div');
    modal.className = 'modal';

    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-sheet category-sheet">
        <div class="modal-sheet-header">
          <h3>Change category</h3>
          <button class="modal-close" type="button" data-category-cancel>✕</button>
        </div>

        <div class="category-options">
          ${categories.map((cat) => `
            <button
              class="category-option ${cat === currentCategory ? 'active' : ''}"
              type="button"
              data-category-value="${cat}"
            >
              ${cat}
            </button>
          `).join('')}
        </div>

        <div class="remember-row">
          <label>
            <input type="checkbox" data-category-remember checked>
            Remember this merchant for future imports
          </label>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = (value) => {
      modal.remove();
      resolve(value);
    };

    modal.querySelectorAll('[data-category-cancel]').forEach((btn) => {
      btn.addEventListener('click', () => close(null));
    });

    modal.querySelector('.modal-backdrop').addEventListener('click', () => close(null));

    modal.querySelectorAll('[data-category-value]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const category = btn.getAttribute('data-category-value');
        const remember = modal.querySelector('[data-category-remember]')?.checked;
        close({ category, remember });
      });
    });
  });
}

function initTopToggle() {
  const toggle = document.getElementById('topToggle');
  const section = document.getElementById('topSection');

  let collapsed = true;
  let touchStartY = 0;
  let lastScrollY = window.scrollY;

  section.classList.add('collapsed');
  toggle.classList.add('collapsed');

  function setCollapsed(value) {
    collapsed = value;
    section.classList.toggle('collapsed', collapsed);
    toggle.classList.toggle('collapsed', collapsed);
  }

  toggle.addEventListener('click', () => {
    setCollapsed(!collapsed);
  });

  toggle.addEventListener('touchstart', (event) => {
    touchStartY = event.touches[0].clientY;
  }, { passive: true });

  toggle.addEventListener('touchend', (event) => {
    const touchEndY = event.changedTouches[0].clientY;
    const diff = touchEndY - touchStartY;

    if (diff > 35) setCollapsed(false);   // swipe down = open
    if (diff < -35) setCollapsed(true);   // swipe up = close
  }, { passive: true });

  window.addEventListener('scroll', () => {
    const currentY = window.scrollY;
    const scrollingDown = currentY > lastScrollY;

    if (scrollingDown && currentY > 80) {
      toggle.classList.add('hidden-on-scroll');
    } else {
      toggle.classList.remove('hidden-on-scroll');
    }

    lastScrollY = currentY;
  }, { passive: true });
}

initApp();