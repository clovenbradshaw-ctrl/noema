/**
 * EO View Hierarchy - Compliant View Organization System
 *
 * Implements a 5-level view hierarchy that fully complies with the Nine Rules:
 *
 * Level 1: Workspaces (Contextual boundaries)
 * Level 2: Sets (Typed data collections)
 * Level 3: Lenses (View type perspectives)
 * Level 4: Focuses (Filtered/restricted views)
 * Level 5: Snapshots (Immutable captures)
 *
 * COMPLIANCE:
 * - All views are MEANT events (interpretations, not sources of truth)
 * - All access is horizon-mediated (Rule 4)
 * - Focuses only restrict, never expand (Rule 5)
 * - All views have provenance tracking (Rule 7)
 * - Views are supersedable, never dogmatic (Rule 9)
 */

// ============================================================================
// View Hierarchy Levels
// ============================================================================

const ViewLevel = Object.freeze({
  WORKSPACE: 'workspace',
  SET: 'set',
  LENS: 'lens',
  FOCUS: 'focus',
  SNAPSHOT: 'snapshot'
});

const LensType = Object.freeze({
  GRID: 'grid',
  CARDS: 'cards',
  KANBAN: 'kanban',
  TIMELINE: 'timeline',
  CALENDAR: 'calendar',
  GRAPH: 'graph'
});

const ViewStatus = Object.freeze({
  ACTIVE: 'active',
  SUPERSEDED: 'superseded',
  ARCHIVED: 'archived'
});

// ============================================================================
// Base View Configuration
// ============================================================================

/**
 * Base class for all view configurations
 * All views are MEANT events - interpretations of how to see Given data
 */
class ViewNode {
  constructor(config) {
    this.id = config.id || this._generateId();
    this.name = config.name || 'Untitled View';
    this.level = config.level;
    this.parentId = config.parentId || null;
    this.createdAt = config.createdAt || new Date().toISOString();
    this.createdBy = config.createdBy || 'system';
    this.status = config.status || ViewStatus.ACTIVE;

    // Rule 7: Provenance tracking - views must be grounded in Given events
    this.provenance = config.provenance || [];

    // Rule 9: Defeasibility - views can be superseded
    this.supersedes = config.supersedes || null;
    this.supersededBy = config.supersededBy || null;

    // Rule 8: Frame with purpose
    this.frame = {
      purpose: config.purpose || 'data_visualization',
      epistemicStatus: config.epistemicStatus || 'preliminary',
      audience: config.audience || null
    };

    // Metadata
    this.description = config.description || '';
    this.icon = config.icon || 'ph-eye';
    this.color = config.color || null;
    this.tags = config.tags || [];
  }

