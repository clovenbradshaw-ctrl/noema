/**
 * EO Provenance System
 *
 * Implements the 9-element Experiential Ontology provenance schema:
 *
 * I. EPISTEMIC PROVENANCE (How the claim was produced)
 *    1. Agent - Who made the claim
 *    2. Method - How the claim was produced
 *    3. Source - Where the claim was published/archived
 *
 * II. SEMANTIC PROVENANCE (What the claim means)
 *    4. Term - The key concept being used
 *    5. Definition - What that term means here
 *    6. Jurisdiction - Where/under whose authority
 *
 * III. SITUATIONAL PROVENANCE (When/where it holds)
 *    7. Scale - At what level the claim operates
 *    8. Timeframe - When observed, over what duration
 *    9. Background - Enabling/constraining conditions
 *
 * Each element can be:
 * - A direct string value
 * - A reference to another record { $ref: recordId }
 * - null (unknown/unfilled)
 */

// ============================================================================
// Provenance Schema
// ============================================================================

const ProvenanceElements = Object.freeze({
  // Epistemic
  AGENT: 'agent',
  METHOD: 'method',
  SOURCE: 'source',
  // Semantic
  TERM: 'term',
  DEFINITION: 'definition',
  JURISDICTION: 'jurisdiction',
  // Situational
  SCALE: 'scale',
  TIMEFRAME: 'timeframe',
  BACKGROUND: 'background'
});

const ProvenanceTriads = Object.freeze({
  EPISTEMIC: ['agent', 'method', 'source'],
  SEMANTIC: ['term', 'definition', 'jurisdiction'],
  SITUATIONAL: ['scale', 'timeframe', 'background']
});

const ProvenanceLabels = Object.freeze({
  agent: {
    label: 'Agent',
    question: 'Who provided this information?',
    hint: 'Person, institution, instrument, or system',
    icon: 'ph-user'
  },
  method: {
    label: 'Method',
    question: 'How was this information produced?',
    hint: 'Measured, observed, inferred, declared, aggregated',
    icon: 'ph-flask'
  },
  source: {
    label: 'Source',
    question: 'Where was this published or archived?',
    hint: 'Document, database, report, system',
    icon: 'ph-file-text'
  },
  term: {
    label: 'Term',
    question: 'What key concept does this use?',
    hint: 'The main term or concept being referenced',
    icon: 'ph-bookmark'
  },
  definition: {
    label: 'Definition',
    question: 'What does that term mean here?',
    hint: 'The specific meaning in this context',
    icon: 'ph-book-open'
  },
  jurisdiction: {
    label: 'Jurisdiction',
    question: 'Where does this definition apply?',
    hint: 'Legal, geographic, institutional scope',
    icon: 'ph-map-pin'
  },
  scale: {
    label: 'Scale',
    question: 'At what level does this operate?',
    hint: 'Individual, team, region, global',
    icon: 'ph-arrows-out'
  },
  timeframe: {
    label: 'Timeframe',
    question: 'When was this observed? Over what period?',
    hint: 'Date range, snapshot vs longitudinal',
    icon: 'ph-calendar'
  },
  background: {
    label: 'Background',
    question: 'What conditions enable or constrain this?',
    hint: 'Context, environment, prior events',
    icon: 'ph-info'
  }
});

// ============================================================================
// Provenance Value Types
// ============================================================================

/**
 * Check if a value is a record reference
 */
function isRecordRef(value) {
  return value && typeof value === 'object' && '$ref' in value;
}

/**
 * Create a record reference
 */
function createRecordRef(recordId) {
  return { $ref: recordId };
}

/**
 * Get the referenced record ID
 */
function getRefId(value) {
  return isRecordRef(value) ? value.$ref : null;
}

/**
 * Create an empty provenance object
 */
function createEmptyProvenance() {
  return {
    agent: null,
    method: null,
    source: null,
    term: null,
    definition: null,
    jurisdiction: null,
    scale: null,
    timeframe: null,
    background: null
  };
}

/**
 * Merge provenance objects (child overrides parent for non-null values)
 */
function mergeProvenance(parent, child) {
  const result = { ...createEmptyProvenance() };

  Object.keys(ProvenanceElements).forEach(key => {
    const element = ProvenanceElements[key];
    // Child takes precedence, then parent
    result[element] = child?.[element] ?? parent?.[element] ?? null;
  });

  return result;
}

