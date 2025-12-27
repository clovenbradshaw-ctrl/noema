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
// Upload Metadata Structures (Nested within 9 elements)
// ============================================================================

/**
 * Upload context nested under 'agent' - who/what initiated the upload
 */
function createUploadContext(options = {}) {
  return {
    userId: options.userId || null,
    sessionId: options.sessionId || null,
    userAgent: options.userAgent || null,
    ipAddress: options.ipAddress || null  // For audit, not stored client-side
  };
}

/**
 * Transformation log nested under 'method' - how data was processed
 * Each step records parser decisions and data transformations
 */
function createTransformationStep(options = {}) {
  return {
    step: options.step || 0,
    operation: options.operation || null,  // PARSE, INFER_SCHEMA, SPLIT_VIEWS, etc.
    processor: options.processor || null,  // CSVParser, JSONParser, SchemaInferrer, etc.
    decisions: options.decisions || {},    // Parser-specific decisions made
    inputHash: options.inputHash || null,  // SHA-256 of input (optional)
    outputHash: options.outputHash || null, // SHA-256 of output (optional)
    timestamp: options.timestamp || new Date().toISOString(),
    duration: options.duration || null     // Processing time in ms
  };
}

/**
 * Quality audit nested under 'method' - validation results
 */
function createQualityAudit(options = {}) {
  return {
    validation: {
      schemaConformance: options.schemaConformance ?? null, // % of records matching schema
      nullRates: options.nullRates || {},                   // { fieldName: rate }
      typeCoercionCount: options.typeCoercionCount ?? 0,    // Fields that needed conversion
      truncatedValues: options.truncatedValues ?? 0
    },
    warnings: options.warnings || [],  // { code, field, message, affectedRecords[] }
    errors: options.errors || [],      // { code, row, message, resolution }
    completeness: {
      expectedRecords: options.expectedRecords ?? null,
      importedRecords: options.importedRecords ?? null,
      skippedRecords: options.skippedRecords ?? 0,
      skippedReason: options.skippedReason || null
    }
  };
}

/**
 * File identity nested under 'source' - cryptographic file identification
 */
function createFileIdentity(options = {}) {
  return {
    contentHash: options.contentHash || null,  // SHA-256 of raw file content
    rawSize: options.rawSize || null,          // Bytes before parsing
    encoding: options.encoding || null,        // Detected encoding (utf-8, etc.)
    mimeType: options.mimeType || null         // Actual MIME type
  };
}

/**
 * Origin verification nested under 'source' - external source validation
 */
function createOriginVerification(options = {}) {
  return {
    sourceUrl: options.sourceUrl || null,
    fetchedAt: options.fetchedAt || null,
    httpStatus: options.httpStatus || null,
    contentTypeHeader: options.contentTypeHeader || null,
    etagHeader: options.etagHeader || null,
    lastModifiedHeader: options.lastModifiedHeader || null
  };
}

/**
 * Merge manifest nested under 'source' - multi-file import tracking
 */
function createMergeManifest(options = {}) {
  return {
    type: options.type || 'SINGLE_SOURCE',  // SINGLE_SOURCE, MULTI_FILE, MULTI_SHEET
    sources: options.sources || [],          // { filename, contentHash, recordsContributed, fieldsContributed[] }
    mergeStrategy: options.mergeStrategy || null,     // UNION, INTERSECTION, GRAPH_UNION
    conflictResolution: options.conflictResolution || null  // FIRST_WINS, LAST_WINS, ERROR
  };
}

/**
 * Schema mapping nested under 'term' - semantic field interpretation
 */
function createSchemaMapping(options = {}) {
  return {
    inferredTypes: options.inferredTypes || {},   // { fieldName: { type, confidence } }
    fieldSemantics: options.fieldSemantics || {}, // { fieldName: semanticType } (e.g., 'email', 'currency')
    ontologyLinks: options.ontologyLinks || []    // Links to external ontologies
  };
}

/**
 * Parser interpretation nested under 'definition' - how raw data was interpreted
 */
function createParserInterpretation(options = {}) {
  return {
    delimiter: options.delimiter || null,
    quoteChar: options.quoteChar || null,
    escapeChar: options.escapeChar || null,
    nullRepresentation: options.nullRepresentation || [],  // ['', 'NULL', 'N/A', etc.]
    dateFormats: options.dateFormats || [],                // Detected date formats
    numberFormats: options.numberFormats || {}             // { fieldName: format }
  };
}

/**
 * Domain authority nested under 'jurisdiction' - source trust signals
 */
