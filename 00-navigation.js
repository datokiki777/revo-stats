/*
JS MAP (short)

01-config.js → constants, defaults
02-db.js → IndexedDB (get/put/delete)
03-utils.js → helpers (format, sort)
04-parser.js → CSV → transactions
05-stats.js → stats + filters logic
06-render.js → UI render (cards, list, modal)
07-events.js → DOM events (click, input)
08-app.js → main logic (state, flow)

FLOW:
CSV → parser → DB → state → stats → render

UI change:
→ 06-render.js

Logic change:
→ 08-app.js

Events:
→ 07-events.js

DB:
→ 02-db.js
*/