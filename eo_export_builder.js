/**
 * EO Lake Export Builder - Comprehensive Export Format System
 *
 * Implements the export format design with multiple scopes:
 * - Master Archive: Complete system reconstruction
 * - Workspace: All data in a workspace
 * - Set: Single set with configurable options
 * - View: Filtered/sorted perspective
 * - Selection: Specific selected records
 * - Definitions: Semantic vocabulary only
 * - Audit: Activity trail for compliance
 * - Delta: Incremental changes
 * - Snapshot: Current state only
 *
 * Every export is itself a Given event with full provenance.
 */

// ============================================================================
// Constants
// ============================================================================

const ExportScope = Object.freeze({
  MASTER_ARCHIVE: 'master_archive',
  WORKSPACE: 'workspace',
  SET: 'set',
  VIEW: 'view',
  SELECTION: 'selection',
  DEFINITIONS: 'definitions',
  AUDIT: 'audit',
  DELTA: 'delta',
  SNAPSHOT: 'snapshot'
});

const ExportFormat = Object.freeze({
  EO_LAKE: 'eo_lake',       // Full fidelity native format
  JSON: 'json',              // Standard JSON
  CSV: 'csv',                // Comma-separated values
  XLSX: 'xlsx',              // Excel workbook
  SQL: 'sql',                // SQL statements
  NDJSON: 'ndjson'           // Newline-delimited JSON
});

const HistoryDepth = Object.freeze({
  NONE: 'none',
  DAYS_30: '30d',
  DAYS_90: '90d',
  YEAR_1: '1y',
  FULL: 'full'
});

// ============================================================================
// Export Options
// ============================================================================

/**
 * Default export options
 */
function getDefaultExportOptions() {
  return {
    // What to include
    includeDefinitions: true,
    includeHistory: false,
    historyDepth: HistoryDepth.NONE,
    includeActivity: false,
    includeGhosts: false,
    includeSources: false,
    includeLinkedRecords: false,
    includeLinkedSetSchema: false,

    // Format options
    format: ExportFormat.EO_LAKE,
    pretty: true,
    includeMetadata: true,
    generateChecksum: true,

    // CSV options
    csvDelimiter: ',',
    csvQuoteChar: '"',
    csvDateFormat: 'ISO8601',
    csvNullValue: '',
    csvMultiselectDelimiter: ';',

    // JSON options
    jsonStructure: 'object',  // 'object' | 'array' | 'ndjson'
    jsonIncludeFieldIds: false,

    // Excel options
    xlsxOneSheetPerSet: true,
    xlsxIncludeMetadataSheet: false,
    xlsxIncludeDefinitionsSheet: false,
    xlsxAutoColumnWidth: true,
    xlsxFreezeHeaderRow: true,

    // SQL options
    sqlDialect: 'postgresql',
    sqlIncludeCreateTable: true,
    sqlIncludeDropTable: false,
    sqlBatchSize: 1000,
    sqlTablePrefix: ''
  };
}

// ============================================================================
// Export Metadata Header
// ============================================================================

/**
 * Create standard export header
 */
function createExportHeader(scope, options = {}) {
  const header = {
    _eo_lake_export: {
      format: options.format || ExportFormat.EO_LAKE,
      version: '1.0',

      exported_at: new Date().toISOString(),
      exported_by: options.actor || 'unknown',
      export_method: options.method || 'ui',

      source_system: {
        name: 'EO Lake',
        version: '1.0.0'
      },

      scope: {
        type: scope,
        ids: options.scopeIds || []
      },

      options: {
        includeDefinitions: options.includeDefinitions,
        includeHistory: options.includeHistory,
        historyDepth: options.historyDepth,
        includeActivity: options.includeActivity,
        includeGhosts: options.includeGhosts,
        includeSources: options.includeSources
      }
    }
  };

  return header;
}

/**
 * Create integrity info
 */
function createIntegrityInfo(data) {
  let recordCount = 0;
  let eventCount = 0;

  if (data.sets) {
    for (const set of data.sets) {
      recordCount += (set.records || []).length;
    }
  }
  if (data.records) {
    recordCount += data.records.length;
  }
  if (data.event_log?.events) {
    eventCount = data.event_log.events.length;
  }

  return {
    record_count: recordCount,
    event_count: eventCount,
    checksum: generateChecksum(data)
  };
}

/**
 * Generate checksum for data integrity
 */
function generateChecksum(data) {
  // Simple checksum based on JSON string length and content sampling
  const json = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < json.length; i++) {
    const char = json.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `sha256-${Math.abs(hash).toString(16).padStart(8, '0')}`;
}

// ============================================================================
// History Filtering
// ============================================================================

/**
 * Filter events by history depth
 */