/**
 * Count filled provenance elements
 */
function countFilledProvenance(provenance) {
  if (!provenance) return 0;
  return Object.values(ProvenanceElements).filter(key => provenance[key] != null).length;
}

/**
 * Get provenance completeness status
 * @returns 'full' | 'partial' | 'none'
 */
function getProvenanceStatus(provenance) {
  const count = countFilledProvenance(provenance);
  if (count === 0) return 'none';
  if (count === 9) return 'full';
  return 'partial';
}

/**
 * Get provenance indicator symbol
 */
function getProvenanceIndicator(status) {
  switch (status) {
    case 'full': return '◉';
    case 'partial': return '◐';
    default: return '○';
  }
}

// ============================================================================
// Dataset-Level Provenance
// ============================================================================

/**
 * Create dataset provenance (import-level)
 */
function createDatasetProvenance(options = {}) {
  return {
    // Import metadata
    importedAt: new Date().toISOString(),
    importedBy: options.importedBy || null,
    originalFilename: options.originalFilename || null,
    originalFileSize: options.originalFileSize || null,
    originalFileType: options.originalFileType || null,

    // Original source preserved
    originalSource: options.originalSource || null, // The raw file content

    // EO 9-element provenance
    provenance: {
      agent: options.agent || null,
      method: options.method || null,
      source: options.source || null,
      term: options.term || null,
      definition: options.definition || null,
      jurisdiction: options.jurisdiction || null,
      scale: options.scale || null,
      timeframe: options.timeframe || null,
      background: options.background || null
    }
  };
}

// ============================================================================
// Record-Level Provenance
// ============================================================================

/**
 * Create record provenance
 */
function createRecordProvenance(options = {}) {
  return {
    provenance: {
      agent: options.agent || null,
      method: options.method || null,
      source: options.source || null,
      term: options.term || null,
      definition: options.definition || null,
      jurisdiction: options.jurisdiction || null,
      scale: options.scale || null,
      timeframe: options.timeframe || null,
      background: options.background || null
    },
    // Field-level provenance overrides
    fieldProvenance: options.fieldProvenance || {}
  };
}

// ============================================================================
// Provenance Resolution
// ============================================================================

/**
 * Resolve provenance for a record (including dataset inheritance)
 */
function resolveRecordProvenance(record, dataset) {
  const datasetProv = dataset?.datasetProvenance?.provenance || createEmptyProvenance();
  const recordProv = record?.provenance || createEmptyProvenance();
  return mergeProvenance(datasetProv, recordProv);
}

/**
 * Resolve provenance for a specific field (including record and dataset inheritance)
 */
function resolveFieldProvenance(record, fieldId, dataset) {
  const recordProv = resolveRecordProvenance(record, dataset);
  const fieldProv = record?.fieldProvenance?.[fieldId] || createEmptyProvenance();
  return mergeProvenance(recordProv, fieldProv);
}

/**
 * Get inheritance info for provenance display
 */
function getProvenanceInheritance(record, dataset) {
  const result = {};
  const datasetProv = dataset?.datasetProvenance?.provenance || {};
  const recordProv = record?.provenance || {};

  Object.values(ProvenanceElements).forEach(element => {
    if (recordProv[element] != null) {
      result[element] = 'record';
    } else if (datasetProv[element] != null) {
      result[element] = 'dataset';
    } else {
      result[element] = null;
    }
  });

  return result;
}

// ============================================================================
// Provenance Display Utilities
// ============================================================================

/**
 * Format a provenance value for display
 */
function formatProvenanceValue(value, getRecordName = null) {
  if (value === null || value === undefined) {
    return { display: '—', isRef: false, refId: null };
  }

  if (isRecordRef(value)) {
    const refId = value.$ref;
    const name = getRecordName ? getRecordName(refId) : refId;
    return {
      display: `→ ${name}`,
      isRef: true,
      refId
    };
  }

  return { display: String(value), isRef: false, refId: null };
}

/**
 * Render provenance indicator HTML
 */
function renderProvenanceIndicator(status, title = '') {
  const indicator = getProvenanceIndicator(status);
  const colorClass = status === 'full' ? 'prov-full' : status === 'partial' ? 'prov-partial' : 'prov-none';
  return `<span class="provenance-indicator ${colorClass}" title="${title}">${indicator}</span>`;
}

// ============================================================================
// Backlinks (Cited By)
// ============================================================================

