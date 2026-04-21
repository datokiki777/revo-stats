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
import { readFileText, parseCSV, normalizeTransactions, buildImportMeta } from './04-parser.js';
import {
  calcOverviewStats,
  calcMonthlyStats,
  getCategoryOptions,
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
  expandedMerchants: {},
  filters: { ...DEFAULT_FILTERS }
};

async function initApp() {
  try {
    await openDB();
    await loadStateFromDB();
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
  onMerchantToggle: handleMerchantToggle
});

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
  const [transactions, imports] = await Promise.all([
    dbGetAll(STORES.transactions),
    dbGetAll(STORES.imports)
  ]);

  state.transactions = sortByDateDesc(transactions, (item) => item.dateCompleted);
  state.imports = imports.sort((a, b) => (b.importedAt || '').localeCompare(a.importedAt || ''));
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

renderSummary(summary);
renderMonthlyStats(months);
renderTransactions(filtered, state.expandedMerchants);
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
    const transactions = normalizeTransactions(rawRows, importMeta.id);

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
    state.expandedMerchants = {};

    refreshUI();
    closeImportModal();

    renderMeta({
      importsCount: state.imports.length,
      txCount: state.transactions.length,
      statusText: `Imported ${transactions.length} rows`
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
  refreshUI();
}

function handleTypeSelect(typeValue) {
  state.filters.type = typeValue || 'all';
  refreshUI();
  closeTypeModal();
}

function handleMerchantToggle(merchantKey) {
  state.expandedMerchants[merchantKey] = !state.expandedMerchants[merchantKey];
  refreshUI();
}

function openTypeModal() {
  document.getElementById('typeModal').classList.remove('hidden');
}

function closeTypeModal() {
  document.getElementById('typeModal').classList.add('hidden');
}

async function handleClearData() {
  const ok = window.confirm('Clear all imported data?');
  if (!ok) return;

  try {
    await clearAllAppData();
    state.transactions = [];
state.imports = [];
state.selectedImportId = null;
state.expandedMerchants = {};
state.filters = { ...DEFAULT_FILTERS };
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

function handleSelectImport(importId) {
  state.selectedImportId = importId;
  state.expandedMerchants = {};
  refreshUI();
  renderMeta({
  importsCount: state.imports.length,
  txCount: state.transactions.length,
  statusText: 'File selected'
});
  closeImportModal();
}

function handleShowAllImports() {
  state.selectedImportId = null;
  state.expandedMerchants = {};
  refreshUI();
  closeImportModal();
}

async function handleDeleteImport(importId) {
  const ok = window.confirm('Delete this import and its transactions?');
  if (!ok) return;

  try {
    await dbDeleteByIndex(STORES.transactions, 'importId', importId);
    await dbDelete(STORES.imports, importId);

    state.transactions = state.transactions.filter((tx) => tx.importId !== importId);
    state.imports = state.imports.filter((imp) => imp.id !== importId);

    if (state.selectedImportId === importId) {
      state.selectedImportId = null;
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

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  try {
    await navigator.serviceWorker.register('./service-worker.js');
  } catch (error) {
    console.error('SW registration failed:', error);
  }
}

initApp();