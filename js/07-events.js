export function bindEvents(handlers) {
  document.getElementById('fileInput').addEventListener('change', handlers.onFileChange);
  document.getElementById('searchInput').addEventListener('input', handlers.onSearchInput);
  document.getElementById('typeFilter').addEventListener('change', handlers.onTypeChange);
  document.getElementById('currencyFilter').addEventListener('change', handlers.onCurrencyChange);
  document.getElementById('clearDbBtn').addEventListener('click', handlers.onClearData);

  document.addEventListener('click', (event) => {
    const selectBtn = event.target.closest('[data-select-import]');
    const deleteBtn = event.target.closest('[data-delete-import]');

    if (selectBtn) {
      handlers.onSelectImport?.(selectBtn.getAttribute('data-select-import'));
      return;
    }

    if (deleteBtn) {
      handlers.onDeleteImport?.(deleteBtn.getAttribute('data-delete-import'));
    }
  });
}