import { uid, safeNumber, monthKeyFromDate } from './03-utils.js';

export function readFileText(file) {
  return file.text();
}

export function parseCSV(text) {
  const rows = [];
  const lines = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(current);
      lines.push(row);
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    lines.push(row);
  }

  if (!lines.length) return [];

  const headers = lines[0].map((h) => String(h || '').trim());

  for (let i = 1; i < lines.length; i += 1) {
    const values = lines[i];
    if (!values || values.every((v) => String(v || '').trim() === '')) continue;

    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] ?? '';
    });
    rows.push(obj);
  }

  return rows;
}

export function normalizeTransactions(rawRows, importId) {
  return rawRows.map((row) => {
    const type = String(row['Type'] || '').trim();
    const description = String(row['Description'] || '').trim();
    const currency = String(row['Currency'] || '').trim() || 'EUR';
    const state = String(row['State'] || '').trim() || 'UNKNOWN';

    const startedDate = normalizeDate(
  row['Started Date'] ||
  row['Started Date (UTC)'] ||
  row['Date']
);

const completedDate = normalizeDate(
  row['Completed Date'] ||
  row['Completed Date (UTC)'] ||
  row['Date']
) || startedDate;

    const amount = safeNumber(
  row['Amount'] ||
  row['Amount (EUR)'] ||
  row['Amount (GBP)']
);
    const fee = safeNumber(row['Fee']);
    const balance = safeNumber(row['Balance']);
    
    const category = detectCategory(description, type, amount, fee);

    return {
  id: uid('tx'),
  importId,
  type,
  category,
  description,
  currency,
  state,
  startedDate,
  dateCompleted: completedDate,
  amount,
  fee,
  balance,
  monthKey: monthKeyFromDate(completedDate),
  direction: amount >= 0 ? 'income' : 'expense',
  raw: row
};
  });
}

function normalizeDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const maybe = new Date(raw);
  if (!Number.isNaN(maybe.getTime())) {
    return maybe.toISOString();
  }

  return raw;
}

export function buildImportMeta(fileName, transactions) {
  const currencies = [...new Set(transactions.map((tx) => tx.currency).filter(Boolean))];
  const dates = transactions
    .map((tx) => tx.dateCompleted)
    .filter(Boolean)
    .sort();

  return {
    id: uid('imp'),
    fileName,
    importedAt: new Date().toISOString(),
    rowCount: transactions.length,
    currencies,
    dateFrom: dates[0] || '',
    dateTo: dates[dates.length - 1] || ''
  };
}

function detectCategory(description, type, amount, fee) {
  const text = `${description} ${type}`.toLowerCase();

  if (fee > 0 || text.includes('fee')) {
    return 'Fees';
  }

  if (
    text.includes('aldi') ||
    text.includes('lidl') ||
    text.includes('rewe') ||
    text.includes('edeka') ||
    text.includes('kaufland') ||
    text.includes('penny') ||
    text.includes('netto') ||
    text.includes('restaurant') ||
    text.includes('pizza') ||
    text.includes('burger') ||
    text.includes('kebab') ||
    text.includes('doner') ||
    text.includes('mcdonald') ||
    text.includes('subway') ||
    text.includes('cafe') ||
    text.includes('bakery')
  ) {
    return 'Food';
  }

  if (
    text.includes('db') ||
    text.includes('deutsche bahn') ||
    text.includes('bahn') ||
    text.includes('vrr') ||
    text.includes('ruhrbahn') ||
    text.includes('ticket') ||
    text.includes('bus') ||
    text.includes('tram')
  ) {
    return 'Tickets';
  }

  if (
    text.includes('uber') ||
    text.includes('bolt') ||
    text.includes('taxi') ||
    text.includes('shell') ||
    text.includes('aral') ||
    text.includes('esso')
  ) {
    return 'Transport';
  }

  if (
    text.includes('amazon') ||
    text.includes('ebay') ||
    text.includes('zara') ||
    text.includes('hm') ||
    text.includes('h&m') ||
    text.includes('ikea') ||
    text.includes('dm') ||
    text.includes('rossmann')
  ) {
    return 'Shopping';
  }

  if (
    text.includes('transfer') ||
    text.includes('bank transfer') ||
    text.includes('card to card')
  ) {
    return 'Transfers';
  }

  if (
    text.includes('cash') ||
    text.includes('atm')
  ) {
    return 'Cash';
  }

  return 'Other';
}