01-config.js
═══════════════════════════════════════
- Constants
- DEFAULT_FILTERS
- STORES
- DB_VERSION

02-db.js
═══════════════════════════════════════
- IndexedDB
- transactions / imports / settings / rules
- dbGetAll / dbPut / dbBulkPut / dbDelete

03-utils.js
═══════════════════════════════════════
- formatMoney
- formatDate
- safeNumber
- escapeHtml
- sortByDateDesc
- uid
- monthKeyFromDate

04-parser.js
═══════════════════════════════════════
- CSV parse
- normalizeTransactions
- buildImportMeta
- buildSmartFingerprint
- detectCategory
- category learning rules

05-stats.js
═══════════════════════════════════════
- calcOverviewStats
- calcMonthlyStats
- applyFilters
- getCategoryOptions

06-render.js
═══════════════════════════════════════
- renderSummary
- renderMonthlyStats
- renderTransactions
- renderImportModal
- renderTypeModal
- merchant grouping
- month label formatting

07-events.js
═══════════════════════════════════════
- bindEvents
- import/select/delete clicks
- search/type events
- merchant toggle
- month navigation
- category change

08-app.js
═══════════════════════════════════════
- app state
- initApp
- loadStateFromDB
- refreshUI
- CSV import + duplicate skip
- monthly selected view
- category learning
- custom modals
- top collapse
- service worker

FLOW
═══════════════════════════════════════
CSV → parser → duplicate check → DB → state → stats → render

CATEGORY FLOW
═══════════════════════════════════════
Change merchant → choose category → update old data → save rule → future CSV auto-category

UI CHANGE → 06-render.js
LOGIC CHANGE → 08-app.js
EVENTS → 07-events.js
DB → 02-db.js
CSS → 01-base / 02-layout / 03-components / 04-modals-responsive / 05-effects