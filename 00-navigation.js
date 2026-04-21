01-config.js
═══════════════════════════════════════
- App constants, defaults
- DEFAULT_FILTERS (search, type)
- STORE names

02-db.js
═══════════════════════════════════════
- IndexedDB:
  - openDB()
  - dbGetAll()
  - dbPut()
  - dbBulkPut()
  - dbDelete()
  - dbDeleteByIndex()
  - clearAllAppData()

03-utils.js
═══════════════════════════════════════
- Helpers:
  - formatMoney()
  - formatDate()
  - safeNumber()
  - escapeHtml()
  - sortByDateDesc()
  - uid()

04-parser.js
═══════════════════════════════════════
- CSV handling:
  - readFileText()
  - parseCSV()
  - normalizeTransactions()
  - buildImportMeta()
- Category detection:
  - detectCategory()

05-stats.js
═══════════════════════════════════════
- Calculations:
  - calcOverviewStats()
  - calcMonthlyStats()
  - applyFilters()
- Category options:
  - getCategoryOptions()

06-render.js
═══════════════════════════════════════
- UI render:
  - renderSummary()
  - renderMonthlyStats()
  - renderTransactions() (grouped merchants)
  - renderImportModal()
  - renderTypeModal()
  - renderSelectedImportLabel()
  - renderTypeFilterLabel()
- Helpers:
  - groupTransactionsByMerchant()
  - normalizeMerchantName()

07-events.js
═══════════════════════════════════════
- Event binding:
  - bindEvents()
- Handles:
  - file input
  - search input
  - modal open/close
  - import select/delete
  - type select (modal)
  - merchant expand/collapse

08-app.js
═══════════════════════════════════════
- Main state:
  - transactions
  - imports
  - selectedImportId
  - expandedMerchants
  - filters
- Core logic:
  - initApp()
  - loadStateFromDB()
  - refreshUI()
- Handlers:
  - handleFileChange()
  - handleSelectImport()
  - handleShowAllImports()
  - handleDeleteImport()
  - handleSearchInput()
  - handleTypeSelect()
  - handleMerchantToggle()
- Modal control:
  - openImportModal()
  - closeImportModal()
  - openTypeModal()
  - closeTypeModal()
- Service worker:
  - registerServiceWorker()

FLOW
═══════════════════════════════════════
CSV → parser → DB → state → stats → render

UI CHANGE → 06-render.js
LOGIC CHANGE → 08-app.js
EVENTS → 07-events.js
DB → 02-db.js
CATEGORY RULES → 04-parser.js
MERCHANT GROUPING → 06-render.js + 08-app.js