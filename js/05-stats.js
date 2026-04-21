export function calcOverviewStats(transactions) {
  let income = 0;
  let expenses = 0;
  let fees = 0;

  for (const tx of transactions) {
    const amount = Number(tx.amount || 0);
    const fee = Number(tx.fee || 0);

    if (amount >= 0) income += amount;
    else expenses += Math.abs(amount);

    fees += fee;
  }

  return {
    income,
    expenses,
    net: income - expenses,
    fees
  };
}

export function calcMonthlyStats(transactions) {
  const map = new Map();

  for (const tx of transactions) {
    const key = tx.monthKey || 'unknown';

    if (!map.has(key)) {
      map.set(key, {
        monthKey: key,
        income: 0,
        expenses: 0,
        fees: 0,
        count: 0
      });
    }

    const bucket = map.get(key);
    const amount = Number(tx.amount || 0);
    const fee = Number(tx.fee || 0);

    if (amount >= 0) bucket.income += amount;
    else bucket.expenses += Math.abs(amount);

    bucket.fees += fee;
    bucket.count += 1;
  }

  return [...map.values()].sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

export function getUniqueTypes(transactions) {
  return [...new Set(transactions.map((tx) => tx.type).filter(Boolean))].sort();
}

export function getUniqueCurrencies(transactions) {
  return [...new Set(transactions.map((tx) => tx.currency).filter(Boolean))].sort();
}

export function applyFilters(transactions, filters) {
  const search = String(filters.search || '').trim().toLowerCase();
  const type = filters.type || 'all';
  const currency = filters.currency || 'all';

  return transactions.filter((tx) => {
    if (type !== 'all' && tx.type !== type) return false;
    if (currency !== 'all' && tx.currency !== currency) return false;

    if (search) {
      const haystack = [
        tx.description,
        tx.type,
        tx.currency,
        tx.state
      ]
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(search)) return false;
    }

    return true;
  });
}