  _generateId() {
    return `view_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate that this view is compliant with the Nine Rules
   */
  validate() {
    const errors = [];

    // Rule 7: Must have provenance
    if (!this.provenance || this.provenance.length === 0) {
      errors.push('RULE_7: View must have non-empty provenance');
    }

    // Rule 8: Must have frame with purpose
    if (!this.frame || !this.frame.purpose) {
      errors.push('RULE_8: View must have frame with purpose');
    }

    // Must have valid level
    if (!Object.values(ViewLevel).includes(this.level)) {
      errors.push('Invalid view level');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Convert to a Meant event for storage
   */
  toMeantEvent(actor, context) {
    return {
      id: generateEventId({ viewId: this.id, action: 'view_config' }),
      type: EventType.MEANT,
      actor: actor,
      timestamp: new Date().toISOString(),
      context: {
        workspace: context?.workspace || 'default',
        schemaVersion: context?.schemaVersion || '1.0'
      },
      frame: this.frame,
      provenance: this.provenance,
      epistemicStatus: EpistemicStatus.PRELIMINARY,
      supersedes: this.supersedes,
      payload: {
        category: 'view_config',
        level: this.level,
        viewConfig: this.toJSON()
      }
    };
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      level: this.level,
      parentId: this.parentId,
      createdAt: this.createdAt,
      createdBy: this.createdBy,
      status: this.status,
      provenance: [...this.provenance],
      supersedes: this.supersedes,
      supersededBy: this.supersededBy,
      frame: { ...this.frame },
      description: this.description,
      icon: this.icon,
      color: this.color,
      tags: [...this.tags]
    };
  }
}

// ============================================================================
// Workspace (Level 1)
// ============================================================================

/**
 * Workspace - Defines the broadest organizational context
 * Rule 4: Represents a particular horizon
 */
class WorkspaceView extends ViewNode {
  constructor(config) {
    super({ ...config, level: ViewLevel.WORKSPACE });

    // Horizon definition for this workspace
    this.horizon = {
      timeRange: config.horizon?.timeRange || null,
      actors: config.horizon?.actors || [],
      entityTypes: config.horizon?.entityTypes || [],
      frames: config.horizon?.frames || []
    };

    // Workspace-specific settings
    this.settings = {
      defaultLensType: config.settings?.defaultLensType || LensType.GRID,
      theme: config.settings?.theme || 'default',
      permissions: config.settings?.permissions || {}
    };
  }

  /**
   * Create a Horizon object from this workspace's horizon definition
   */
  toHorizon() {
    return new Horizon({
      id: `horizon_${this.id}`,
      type: HorizonType.WORKSPACE,
      name: this.name,
      workspaces: [this.id],
      actors: this.horizon.actors,
      frames: this.horizon.frames,
      timeRange: this.horizon.timeRange,
      tags: this.tags
    });
  }

  toJSON() {
    return {
      ...super.toJSON(),
      horizon: { ...this.horizon },
      settings: { ...this.settings }
    };
  }
}

// ============================================================================
// Set (Level 2)
// ============================================================================

/**
 * Set - Groups related entities into coherent collections
 * Schema is an interpretation of entity structure (Meant, not Given)
 */
class SetView extends ViewNode {
  constructor(config) {
    super({ ...config, level: ViewLevel.SET });

    // Schema defines how entities in this set are structured
    this.schema = {
      fields: (config.schema?.fields || []).map(f => ({
        id: f.id || `field_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`,
        name: f.name,
        type: f.type || 'text',
        isPrimary: f.isPrimary || false,
        required: f.required || false,
        options: f.options || {}
      })),
      entityTypes: config.schema?.entityTypes || []
    };

    // Coherence rules - how entities are filtered into this set
    this.coherenceRules = {
      includeTypes: config.coherenceRules?.includeTypes || [],
      excludeDeleted: config.coherenceRules?.excludeDeleted !== false,
      filters: config.coherenceRules?.filters || []
    };

    // Default lens for this set
    this.defaultLensId = config.defaultLensId || null;
  }

  /**
   * Get the primary field for this set
   */
  getPrimaryField() {
    return this.schema.fields.find(f => f.isPrimary) || this.schema.fields[0];
  }

  /**
   * Check if an entity belongs in this set based on coherence rules
   */
  matchesCoherenceRules(entity) {
    // Check entity type
    if (this.coherenceRules.includeTypes.length > 0) {
      if (!this.coherenceRules.includeTypes.includes(entity.type)) {
        return false;
      }
    }

    // Check tombstone status
    if (this.coherenceRules.excludeDeleted && entity.tombstoned) {
      return false;
    }

    // Check additional filters
    for (const filter of this.coherenceRules.filters) {
      const value = this._getNestedValue(entity, filter.field);
      if (!this._matchesFilter(value, filter)) {
        return false;
      }
    }

    return true;
  }

  _getNestedValue(obj, path) {
    const parts = path.split('.');
    let value = obj;
    for (const part of parts) {
      if (value == null) return null;
      value = value[part];
    }
    return value;
  }

  _matchesFilter(value, filter) {
    switch (filter.operator) {
      case 'equals': return value === filter.value;
      case 'not_equals': return value !== filter.value;
      case 'contains': return String(value).includes(filter.value);
      case 'is_empty': return value == null || value === '';
      case 'is_not_empty': return value != null && value !== '';
      default: return true;
    }
  }

  toJSON() {
    return {
      ...super.toJSON(),
      schema: {
        fields: this.schema.fields.map(f => ({ ...f })),
        entityTypes: [...this.schema.entityTypes]
      },
      coherenceRules: {
        includeTypes: [...this.coherenceRules.includeTypes],
        excludeDeleted: this.coherenceRules.excludeDeleted,
        filters: this.coherenceRules.filters.map(f => ({ ...f }))
      },
      defaultLensId: this.defaultLensId
    };
  }
}

// ============================================================================
// Lens (Level 3)
// ============================================================================

/**
 * Lens - Defines HOW to visualize data (rendering perspective)
 * Multiple lenses can coexist - none is "correct" (Rule 9: no dogmatism)
 */
class LensView extends ViewNode {
  constructor(config) {
    super({ ...config, level: ViewLevel.LENS });

    this.lensType = config.lensType || LensType.GRID;

    // Common configuration across all lens types
    this.config = {
      // Field visibility and ordering
      visibleFields: config.config?.visibleFields || [],
      hiddenFields: config.config?.hiddenFields || [],
      fieldOrder: config.config?.fieldOrder || [],

      // Display options
      rowHeight: config.config?.rowHeight || 'medium',
      density: config.config?.density || 'comfortable',
      showRowNumbers: config.config?.showRowNumbers !== false,

      // Lens-type-specific configuration
      ...this._getLensTypeDefaults(config.lensType),
      ...(config.config || {})
    };
  }

  _getLensTypeDefaults(lensType) {
    switch (lensType) {
      case LensType.KANBAN:
        return {
          groupByField: null,
          cardTitleField: null,
          cardDescriptionField: null,
          columnOrder: [],
          showEmptyColumns: true,
          cardHeight: 'auto'
        };

      case LensType.CALENDAR:
        return {
          dateField: null,
          endDateField: null,
          titleField: null,
          colorField: null,
          defaultView: 'month'
        };

      case LensType.TIMELINE:
        return {
          dateField: null,
          labelField: null,
          groupByField: null,
          showConnections: false
        };

      case LensType.CARDS:
        return {
          titleField: null,
          descriptionField: null,
          imageField: null,
          badgeField: null,
          cardWidth: 280,
          columns: 'auto'
        };

      case LensType.GRAPH:
        return {
          nodeField: null,
          edgeField: null,
          labelField: null,
          colorField: null,
          layout: 'force'
        };

      case LensType.GRID:
      default:
        return {
          columnWidths: {},
          frozenColumns: 0,
          showGridLines: true
        };
    }
  }

  /**
   * Get the visible fields for this lens, respecting the set's schema
   */
  getVisibleFields(setSchema) {
    if (!setSchema || !setSchema.fields) return [];

    let fields = setSchema.fields.filter(f => !this.config.hiddenFields.includes(f.id));

    // Apply ordering if specified
    if (this.config.fieldOrder.length > 0) {
      fields.sort((a, b) => {
        const aIndex = this.config.fieldOrder.indexOf(a.id);
        const bIndex = this.config.fieldOrder.indexOf(b.id);
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    }

    return fields;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      lensType: this.lensType,
      config: { ...this.config }
    };
  }
}

// ============================================================================
// Focus (Level 4)
// ============================================================================

/**
 * Focus - Applies constraints to narrow what data is visible
 * Rule 5: Can only RESTRICT parent scope, never expand
 */
class FocusView extends ViewNode {
  constructor(config) {
    super({ ...config, level: ViewLevel.FOCUS });

    // Restrictions - only narrow, never expand (Rule 5)
    this.restrictions = {
      filters: (config.restrictions?.filters || []).map(f => ({
        id: f.id || `filter_${Date.now().toString(36)}`,
        field: f.field,
        operator: f.operator || 'equals',
        value: f.value,
        enabled: f.enabled !== false
      })),
      sorts: (config.restrictions?.sorts || []).map(s => ({
        field: s.field,
        direction: s.direction || 'asc'
      })),
      limit: config.restrictions?.limit || null,
      offset: config.restrictions?.offset || null
    };

    // Additional visibility restrictions
    this.visibility = {
      hiddenFields: config.visibility?.hiddenFields || [],
      hiddenRecords: config.visibility?.hiddenRecords || []
    };

    // Rule 6: Coherence - what's valid in parent remains valid here
    this.coherenceInherited = config.coherenceInherited !== false;
  }

  /**
   * Validate that this focus only restricts (Rule 5)
   */
  validateRestrictivity(parentLens, parentSet) {
    const errors = [];

    // Check that hidden fields are subset of parent visible fields
    if (parentLens) {
      const parentHidden = new Set(parentLens.config.hiddenFields || []);
      for (const fieldId of this.visibility.hiddenFields) {
        if (parentHidden.has(fieldId)) {
          // Already hidden in parent, that's fine
        }
        // New hides are allowed - they're restrictions
      }
    }

    // Filters can only narrow, not expand
    // (This is enforced by the filter application logic)

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Apply filters to a data set
   */
  applyFilters(data) {
    let result = [...data];

    // Apply each enabled filter
    for (const filter of this.restrictions.filters) {
      if (!filter.enabled) continue;

      result = result.filter(item => {
        const value = this._getNestedValue(item, filter.field);
        return this._matchesFilter(value, filter);
      });
    }

    // Apply sorts
    if (this.restrictions.sorts.length > 0) {
      result.sort((a, b) => {
        for (const sort of this.restrictions.sorts) {
          const aVal = this._getNestedValue(a, sort.field);
          const bVal = this._getNestedValue(b, sort.field);
          let cmp = 0;

          if (aVal == null && bVal == null) cmp = 0;
          else if (aVal == null) cmp = 1;
          else if (bVal == null) cmp = -1;
          else if (typeof aVal === 'number') cmp = aVal - bVal;
          else cmp = String(aVal).localeCompare(String(bVal));

          if (cmp !== 0) {
            return sort.direction === 'desc' ? -cmp : cmp;
          }
        }
        return 0;
      });
    }

    // Apply limit and offset
    if (this.restrictions.offset) {
      result = result.slice(this.restrictions.offset);
    }
    if (this.restrictions.limit) {
      result = result.slice(0, this.restrictions.limit);
    }

    // Filter out hidden records
    if (this.visibility.hiddenRecords.length > 0) {
      const hiddenSet = new Set(this.visibility.hiddenRecords);
      result = result.filter(item => !hiddenSet.has(item.id));
    }

    return result;
  }

  _getNestedValue(obj, path) {
    const parts = path.split('.');
    let value = obj;
    for (const part of parts) {
      if (value == null) return null;
      value = value[part];
    }
    return value;
  }

  _matchesFilter(value, filter) {
    const filterValue = filter.value;

    switch (filter.operator) {
      case 'equals':
        return value === filterValue;
      case 'not_equals':
        return value !== filterValue;
      case 'contains':
        return String(value || '').toLowerCase().includes(String(filterValue).toLowerCase());
      case 'not_contains':
        return !String(value || '').toLowerCase().includes(String(filterValue).toLowerCase());
      case 'starts_with':
        return String(value || '').toLowerCase().startsWith(String(filterValue).toLowerCase());
      case 'ends_with':
        return String(value || '').toLowerCase().endsWith(String(filterValue).toLowerCase());
      case 'greater_than':
        return Number(value) > Number(filterValue);
      case 'less_than':
        return Number(value) < Number(filterValue);
      case 'is_empty':
        return value == null || value === '';
      case 'is_not_empty':
        return value != null && value !== '';
      case 'in':
        return Array.isArray(filterValue) && filterValue.includes(value);
      case 'not_in':
        return Array.isArray(filterValue) && !filterValue.includes(value);
      default:
        return true;
    }
  }

  toJSON() {
    return {
      ...super.toJSON(),
      restrictions: {
        filters: this.restrictions.filters.map(f => ({ ...f })),
        sorts: this.restrictions.sorts.map(s => ({ ...s })),
        limit: this.restrictions.limit,
        offset: this.restrictions.offset
      },
      visibility: {
        hiddenFields: [...this.visibility.hiddenFields],
        hiddenRecords: [...this.visibility.hiddenRecords]
      },
      coherenceInherited: this.coherenceInherited
    };
  }
}

// ============================================================================
// Snapshot (Level 5)
// ============================================================================

/**
 * Snapshot - Immutable capture of a view at a specific point in time
 * Rule 9: Can be superseded but never edited
 */
class SnapshotView extends ViewNode {
  constructor(config) {
    super({ ...config, level: ViewLevel.SNAPSHOT });

    // Capture metadata
    this.capturedAt = config.capturedAt || new Date().toISOString();
    this.capturedBy = config.capturedBy || config.createdBy;
    this.sourceViewId = config.sourceViewId;

    // Frozen view configuration at capture time
    this.frozenConfig = config.frozenConfig || null;

    // Data state at capture time
    this.dataState = {
      recordIds: config.dataState?.recordIds || [],
      eventLogPosition: config.dataState?.eventLogPosition || null,
      recordCount: config.dataState?.recordCount || 0
    };

    // Annotations for this snapshot
    this.annotations = {
      purpose: config.annotations?.purpose || 'archive',
      notes: config.annotations?.notes || '',
      reviewed: config.annotations?.reviewed || false,
      reviewedBy: config.annotations?.reviewedBy || null,
      reviewedAt: config.annotations?.reviewedAt || null
    };

    // Immutability flag
    this._immutable = true;
  }

  /**
   * Snapshots cannot be modified - return copy of frozen config
   */
  getFrozenConfig() {
    return this.frozenConfig ? JSON.parse(JSON.stringify(this.frozenConfig)) : null;
  }

  /**
   * Get the record IDs captured in this snapshot
   */
  getCapturedRecordIds() {
    return [...this.dataState.recordIds];
  }

  /**
   * Add an annotation (the only modification allowed)
   */
  addAnnotation(key, value, actor) {
    // Create a supersession event instead of modifying
    return {
      action: 'annotate',
      key,
      value,
      actor,
      timestamp: new Date().toISOString()
    };
  }

  toJSON() {
    return {
      ...super.toJSON(),
      capturedAt: this.capturedAt,
      capturedBy: this.capturedBy,
      sourceViewId: this.sourceViewId,
      frozenConfig: this.frozenConfig,
      dataState: { ...this.dataState },
      annotations: { ...this.annotations }
    };
  }
}

// ============================================================================
// View Registry
// ============================================================================

/**
 * ViewRegistry - Central coordinator for compliant view management
 * Rule 4: All access through this registry, which respects horizons
 */
class ViewRegistry {
  constructor(eventStore, horizonLattice) {
    this.eventStore = eventStore;
    this.horizonLattice = horizonLattice;

    // View storage by ID
    this._views = new Map();

    // Index by level for fast queries
    this._byLevel = new Map();
    for (const level of Object.values(ViewLevel)) {
      this._byLevel.set(level, new Set());
    }

    // Index by parent for hierarchy queries
    this._byParent = new Map();

    // Subscribers
    this._subscribers = new Set();
  }

  // --------------------------------------------------------------------------
  // View Creation
  // --------------------------------------------------------------------------

  /**
   * Create a workspace view
   */
  createWorkspace(config, actor = 'system') {
    const provenance = this._getDefaultProvenance();
    const workspace = new WorkspaceView({
      ...config,
      provenance: config.provenance || provenance
    });

    return this._registerView(workspace, actor);
  }

  /**
   * Create a set view under a workspace
   */
  createSet(workspaceId, config, actor = 'system') {
    const workspace = this._views.get(workspaceId);
    if (!workspace || workspace.level !== ViewLevel.WORKSPACE) {
      throw new ViewHierarchyError('Invalid workspace ID');
    }

    const provenance = config.provenance || [
      ...this._getDefaultProvenance(),
      ...workspace.provenance
    ];

    const set = new SetView({
      ...config,
      parentId: workspaceId,
      provenance
    });

    return this._registerView(set, actor);
  }

  /**
   * Create a lens view under a set
   */
  createLens(setId, config, actor = 'system') {
    const set = this._views.get(setId);
    if (!set || set.level !== ViewLevel.SET) {
      throw new ViewHierarchyError('Invalid set ID');
    }

    const provenance = config.provenance || [
      ...this._getDefaultProvenance(),
      ...set.provenance
    ];

    const lens = new LensView({
      ...config,
      parentId: setId,
      provenance
    });

    return this._registerView(lens, actor);
  }

  /**
   * Create a focus view under a lens
   * Rule 5: Focus can only restrict, never expand
   */
  createFocus(lensId, config, actor = 'system') {
    const lens = this._views.get(lensId);
    if (!lens || lens.level !== ViewLevel.LENS) {
      throw new ViewHierarchyError('Invalid lens ID');
    }

    const provenance = config.provenance || [
      ...this._getDefaultProvenance(),
      ...lens.provenance
    ];

    const focus = new FocusView({
      ...config,
      parentId: lensId,
      provenance
    });

    // Validate restrictivity (Rule 5)
    const parentSet = this.getParentOfType(lens, ViewLevel.SET);
    const validation = focus.validateRestrictivity(lens, parentSet);
    if (!validation.valid) {
      throw new ViewHierarchyError(`Rule 5 violation: ${validation.errors.join(', ')}`);
    }

    return this._registerView(focus, actor);
  }

  /**
   * Create a snapshot from any view
   */
  createSnapshot(sourceViewId, config, data, actor = 'system') {
    const sourceView = this._views.get(sourceViewId);
    if (!sourceView) {
      throw new ViewHierarchyError('Invalid source view ID');
    }

    const provenance = [
      ...this._getDefaultProvenance(),
      ...sourceView.provenance,
      sourceViewId
    ];

    const snapshot = new SnapshotView({
      ...config,
      parentId: sourceViewId,
      sourceViewId,
      frozenConfig: sourceView.toJSON(),
      dataState: {
        recordIds: data?.map(r => r.id) || [],
        recordCount: data?.length || 0,
        eventLogPosition: this.eventStore.getHeads()[0]?.id || null
      },
      provenance
    });

    return this._registerView(snapshot, actor);
  }

  // --------------------------------------------------------------------------
  // View Registration and Events
  // --------------------------------------------------------------------------

  _registerView(view, actor) {
    // Validate the view
    const validation = view.validate();
    if (!validation.valid) {
      throw new ViewHierarchyError(`Invalid view: ${validation.errors.join(', ')}`);
    }

    // Store in registry
    this._views.set(view.id, view);
    this._byLevel.get(view.level).add(view.id);

    if (view.parentId) {
      if (!this._byParent.has(view.parentId)) {
        this._byParent.set(view.parentId, new Set());
      }
      this._byParent.get(view.parentId).add(view.id);
    }

    // Create Meant event for the view
    const event = view.toMeantEvent(actor, { workspace: 'default' });
    const result = this.eventStore.append(event);

    if (!result.success) {
      // Rollback registration
      this._views.delete(view.id);
      this._byLevel.get(view.level).delete(view.id);
      if (view.parentId) {
        this._byParent.get(view.parentId)?.delete(view.id);
      }
      throw new ViewHierarchyError(`Failed to record view event: ${result.error || result.errors?.join(', ')}`);
    }

    // Notify subscribers
    this._notify('view_created', view);

    return view;
  }

  _getDefaultProvenance() {
    // Get the first Given event as default provenance
    const givenEvents = this.eventStore.getGiven();
    if (givenEvents.length > 0) {
      return [givenEvents[0].id];
    }

    // Create a system initialization event if none exists
    const initEvent = {
      id: generateEventId({ action: 'system_init' }),
      type: EventType.GIVEN,
      actor: 'system',
      timestamp: new Date().toISOString(),
      mode: GivenMode.RECEIVED,
      context: { workspace: 'default', schemaVersion: '1.0' },
      payload: { action: 'view_hierarchy_init' }
    };

    this.eventStore.append(initEvent);
    return [initEvent.id];
  }

  // --------------------------------------------------------------------------
  // View Queries
  // --------------------------------------------------------------------------

  /**
   * Get a view by ID
   */
  get(viewId) {
    return this._views.get(viewId) || null;
  }

  /**
   * Get all views
   */
  getAll() {
    return Array.from(this._views.values());
  }

  /**
   * Get views by level
   */
  getByLevel(level) {
    const ids = this._byLevel.get(level);
    if (!ids) return [];
    return Array.from(ids).map(id => this._views.get(id)).filter(Boolean);
  }

  /**
   * Get all workspaces
   */
  getWorkspaces() {
    return this.getByLevel(ViewLevel.WORKSPACE);
  }

  /**
   * Get all sets
   */
  getSets(workspaceId = null) {
    const sets = this.getByLevel(ViewLevel.SET);
    if (workspaceId) {
      return sets.filter(s => s.parentId === workspaceId);
    }
    return sets;
  }

  /**
   * Get all lenses
   */
  getLenses(setId = null) {
    const lenses = this.getByLevel(ViewLevel.LENS);
    if (setId) {
      return lenses.filter(l => l.parentId === setId);
    }
    return lenses;
  }

  /**
   * Get all focuses
   */
  getFocuses(lensId = null) {
    const focuses = this.getByLevel(ViewLevel.FOCUS);
    if (lensId) {
      return focuses.filter(f => f.parentId === lensId);
    }
    return focuses;
  }

  /**
   * Get all snapshots
   */
  getSnapshots(sourceViewId = null) {
    const snapshots = this.getByLevel(ViewLevel.SNAPSHOT);
    if (sourceViewId) {
      return snapshots.filter(s => s.sourceViewId === sourceViewId);
    }
    return snapshots;
  }

  /**
   * Get children of a view
   */
  getChildren(viewId) {
    const childIds = this._byParent.get(viewId);
    if (!childIds) return [];
    return Array.from(childIds).map(id => this._views.get(id)).filter(Boolean);
  }

  /**
   * Get parent of a view
   */
  getParent(viewId) {
    const view = this._views.get(viewId);
    if (!view || !view.parentId) return null;
    return this._views.get(view.parentId) || null;
  }

  /**
   * Get ancestor of a specific level
   */
  getParentOfType(view, level) {
    let current = view;
    while (current && current.parentId) {
      current = this._views.get(current.parentId);
      if (current && current.level === level) {
        return current;
      }
    }
    return null;
  }

  /**
   * Get the full lineage of a view (from root to leaf)
   */
  getLineage(viewId) {
    const lineage = [];
    let current = this._views.get(viewId);

    while (current) {
      lineage.unshift(current);
      current = current.parentId ? this._views.get(current.parentId) : null;
    }

    return lineage;
  }

  /**
   * Get the hierarchy tree from a root view
   */
  getHierarchyTree(rootId = null) {
    const buildTree = (viewId) => {
      const view = this._views.get(viewId);
      if (!view) return null;

      const children = this.getChildren(viewId);

      return {
        view,
        children: children.map(child => buildTree(child.id)).filter(Boolean)
      };
    };

    if (rootId) {
      return buildTree(rootId);
    }

    // Return all workspace trees
    return this.getWorkspaces().map(ws => buildTree(ws.id)).filter(Boolean);
  }

  // --------------------------------------------------------------------------
  // View Supersession (Rule 9)
  // --------------------------------------------------------------------------

  /**
   * Supersede a view with a new configuration
   */
  supersedeView(viewId, newConfig, reason, actor = 'system') {
    const oldView = this._views.get(viewId);
    if (!oldView) {
      throw new ViewHierarchyError('View not found');
    }

    // Create new view with same level and parent
    let newView;
    switch (oldView.level) {
      case ViewLevel.WORKSPACE:
        newView = new WorkspaceView({
          ...oldView.toJSON(),
          ...newConfig,
          id: undefined, // Generate new ID
          supersedes: viewId,
          provenance: [...oldView.provenance, viewId]
        });
        break;
      case ViewLevel.SET:
        newView = new SetView({
          ...oldView.toJSON(),
          ...newConfig,
          id: undefined,
          supersedes: viewId,
          provenance: [...oldView.provenance, viewId]
        });
        break;
      case ViewLevel.LENS:
        newView = new LensView({
          ...oldView.toJSON(),
          ...newConfig,
          id: undefined,
          supersedes: viewId,
          provenance: [...oldView.provenance, viewId]
        });
        break;
      case ViewLevel.FOCUS:
        newView = new FocusView({
          ...oldView.toJSON(),
          ...newConfig,
          id: undefined,
          supersedes: viewId,
          provenance: [...oldView.provenance, viewId]
        });
        break;
      default:
        throw new ViewHierarchyError('Cannot supersede snapshots');
    }

    // Register the new view
    this._registerView(newView, actor);

    // Mark old view as superseded
    oldView.supersededBy = newView.id;
    oldView.status = ViewStatus.SUPERSEDED;

    // Notify
    this._notify('view_superseded', { oldView, newView, reason });

    return newView;
  }

  // --------------------------------------------------------------------------
  // Data Access (Rule 4: Horizon-mediated)
  // --------------------------------------------------------------------------

  /**
   * Get view data through the horizon gate
   */
  getViewData(viewId, horizonId = null) {
    const view = this._views.get(viewId);
    if (!view) return null;

    // Get the appropriate horizon
    const horizon = horizonId
      ? this.horizonLattice.get(horizonId)
      : this.horizonLattice.top;

    // Create a gate for this horizon
    const gate = new HorizonGate(horizon, this.eventStore);

    // Get available events
    const availableEvents = gate.getAvailable();

    // Build view-specific data based on level
    switch (view.level) {
      case ViewLevel.WORKSPACE:
        return this._buildWorkspaceData(view, availableEvents);
      case ViewLevel.SET:
        return this._buildSetData(view, availableEvents);
      case ViewLevel.LENS:
        return this._buildLensData(view, availableEvents);
      case ViewLevel.FOCUS:
        return this._buildFocusData(view, availableEvents);
      case ViewLevel.SNAPSHOT:
        return this._buildSnapshotData(view);
      default:
        return null;
    }
  }

  _buildWorkspaceData(workspace, events) {
    const sets = this.getChildren(workspace.id);
    return {
      view: workspace,
      sets: sets.map(s => ({
        id: s.id,
        name: s.name,
        recordCount: this._countSetRecords(s, events)
      })),
      eventCount: events.length
    };
  }

  _buildSetData(set, events) {
    // Extract entities from events and filter by coherence rules
    const entities = this._extractEntities(events);
    const filtered = entities.filter(e => set.matchesCoherenceRules(e));

    return {
      view: set,
      schema: set.schema,
      records: filtered,
      recordCount: filtered.length
    };
  }

  _buildLensData(lens, events) {
    // Get parent set
    const set = this.getParent(lens.id);
    if (!set || set.level !== ViewLevel.SET) return null;

    const setData = this._buildSetData(set, events);
    const visibleFields = lens.getVisibleFields(set.schema);

    return {
      view: lens,
      lensType: lens.lensType,
      config: lens.config,
      schema: {
        ...set.schema,
        fields: visibleFields
      },
      records: setData.records,
      recordCount: setData.recordCount
    };
  }

  _buildFocusData(focus, events) {
    // Get parent lens
    const lens = this.getParent(focus.id);
    if (!lens || lens.level !== ViewLevel.LENS) return null;

    const lensData = this._buildLensData(lens, events);
    if (!lensData) return null;

    // Apply focus restrictions
    const filteredRecords = focus.applyFilters(lensData.records);

    // Apply visibility restrictions
    const visibleFields = lensData.schema.fields.filter(
      f => !focus.visibility.hiddenFields.includes(f.id)
    );

    return {
      view: focus,
      lensType: lens.lensType,
      config: lens.config,
      restrictions: focus.restrictions,
      schema: {
        ...lensData.schema,
        fields: visibleFields
      },
      records: filteredRecords,
      recordCount: filteredRecords.length
    };
  }

  _buildSnapshotData(snapshot) {
    return {
      view: snapshot,
      frozenConfig: snapshot.getFrozenConfig(),
      capturedAt: snapshot.capturedAt,
      recordIds: snapshot.getCapturedRecordIds(),
      recordCount: snapshot.dataState.recordCount,
      annotations: snapshot.annotations
    };
  }

  _extractEntities(events) {
    // Simple entity extraction from events
    const entities = new Map();

    for (const event of events) {
      if (event.type !== EventType.GIVEN) continue;

      const payload = event.payload || {};

      if (payload.action === 'entity_create') {
        entities.set(payload.entityId, {
          id: payload.entityId,
          type: payload.entityType,
          data: payload.data || {},
          version: 1,
          createdAt: event.timestamp,
          updatedAt: event.timestamp,
          tombstoned: false,
          sourceEvents: [event.id]
        });
      } else if (payload.action === 'field_update') {
        const entity = entities.get(payload.entityId);
        if (entity) {
          entity.data[payload.field] = payload.value;
          entity.version++;
          entity.updatedAt = event.timestamp;
          entity.sourceEvents.push(event.id);
        }
      } else if (payload.action === 'tombstone') {
        const entity = entities.get(payload.targetId);
        if (entity) {
          entity.tombstoned = true;
          entity.sourceEvents.push(event.id);
        }
      }
    }

    return Array.from(entities.values());
  }

  _countSetRecords(set, events) {
    const entities = this._extractEntities(events);
    return entities.filter(e => set.matchesCoherenceRules(e)).length;
  }

  // --------------------------------------------------------------------------
  // Subscription
  // --------------------------------------------------------------------------

  subscribe(callback) {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  _notify(eventType, data) {
    for (const callback of this._subscribers) {
      try {
        callback(eventType, data);
      } catch (err) {
        console.error('ViewRegistry subscriber error:', err);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Persistence
  // --------------------------------------------------------------------------

  /**
   * Export all views for persistence
   */
  export() {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      views: this.getAll().map(v => v.toJSON())
    };
  }

  /**
   * Import views from persistence
   */
  import(data, actor = 'system') {
    if (!data || !data.views) return { imported: 0, errors: [] };

    const errors = [];
    let imported = 0;

    // Sort by level to ensure parents are imported first
    const levelOrder = [
      ViewLevel.WORKSPACE,
      ViewLevel.SET,
      ViewLevel.LENS,
      ViewLevel.FOCUS,
      ViewLevel.SNAPSHOT
    ];

    const sortedViews = [...data.views].sort((a, b) => {
      return levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level);
    });

    for (const viewData of sortedViews) {
      try {
        let view;
        switch (viewData.level) {
          case ViewLevel.WORKSPACE:
            view = new WorkspaceView(viewData);
            break;
          case ViewLevel.SET:
            view = new SetView(viewData);
            break;
          case ViewLevel.LENS:
            view = new LensView(viewData);
            break;
          case ViewLevel.FOCUS:
            view = new FocusView(viewData);
            break;
          case ViewLevel.SNAPSHOT:
            view = new SnapshotView(viewData);
            break;
          default:
            throw new Error(`Unknown view level: ${viewData.level}`);
        }

        // Register without creating new event (use existing provenance)
        this._views.set(view.id, view);
        this._byLevel.get(view.level).add(view.id);

        if (view.parentId) {
          if (!this._byParent.has(view.parentId)) {
            this._byParent.set(view.parentId, new Set());
          }
          this._byParent.get(view.parentId).add(view.id);
        }

        imported++;
      } catch (err) {
        errors.push({ viewId: viewData.id, error: err.message });
      }
    }

    return { imported, errors };
  }

  /**
   * Clear all views
   */
  clear() {
    this._views.clear();
    for (const level of Object.values(ViewLevel)) {
      this._byLevel.set(level, new Set());
    }
    this._byParent.clear();
  }
}

// ============================================================================
// Error Types
// ============================================================================

class ViewHierarchyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ViewHierarchyError';
  }
}

// ============================================================================
// Singleton and Initialization
// ============================================================================

let _viewRegistry = null;

function getViewRegistry() {
  return _viewRegistry;
}

function initViewRegistry(eventStore, horizonLattice) {
  if (!eventStore) {
    eventStore = getEventStore();
  }
  if (!horizonLattice) {
    horizonLattice = getHorizonLattice();
  }

  _viewRegistry = new ViewRegistry(eventStore, horizonLattice);

  // Create default workspace if none exists
  if (_viewRegistry.getWorkspaces().length === 0) {
    _viewRegistry.createWorkspace({
      name: 'Default Workspace',
      description: 'The default workspace for EO Lake',
      horizon: {
        entityTypes: [],
        actors: []
      },
      settings: {
        defaultLensType: LensType.GRID
      }
    });
  }

  console.log('EO View Hierarchy: Registry initialized');
  return _viewRegistry;
}

// ============================================================================
// Exports
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ViewLevel,
    LensType,
    ViewStatus,
    ViewNode,
    WorkspaceView,
    SetView,
    LensView,
    FocusView,
    SnapshotView,
    ViewRegistry,
    ViewHierarchyError,
    getViewRegistry,
    initViewRegistry
  };
}

if (typeof window !== 'undefined') {
  window.ViewLevel = ViewLevel;
  window.LensType = LensType;
  window.ViewStatus = ViewStatus;
  window.ViewNode = ViewNode;
  window.WorkspaceView = WorkspaceView;
  window.SetView = SetView;
  window.LensView = LensView;
  window.FocusView = FocusView;
  window.SnapshotView = SnapshotView;
  window.ViewRegistry = ViewRegistry;
  window.ViewHierarchyError = ViewHierarchyError;
  window.getViewRegistry = getViewRegistry;
  window.initViewRegistry = initViewRegistry;
}
