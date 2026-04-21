export function bindEvents(handlers) {
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('fileInput').click();
  });

  document.getElementById('fileInput').addEventListener('change', handlers.onFileChange);
  document.getElementById('searchInput').addEventListener('input', handlers.onSearchInput);
  document.getElementById('clearDbBtn').addEventListener('click', handlers.onClearData);

  document.getElementById('selectImportBtn').addEventListener('click', handlers.onOpenImportModal);
  document.getElementById('closeImportModal').addEventListener('click', handlers.onCloseImportModal);
  document.getElementById('importModalBackdrop').addEventListener('click', handlers.onCloseImportModal);
  document.getElementById('showAllImportsBtn').addEventListener('click', handlers.onShowAllImports);

  document.getElementById('typeFilterBtn').addEventListener('click', handlers.onOpenTypeModal);
  document.getElementById('closeTypeModal').addEventListener('click', handlers.onCloseTypeModal);
  document.getElementById('typeModalBackdrop').addEventListener('click', handlers.onCloseTypeModal);

  document.getElementById('dismissUpdateBtn').addEventListener('click', handlers.onDismissUpdate);
  document.getElementById('applyUpdateBtn').addEventListener('click', handlers.onApplyUpdate);
  document.getElementById('updateModalBackdrop')
  .addEventListener('click', handlers.onDismissUpdate);

  document.addEventListener('click', (event) => {
    const selectBtn = event.target.closest('[data-select-import]');
    const deleteBtn = event.target.closest('[data-delete-import]');
    const typeBtn = event.target.closest('[data-type-option]');
    const merchantBtn = event.target.closest('[data-merchant-toggle]');

    if (selectBtn) {
      handlers.onSelectImport?.(selectBtn.getAttribute('data-select-import'));
      return;
    }

    if (deleteBtn) {
      handlers.onDeleteImport?.(deleteBtn.getAttribute('data-delete-import'));
      return;
    }

    if (typeBtn) {
      handlers.onTypeSelect?.(typeBtn.getAttribute('data-type-option'));
      return;
    }

    if (merchantBtn) {
      handlers.onMerchantToggle?.(merchantBtn.getAttribute('data-merchant-toggle'));
    }
  });
}