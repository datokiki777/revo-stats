export function bindEvents(handlers) {
  document.getElementById('fileInput').addEventListener('change', handlers.onFileChange);
  document.getElementById('searchInput').addEventListener('input', handlers.onSearchInput);
  document.getElementById('typeFilter').addEventListener('change', handlers.onTypeChange);
  document.getElementById('currencyFilter').addEventListener('change', handlers.onCurrencyChange);
  document.getElementById('clearDbBtn').addEventListener('click', handlers.onClearData);

  document.getElementById('selectImportBtn').addEventListener('click', handlers.onOpenImportModal);
  document.getElementById('closeImportModal').addEventListener('click', handlers.onCloseImportModal);
  document.getElementById('importModalBackdrop').addEventListener('click', handlers.onCloseImportModal);
  document.getElementById('showAllImportsBtn').addEventListener('click', handlers.onShowAllImports);

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