/**
 * Find all records that cite a given record in their provenance
 */
function findProvenanceCitations(targetRecordId, allRecords) {
  const citations = [];

  for (const record of allRecords) {
    // Check record-level provenance
    if (record.provenance) {
      for (const [element, value] of Object.entries(record.provenance)) {
        if (isRecordRef(value) && value.$ref === targetRecordId) {
          citations.push({
            recordId: record.id,
            level: 'record',
            element,
            fieldId: null
          });
        }
      }
    }

    // Check field-level provenance
    if (record.fieldProvenance) {
      for (const [fieldId, fieldProv] of Object.entries(record.fieldProvenance)) {
        if (fieldProv) {
          for (const [element, value] of Object.entries(fieldProv)) {
            if (isRecordRef(value) && value.$ref === targetRecordId) {
              citations.push({
                recordId: record.id,
                level: 'field',
                element,
                fieldId
              });
            }
          }
        }
      }
    }
  }

  return citations;
}

// ============================================================================
// Import Provenance Mapping
// ============================================================================

/**
 * Map embedded provenance from imported data (like edgeEvents with context)
 */
function mapEmbeddedProvenance(contextObj) {
  if (!contextObj) return createEmptyProvenance();

  const prov = createEmptyProvenance();

  // Common patterns in imported data
  if (contextObj.source) prov.source = contextObj.source;
  if (contextObj.agent) prov.agent = contextObj.agent;
  if (contextObj.method) prov.method = contextObj.method;
  if (contextObj.timestamp) prov.timeframe = contextObj.timestamp;
  if (contextObj.jurisdiction) prov.jurisdiction = contextObj.jurisdiction;

  // Note: confidence is NOT a provenance element, it's a separate claim

  return prov;
}

// ============================================================================
// Provenance Styles
// ============================================================================

