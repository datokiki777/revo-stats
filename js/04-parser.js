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

    const tx = {
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

    tx.fingerprint = buildSmartFingerprint(tx);

    return tx;
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

  // User-defined rules from database
  const rules = window.__categoryRules || [];

  for (const rule of rules) {
    const key = String(rule.key || '').trim().toLowerCase();
    if (key && text.includes(key)) {
      return rule.category;
    }
  }

  // 1. Fees (highest priority)
  if (fee > 0 || text.includes('fee')) {
    return 'Fees';
  }

  // 2. Transfers
  if (
    text.includes('transfer') ||
    text.includes('bank transfer') ||
    text.includes('card to card') ||
    text.includes('revolut') ||
    text.includes('iban')
  ) {
    return 'Transfers';
  }

  // 3. Cash
  if (
    text.includes('atm') ||
    text.includes('cash withdrawal') ||
    text.includes('cash')
  ) {
    return 'Cash';
  }

  // 4. Tickets / Public transport
  if (
    text.includes('deutsche bahn') ||
    text.includes(' db ') ||
    text.includes('bahn') ||
    text.includes('vrr') ||
    text.includes('ruhrbahn') ||
    text.includes('ticket') ||
    text.includes('bus') ||
    text.includes('tram')
  ) {
    return 'Tickets';
  }

  // 5. Transport (car, taxi)
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

  // 6. Food
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
    text.includes('bakery') ||
    text.includes('eat')
  ) {
    return 'Food';
  }

  // 7. Shopping
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

  return 'Other';
}

export function buildSmartFingerprint(tx) {
  const dateKey = String(tx.dateCompleted || '').slice(0, 10);
  const amountKey = Number(tx.amount || 0).toFixed(2);
  const currencyKey = String(tx.currency || 'EUR').trim().toUpperCase();
  const typeKey = String(tx.type || '').trim().toLowerCase();

  const descKey = String(tx.description || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '');

  return [
    dateKey,
    amountKey,
    currencyKey,
    typeKey,
    descKey
  ].join('|');
}