function createDomainAuthority(options = {}) {
  return {
    domain: options.domain || null,
    domainOwner: options.domainOwner || null,
    dataLicense: options.dataLicense || null,
    certIssuer: options.certIssuer || null,
    certExpiry: options.certExpiry || null
  };
}

/**
 * Import scope nested under 'scale' - size/extent of import
 */
function createImportScope(options = {}) {
  return {
    recordCount: options.recordCount ?? null,
    fieldCount: options.fieldCount ?? null,
    fileCount: options.fileCount ?? 1,
    sheetCount: options.sheetCount ?? null,  // For Excel files
    totalBytes: options.totalBytes ?? null
  };
}

/**
 * Temporal chain nested under 'timeframe' - multi-stage timing
 */
function createTemporalChain(options = {}) {
  return {
    fileCreatedAt: options.fileCreatedAt || null,      // From file metadata if available
    fileModifiedAt: options.fileModifiedAt || null,    // Last modification
    uploadInitiatedAt: options.uploadInitiatedAt || null,
    parseStartedAt: options.parseStartedAt || null,
    parseCompletedAt: options.parseCompletedAt || null,
    commitCompletedAt: options.commitCompletedAt || null
  };
}

/**
 * Import context nested under 'background' - enabling conditions
 */
function createImportContext(options = {}) {
  return {
    previousVersionHash: options.previousVersionHash || null,  // If re-importing
    supersedes: options.supersedes || null,                    // Links to prior import
    retryCount: options.retryCount ?? 0,
    importMode: options.importMode || 'create',                // create, append, replace
    triggeredBy: options.triggeredBy || 'user'                 // user, scheduled, api
  };
}

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
 * Handles both flat and nested formats
 */
function mergeProvenance(parent, child) {
  const result = { ...createEmptyProvenance() };

  Object.keys(ProvenanceElements).forEach(key => {
    const element = ProvenanceElements[key];
    const parentVal = getProvenanceValue(parent?.[element]);
    const childVal = getProvenanceValue(child?.[element]);

    // Child value takes precedence, then parent value
    const mergedValue = childVal ?? parentVal ?? null;

    // If either has nested metadata, preserve it
    const parentNested = typeof parent?.[element] === 'object' ? parent[element] : {};
    const childNested = typeof child?.[element] === 'object' ? child[element] : {};

    // Merge nested metadata (child overrides parent)
    result[element] = {
      value: mergedValue,
      ...parentNested,
      ...childNested,
      value: mergedValue  // Ensure value is set correctly after spread
    };
  });

  return result;
}

/**
 * Count filled provenance elements
 * Handles both flat and nested formats
 */
