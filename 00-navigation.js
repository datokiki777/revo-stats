01-config.js
═══════════════════════════════════════
- App constants, defaults
- DEFAULT_FILTERS (search, type)
- STORE names
- DB_VERSION
  - increase DB_VERSION when adding new IndexedDB stores

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

- Stores:
  - transactions
  - imports
  - settings
  - rules (category learning rules)

03-utils.js
═══════════════════════════════════════
- Helpers:
  - formatMoney()
  - formatDate()
  - safeNumber()
  - escapeHtml()
  - sortByDateDesc()
  - uid()
  - monthKeyFromDate()

04-parser.js
═══════════════════════════════════════
- CSV handling:
  - readFileText()
  - parseCSV()
  - normalizeTransactions()
  - buildImportMeta()

- Smart duplicate support:
  - buildSmartFingerprint()
  - creates fingerprint from:
    - date
    - amount
    - currency
    - type
    - cleaned description

- Category detection:
  - detectCategory()
  - category priority:
    - Fees
    - Transfers
    - Cash
    - Tickets
    - Transport
    - Food
    - Shopping
    - Other

- Category learning:
  - checks window.__categoryRules before default category detection
  - remembered merchants override auto-detection

05-stats.js
═══════════════════════════════════════
- Calculations:
  - calcOverviewStats()
  - calcMonthlyStats()
  - applyFilters()

- Monthly stats:
  - groups transactions by monthKey
  - returns months sorted newest first

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

- Monthly stats:
  - single monthly card
  - month slider arrows
  - English month label:
    - April 2026 instead of 2026-04
  - Income / Expenses / Net / Fees shown as rows
  - amount colors by type

- Transactions:
  - grouped merchant cards
  - merchant card structure:
    - merchant-summary
      - merchant-summary-left
        - merchant name
        - transaction count + last date
        - click area for expand/collapse
      - merchant-summary-right
        - Change button
        - total amount
        - arrow
  - IMPORTANT:
    - no button inside button
    - merchant-summary is DIV
    - expand/collapse uses data-merchant-toggle
    - category change uses data-change-merchant

- Child transaction rows:
  - date + type
  - currency badge
  - state badge
  - category badge
  - amount
  - fee

- Helpers:
  - groupTransactionsByMerchant()
  - normalizeMerchantName()
  - formatMonthLabel()

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
  - month slider navigation
  - merchant category change

- Data attributes:
  - data-select-import
  - data-delete-import
  - data-type-option
  - data-merchant-toggle
  - data-month-nav
  - data-change-merchant

08-app.js
═══════════════════════════════════════
- Main state:
  - transactions
  - imports
  - selectedImportId
  - selectedMonthIndex
  - expandedMerchants
  - filters
  - updateWorker
  - updateReady

- Core logic:
  - initApp()
  - loadStateFromDB()
  - refreshUI()

- Import logic:
  - handleFileChange()
  - reads CSV
  - parses transactions
  - removes smart duplicates
  - shows skipped duplicate count
  - saves import + transactions to IndexedDB

- Monthly logic:
  - selectedMonthIndex
  - handleMonthNav()
  - monthly stats card controls visible transactions
  - transactions list shows selected month only

- Handlers:
  - handleFileChange()
  - handleSelectImport()
  - handleShowAllImports()
  - handleDeleteImport()
  - handleSearchInput()
  - handleTypeSelect()
  - handleMerchantToggle()
  - handleMonthNav()
  - handleChangeMerchant()

- Category learning:
  - handleChangeMerchant()
  - opens category picker
  - changes all matching existing merchant transactions
  - optionally remembers merchant for future imports
  - saves rule to rules store
  - updates window.__categoryRules

- Modal control:
  - openImportModal()
  - closeImportModal()
  - openTypeModal()
  - closeTypeModal()
  - askConfirm()
  - askCategoryPicker()

- Custom modals:
  - Clear Data uses custom confirm modal
  - Delete Import uses custom confirm modal
  - Change Category uses custom category modal
  - no native Android prompt/confirm for these flows

- Service worker:
  - registerServiceWorker()
  - update modal
  - applyAppUpdate()
  - dismissUpdateModal()

FLOW
═══════════════════════════════════════
CSV → parser → smart duplicate check → DB → state → stats → render

CATEGORY FLOW
═══════════════════════════════════════
Merchant Change → category picker → update old transactions → save rule → future CSV auto-category

MONTHLY FLOW
═══════════════════════════════════════
All filtered transactions → calcMonthlyStats → selected month → render monthly card → render month transactions

UI CHANGE → 06-render.js
LOGIC CHANGE → 08-app.js
EVENTS → 07-events.js
DB → 02-db.js
CATEGORY RULES → 04-parser.js + 08-app.js
MERCHANT GROUPING → 06-render.js
STYLES → 01-main.css