function filterEventsByDepth(events, depth) {
  if (depth === HistoryDepth.FULL || depth === HistoryDepth.NONE) {
    return depth === HistoryDepth.FULL ? events : [];
  }

  const now = Date.now();
  let cutoff;

  switch (depth) {
    case HistoryDepth.DAYS_30:
      cutoff = now - (30 * 24 * 60 * 60 * 1000);
      break;
    case HistoryDepth.DAYS_90:
      cutoff = now - (90 * 24 * 60 * 60 * 1000);
      break;
    case HistoryDepth.YEAR_1:
      cutoff = now - (365 * 24 * 60 * 60 * 1000);
      break;
    default:
      return events;
  }

  return events.filter(e => new Date(e.timestamp).getTime() >= cutoff);
}

/**
 * Filter events by entity IDs
 */
function filterEventsByEntities(events, entityIds) {
  const idSet = new Set(entityIds);
  return events.filter(e => {
    const targetId = e.payload?.targetId ||
                     e.payload?.recordId ||
                     e.payload?.setId ||
                     e.payload?.entityId;
    return targetId && idSet.has(targetId);
  });
}

// ============================================================================
// ExportBuilder Class
// ============================================================================

/**
 * ExportBuilder - Orchestrates data export with configurable options
 */
class ExportBuilder {
  constructor(options = {}) {
    this.options = { ...getDefaultExportOptions(), ...options };

    // Get store references
    this._eventStore = options.eventStore || (typeof getEventStore === 'function' ? getEventStore() : null);
    this._semanticRegistry = options.semanticRegistry ||
      (typeof window !== 'undefined' && window.EOSchemaSemantic?.getSemanticRegistry?.()) || null;
    this._bindingStore = options.bindingStore ||
      (typeof window !== 'undefined' && window.EOInterpretationBinding?.getBindingStore?.()) || null;
    this._activityStore = options.activityStore ||
      (typeof window !== 'undefined' && window.activityStore) || null;
    this._ghostRegistry = options.ghostRegistry ||
      (typeof window !== 'undefined' && window.getGhostRegistry?.()) || null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Main Export Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Export a single set
   */
  exportSet(set, options = {}) {
    const opts = { ...this.options, ...options };
    const header = createExportHeader(ExportScope.SET, {
      ...opts,
      scopeIds: [set.id]
    });

    const exportData = {
      ...header,
      format: 'eo-lake-set',
      version: '1.0',

      set: {
        id: set.id,
        name: set.name,
        description: set.description || null,
        icon: set.icon || null,
        fields: this._exportFields(set.fields),
        records: this._exportRecords(set.records, set.fields),
        views: (set.views || []).map(v => this._exportView(v))
      }
    };

    // Include lineage if available
    if (set.parentSetId || set.sourceId) {
      exportData.lineage = {
        parent_set_id: set.parentSetId || null,
        source_id: set.sourceId || null,
        created_at: set.createdAt
      };
    }

    // Include definitions if requested
    if (opts.includeDefinitions) {
      exportData.definitions = this._collectDefinitionsForSet(set);
    }

    // Include history if requested
    if (opts.includeHistory && opts.historyDepth !== HistoryDepth.NONE) {
      exportData.history = this._collectHistoryForSet(set, opts.historyDepth);
    }

    // Include source if requested
    if (opts.includeSources && set.sources) {
      exportData.sources = set.sources.map(s => this._exportSource(s));
    }

    // Include linked records if requested
    if (opts.includeLinkedRecords) {
      exportData.linked_data = this._collectLinkedData(set, opts.includeLinkedSetSchema);
    }

    // Add integrity info
    exportData._eo_lake_export.integrity = createIntegrityInfo(exportData);

    return exportData;
  }

  /**
   * Export a view (filtered/sorted perspective)
   */
  exportView(view, set, options = {}) {
    const opts = { ...this.options, ...options };
    const header = createExportHeader(ExportScope.VIEW, {
      ...opts,
      scopeIds: [view.id]
    });

    // Get visible fields
    const visibleFieldIds = new Set(view.visibleFields || view.fields || set.fields.map(f => f.id));
    const visibleFields = set.fields.filter(f => visibleFieldIds.has(f.id));

    // Get filtered/sorted records
    const visibleRecords = this._getViewRecords(view, set);

    const exportData = {
      ...header,
      format: 'eo-lake-view',
      version: '1.0',

      view: {
        id: view.id,
        name: view.name,
        type: view.type || 'table',
        configuration: {
          sortBy: view.sortBy || null,
          groupBy: view.groupBy || null,
          filterExpression: view.filterExpression || null,
          visibleFields: Array.from(visibleFieldIds)
        }
      },

      data: {
        fields: this._exportFields(visibleFields),
        records: this._exportRecords(visibleRecords, visibleFields)
      },

      set_reference: {
        id: set.id,
        name: set.name,
        total_records: (set.records || []).length,
        total_fields: (set.fields || []).length
      }
    };

    // Include definitions if requested
    if (opts.includeDefinitions) {
      exportData.definitions = this._collectDefinitionsForFields(visibleFields);
    }

    // Include view history if requested
    if (opts.includeHistory && opts.historyDepth !== HistoryDepth.NONE) {
      exportData.history = this._collectHistoryForView(view, opts.historyDepth);
    }

    exportData._eo_lake_export.integrity = createIntegrityInfo(exportData);

    return exportData;
  }

  /**
   * Export selected records
   */
  exportSelection(recordIds, set, options = {}) {
    const opts = { ...this.options, ...options };
    const header = createExportHeader(ExportScope.SELECTION, {
      ...opts,
      scopeIds: recordIds
    });

    // Get selected records
    const selectedRecords = (set.records || []).filter(r => recordIds.includes(r.id));

    const exportData = {
      ...header,
      format: 'eo-lake-selection',
      version: '1.0',

      selection: {
        record_ids: recordIds,
        source_set_id: set.id,
        source_set_name: set.name
      },

      data: {
        fields: this._exportFields(set.fields),
        records: this._exportRecords(selectedRecords, set.fields)
      }
    };

    // Include definitions if requested
    if (opts.includeDefinitions) {
      exportData.definitions = this._collectDefinitionsForSet(set);
    }

    // Include record history if requested
    if (opts.includeHistory && opts.historyDepth !== HistoryDepth.NONE) {
      exportData.history = this._collectHistoryForRecords(recordIds, opts.historyDepth);
    }

    // Include linked records if requested
    if (opts.includeLinkedRecords) {
      exportData.linked_data = this._collectLinkedDataForRecords(selectedRecords, set);
    }

    exportData._eo_lake_export.integrity = createIntegrityInfo(exportData);

    return exportData;
  }

  /**
   * Export current state snapshot (no history)
   */
  exportSnapshot(sets, options = {}) {
    const opts = { ...this.options, ...options };
    const header = createExportHeader(ExportScope.SNAPSHOT, {
      ...opts,
      scopeIds: sets.map(s => s.id)
    });

    const exportData = {
      ...header,
      format: 'eo-lake-snapshot',
      version: '1.0',
      snapshot_time: new Date().toISOString(),

      scope: opts.scope || 'sets',
      scope_ids: sets.map(s => s.id),

      sets: sets.map(set => ({
        id: set.id,
        name: set.name,
        icon: set.icon,
        fields: this._exportFields(set.fields),
        records: this._exportRecords(set.records, set.fields),
        views: (set.views || []).map(v => this._exportView(v))
      })),

      lossy_notice: 'This export contains current state only. History and provenance are not included.'
    };

    // Include definitions if requested
    if (opts.includeDefinitions) {
      exportData.definitions = this._collectAllDefinitions();
    }

    exportData._eo_lake_export.integrity = createIntegrityInfo(exportData);

    return exportData;
  }

  /**
   * Export definitions only
   */
  exportDefinitions(options = {}) {
    const opts = { ...this.options, ...options };
    const header = createExportHeader(ExportScope.DEFINITIONS, opts);

    const semantics = this._semanticRegistry?.getAll() || [];
    const bindings = this._bindingStore?.getAll() || [];

    const exportData = {
      ...header,
      format: 'eo-lake-definitions',
      version: '1.0',

      schema_semantics: semantics.map(s => ({
        id: s.id,
        term: s.term,
        canonical_label: s.canonical_label,
        definition: s.definition,
        jurisdiction: s.jurisdiction,
        scale: s.scale,
        timeframe: s.timeframe,
        background: s.background || [],
        aliases: s.aliases || [],
        aligned_uris: s.aligned_uris || [],
        version: s.version,
        status: s.status,
        role: s.role,
        usage_stats: opts.includeUsageStats ? s.usage_stats : undefined
      })),

      // Include binding templates (active bindings without the data)
      binding_templates: opts.includeBindingTemplates ? bindings.map(b => ({
        id: b.id,
        name: `Interpretation for ${b.source_dataset}`,
        bindings: b.bindings.map(cb => ({
          column: cb.column,
          semantic_uri: cb.semantic_uri,
          confidence: cb.confidence
        }))
      })) : undefined
    };

    // Include definition history if requested
    if (opts.includeHistory && opts.historyDepth !== HistoryDepth.NONE) {
      exportData.history = this._collectDefinitionHistory(opts.historyDepth);
    }

    exportData._eo_lake_export.integrity = createIntegrityInfo(exportData);

    return exportData;
  }

  /**
   * Export audit trail
   */
  exportAudit(options = {}) {
    const opts = { ...this.options, ...options };
    const header = createExportHeader(ExportScope.AUDIT, opts);

    // Get activity data
    const activities = this._activityStore?.query({
      startTime: opts.startTime,
      endTime: opts.endTime,
      agent: opts.actors,
      entityId: opts.entityIds,
      operator: opts.operators
    }) || [];

    // Get sequences
    const sequences = this._activityStore?.sequences || new Map();

    // Build operator stats
    const operatorStats = {};
    const actorStats = {};

    for (const act of activities) {
      operatorStats[act.operator] = (operatorStats[act.operator] || 0) + 1;
      const agent = act.context?.epistemic?.agent || 'unknown';
      actorStats[agent] = (actorStats[agent] || 0) + 1;
    }

    const exportData = {
      ...header,
      format: 'eo-lake-audit',
      version: '1.0',

      audit_scope: {
        start_time: opts.startTime || null,
        end_time: opts.endTime || new Date().toISOString(),
        actors: opts.actors || null,
        sets: opts.setIds || null,
        operators: opts.operators || null
      },

      activity: {
        atoms: activities.map(a => ({
          id: a.id,
          timestamp: a.timestamp,
          logical_clock: a.logicalClock,
          operator: a.operator,
          target: {
            id: a.target?.id || a.target?.entityId,
            type: a.target?.entityType || a.target?.positionType
          },
          actor: a.context?.epistemic?.agent,
          context: a.context,
          sequence_id: a.sequenceId,
          sequence_index: a.sequenceIndex
        })),

        sequences: Array.from(sequences.values()).map(s => ({
          id: s.id,
          name: s.name,
          atom_count: s.atomCount,
          start_time: s.timestamp,
          end_time: s.completedAt
        }))
      },

      summary: {
        total_events: activities.length,
        by_operator: operatorStats,
        by_actor: actorStats
      }
    };

    // Include supersession chains if requested
    if (opts.includeSupersessions && this._eventStore) {
      exportData.supersessions = this._collectSupersessions();
    }

    exportData._eo_lake_export.integrity = createIntegrityInfo(exportData);

    return exportData;
  }

  /**
   * Export delta (changes since a point)
   */
  exportDelta(baseLogicalClock, options = {}) {
    const opts = { ...this.options, ...options };
    const header = createExportHeader(ExportScope.DELTA, opts);

    if (!this._eventStore) {
      throw new Error('Event store not available for delta export');
    }

    // Get all events after the base clock
    const allEvents = this._eventStore.getAll();
    const newEvents = allEvents.filter(e => e.logicalClock > baseLogicalClock);

    // Analyze changes
    const changes = {
      sets_created: [],
      sets_modified: [],
      sets_deleted: [],
      records_created: 0,
      records_modified: 0,
      records_deleted: 0,
      definitions_added: [],
      definitions_modified: [],
      definitions_deprecated: []
    };

    for (const event of newEvents) {
      if (event.category === 'set_created') {
        changes.sets_created.push(event.payload?.setId);
      } else if (event.category === 'set_updated') {
        if (!changes.sets_modified.includes(event.payload?.setId)) {
          changes.sets_modified.push(event.payload?.setId);
        }
      } else if (event.category === 'tombstone' && event.payload?.targetSnapshot?.type === 'set') {
        changes.sets_deleted.push(event.payload?.targetId);
      } else if (event.category === 'record_created') {
        changes.records_created++;
      } else if (event.category === 'record_updated') {
        changes.records_modified++;
      } else if (event.category === 'tombstone' && event.payload?.targetSnapshot?.type === 'record') {
        changes.records_deleted++;
      }
    }

    const exportData = {
      ...header,
      format: 'eo-lake-delta',
      version: '1.0',

      delta: {
        base_logical_clock: baseLogicalClock,
        base_timestamp: opts.baseTimestamp || null,
        current_logical_clock: this._eventStore.clock,
        current_timestamp: new Date().toISOString()
      },

      new_events: newEvents.map(e => ({ ...e })),

      changes,

      application_order: newEvents.map(e => ({ eventId: e.id, logicalClock: e.logicalClock }))
    };

    exportData._eo_lake_export.integrity = createIntegrityInfo(exportData);

    return exportData;
  }

  /**
   * Export workspace
   */
  exportWorkspace(workspaceId, sets, options = {}) {
    const opts = { ...this.options, ...options };
    const header = createExportHeader(ExportScope.WORKSPACE, {
      ...opts,
      scopeIds: [workspaceId]
    });

    const exportData = {
      ...header,
      format: 'eo-lake-workspace',
      version: '1.0',
      workspace_id: workspaceId,
      workspace_name: opts.workspaceName || workspaceId,

      sets: sets.map(set => ({
        id: set.id,
        name: set.name,
        icon: set.icon,
        description: set.description,
        fields: this._exportFields(set.fields),
        records: this._exportRecords(set.records, set.fields),
        views: (set.views || []).map(v => this._exportView(v)),
        sources: set.sources || []
      })),

      include: {
        history: opts.includeHistory,
        history_depth: opts.historyDepth,
        definitions: opts.includeDefinitions,
        sources: opts.includeSources,
        ghosts: opts.includeGhosts,
        activity: opts.includeActivity
      }
    };

    // Include definitions if requested
    if (opts.includeDefinitions) {
      exportData.definitions = this._collectAllDefinitions();
    }

    // Include history if requested
    if (opts.includeHistory && opts.historyDepth !== HistoryDepth.NONE) {
      const events = this._eventStore?.getAll() || [];
      const workspaceEvents = events.filter(e => e.context?.workspace === workspaceId);
      exportData.event_log = filterEventsByDepth(workspaceEvents, opts.historyDepth);
    }

    // Include ghosts if requested
    if (opts.includeGhosts && this._ghostRegistry) {
      exportData.ghosts = this._ghostRegistry.getAllGhosts({ workspace: workspaceId });
    }

    // Include activity if requested
    if (opts.includeActivity && this._activityStore) {
      exportData.activity = this._activityStore.query({ workspace: workspaceId });
    }

    exportData._eo_lake_export.integrity = createIntegrityInfo(exportData);

    return exportData;
  }

  /**
   * Export master archive (everything)
   */
  exportMasterArchive(sets, options = {}) {
    const opts = { ...this.options, ...options };
    const header = createExportHeader(ExportScope.MASTER_ARCHIVE, opts);

    const exportData = {
      ...header,
      format: 'eo-lake-archive',
      version: '1.0',

      // The authoritative source
      event_log: {
        events: this._eventStore?.getAll() || [],
        logical_clock: this._eventStore?.clock || 0,
        supersession_index: this._collectSupersessionIndex()
      },

      // Current computed state
      snapshot: {
        sets: sets.map(set => ({
          id: set.id,
          name: set.name,
          icon: set.icon,
          description: set.description,
          fields: this._exportFields(set.fields),
          records: this._exportRecords(set.records, set.fields),
          views: (set.views || []).map(v => this._exportView(v)),
          sources: set.sources || []
        })),
        ghost_registry: this._ghostRegistry?.export()?.ghosts || [],
        tossed_items: opts.tossedItems || []
      },

      // Semantic layer
      definitions: {
        schema_semantics: this._semanticRegistry?.getAll().map(s => s.toJSON()) || [],
        interpretation_bindings: this._bindingStore?.getAll().map(b => b.toJSON()) || []
      },

      // Original imports
      sources: {
        imports: this._collectAllSources(sets)
      },

      // Activity layer
      activity: {
        atoms: this._activityStore?.query({}) || [],
        sequences: Array.from(this._activityStore?.sequences?.values() || [])
      }
    };

    // Add integrity info
    exportData._eo_lake_export.integrity = createIntegrityInfo(exportData);

    return exportData;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helper Methods
  // ─────────────────────────────────────────────────────────────────────────

  _exportFields(fields) {
    return (fields || []).map(f => ({
      id: f.id,
      name: f.name,
      type: f.type,
      width: f.width,
      isPrimary: f.isPrimary || false,
      options: f.options || {}
    }));
  }

  _exportRecords(records, fields) {
    return (records || []).map(r => ({
      id: r.id,
      values: r.values || {},
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));
  }

  _exportView(view) {
    return {
      id: view.id,
      name: view.name,
      type: view.type || 'table',
      visibleFields: view.visibleFields || view.fields,
      sortBy: view.sortBy,
      groupBy: view.groupBy,
      filterExpression: view.filterExpression,
      metadata: view.metadata
    };
  }

  _exportSource(source) {
    return {
      id: source.id,
      name: source.name,
      type: source.type,
      fileMetadata: source.fileMetadata,
      importedAt: source.importedAt,
      importedBy: source.importedBy,
      provenance: source.provenance,
      originalData: source.originalData
    };
  }

  _getViewRecords(view, set) {
    let records = [...(set.records || [])];

    // Apply filter if exists
    if (view.filterExpression) {
      // Simple filter implementation - would need proper expression parser
      // For now just return all records
    }

    // Apply sort if exists
    if (view.sortBy) {
      const { fieldId, direction } = typeof view.sortBy === 'object' ?
        view.sortBy : { fieldId: view.sortBy, direction: 'asc' };
      records.sort((a, b) => {
        const aVal = a.values?.[fieldId] ?? '';
        const bVal = b.values?.[fieldId] ?? '';
        const cmp = String(aVal).localeCompare(String(bVal));
        return direction === 'desc' ? -cmp : cmp;
      });
    }

    return records;
  }

  _collectDefinitionsForSet(set) {
    if (!this._semanticRegistry || !this._bindingStore) return [];

    const binding = this._bindingStore.getActiveForDataset(set.id);
    if (!binding) return [];

    const semanticUris = binding.bindings.map(b => b.semantic_uri);
    return semanticUris
      .map(uri => this._semanticRegistry.get(uri))
      .filter(Boolean)
      .map(s => s.toJSON());
  }

  _collectDefinitionsForFields(fields) {
    // For now, return all definitions - could be more selective
    return this._collectAllDefinitions();
  }

  _collectAllDefinitions() {
    if (!this._semanticRegistry) return [];
    return this._semanticRegistry.getAll().map(s => s.toJSON());
  }

  _collectHistoryForSet(set, depth) {
    if (!this._eventStore) return [];
    const events = this._eventStore.getByEntity(set.id);
    return filterEventsByDepth(events, depth);
  }

  _collectHistoryForView(view, depth) {
    if (!this._eventStore) return [];
    const events = this._eventStore.getByEntity(view.id);
    return filterEventsByDepth(events, depth);
  }

  _collectHistoryForRecords(recordIds, depth) {
    if (!this._eventStore) return [];
    const allEvents = [];
    for (const id of recordIds) {
      allEvents.push(...this._eventStore.getByEntity(id));
    }
    return filterEventsByDepth(allEvents, depth);
  }

  _collectDefinitionHistory(depth) {
    if (!this._eventStore) return [];
    const events = this._eventStore.getByCategory('semantic_created') || [];
    const updateEvents = this._eventStore.getByCategory('semantic_updated') || [];
    return filterEventsByDepth([...events, ...updateEvents], depth);
  }

  _collectLinkedData(set, includeSchema) {
    const linkedSets = [];
    const linkedSetIds = new Set();

    // Find link fields
    for (const field of set.fields || []) {
      if (field.type === 'LINK' && field.options?.linkedSetId) {
        linkedSetIds.add(field.options.linkedSetId);
      }
    }

    // Collect linked records (would need access to all sets)
    // For now, return empty - actual implementation would query for linked sets

    return {
      sets: linkedSets
    };
  }

  _collectLinkedDataForRecords(records, set) {
    // Similar to above - collect linked records for specific records
    return { sets: [] };
  }

  _collectSupersessions() {
    if (!this._eventStore) return [];

    const supersessions = [];
    const events = this._eventStore.getAll();

    for (const event of events) {
      if (event.supersession?.supersedes) {
        supersessions.push({
          original_id: event.supersession.supersedes,
          replacement_id: event.id,
          type: event.supersession.type,
          reason: event.supersession.reason,
          timestamp: event.timestamp
        });
      }
    }

    return supersessions;
  }

  _collectSupersessionIndex() {
    if (!this._eventStore) return {};

    const index = {};
    const events = this._eventStore.getAll();

    for (const event of events) {
      if (event.supersession?.supersedes) {
        index[event.supersession.supersedes] = event.id;
      }
    }

    return index;
  }

  _collectAllSources(sets) {
    const sources = [];
    for (const set of sets) {
      if (set.sources) {
        sources.push(...set.sources.map(s => this._exportSource(s)));
      }
    }
    return sources;
  }
}

// ============================================================================
// Format Converters
// ============================================================================

/**
 * Convert EO Lake export to standard JSON
 */
function convertToJSON(exportData, options = {}) {
  // For JSON, we can just serialize the export data
  const pretty = options.pretty !== false;
  return new Blob(
    [JSON.stringify(exportData, null, pretty ? 2 : 0)],
    { type: 'application/json' }
  );
}

/**
 * Convert EO Lake export to CSV
 */
function convertToCSV(exportData, options = {}) {
  const sets = exportData.sets || (exportData.set ? [exportData.set] : []);
  const delimiter = options.csvDelimiter || ',';

  if (sets.length === 0 && exportData.data) {
    // Single view or selection export
    return createCSVBlob(exportData.data.fields, exportData.data.records, delimiter);
  }

  // For multiple sets, only export the first one (CSV can't have multiple sheets)
  if (sets.length > 0) {
    const set = sets[0];
    return createCSVBlob(set.fields, set.records, delimiter);
  }

  return new Blob([''], { type: 'text/csv' });
}

function createCSVBlob(fields, records, delimiter) {
  const headers = fields.map(f => escapeCSV(f.name, delimiter));
  const rows = records.map(record => {
    return fields.map(field => {
      const value = record.values?.[field.id] ?? '';
      return formatCSVValue(value, field, delimiter);
    });
  });

  const csvContent = [
    headers.join(delimiter),
    ...rows.map(row => row.join(delimiter))
  ].join('\n');

  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}

function escapeCSV(value, delimiter) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function formatCSVValue(value, field, delimiter) {
  if (value == null || value === '') return '';

  switch (field.type) {
    case 'MULTI_SELECT':
      return Array.isArray(value) ? escapeCSV(value.join('; '), delimiter) : escapeCSV(value, delimiter);
    case 'CHECKBOX':
      return value ? 'true' : 'false';
    case 'DATE':
      return value instanceof Date ? value.toISOString().split('T')[0] : escapeCSV(value, delimiter);
    case 'JSON':
    case 'ATTACHMENT':
      return typeof value === 'object' ? escapeCSV(JSON.stringify(value), delimiter) : escapeCSV(value, delimiter);
    default:
      return escapeCSV(value, delimiter);
  }
}

/**
 * Convert EO Lake export to Excel
 */
function convertToXLSX(exportData, options = {}) {
  if (typeof XLSX === 'undefined') {
    throw new Error('Excel export requires SheetJS library');
  }

  const wb = XLSX.utils.book_new();
  const sets = exportData.sets || (exportData.set ? [exportData.set] : []);

  if (sets.length === 0 && exportData.data) {
    // Single view or selection
    const ws = createWorksheet(exportData.data.fields, exportData.data.records);
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
  } else {
    // Multiple sets
    const usedNames = new Set();
    for (const set of sets) {
      const ws = createWorksheet(set.fields, set.records);
      let name = sanitizeSheetName(set.name);
      let counter = 1;
      while (usedNames.has(name)) {
        name = sanitizeSheetName(`${set.name} (${counter++})`);
      }
      usedNames.add(name);
      XLSX.utils.book_append_sheet(wb, ws, name);
    }
  }

  // Add definitions sheet if requested
  if (options.xlsxIncludeDefinitionsSheet && exportData.definitions) {
    const defData = [['Term', 'Definition', 'Jurisdiction', 'Status']];
    const defs = Array.isArray(exportData.definitions) ? exportData.definitions : exportData.definitions.schema_semantics || [];
    for (const def of defs) {
      defData.push([def.term, def.definition, def.jurisdiction, def.status]);
    }
    const defWs = XLSX.utils.aoa_to_sheet(defData);
    XLSX.utils.book_append_sheet(wb, defWs, 'Definitions');
  }

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

function createWorksheet(fields, records) {
  const headers = fields.map(f => f.name);
  const rows = records.map(record => {
    return fields.map(field => {
      const value = record.values?.[field.id];
      return formatExcelValue(value, field);
    });
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = fields.map((f, i) => ({ wch: Math.max(f.name.length, 10) + 2 }));

  return ws;
}

function formatExcelValue(value, field) {
  if (value == null) return '';

  switch (field.type) {
    case 'MULTI_SELECT':
      return Array.isArray(value) ? value.join(', ') : value;
    case 'CHECKBOX':
      return value ? 'Yes' : 'No';
    case 'DATE':
      return value instanceof Date ? value : (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/) ? new Date(value) : value);
    case 'NUMBER':
      return typeof value === 'number' ? value : parseFloat(value) || value;
    case 'JSON':
    case 'ATTACHMENT':
      return typeof value === 'object' ? JSON.stringify(value) : value;
    default:
      return String(value);
  }
}

function sanitizeSheetName(name) {
  if (!name) return 'Sheet1';
  let sanitized = name.replace(/[\\/?*[\]:]/g, '_');
  if (sanitized.length > 31) sanitized = sanitized.substring(0, 31);
  return sanitized || 'Sheet1';
}

/**
 * Convert EO Lake export to SQL
 */
function convertToSQL(exportData, options = {}) {
  const dialect = options.sqlDialect || 'postgresql';
  const prefix = options.sqlTablePrefix || '';
  const sets = exportData.sets || (exportData.set ? [exportData.set] : []);

  const statements = [];

  for (const set of sets) {
    const tableName = `${prefix}${sanitizeTableName(set.name)}`;

    if (options.sqlIncludeDropTable) {
      statements.push(`DROP TABLE IF EXISTS ${tableName};`);
    }

    if (options.sqlIncludeCreateTable) {
      statements.push(createTableStatement(tableName, set.fields, dialect));
    }

    statements.push(...createInsertStatements(tableName, set.fields, set.records, dialect, options.sqlBatchSize));
  }

  return new Blob([statements.join('\n\n')], { type: 'text/plain' });
}

function sanitizeTableName(name) {
  return name.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '');
}

function createTableStatement(tableName, fields, dialect) {
  const columns = fields.map(f => {
    const sqlType = getSQLType(f.type, dialect);
    return `  ${f.name.toLowerCase().replace(/[^a-z0-9_]/g, '_')} ${sqlType}`;
  });

  return `CREATE TABLE ${tableName} (\n${columns.join(',\n')}\n);`;
}

function getSQLType(fieldType, dialect) {
  const typeMap = {
    TEXT: 'TEXT',
    LONG_TEXT: 'TEXT',
    NUMBER: dialect === 'postgresql' ? 'NUMERIC' : 'DECIMAL(18,4)',
    CHECKBOX: 'BOOLEAN',
    DATE: 'DATE',
    SELECT: 'VARCHAR(255)',
    MULTI_SELECT: 'TEXT',
    URL: 'TEXT',
    EMAIL: 'VARCHAR(255)',
    PHONE: 'VARCHAR(50)',
    JSON: dialect === 'postgresql' ? 'JSONB' : 'TEXT',
    ATTACHMENT: 'TEXT',
    LINK: 'VARCHAR(255)',
    FORMULA: 'TEXT',
    ROLLUP: 'TEXT',
    COUNT: 'INTEGER',
    AUTONUMBER: 'INTEGER'
  };
  return typeMap[fieldType] || 'TEXT';
}

function createInsertStatements(tableName, fields, records, dialect, batchSize = 1000) {
  const statements = [];
  const columns = fields.map(f => f.name.toLowerCase().replace(/[^a-z0-9_]/g, '_')).join(', ');

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const values = batch.map(record => {
      const vals = fields.map(f => formatSQLValue(record.values?.[f.id], f.type));
      return `(${vals.join(', ')})`;
    });

    statements.push(`INSERT INTO ${tableName} (${columns}) VALUES\n${values.join(',\n')};`);
  }

  return statements;
}

function formatSQLValue(value, fieldType) {
  if (value == null || value === '') return 'NULL';

  switch (fieldType) {
    case 'NUMBER':
    case 'COUNT':
    case 'AUTONUMBER':
      return typeof value === 'number' ? value : (parseFloat(value) || 'NULL');
    case 'CHECKBOX':
      return value ? 'TRUE' : 'FALSE';
    case 'JSON':
    case 'ATTACHMENT':
    case 'MULTI_SELECT':
      return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    default:
      return `'${String(value).replace(/'/g, "''")}'`;
  }
}

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Main export function with format conversion
 */
function exportData(scope, data, options = {}) {
  const builder = new ExportBuilder(options);
  let exportData;

  switch (scope) {
    case ExportScope.SET:
      exportData = builder.exportSet(data.set, options);
      break;
    case ExportScope.VIEW:
      exportData = builder.exportView(data.view, data.set, options);
      break;
    case ExportScope.SELECTION:
      exportData = builder.exportSelection(data.recordIds, data.set, options);
      break;
    case ExportScope.SNAPSHOT:
      exportData = builder.exportSnapshot(data.sets, options);
      break;
    case ExportScope.DEFINITIONS:
      exportData = builder.exportDefinitions(options);
      break;
    case ExportScope.AUDIT:
      exportData = builder.exportAudit(options);
      break;
    case ExportScope.DELTA:
      exportData = builder.exportDelta(data.baseLogicalClock, options);
      break;
    case ExportScope.WORKSPACE:
      exportData = builder.exportWorkspace(data.workspaceId, data.sets, options);
      break;
    case ExportScope.MASTER_ARCHIVE:
      exportData = builder.exportMasterArchive(data.sets, options);
      break;
    default:
      throw new Error(`Unknown export scope: ${scope}`);
  }

  // Convert to requested format
  const format = options.format || ExportFormat.EO_LAKE;

  switch (format) {
    case ExportFormat.JSON:
    case ExportFormat.EO_LAKE:
      return convertToJSON(exportData, options);
    case ExportFormat.CSV:
      return convertToCSV(exportData, options);
    case ExportFormat.XLSX:
      return convertToXLSX(exportData, options);
    case ExportFormat.SQL:
      return convertToSQL(exportData, options);
    default:
      return convertToJSON(exportData, options);
  }
}

/**
 * Get file extension for format
 */
function getFileExtension(format, scope) {
  const extensions = {
    [ExportFormat.EO_LAKE]: {
      [ExportScope.MASTER_ARCHIVE]: '.eolake',
      [ExportScope.WORKSPACE]: '.eolake-ws',
      [ExportScope.SET]: '.eolake-set',
      [ExportScope.VIEW]: '.eolake-view',
      [ExportScope.SELECTION]: '.eolake-sel',
      [ExportScope.DEFINITIONS]: '.eolake-def',
      [ExportScope.AUDIT]: '.eolake-audit',
      [ExportScope.DELTA]: '.eolake-delta',
      [ExportScope.SNAPSHOT]: '.eolake-snap',
      default: '.eolake'
    },
    [ExportFormat.JSON]: '.json',
    [ExportFormat.CSV]: '.csv',
    [ExportFormat.XLSX]: '.xlsx',
    [ExportFormat.SQL]: '.sql',
    [ExportFormat.NDJSON]: '.ndjson'
  };

  const ext = extensions[format];
  if (typeof ext === 'object') {
    return ext[scope] || ext.default;
  }
  return ext || '.json';
}

// ============================================================================
// Exports
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ExportScope,
    ExportFormat,
    HistoryDepth,
    ExportBuilder,
    getDefaultExportOptions,
    createExportHeader,
    createIntegrityInfo,
    filterEventsByDepth,
    filterEventsByEntities,
    exportData,
    getFileExtension,
    convertToJSON,
    convertToCSV,
    convertToXLSX,
    convertToSQL
  };
}

if (typeof window !== 'undefined') {
  window.EOExportBuilder = {
    Scope: ExportScope,
    Format: ExportFormat,
    HistoryDepth,
    Builder: ExportBuilder,
    getDefaultOptions: getDefaultExportOptions,
    createHeader: createExportHeader,
    createIntegrity: createIntegrityInfo,
    filterByDepth: filterEventsByDepth,
    filterByEntities: filterEventsByEntities,
    export: exportData,
    getExtension: getFileExtension,
    toJSON: convertToJSON,
    toCSV: convertToCSV,
    toXLSX: convertToXLSX,
    toSQL: convertToSQL
  };
}