const provenanceStyles = `
  /* Provenance Indicators */
  .provenance-indicator {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    font-size: 12px;
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.15s;
  }

  .provenance-indicator:hover {
    opacity: 1;
  }

  .provenance-indicator.prov-full {
    color: var(--success-500, #22c55e);
  }

  .provenance-indicator.prov-partial {
    color: var(--warning-500, #f59e0b);
  }

  .provenance-indicator.prov-none {
    color: var(--text-muted, #9ca3af);
  }

  /* Provenance Section in Side Panel */
  .provenance-section {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--border-primary, #e5e7eb);
  }

  .provenance-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .provenance-section-title {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-secondary, #6b7280);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .provenance-triad {
    margin-bottom: 12px;
  }

  .provenance-triad-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-muted, #9ca3af);
    margin-bottom: 6px;
    letter-spacing: 0.5px;
  }

  .provenance-element {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 6px 0;
    border-bottom: 1px solid var(--border-secondary, #f3f4f6);
  }

  .provenance-element:last-child {
    border-bottom: none;
  }

  .provenance-element-icon {
    color: var(--text-muted, #9ca3af);
    font-size: 14px;
    margin-top: 2px;
  }

  .provenance-element-content {
    flex: 1;
    min-width: 0;
  }

  .provenance-element-label {
    font-size: 11px;
    color: var(--text-secondary, #6b7280);
    margin-bottom: 2px;
  }

  .provenance-element-value {
    font-size: 13px;
    color: var(--text-primary, #111827);
    word-break: break-word;
  }

  .provenance-element-value.empty {
    color: var(--text-muted, #9ca3af);
    font-style: italic;
  }

  .provenance-element-value.is-ref {
    color: var(--primary-500, #6366f1);
    cursor: pointer;
  }

  .provenance-element-value.is-ref:hover {
    text-decoration: underline;
  }

  .provenance-inherited {
    font-size: 10px;
    color: var(--text-muted, #9ca3af);
    margin-left: 4px;
  }

  /* Provenance Edit Modal */
  .provenance-edit-group {
    margin-bottom: 16px;
  }

  .provenance-edit-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 6px;
  }

  .provenance-edit-hint {
    font-size: 11px;
    color: var(--text-muted, #9ca3af);
    margin-bottom: 8px;
  }

  .provenance-input-wrapper {
    display: flex;
    gap: 8px;
  }

  .provenance-input-mode {
    display: flex;
    border: 1px solid var(--border-primary, #e5e7eb);
    border-radius: 6px;
    overflow: hidden;
  }

  .provenance-mode-btn {
    padding: 6px 10px;
    background: var(--bg-secondary, #f9fafb);
    border: none;
    cursor: pointer;
    font-size: 12px;
    color: var(--text-secondary, #6b7280);
    transition: all 0.15s;
  }

  .provenance-mode-btn:hover {
    background: var(--bg-tertiary, #f3f4f6);
  }

  .provenance-mode-btn.active {
    background: var(--primary-500, #6366f1);
    color: white;
  }

  .provenance-text-input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid var(--border-primary, #e5e7eb);
    border-radius: 6px;
    font-size: 13px;
  }

  .provenance-ref-input {
    flex: 1;
    position: relative;
  }

  .provenance-ref-search {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--border-primary, #e5e7eb);
    border-radius: 6px;
    font-size: 13px;
  }

  .provenance-ref-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    max-height: 200px;
    overflow-y: auto;
    background: white;
    border: 1px solid var(--border-primary, #e5e7eb);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    z-index: 100;
    display: none;
  }

  .provenance-ref-dropdown.open {
    display: block;
  }

  .provenance-ref-option {
    padding: 8px 12px;
    cursor: pointer;
    font-size: 13px;
    border-bottom: 1px solid var(--border-secondary, #f3f4f6);
  }

  .provenance-ref-option:last-child {
    border-bottom: none;
  }

  .provenance-ref-option:hover {
    background: var(--bg-secondary, #f9fafb);
  }

  .provenance-ref-option-id {
    font-size: 11px;
    color: var(--text-muted, #9ca3af);
  }

  /* Citations/Backlinks */
  .provenance-citations {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--border-primary, #e5e7eb);
  }

  .provenance-citations-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary, #6b7280);
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .provenance-citation-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    background: var(--bg-secondary, #f9fafb);
    border-radius: 4px;
    margin-bottom: 4px;
    font-size: 12px;
    cursor: pointer;
  }

  .provenance-citation-item:hover {
    background: var(--bg-tertiary, #f3f4f6);
  }

  /* Import Provenance Dialog */
  .import-provenance-section {
    margin-top: 20px;
    padding: 16px;
    background: var(--bg-secondary, #f9fafb);
    border-radius: 8px;
    border: 1px solid var(--border-primary, #e5e7eb);
  }

  .import-provenance-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .import-provenance-subtitle {
    font-size: 12px;
    color: var(--text-muted, #9ca3af);
    margin-bottom: 16px;
  }

  .import-provenance-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .import-provenance-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .import-provenance-field.full-width {
    grid-column: 1 / -1;
  }

  .import-provenance-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary, #6b7280);
  }

  .import-provenance-input {
    padding: 8px 10px;
    border: 1px solid var(--border-primary, #e5e7eb);
    border-radius: 6px;
    font-size: 13px;
    background: white;
  }

  .import-provenance-input:focus {
    outline: none;
    border-color: var(--primary-500, #6366f1);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
  }

  .import-provenance-input::placeholder {
    color: var(--text-muted, #9ca3af);
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.id = 'eo-provenance-styles';
  styleEl.textContent = provenanceStyles;
  document.head.appendChild(styleEl);
}

// ============================================================================
// Exports
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ProvenanceElements,
    ProvenanceTriads,
    ProvenanceLabels,
    isRecordRef,
    createRecordRef,
    getRefId,
    createEmptyProvenance,
    mergeProvenance,
    countFilledProvenance,
    getProvenanceStatus,
    getProvenanceIndicator,
    createDatasetProvenance,
    createRecordProvenance,
    resolveRecordProvenance,
    resolveFieldProvenance,
    getProvenanceInheritance,
    formatProvenanceValue,
    renderProvenanceIndicator,
    findProvenanceCitations,
    mapEmbeddedProvenance
  };
}

if (typeof window !== 'undefined') {
  window.EOProvenance = {
    ProvenanceElements,
    ProvenanceTriads,
    ProvenanceLabels,
    isRecordRef,
    createRecordRef,
    getRefId,
    createEmptyProvenance,
    mergeProvenance,
    countFilledProvenance,
    getProvenanceStatus,
    getProvenanceIndicator,
    createDatasetProvenance,
    createRecordProvenance,
    resolveRecordProvenance,
    resolveFieldProvenance,
    getProvenanceInheritance,
    formatProvenanceValue,
    renderProvenanceIndicator,
    findProvenanceCitations,
    mapEmbeddedProvenance
  };
}
