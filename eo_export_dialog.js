/**
 * EO Lake Export Dialog - Enhanced Export UI
 *
 * Provides a comprehensive export dialog with:
 * - Scope selection (Master Archive, Workspace, Set, View, Selection, etc.)
 * - Format selection (EO Lake, JSON, CSV, Excel, SQL)
 * - Configurable options (history depth, definitions, ghosts, etc.)
 * - Export preview
 */

// ============================================================================
// Export Dialog Component
// ============================================================================

/**
 * Show the enhanced export dialog
 *
 * @param {Object} context - Export context
 * @param {Object} context.set - Current set (if applicable)
 * @param {Object} context.view - Current view (if applicable)
 * @param {string[]} context.selectedRecordIds - Selected record IDs (if any)
 * @param {Object[]} context.allSets - All sets in workspace
 * @param {string} context.workspaceId - Current workspace ID
 * @param {Function} context.onExport - Callback after export
 */
function showEnhancedExportDialog(context) {
  const {
    set,
    view,
    selectedRecordIds = [],
    allSets = [],
    workspaceId = 'default',
    onExport
  } = context;

  const modal = document.getElementById('modal-overlay');
  const modalTitle = modal?.querySelector('.modal-title');
  const modalBody = document.getElementById('modal-body');
  const modalFooter = document.getElementById('modal-footer');

  if (!modal || !modalBody) {
    console.error('Modal elements not found');
    return;
  }

  modalTitle.textContent = 'Export Data';

  const excelAvailable = typeof XLSX !== 'undefined';
  const hasSelection = selectedRecordIds.length > 0;
  const hasView = !!view;
  const hasSet = !!set;
  const hasMultipleSets = allSets.length > 1;

  // Determine available scopes
  const scopes = [
    { value: 'master_archive', label: 'Master Archive', desc: 'Complete backup for full system reconstruction', icon: 'archive' },
    { value: 'workspace', label: 'Workspace', desc: 'All sets in current workspace', icon: 'folder-open' },
    { value: 'set', label: 'Current Set', desc: `Export "${set?.name || 'Set'}" with all records`, icon: 'table', disabled: !hasSet },
    { value: 'view', label: 'Current View', desc: `Export filtered/sorted view`, icon: 'funnel', disabled: !hasView },
    { value: 'selection', label: 'Selected Records', desc: `Export ${selectedRecordIds.length} selected records`, icon: 'check-square', disabled: !hasSelection },
    { value: 'definitions', label: 'Definitions Only', desc: 'Semantic vocabulary without data', icon: 'book-open' },
    { value: 'snapshot', label: 'Snapshot', desc: 'Current state only (no history)', icon: 'camera' }
  ];

  // Determine available formats
  const formats = [
    { value: 'eo_lake', label: 'EO Lake Native', desc: 'Full fidelity with history & provenance', icon: 'database' },
    { value: 'json', label: 'JSON', desc: 'Structured data, good for APIs', icon: 'file-code' },
    { value: 'csv', label: 'CSV', desc: 'Simple tabular data', icon: 'file-csv' },
    { value: 'xlsx', label: 'Excel', desc: 'Spreadsheet with formatting', icon: 'file-xls', disabled: !excelAvailable },
    { value: 'sql', label: 'SQL', desc: 'Database import statements', icon: 'file-sql' }
  ];

  modalBody.innerHTML = `
    <div class="export-dialog">
      <!-- Scope Selection -->
      <div class="export-section">
        <h3 class="export-section-title">
          <i class="ph ph-target"></i> Export Scope
        </h3>
        <div class="export-scope-options">
          ${scopes.map(scope => `
            <label class="export-option ${scope.disabled ? 'disabled' : ''}">
              <input type="radio" name="export-scope" value="${scope.value}"
                     ${scope.disabled ? 'disabled' : ''}
                     ${scope.value === 'set' && hasSet ? 'checked' : ''}
                     ${scope.value === 'selection' && hasSelection ? 'checked' : ''}>
              <div class="option-card">
                <i class="ph ph-${scope.icon}"></i>
                <div class="option-info">
                  <span class="option-name">${scope.label}</span>
                  <span class="option-desc">${scope.desc}</span>
                </div>
              </div>
            </label>
          `).join('')}
        </div>
      </div>

      <!-- Format Selection -->
      <div class="export-section">
        <h3 class="export-section-title">
          <i class="ph ph-file"></i> Format
        </h3>
        <div class="export-format-grid">
          ${formats.map(format => `
            <label class="format-option ${format.disabled ? 'disabled' : ''}">
              <input type="radio" name="export-format" value="${format.value}"
                     ${format.disabled ? 'disabled' : ''}
                     ${format.value === 'eo_lake' ? 'checked' : ''}>
              <div class="format-card">
                <i class="ph ph-${format.icon}"></i>
                <span class="format-name">${format.label}</span>
                <span class="format-desc">${format.desc}</span>
              </div>
            </label>
          `).join('')}
        </div>
      </div>

      <!-- Include Options (for EO Lake format) -->
      <div class="export-section include-options" id="include-options">
        <h3 class="export-section-title">
          <i class="ph ph-sliders"></i> Include
        </h3>
        <div class="include-grid">
          <label class="include-option">
            <input type="checkbox" name="include-definitions" checked>
            <span class="include-label">
              <i class="ph ph-book-open"></i>
              Definitions
              <span class="include-hint">Semantic vocabulary</span>
            </span>
          </label>

          <label class="include-option">
            <input type="checkbox" name="include-history">
            <span class="include-label">
              <i class="ph ph-clock-counter-clockwise"></i>
              History
              <span class="include-hint">Event log</span>
            </span>
          </label>

          <label class="include-option">
            <input type="checkbox" name="include-activity">
            <span class="include-label">
              <i class="ph ph-activity"></i>
              Activity
              <span class="include-hint">Operator audit trail</span>
            </span>
          </label>

          <label class="include-option">
            <input type="checkbox" name="include-ghosts">
            <span class="include-label">
              <i class="ph ph-ghost"></i>
              Ghosts
              <span class="include-hint">Deleted items</span>
            </span>
          </label>

          <label class="include-option">
            <input type="checkbox" name="include-sources">
            <span class="include-label">
              <i class="ph ph-upload"></i>
              Sources
              <span class="include-hint">Original imports</span>
            </span>
          </label>

          <label class="include-option">
            <input type="checkbox" name="include-linked">
            <span class="include-label">
              <i class="ph ph-link"></i>
              Linked Records
              <span class="include-hint">From related sets</span>
            </span>
          </label>
        </div>

        <!-- History Depth (shown when history is checked) -->
        <div class="history-depth-options" id="history-depth-options" style="display: none;">
          <label class="form-label">History Depth</label>
          <div class="depth-buttons">
            <label class="depth-button">
              <input type="radio" name="history-depth" value="30d" checked>
              <span>30 days</span>
            </label>
            <label class="depth-button">
              <input type="radio" name="history-depth" value="90d">
              <span>90 days</span>
            </label>
            <label class="depth-button">
              <input type="radio" name="history-depth" value="1y">
              <span>1 year</span>
            </label>
            <label class="depth-button">
              <input type="radio" name="history-depth" value="full">
              <span>Full</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Filename -->
      <div class="export-section">
        <div class="form-group">
          <label class="form-label">Filename</label>
          <div class="filename-input-wrapper">
            <input type="text" class="form-input" id="export-filename"
                   value="${set?.name || 'export'}" placeholder="Enter filename">
            <span class="filename-extension" id="filename-extension">.eolake</span>
          </div>
        </div>
      </div>

      <!-- Preview -->
      <div class="export-section export-preview" id="export-preview">
        <h3 class="export-section-title">
          <i class="ph ph-eye"></i> Preview
        </h3>
        <div class="preview-content" id="preview-content">
          <div class="preview-loading">Calculating...</div>
        </div>
      </div>
    </div>
  `;

  modalFooter.innerHTML = `
    <button class="btn btn-secondary" id="export-cancel">Cancel</button>
    <button class="btn btn-primary" id="export-confirm">
      <i class="ph ph-export"></i> Export
    </button>
  `;

  // Show modal
  modal.classList.add('active');

  // Get elements
  const scopeRadios = modalBody.querySelectorAll('input[name="export-scope"]');
  const formatRadios = modalBody.querySelectorAll('input[name="export-format"]');
  const includeOptions = document.getElementById('include-options');
  const historyCheckbox = modalBody.querySelector('input[name="include-history"]');
  const historyDepthOptions = document.getElementById('history-depth-options');
  const filenameInput = document.getElementById('export-filename');
  const extensionSpan = document.getElementById('filename-extension');
  const previewContent = document.getElementById('preview-content');
  const cancelBtn = document.getElementById('export-cancel');
  const confirmBtn = document.getElementById('export-confirm');

  // State
  let currentScope = hasSelection ? 'selection' : (hasSet ? 'set' : 'workspace');
  let currentFormat = 'eo_lake';

  // Update extension based on format and scope
  function updateExtension() {
    const extensions = {
      'eo_lake': {
        'master_archive': '.eolake',
        'workspace': '.eolake-ws',
        'set': '.eolake-set',
        'view': '.eolake-view',
        'selection': '.eolake-sel',
        'definitions': '.eolake-def',
        'snapshot': '.eolake-snap'
      },
      'json': '.json',
      'csv': '.csv',
      'xlsx': '.xlsx',
      'sql': '.sql'
    };

    const ext = extensions[currentFormat];
    extensionSpan.textContent = typeof ext === 'object' ? (ext[currentScope] || '.eolake') : ext;
  }

  // Update preview
  function updatePreview() {
    const includeHistory = historyCheckbox?.checked;
    const includeDefinitions = modalBody.querySelector('input[name="include-definitions"]')?.checked;

    let recordCount = 0;
    let fieldCount = 0;
    let setCount = 0;

    switch (currentScope) {
      case 'master_archive':
      case 'workspace':
        setCount = allSets.length;
        recordCount = allSets.reduce((sum, s) => sum + (s.records?.length || 0), 0);
        fieldCount = allSets.reduce((sum, s) => sum + (s.fields?.length || 0), 0);
        break;
      case 'set':
        setCount = 1;
        recordCount = set?.records?.length || 0;
        fieldCount = set?.fields?.length || 0;
        break;
      case 'view':
        setCount = 1;
        recordCount = set?.records?.length || 0; // Would need actual view filtering
        fieldCount = view?.visibleFields?.length || set?.fields?.length || 0;
        break;
      case 'selection':
        recordCount = selectedRecordIds.length;
        fieldCount = set?.fields?.length || 0;
        break;
      case 'definitions':
        recordCount = 0;
        break;
      case 'snapshot':
        setCount = allSets.length;
        recordCount = allSets.reduce((sum, s) => sum + (s.records?.length || 0), 0);
        break;
    }

    previewContent.innerHTML = `
      <div class="preview-stats">
        ${setCount > 0 ? `<div class="preview-stat"><span class="stat-value">${setCount}</span><span class="stat-label">set${setCount !== 1 ? 's' : ''}</span></div>` : ''}
        ${recordCount > 0 ? `<div class="preview-stat"><span class="stat-value">${recordCount.toLocaleString()}</span><span class="stat-label">record${recordCount !== 1 ? 's' : ''}</span></div>` : ''}
        ${fieldCount > 0 ? `<div class="preview-stat"><span class="stat-value">${fieldCount}</span><span class="stat-label">field${fieldCount !== 1 ? 's' : ''}</span></div>` : ''}
        ${includeDefinitions ? `<div class="preview-stat"><span class="stat-value"><i class="ph ph-check"></i></span><span class="stat-label">definitions</span></div>` : ''}
        ${includeHistory ? `<div class="preview-stat"><span class="stat-value"><i class="ph ph-check"></i></span><span class="stat-label">history</span></div>` : ''}
      </div>
      <div class="preview-estimate">
        Estimated size: ~${estimateSize(recordCount, includeHistory)} KB
      </div>
    `;
  }

  function estimateSize(recordCount, includeHistory) {
    // Rough estimate: 500 bytes per record for data, 2x if history included
    const baseSize = recordCount * 0.5;
    const multiplier = includeHistory ? 3 : 1;
    return Math.max(1, Math.round(baseSize * multiplier));
  }

  // Show/hide include options based on format
  function updateIncludeVisibility() {
    const isNativeFormat = currentFormat === 'eo_lake';
    includeOptions.style.display = isNativeFormat ? 'block' : 'none';
  }

  // Event listeners
  scopeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      currentScope = e.target.value;
      updateExtension();
      updatePreview();
    });
  });

  formatRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      currentFormat = e.target.value;
      updateExtension();
      updateIncludeVisibility();
      updatePreview();
    });
  });

  historyCheckbox?.addEventListener('change', (e) => {
    historyDepthOptions.style.display = e.target.checked ? 'block' : 'none';
    updatePreview();
  });

  modalBody.querySelectorAll('.include-option input').forEach(cb => {
    cb.addEventListener('change', updatePreview);
  });

  // Close modal
  const closeModal = () => {
    modal.classList.remove('active');
  };

  cancelBtn.addEventListener('click', closeModal);

  // Export
  confirmBtn.addEventListener('click', async () => {
    const filename = filenameInput.value.trim() || 'export';
    const extension = extensionSpan.textContent;
    const fullFilename = `${filename}${extension}`;

    const options = {
      format: currentFormat,
      includeDefinitions: modalBody.querySelector('input[name="include-definitions"]')?.checked,
      includeHistory: historyCheckbox?.checked,
      historyDepth: modalBody.querySelector('input[name="history-depth"]:checked')?.value || '30d',
      includeActivity: modalBody.querySelector('input[name="include-activity"]')?.checked,
      includeGhosts: modalBody.querySelector('input[name="include-ghosts"]')?.checked,
      includeSources: modalBody.querySelector('input[name="include-sources"]')?.checked,
      includeLinkedRecords: modalBody.querySelector('input[name="include-linked"]')?.checked,
      actor: 'user',
      method: 'ui'
    };

    try {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Exporting...';

      let blob;
      const builder = new window.EOExportBuilder.Builder(options);

      switch (currentScope) {
        case 'master_archive':
          blob = window.EOExportBuilder.export(
            window.EOExportBuilder.Scope.MASTER_ARCHIVE,
            { sets: allSets },
            options
          );
          break;
        case 'workspace':
          blob = window.EOExportBuilder.export(
            window.EOExportBuilder.Scope.WORKSPACE,
            { workspaceId, sets: allSets },
            options
          );
          break;
        case 'set':
          blob = window.EOExportBuilder.export(
            window.EOExportBuilder.Scope.SET,
            { set },
            options
          );
          break;
        case 'view':
          blob = window.EOExportBuilder.export(
            window.EOExportBuilder.Scope.VIEW,
            { view, set },
            options
          );
          break;
        case 'selection':
          blob = window.EOExportBuilder.export(
            window.EOExportBuilder.Scope.SELECTION,
            { recordIds: selectedRecordIds, set },
            options
          );
          break;
        case 'definitions':
          blob = window.EOExportBuilder.export(
            window.EOExportBuilder.Scope.DEFINITIONS,
            {},
            options
          );
          break;
        case 'snapshot':
          blob = window.EOExportBuilder.export(
            window.EOExportBuilder.Scope.SNAPSHOT,
            { sets: allSets },
            options
          );
          break;
      }

      // Download
      downloadBlob(blob, fullFilename);

      closeModal();

      if (onExport) {
        onExport({
          scope: currentScope,
          format: currentFormat,
          filename: fullFilename,
          options
        });
      }

    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error.message}`);
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '<i class="ph ph-export"></i> Export';
    }
  });

  // Backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Initial updates
  updateExtension();
  updateIncludeVisibility();
  updatePreview();

  // Select appropriate default scope
  const defaultScope = hasSelection ? 'selection' : (hasSet ? 'set' : 'workspace');
  const defaultRadio = modalBody.querySelector(`input[name="export-scope"][value="${defaultScope}"]`);
  if (defaultRadio && !defaultRadio.disabled) {
    defaultRadio.checked = true;
    currentScope = defaultScope;
    updateExtension();
    updatePreview();
  }
}

/**
 * Download a blob as a file
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Styles
// ============================================================================

const exportDialogStyles = document.createElement('style');
exportDialogStyles.textContent = `
  .export-dialog {
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-height: 70vh;
    overflow-y: auto;
  }

  .export-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .export-section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary, #333);
    margin: 0;
  }

  .export-section-title i {
    font-size: 16px;
    color: var(--primary, #0066cc);
  }

  /* Scope Options */
  .export-scope-options {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .export-option {
    cursor: pointer;
  }

  .export-option.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .export-option input {
    display: none;
  }

  .export-option .option-card {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px;
    border: 2px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    transition: all 0.15s ease;
  }

  .export-option:not(.disabled):hover .option-card {
    border-color: var(--primary, #0066cc);
    background: var(--bg-hover, #f8f8f8);
  }

  .export-option input:checked + .option-card {
    border-color: var(--primary, #0066cc);
    background: var(--primary-light, #e6f0ff);
  }

  .option-card i {
    font-size: 20px;
    color: var(--primary, #0066cc);
    flex-shrink: 0;
    margin-top: 2px;
  }

  .option-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .option-name {
    font-weight: 600;
    font-size: 13px;
    color: var(--text-primary, #333);
  }

  .option-desc {
    font-size: 11px;
    color: var(--text-muted, #888);
    line-height: 1.3;
  }

  /* Format Grid */
  .export-format-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
  }

  @media (max-width: 600px) {
    .export-format-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .format-option {
    cursor: pointer;
  }

  .format-option.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .format-option input {
    display: none;
  }

  .format-option .format-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 12px 8px;
    border: 2px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    transition: all 0.15s ease;
    text-align: center;
  }

  .format-option:not(.disabled):hover .format-card {
    border-color: var(--primary, #0066cc);
    background: var(--bg-hover, #f8f8f8);
  }

  .format-option input:checked + .format-card {
    border-color: var(--primary, #0066cc);
    background: var(--primary-light, #e6f0ff);
  }

  .format-card i {
    font-size: 24px;
    color: var(--primary, #0066cc);
  }

  .format-name {
    font-weight: 600;
    font-size: 12px;
  }

  .format-desc {
    font-size: 10px;
    color: var(--text-muted, #888);
    line-height: 1.2;
  }

  /* Include Options */
  .include-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  @media (max-width: 600px) {
    .include-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .include-option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .include-option:hover {
    background: var(--bg-hover, #f8f8f8);
  }

  .include-option input {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  .include-option input:checked ~ .include-label {
    color: var(--primary, #0066cc);
  }

  .include-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 500;
  }

  .include-label i {
    font-size: 14px;
  }

  .include-hint {
    font-size: 10px;
    color: var(--text-muted, #888);
    font-weight: 400;
  }

  /* History Depth */
  .history-depth-options {
    margin-top: 12px;
    padding: 12px;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 6px;
  }

  .depth-buttons {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }

  .depth-button {
    flex: 1;
    cursor: pointer;
  }

  .depth-button input {
    display: none;
  }

  .depth-button span {
    display: block;
    padding: 8px 12px;
    text-align: center;
    font-size: 12px;
    font-weight: 500;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 4px;
    transition: all 0.15s ease;
  }

  .depth-button:hover span {
    border-color: var(--primary, #0066cc);
  }

  .depth-button input:checked + span {
    background: var(--primary, #0066cc);
    color: white;
    border-color: var(--primary, #0066cc);
  }

  /* Filename */
  .filename-input-wrapper {
    display: flex;
    align-items: center;
  }

  .filename-input-wrapper .form-input {
    flex: 1;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  .filename-extension {
    padding: 8px 12px;
    background: var(--bg-secondary, #f5f5f5);
    border: 1px solid var(--border-color, #e0e0e0);
    border-left: none;
    border-radius: 0 6px 6px 0;
    font-size: 13px;
    color: var(--text-muted, #888);
    font-family: monospace;
  }

  /* Preview */
  .export-preview {
    background: var(--bg-secondary, #f5f5f5);
    padding: 16px;
    border-radius: 8px;
    margin-top: 8px;
  }

  .preview-content {
    margin-top: 8px;
  }

  .preview-stats {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }

  .preview-stat {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .stat-value {
    font-weight: 700;
    font-size: 16px;
    color: var(--primary, #0066cc);
  }

  .stat-label {
    font-size: 12px;
    color: var(--text-muted, #888);
  }

  .preview-estimate {
    margin-top: 12px;
    font-size: 12px;
    color: var(--text-muted, #888);
  }

  .preview-loading {
    font-size: 12px;
    color: var(--text-muted, #888);
    font-style: italic;
  }

  /* Spinner animation */
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .ph-spin {
    animation: spin 1s linear infinite;
  }
`;

document.head.appendChild(exportDialogStyles);

// ============================================================================
// Quick Export Functions
// ============================================================================

/**
 * Quick export set to CSV
 */
function quickExportCSV(set, filename) {
  const blob = window.EOExportBuilder.export(
    window.EOExportBuilder.Scope.SET,
    { set },
    { format: 'csv' }
  );
  downloadBlob(blob, `${filename || set.name}.csv`);
}

/**
 * Quick export set to JSON
 */
function quickExportJSON(set, filename) {
  const blob = window.EOExportBuilder.export(
    window.EOExportBuilder.Scope.SET,
    { set },
    { format: 'json', pretty: true }
  );
  downloadBlob(blob, `${filename || set.name}.json`);
}

/**
 * Quick export set to Excel
 */
function quickExportXLSX(set, filename) {
  const blob = window.EOExportBuilder.export(
    window.EOExportBuilder.Scope.SET,
    { set },
    { format: 'xlsx' }
  );
  downloadBlob(blob, `${filename || set.name}.xlsx`);
}

/**
 * Quick export master archive
 */
function quickExportArchive(sets, filename) {
  const blob = window.EOExportBuilder.export(
    window.EOExportBuilder.Scope.MASTER_ARCHIVE,
    { sets },
    { format: 'eo_lake', includeHistory: true, historyDepth: 'full' }
  );
  downloadBlob(blob, `${filename || 'archive'}.eolake`);
}

// ============================================================================
// Exports
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    showEnhancedExportDialog,
    downloadBlob,
    quickExportCSV,
    quickExportJSON,
    quickExportXLSX,
    quickExportArchive
  };
}

if (typeof window !== 'undefined') {
  window.showEnhancedExportDialog = showEnhancedExportDialog;
  window.quickExportCSV = quickExportCSV;
  window.quickExportJSON = quickExportJSON;
  window.quickExportXLSX = quickExportXLSX;
  window.quickExportArchive = quickExportArchive;
}