function countFilledProvenance(provenance) {
  if (!provenance) return 0;
  return Object.values(ProvenanceElements).filter(key => {
    const val = getProvenanceValue(provenance[key]);
    return val != null;
  }).length;
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
 * Create dataset provenance (import-level) with nested upload metadata
 *
 * Each of the 9 EO elements can have:
 * - value: The user-provided or inferred string value
 * - Nested metadata objects specific to that element
 *
 * Structure:
 * - agent.value + agent.uploadContext
 * - method.value + method.transformationLog[] + method.qualityAudit
 * - source.value + source.fileIdentity + source.originVerification + source.mergeManifest
 * - term.value + term.schemaMapping
 * - definition.value + definition.parserInterpretation
 * - jurisdiction.value + jurisdiction.domainAuthority
 * - scale.value + scale.importScope
 * - timeframe.value + timeframe.temporalChain
 * - background.value + background.importContext
 */
function createDatasetProvenance(options = {}) {
  const now = new Date().toISOString();

  return {
    // Top-level import metadata (backwards compatible)
    importedAt: now,
    importedBy: options.importedBy || null,
    originalFilename: options.originalFilename || null,
    originalFileSize: options.originalFileSize || null,
    originalFileType: options.originalFileType || null,
    originalSource: options.originalSource || null,

    // EO 9-element provenance with nested upload metadata
    provenance: {
      // EPISTEMIC TRIAD
      agent: {
        value: options.agent || null,
        uploadContext: options.uploadContext || createUploadContext()
      },
      method: {
        value: options.method || null,
        transformationLog: options.transformationLog || [],
        qualityAudit: options.qualityAudit || null
      },
      source: {
        value: options.source || null,
        fileIdentity: options.fileIdentity || createFileIdentity(),
        originVerification: options.originVerification || null,
        mergeManifest: options.mergeManifest || null
      },

      // SEMANTIC TRIAD
      term: {
        value: options.term || null,
        schemaMapping: options.schemaMapping || null
      },
      definition: {
        value: options.definition || null,
        parserInterpretation: options.parserInterpretation || null
      },
      jurisdiction: {
        value: options.jurisdiction || null,
        domainAuthority: options.domainAuthority || null
      },

      // SITUATIONAL TRIAD
      scale: {
        value: options.scale || null,
        importScope: options.importScope || createImportScope()
      },
      timeframe: {
        value: options.timeframe || null,
        temporalChain: options.temporalChain || createTemporalChain({ uploadInitiatedAt: now })
      },
      background: {
        value: options.background || null,
        importContext: options.importContext || createImportContext()
      }
    }
  };
}

/**
 * Helper to get the simple value from a provenance element
 * Handles both old flat format and new nested format
 */
function getProvenanceValue(element) {
  if (element === null || element === undefined) return null;
  if (typeof element === 'object' && 'value' in element) return element.value;
  return element; // Old format: direct value
}

/**
 * Helper to set provenance value preserving nested metadata
 */
function setProvenanceValue(provenance, elementKey, value) {
  if (!provenance || !provenance[elementKey]) return;

  if (typeof provenance[elementKey] === 'object' && 'value' in provenance[elementKey]) {
    provenance[elementKey].value = value;
  } else {
    provenance[elementKey] = value;
  }
}

/**
 * Normalize provenance to new nested format
 * Converts old flat format { agent: "value" } to new { agent: { value: "value" } }
 */
function normalizeProvenance(provenance) {
  if (!provenance) return createEmptyProvenance();

  const normalized = {};

  for (const key of Object.values(ProvenanceElements)) {
    const element = provenance[key];

    if (element === null || element === undefined) {
      normalized[key] = { value: null };
    } else if (typeof element === 'object' && 'value' in element) {
      // Already in new format
      normalized[key] = element;
    } else if (isRecordRef(element)) {
      // Record reference - wrap in new format
      normalized[key] = { value: element };
    } else {
      // Old format: string value
      normalized[key] = { value: element };
    }
  }

  return normalized;
}

/**
 * Flatten provenance to old format for display/comparison
 * Converts { agent: { value: "x" } } to { agent: "x" }
 */
function flattenProvenance(provenance) {
  if (!provenance) return createEmptyProvenance();

  const flat = {};

  for (const key of Object.values(ProvenanceElements)) {
    flat[key] = getProvenanceValue(provenance[key]);
  }

  return flat;
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
    // Schema
    ProvenanceElements,
    ProvenanceTriads,
    ProvenanceLabels,

    // Value types
    isRecordRef,
    createRecordRef,
    getRefId,

    // Core provenance
    createEmptyProvenance,
    mergeProvenance,
    countFilledProvenance,
    getProvenanceStatus,
    getProvenanceIndicator,

    // Nested value helpers
    getProvenanceValue,
    setProvenanceValue,
    normalizeProvenance,
    flattenProvenance,

    // Upload metadata factories
    createUploadContext,
    createTransformationStep,
    createQualityAudit,
    createFileIdentity,
    createOriginVerification,
    createMergeManifest,
    createSchemaMapping,
    createParserInterpretation,
    createDomainAuthority,
    createImportScope,
    createTemporalChain,
    createImportContext,

    // Dataset/Record provenance
    createDatasetProvenance,
    createRecordProvenance,
    resolveRecordProvenance,
    resolveFieldProvenance,
    getProvenanceInheritance,

    // Display
    formatProvenanceValue,
    renderProvenanceIndicator,

    // Backlinks
    findProvenanceCitations,

    // Import mapping
    mapEmbeddedProvenance
  };
}

if (typeof window !== 'undefined') {
  window.EOProvenance = {
    // Schema
    ProvenanceElements,
    ProvenanceTriads,
    ProvenanceLabels,

    // Value types
    isRecordRef,
    createRecordRef,
    getRefId,

    // Core provenance
    createEmptyProvenance,
    mergeProvenance,
    countFilledProvenance,
    getProvenanceStatus,
    getProvenanceIndicator,

    // Nested value helpers
    getProvenanceValue,
    setProvenanceValue,
    normalizeProvenance,
    flattenProvenance,

    // Upload metadata factories
    createUploadContext,
    createTransformationStep,
    createQualityAudit,
    createFileIdentity,
    createOriginVerification,
    createMergeManifest,
    createSchemaMapping,
    createParserInterpretation,
    createDomainAuthority,
    createImportScope,
    createTemporalChain,
    createImportContext,

    // Dataset/Record provenance
    createDatasetProvenance,
    createRecordProvenance,
    resolveRecordProvenance,
    resolveFieldProvenance,
    getProvenanceInheritance,

    // Display
    formatProvenanceValue,
    renderProvenanceIndicator,

    // Backlinks
    findProvenanceCitations,

    // Import mapping
    mapEmbeddedProvenance
  };
}
