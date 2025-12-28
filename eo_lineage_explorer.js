/**
 * EO Lake - Lineage Explorer
 *
 * Computes and displays data lineage relationships between Sources, Sets, and Views.
 *
 * Features:
 * - Upstream tracing: What feeds into this entity
 * - Downstream tracing: What this entity feeds
 * - Activity history: Timeline of operations on an entity
 * - Provenance display: Full 9-element provenance information
 */

// ============================================================================
// LineageExplorer Class
// ============================================================================

class LineageExplorer {
  constructor(workbench) {
    this.workbench = workbench;
  }

  /**
   * Get all sources from the workbench
   */
  getSources() {
    return this.workbench.sources || [];
  }

  /**
   * Get all sets from the workbench
   */
  getSets() {
    return this.workbench.sets || [];
  }

  /**
   * Get source registry (derived from sets with provenance)
   */
  getSourceRegistry() {
    const registry = new Map();

    // Add explicit sources
    for (const source of this.getSources()) {
      registry.set(source.id, source);
    }

    // Extract sources from sets with provenance
    for (const set of this.getSets()) {
      const prov = set.datasetProvenance;
      if (prov && (prov.originalFilename || prov.provenance?.source)) {
        const sourceName = prov.originalFilename || prov.provenance?.source;
        const sourceKey = sourceName.toLowerCase();
        const sourceId = `src_${sourceKey.replace(/[^a-z0-9]/g, '_')}`;

        if (!registry.has(sourceId)) {
          registry.set(sourceId, {
            id: sourceId,
            type: 'given',
            entityType: 'source',
            name: sourceName,
            importedAt: prov.importedAt,
            provenance: prov.provenance,
            recordCount: set.records?.length || 0
          });
        } else {
          // Aggregate record count
          const existing = registry.get(sourceId);
          existing.recordCount = (existing.recordCount || 0) + (set.records?.length || 0);
        }
      }
    }

    return registry;
  }

  /**
   * Find a source by ID or name
   */
  findSource(sourceIdOrName) {
    const registry = this.getSourceRegistry();

    // Try direct ID match
    if (registry.has(sourceIdOrName)) {
      return registry.get(sourceIdOrName);
    }

    // Try name match
    for (const source of registry.values()) {
      if (source.name?.toLowerCase() === sourceIdOrName?.toLowerCase()) {
        return source;
      }
    }

    return null;
  }

  /**
   * Find a set by ID
   */
  findSet(setId) {
    return this.getSets().find(s => s.id === setId);
  }

  // --------------------------------------------------------------------------
  // Upstream Lineage (What feeds into this entity)
  // --------------------------------------------------------------------------

  /**
   * Get upstream lineage for a source
   * Sources have no upstream - they are the root
   */
  getSourceUpstream(sourceId) {
    return {
      type: 'root',
      message: 'Sources are GIVEN - they are the root of data lineage',
      chain: []
    };
  }

  /**
   * Get upstream lineage for a set
   */
  getSetUpstream(setId) {
    const set = this.findSet(setId);
    if (!set) return { chain: [], error: 'Set not found' };

    const chain = [];
    this._traceSetUpstream(set, chain, new Set());

    return {
      setId,
      setName: set.name,
      chain: chain.reverse() // Root first, set last
    };
  }

  /**
   * Recursively trace upstream lineage
   */
  _traceSetUpstream(set, chain, visited) {
    if (!set || visited.has(set.id)) return;
    visited.add(set.id);

    // Add current set to chain
    const derivation = this._getSetDerivationInfo(set);
    chain.push({
      id: set.id,
      name: set.name,
      type: 'set',
      operator: derivation.operator,
      strategy: derivation.strategy,
      recordCount: set.records?.length || 0
    });

    // Check explicit derivation
    if (set.derivation) {
      const d = set.derivation;

      if (d.parentSourceId) {
        // Derived from source
        const source = this.findSource(d.parentSourceId);
        if (source) {
          chain.push({
            id: source.id,
            name: source.name,
            type: 'source',
            operator: 'GIVEN',
            recordCount: source.recordCount
          });
        }
      }

      if (d.parentSetId) {
        // Derived from parent set
        const parentSet = this.findSet(d.parentSetId);
        if (parentSet) {
          this._traceSetUpstream(parentSet, chain, visited);
        }
      }

      if (d.joinSetIds && d.joinSetIds.length > 0) {
        // Joined from multiple sets
        for (const joinSetId of d.joinSetIds) {
          const joinSet = this.findSet(joinSetId);
          if (joinSet) {
            this._traceSetUpstream(joinSet, chain, visited);
          }
        }
      }
    }

    // Check provenance for source
    const prov = set.datasetProvenance;
    if (prov && (prov.originalFilename || prov.provenance?.source)) {
      const sourceName = prov.originalFilename || prov.provenance?.source;
      const source = this.findSource(sourceName);
      if (source && !visited.has(source.id)) {
        chain.push({
          id: source.id,
          name: source.name,
          type: 'source',
          operator: 'GIVEN',
          recordCount: source.recordCount
        });
        visited.add(source.id);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Downstream Lineage (What this entity feeds)
  // --------------------------------------------------------------------------

  /**
   * Get downstream lineage for a source
   * Find all sets derived from this source
   */
  getSourceDownstream(sourceId) {
    const source = this.findSource(sourceId);
    if (!source) return { sets: [], views: [], error: 'Source not found' };

    const sourceName = source.name?.toLowerCase();

    // Find all directly derived sets
    const directSets = this.getSets().filter(set => {
      const prov = set.datasetProvenance;
      if (prov) {
        const setSourceName = (prov.originalFilename || prov.provenance?.source)?.toLowerCase();
        return setSourceName === sourceName;
      }

      if (set.derivation?.parentSourceId === sourceId) {
        return true;
      }

      return false;
    });

    // Build downstream tree
    const downstream = [];
    const visited = new Set();

    for (const set of directSets) {
      this._traceSetDownstream(set, downstream, visited, 1);
    }

    return {
      sourceId,
      sourceName: source.name,
      directSets: directSets.map(s => ({
        id: s.id,
        name: s.name,
        operator: this._getSetDerivationInfo(s).operator,
        recordCount: s.records?.length || 0
      })),
      fullTree: downstream
    };
  }

  /**
   * Get downstream lineage for a set
   * Find all sets, views, and focuses derived from this set
   */
  getSetDownstream(setId) {
    const set = this.findSet(setId);
    if (!set) return { sets: [], views: [], error: 'Set not found' };

    // Find derived sets
    const derivedSets = this.getSets().filter(s => {
      if (s.id === setId) return false;

      if (s.derivation?.parentSetId === setId) return true;
      if (s.derivation?.joinSetIds?.includes(setId)) return true;

      return false;
    });

    // Get views (lenses) for this set
    const views = set.views || [];

    // Build downstream tree
    const downstream = [];
    const visited = new Set([setId]);

    for (const derivedSet of derivedSets) {
      this._traceSetDownstream(derivedSet, downstream, visited, 1);
    }

    return {
      setId,
      setName: set.name,
      views: views.map(v => ({
        id: v.id,
        name: v.name,
        type: v.type,
        filterCount: v.config?.filters?.length || 0
      })),
      derivedSets: derivedSets.map(s => ({
        id: s.id,
        name: s.name,
        operator: this._getSetDerivationInfo(s).operator,
        recordCount: s.records?.length || 0
      })),
      fullTree: downstream
    };
  }

  /**
   * Recursively trace downstream lineage
   */
  _traceSetDownstream(set, tree, visited, depth) {
    if (!set || visited.has(set.id)) return;
    visited.add(set.id);

    const derivation = this._getSetDerivationInfo(set);
    const node = {
      id: set.id,
      name: set.name,
      type: 'set',
      operator: derivation.operator,
      strategy: derivation.strategy,
      recordCount: set.records?.length || 0,
      depth,
      children: [],
      views: (set.views || []).map(v => ({
        id: v.id,
        name: v.name,
        type: v.type
      }))
    };

    tree.push(node);

    // Find children
    const children = this.getSets().filter(s => {
      if (s.id === set.id) return false;
      if (s.derivation?.parentSetId === set.id) return true;
      if (s.derivation?.joinSetIds?.includes(set.id)) return true;
      return false;
    });

    for (const child of children) {
      const childNode = this._traceSetDownstream(child, node.children, visited, depth + 1);
    }

    return node;
  }

  // --------------------------------------------------------------------------
  // Activity History
  // --------------------------------------------------------------------------

  /**
   * Get activity history for an entity
   */
  async getActivityHistory(entityId, entityType = null) {
    const activities = [];

    // Try to get from activity store
    if (typeof window !== 'undefined' && window.activityStore) {
      const storeActivities = window.activityStore.getByEntity(entityId);
      activities.push(...storeActivities.map(a => this._formatActivity(a)));
    }

    // Also check event log if available
    if (this.workbench.eventLog) {
      const events = this.workbench.eventLog.filter(e =>
        e.entityId === entityId ||
        e.target?.id === entityId ||
        e.data?.entityId === entityId
      );

      for (const event of events) {
        activities.push({
          id: event.id || `evt_${Date.now()}`,
          timestamp: event.timestamp || new Date().toISOString(),
          operator: event.operator || event.type || 'UNKNOWN',
          description: this._getEventDescription(event),
          actor: event.context?.epistemic?.agent || event.actor || 'system',
          details: event.data || event
        });
      }
    }

    // Generate synthetic history from entity state
    activities.push(...this._generateSyntheticHistory(entityId, entityType));

    // Sort by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {
      entityId,
      entityType,
      activities: activities.slice(0, 100) // Limit to 100 most recent
    };
  }

  /**
   * Format activity from store
   */
  _formatActivity(activity) {
    return {
      id: activity.id,
      timestamp: activity.timestamp,
      operator: activity.operator,
      description: this._getOperatorDescription(activity.operator, activity.target),
      actor: activity.context?.epistemic?.agent || 'system',
      details: activity
    };
  }

  /**
   * Get human-readable operator description
   */
  _getOperatorDescription(operator, target) {
    const descriptions = {
      'INS': 'Created',
      'DES': 'Updated value',
      'NUL': 'Deleted',
      'SEG': 'Filtered/segmented',
      'CON': 'Connected/linked',
      'ALT': 'Transformed',
      'SYN': 'Merged/synthesized',
      'SUP': 'Superseded',
      'REC': 'Recovered'
    };

    let desc = descriptions[operator] || `Operation: ${operator}`;

    if (target?.fieldId) {
      desc += ` field "${target.fieldId}"`;
    }

    return desc;
  }

  /**
   * Get event description
   */
  _getEventDescription(event) {
    if (event.description) return event.description;

    const type = event.type || event.operator;

    switch (type) {
      case 'IMPORT':
        return `Imported from ${event.data?.filename || 'file'}`;
      case 'CREATE_SET':
        return 'Set created';
      case 'CREATE_VIEW':
        return `View "${event.data?.viewName || 'view'}" created`;
      case 'ADD_FIELD':
        return `Field "${event.data?.fieldName || 'field'}" added`;
      case 'UPDATE_RECORD':
        return 'Record updated';
      default:
        return this._getOperatorDescription(type, event.target);
    }
  }

  /**
   * Generate synthetic history from entity state
   */
  _generateSyntheticHistory(entityId, entityType) {
    const history = [];

    if (entityType === 'source') {
      const source = this.findSource(entityId);
      if (source) {
        history.push({
          id: `syn_import_${entityId}`,
          timestamp: source.importedAt || new Date().toISOString(),
          operator: 'INS',
          description: `Source imported: ${source.name}`,
          actor: source.importedBy || source.provenance?.agent || 'system',
          details: { type: 'import', source }
        });

        // Find derived sets
        const downstream = this.getSourceDownstream(entityId);
        for (const set of downstream.directSets) {
          history.push({
            id: `syn_derive_${set.id}`,
            timestamp: new Date().toISOString(),
            operator: set.operator || 'SEG',
            description: `Derived set "${set.name}" created`,
            actor: 'system',
            details: { type: 'derivation', set }
          });
        }
      }
    }

    if (entityType === 'set') {
      const set = this.findSet(entityId);
      if (set) {
        history.push({
          id: `syn_create_${entityId}`,
          timestamp: set.createdAt || new Date().toISOString(),
          operator: 'INS',
          description: `Set "${set.name}" created`,
          actor: 'system',
          details: { type: 'create', set }
        });

        // Add view creation events
        for (const view of (set.views || [])) {
          history.push({
            id: `syn_view_${view.id}`,
            timestamp: view.createdAt || new Date().toISOString(),
            operator: 'INS',
            description: `View "${view.name}" (${view.type}) added`,
            actor: 'system',
            details: { type: 'view_create', view }
          });
        }
      }
    }

    return history;
  }

  // --------------------------------------------------------------------------
  // Helper Methods
  // --------------------------------------------------------------------------

  /**
   * Get derivation info for a set
   */
  _getSetDerivationInfo(set) {
    if (set.derivation) {
      const strategy = set.derivation.strategy;
      const descriptions = {
        'seg': 'Filtered from parent (SEG operator)',
        'con': 'Joined from multiple sets (CON operator)',
        'alt': 'Transformed via rule (ALT operator)',
        'direct': 'Direct import from source'
      };
      return {
        operator: strategy.toUpperCase(),
        strategy: strategy,
        description: descriptions[strategy] || 'Derived set',
        constraint: set.derivation.constraint
      };
    }

    const prov = set.datasetProvenance;
    if (prov && (prov.originalFilename || prov.provenance?.source)) {
      return {
        operator: 'INS',
        strategy: 'direct',
        description: `Imported from ${prov.originalFilename || prov.provenance?.source}`
      };
    }

    return {
      operator: 'INS',
      strategy: 'manual',
      description: 'Manually created set'
    };
  }

  /**
   * Build full lineage graph for visualization
   */
  buildLineageGraph(entityId, entityType) {
    const nodes = [];
    const edges = [];
    const visited = new Set();

    if (entityType === 'source') {
      this._buildGraphFromSource(entityId, nodes, edges, visited);
    } else if (entityType === 'set') {
      this._buildGraphFromSet(entityId, nodes, edges, visited);
    }

    return { nodes, edges, focusId: entityId };
  }

  /**
   * Build graph starting from source
   */
  _buildGraphFromSource(sourceId, nodes, edges, visited) {
    const source = this.findSource(sourceId);
    if (!source || visited.has(sourceId)) return;
    visited.add(sourceId);

    nodes.push({
      id: sourceId,
      label: source.name,
      type: 'source',
      operator: 'GIVEN'
    });

    const downstream = this.getSourceDownstream(sourceId);
    for (const set of downstream.directSets) {
      edges.push({
        source: sourceId,
        target: set.id,
        operator: 'DIRECT'
      });
      this._buildGraphFromSet(set.id, nodes, edges, visited);
    }
  }

  /**
   * Build graph starting from set
   */
  _buildGraphFromSet(setId, nodes, edges, visited) {
    const set = this.findSet(setId);
    if (!set || visited.has(setId)) return;
    visited.add(setId);

    const derivation = this._getSetDerivationInfo(set);
    nodes.push({
      id: setId,
      label: set.name,
      type: 'set',
      operator: derivation.operator,
      recordCount: set.records?.length || 0
    });

    // Add views as nodes
    for (const view of (set.views || [])) {
      const viewId = `${setId}_${view.id}`;
      nodes.push({
        id: viewId,
        label: view.name,
        type: 'view',
        viewType: view.type
      });
      edges.push({
        source: setId,
        target: viewId,
        operator: 'VIEW'
      });
    }

    // Trace upstream
    const upstream = this.getSetUpstream(setId);
    for (let i = 1; i < upstream.chain.length; i++) {
      const parent = upstream.chain[i];
      if (!visited.has(parent.id)) {
        if (parent.type === 'source') {
          this._buildGraphFromSource(parent.id, nodes, edges, visited);
        } else {
          this._buildGraphFromSet(parent.id, nodes, edges, visited);
        }
        edges.push({
          source: parent.id,
          target: setId,
          operator: derivation.operator
        });
      }
    }

    // Trace downstream
    const downstream = this.getSetDownstream(setId);
    for (const derived of downstream.derivedSets) {
      if (!visited.has(derived.id)) {
        edges.push({
          source: setId,
          target: derived.id,
          operator: derived.operator
        });
        this._buildGraphFromSet(derived.id, nodes, edges, visited);
      }
    }
  }
}

// ============================================================================
// EntityDetailPanel - Tabbed detail view
// ============================================================================

class EntityDetailPanel {
  constructor(workbench, lineageExplorer) {
    this.workbench = workbench;
    this.lineage = lineageExplorer;
    this.currentEntity = null;
    this.currentTab = 'lineage';
  }

  /**
   * Show detail panel for a source
   */
  showSourceDetail(sourceId) {
    const source = this.lineage.findSource(sourceId);
    if (!source) {
      console.warn('Source not found:', sourceId);
      return;
    }

    this.currentEntity = { id: sourceId, type: 'source', data: source };
    this._renderPanel();
  }

  /**
   * Show detail panel for a set
   */
  showSetDetail(setId) {
    const set = this.lineage.findSet(setId);
    if (!set) {
      console.warn('Set not found:', setId);
      return;
    }

    this.currentEntity = { id: setId, type: 'set', data: set };
    this._renderPanel();
  }

  /**
   * Render the detail panel
   */
  _renderPanel() {
    const detailBody = document.getElementById('detail-panel-body');
    if (!detailBody) return;

    const entity = this.currentEntity;
    if (!entity) return;

    const isSource = entity.type === 'source';
    const icon = isSource ? this._getSourceIcon(entity.data.name) : (entity.data.icon || 'ph ph-table');
    const badge = isSource ? 'GIVEN' : 'MEANT';
    const badgeClass = isSource ? 'given-badge' : 'meant-badge';

    detailBody.innerHTML = `
      <div class="entity-detail-panel">
        <div class="entity-detail-header">
          <i class="ph ${icon} entity-detail-icon"></i>
          <h3>${this._escapeHtml(entity.data.name)}</h3>
          <span class="${badgeClass}">${badge}</span>
        </div>

        <div class="entity-detail-tabs">
          <button class="entity-tab ${this.currentTab === 'lineage' ? 'active' : ''}" data-tab="lineage">
            <i class="ph ph-git-branch"></i> Lineage
          </button>
          <button class="entity-tab ${this.currentTab === 'provenance' ? 'active' : ''}" data-tab="provenance">
            <i class="ph ph-fingerprint"></i> Provenance
          </button>
          <button class="entity-tab ${this.currentTab === 'activity' ? 'active' : ''}" data-tab="activity">
            <i class="ph ph-clock-counter-clockwise"></i> Activity
          </button>
        </div>

        <div class="entity-detail-content">
          ${this._renderTabContent()}
        </div>
      </div>
    `;

    // Attach tab handlers
    detailBody.querySelectorAll('.entity-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.currentTab = tab.dataset.tab;
        this._renderPanel();
      });
    });

    // Attach clickable item handlers
    this._attachItemHandlers(detailBody);

    // Show detail panel
    document.getElementById('detail-panel')?.classList.add('open');
  }

  /**
   * Render tab content based on current tab
   */
  _renderTabContent() {
    switch (this.currentTab) {
      case 'lineage':
        return this._renderLineageTab();
      case 'provenance':
        return this._renderProvenanceTab();
      case 'activity':
        return this._renderActivityTab();
      default:
        return '';
    }
  }

  /**
   * Render lineage tab content
   */
  _renderLineageTab() {
    const entity = this.currentEntity;
    if (!entity) return '';

    if (entity.type === 'source') {
      return this._renderSourceLineage(entity.id, entity.data);
    } else {
      return this._renderSetLineage(entity.id, entity.data);
    }
  }

  /**
   * Render source lineage
   */
  _renderSourceLineage(sourceId, source) {
    const downstream = this.lineage.getSourceDownstream(sourceId);

    let html = `
      <div class="lineage-section">
        <div class="lineage-origin">
          <i class="ph ph-database"></i>
          <span>This is a <strong>root source</strong> (GIVEN)</span>
        </div>
      </div>

      <div class="lineage-section">
        <h4><i class="ph ph-arrow-down"></i> Feeds Into (${downstream.directSets.length} sets)</h4>
        <div class="lineage-tree">
    `;

    if (downstream.directSets.length === 0) {
      html += `<div class="lineage-empty">No sets derived from this source yet</div>`;
    } else {
      html += this._renderDownstreamTree(downstream.fullTree, sourceId);
    }

    html += `
        </div>
      </div>

      <div class="lineage-actions">
        <button class="btn-lineage-graph" data-entity-id="${sourceId}" data-entity-type="source">
          <i class="ph ph-graph"></i> Show Full Lineage Graph
        </button>
      </div>
    `;

    return html;
  }

  /**
   * Render set lineage
   */
  _renderSetLineage(setId, set) {
    const upstream = this.lineage.getSetUpstream(setId);
    const downstream = this.lineage.getSetDownstream(setId);
    const derivation = this.lineage._getSetDerivationInfo(set);

    let html = `
      <div class="lineage-section">
        <h4><i class="ph ph-arrow-up"></i> Derived From (upstream)</h4>
        <div class="lineage-upstream">
    `;

    if (upstream.chain.length <= 1) {
      html += `<div class="lineage-empty">No upstream lineage found</div>`;
    } else {
      html += this._renderUpstreamChain(upstream.chain, setId);
    }

    html += `
        </div>
      </div>

      <div class="lineage-section">
        <h4><i class="ph ph-arrow-down"></i> Feeds Into (downstream)</h4>
        <div class="lineage-downstream">
    `;

    // Views
    if (downstream.views.length > 0) {
      html += `<div class="lineage-group"><span class="lineage-group-label">Views (${downstream.views.length})</span>`;
      for (const view of downstream.views) {
        const viewIcon = this._getViewIcon(view.type);
        html += `
          <div class="lineage-item lineage-view">
            <i class="ph ${viewIcon}"></i>
            <span>${this._escapeHtml(view.name)}</span>
            <span class="lineage-view-type">${view.type}</span>
          </div>
        `;
      }
      html += `</div>`;
    }

    // Derived sets
    if (downstream.derivedSets.length > 0) {
      html += `<div class="lineage-group"><span class="lineage-group-label">Derived Sets (${downstream.derivedSets.length})</span>`;
      html += this._renderDownstreamTree(downstream.fullTree, setId);
      html += `</div>`;
    }

    if (downstream.views.length === 0 && downstream.derivedSets.length === 0) {
      html += `<div class="lineage-empty">No downstream dependencies</div>`;
    }

    html += `
        </div>
      </div>

      <div class="lineage-actions">
        <button class="btn-lineage-graph" data-entity-id="${setId}" data-entity-type="set">
          <i class="ph ph-graph"></i> Show Full Lineage Graph
        </button>
      </div>
    `;

    return html;
  }

  /**
   * Render upstream chain
   */
  _renderUpstreamChain(chain, currentId) {
    let html = '<div class="lineage-chain">';

    // Reverse to show root first
    const reversed = [...chain].reverse();

    for (let i = 0; i < reversed.length; i++) {
      const node = reversed[i];
      const isCurrent = node.id === currentId;
      const isLast = i === reversed.length - 1;

      const icon = node.type === 'source' ? 'ph-database' : 'ph-table';
      const badge = node.type === 'source' ? 'GIVEN' : node.operator;
      const badgeClass = node.type === 'source' ? 'op-given' : `op-${this._getOperatorColor(node.operator)}`;

      html += `
        <div class="lineage-chain-node ${isCurrent ? 'current' : ''}"
             data-entity-id="${node.id}" data-entity-type="${node.type}">
          <span class="lineage-op-badge ${badgeClass}">${badge}</span>
          <i class="ph ${icon}"></i>
          <span class="lineage-node-name">${this._escapeHtml(node.name)}</span>
          ${node.recordCount ? `<span class="lineage-node-count">${node.recordCount}</span>` : ''}
          ${isCurrent ? '<span class="lineage-current-marker">YOU ARE HERE</span>' : ''}
        </div>
      `;

      if (!isLast) {
        const nextNode = reversed[i + 1];
        const operator = nextNode.operator || 'DIRECT';
        html += `<div class="lineage-chain-arrow"><i class="ph ph-arrow-down"></i> ${operator}</div>`;
      }
    }

    html += '</div>';
    return html;
  }

  /**
   * Render downstream tree
   */
  _renderDownstreamTree(tree, parentId, depth = 0) {
    let html = '';

    for (const node of tree) {
      const icon = node.type === 'source' ? 'ph-database' : 'ph-table';
      const badge = node.operator || 'SET';
      const badgeClass = `op-${this._getOperatorColor(node.operator)}`;
      const indent = depth * 20;

      html += `
        <div class="lineage-tree-node" style="margin-left: ${indent}px"
             data-entity-id="${node.id}" data-entity-type="${node.type}">
          <span class="lineage-tree-connector">${depth > 0 ? '└─' : ''}</span>
          <span class="lineage-op-badge ${badgeClass}">${badge}</span>
          <i class="ph ${icon}"></i>
          <span class="lineage-node-name">${this._escapeHtml(node.name)}</span>
          <span class="lineage-node-count">${node.recordCount || 0}</span>
        </div>
      `;

      // Render views
      for (const view of (node.views || [])) {
        const viewIcon = this._getViewIcon(view.type);
        html += `
          <div class="lineage-tree-node lineage-view" style="margin-left: ${indent + 24}px">
            <span class="lineage-tree-connector">└─</span>
            <i class="ph ${viewIcon}"></i>
            <span class="lineage-node-name">${this._escapeHtml(view.name)}</span>
          </div>
        `;
      }

      // Render children
      if (node.children && node.children.length > 0) {
        html += this._renderDownstreamTree(node.children, node.id, depth + 1);
      }
    }

    return html;
  }

  /**
   * Render provenance tab content
   */
  _renderProvenanceTab() {
    const entity = this.currentEntity;
    if (!entity) return '';

    if (entity.type === 'source') {
      return this._renderSourceProvenance(entity.data);
    } else {
      return this._renderSetProvenance(entity.data);
    }
  }

  /**
   * Render source provenance
   */
  _renderSourceProvenance(source) {
    const prov = source.provenance || {};

    return `
      <div class="provenance-section">
        <h4><i class="ph ph-brain"></i> Epistemic (How was this produced?)</h4>
        <div class="provenance-grid">
          <div class="provenance-field">
            <i class="ph ph-user"></i>
            <span class="provenance-label">Agent:</span>
            <span class="provenance-value">${this._escapeHtml(prov.agent || 'Unknown')}</span>
          </div>
          <div class="provenance-field">
            <i class="ph ph-gear"></i>
            <span class="provenance-label">Method:</span>
            <span class="provenance-value">${this._escapeHtml(prov.method || 'Import')}</span>
          </div>
          <div class="provenance-field">
            <i class="ph ph-file"></i>
            <span class="provenance-label">Source:</span>
            <span class="provenance-value">${this._escapeHtml(prov.source || source.name || 'Unknown')}</span>
          </div>
        </div>
      </div>

      <div class="provenance-section">
        <h4><i class="ph ph-tag"></i> Semantic (What does it mean?)</h4>
        <div class="provenance-grid">
          <div class="provenance-field">
            <i class="ph ph-text-aa"></i>
            <span class="provenance-label">Term:</span>
            <span class="provenance-value">${this._escapeHtml(prov.term || 'Not specified')}</span>
          </div>
          <div class="provenance-field">
            <i class="ph ph-book-open"></i>
            <span class="provenance-label">Definition:</span>
            <span class="provenance-value">${this._escapeHtml(prov.definition || 'Not specified')}</span>
          </div>
          <div class="provenance-field">
            <i class="ph ph-globe"></i>
            <span class="provenance-label">Jurisdiction:</span>
            <span class="provenance-value">${this._escapeHtml(prov.jurisdiction || 'Not specified')}</span>
          </div>
        </div>
      </div>

      <div class="provenance-section">
        <h4><i class="ph ph-map-pin"></i> Situational (When/where does it hold?)</h4>
        <div class="provenance-grid">
          <div class="provenance-field">
            <i class="ph ph-chart-bar"></i>
            <span class="provenance-label">Scale:</span>
            <span class="provenance-value">${this._escapeHtml(prov.scale || 'Not specified')}</span>
          </div>
          <div class="provenance-field">
            <i class="ph ph-calendar"></i>
            <span class="provenance-label">Timeframe:</span>
            <span class="provenance-value">${this._formatTimeframe(prov.timeframe)}</span>
          </div>
          <div class="provenance-field">
            <i class="ph ph-info"></i>
            <span class="provenance-label">Background:</span>
            <span class="provenance-value">${this._escapeHtml(prov.background || 'Not specified')}</span>
          </div>
        </div>
      </div>

      <div class="provenance-section provenance-immutability">
        <h4><i class="ph ph-lock"></i> Immutability</h4>
        <div class="provenance-grid">
          <div class="provenance-field">
            <i class="ph ph-fingerprint"></i>
            <span class="provenance-label">File Hash:</span>
            <span class="provenance-value hash">${source.fileHash || 'Not available'}</span>
          </div>
          <div class="provenance-field">
            <i class="ph ph-calendar-check"></i>
            <span class="provenance-label">Imported:</span>
            <span class="provenance-value">${source.importedAt ? new Date(source.importedAt).toLocaleString() : 'Unknown'}</span>
          </div>
          <div class="provenance-field">
            <i class="ph ph-shield-check"></i>
            <span class="provenance-label">Status:</span>
            <span class="provenance-value status-readonly"><i class="ph ph-lock"></i> Read-only (immutable)</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render set provenance
   */
  _renderSetProvenance(set) {
    const derivation = this.lineage._getSetDerivationInfo(set);
    const prov = set.datasetProvenance?.provenance || {};

    return `
      <div class="provenance-section">
        <h4><i class="ph ph-git-fork"></i> Derivation</h4>
        <div class="provenance-grid">
          <div class="provenance-field">
            <i class="ph ph-function"></i>
            <span class="provenance-label">Strategy:</span>
            <span class="provenance-value">
              <span class="op-badge op-${this._getOperatorColor(derivation.operator)}">${derivation.operator}</span>
              ${derivation.strategy}
            </span>
          </div>
          ${set.derivation?.parentSetId ? `
            <div class="provenance-field">
              <i class="ph ph-arrow-up"></i>
              <span class="provenance-label">Parent:</span>
              <span class="provenance-value clickable" data-entity-id="${set.derivation.parentSetId}" data-entity-type="set">
                ${this._escapeHtml(this.lineage.findSet(set.derivation.parentSetId)?.name || set.derivation.parentSetId)}
              </span>
            </div>
          ` : ''}
          ${set.derivation?.constraint?.filters?.length ? `
            <div class="provenance-field">
              <i class="ph ph-funnel"></i>
              <span class="provenance-label">Constraint:</span>
              <span class="provenance-value">${set.derivation.constraint.filters.length} filter(s)</span>
            </div>
          ` : ''}
          <div class="provenance-field">
            <i class="ph ph-database"></i>
            <span class="provenance-label">Materialized:</span>
            <span class="provenance-value">${set.records?.length || 0} records</span>
          </div>
        </div>
      </div>

      <div class="provenance-section">
        <h4><i class="ph ph-brain"></i> Epistemic Grounding</h4>
        <div class="provenance-grid">
          <div class="provenance-field">
            <i class="ph ph-user"></i>
            <span class="provenance-label">Created by:</span>
            <span class="provenance-value">${this._escapeHtml(prov.agent || set.derivation?.derivedBy || 'System')}</span>
          </div>
          <div class="provenance-field">
            <i class="ph ph-calendar"></i>
            <span class="provenance-label">Created at:</span>
            <span class="provenance-value">${set.createdAt ? new Date(set.createdAt).toLocaleString() : 'Unknown'}</span>
          </div>
          <div class="provenance-field">
            <i class="ph ph-gear"></i>
            <span class="provenance-label">Method:</span>
            <span class="provenance-value">${this._escapeHtml(prov.method || derivation.description)}</span>
          </div>
        </div>
      </div>

      <div class="provenance-section">
        <h4><i class="ph ph-check-circle"></i> Epistemic Status</h4>
        <div class="provenance-grid">
          <div class="provenance-field">
            <i class="ph ph-shield"></i>
            <span class="provenance-label">Status:</span>
            <span class="provenance-value status-${set.epistemicStatus || 'preliminary'}">
              ${this._getEpistemicStatusIcon(set.epistemicStatus)}
              ${set.epistemicStatus || 'Preliminary'}
            </span>
          </div>
          ${set.supersedes ? `
            <div class="provenance-field">
              <i class="ph ph-arrow-left"></i>
              <span class="provenance-label">Supersedes:</span>
              <span class="provenance-value">${this._escapeHtml(set.supersedes)}</span>
            </div>
          ` : ''}
          ${set.supersededBy ? `
            <div class="provenance-field">
              <i class="ph ph-arrow-right"></i>
              <span class="provenance-label">Superseded by:</span>
              <span class="provenance-value">${this._escapeHtml(set.supersededBy)}</span>
            </div>
          ` : ''}
        </div>
      </div>

      <div class="provenance-section">
        <h4><i class="ph ph-shield-check"></i> Coherence Rules</h4>
        <div class="provenance-grid">
          <div class="provenance-field">
            <i class="ph ph-funnel"></i>
            <span class="provenance-label">Include:</span>
            <span class="provenance-value">${(set.coherenceRules?.includeTypes || ['All records']).join(', ')}</span>
          </div>
          <div class="provenance-field">
            <i class="ph ph-minus-circle"></i>
            <span class="provenance-label">Exclude:</span>
            <span class="provenance-value">${set.coherenceRules?.excludeDeleted ? 'Deleted records' : 'None'}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render activity tab content
   */
  _renderActivityTab() {
    const entity = this.currentEntity;
    if (!entity) return '';

    // Start async load of activities
    this._loadActivityHistory(entity.id, entity.type);

    return `
      <div class="activity-section">
        <div class="activity-loading">
          <i class="ph ph-spinner ph-spin"></i>
          <span>Loading activity history...</span>
        </div>
        <div class="activity-timeline" id="activity-timeline"></div>
      </div>
    `;
  }

  /**
   * Load and render activity history
   */
  async _loadActivityHistory(entityId, entityType) {
    const timeline = document.getElementById('activity-timeline');
    const loading = document.querySelector('.activity-loading');
    if (!timeline) return;

    try {
      const history = await this.lineage.getActivityHistory(entityId, entityType);

      if (loading) loading.style.display = 'none';

      if (history.activities.length === 0) {
        timeline.innerHTML = `
          <div class="activity-empty">
            <i class="ph ph-clock"></i>
            <span>No activity history recorded</span>
          </div>
        `;
        return;
      }

      timeline.innerHTML = history.activities.map(activity => `
        <div class="activity-item">
          <div class="activity-icon ${this._getActivityIconClass(activity.operator)}">
            <i class="ph ${this._getActivityIcon(activity.operator)}"></i>
          </div>
          <div class="activity-content">
            <div class="activity-header">
              <span class="activity-operator">${activity.operator}</span>
              <span class="activity-time">${this._formatTimestamp(activity.timestamp)}</span>
            </div>
            <div class="activity-description">${this._escapeHtml(activity.description)}</div>
            <div class="activity-actor">
              <i class="ph ph-user"></i> ${this._escapeHtml(activity.actor)}
            </div>
          </div>
        </div>
      `).join('');
    } catch (err) {
      console.error('Failed to load activity history:', err);
      if (loading) loading.style.display = 'none';
      timeline.innerHTML = `
        <div class="activity-error">
          <i class="ph ph-warning-circle"></i>
          <span>Failed to load activity history</span>
        </div>
      `;
    }
  }

  /**
   * Attach click handlers to interactive items
   */
  _attachItemHandlers(container) {
    // Clickable lineage nodes
    container.querySelectorAll('[data-entity-id]').forEach(item => {
      if (item.classList.contains('current')) return;

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const entityId = item.dataset.entityId;
        const entityType = item.dataset.entityType;

        if (entityType === 'source') {
          this.showSourceDetail(entityId);
        } else if (entityType === 'set') {
          this.showSetDetail(entityId);
        }
      });
    });

    // Lineage graph button
    container.querySelectorAll('.btn-lineage-graph').forEach(btn => {
      btn.addEventListener('click', () => {
        const entityId = btn.dataset.entityId;
        const entityType = btn.dataset.entityType;
        this._showLineageGraphModal(entityId, entityType);
      });
    });
  }

  /**
   * Show lineage graph modal
   */
  _showLineageGraphModal(entityId, entityType) {
    const graphData = this.lineage.buildLineageGraph(entityId, entityType);

    // Dispatch event for workbench to handle
    const event = new CustomEvent('showLineageGraph', {
      detail: { entityId, entityType, graphData }
    });
    document.dispatchEvent(event);
  }

  // --------------------------------------------------------------------------
  // Helper methods
  // --------------------------------------------------------------------------

  _escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  _getSourceIcon(filename) {
    if (!filename) return 'ph-file';
    const ext = filename.split('.').pop()?.toLowerCase();
    const icons = {
      'csv': 'ph-file-csv',
      'json': 'ph-file-js',
      'ics': 'ph-calendar',
      'xlsx': 'ph-file-xls',
      'xls': 'ph-file-xls'
    };
    return icons[ext] || 'ph-file';
  }

  _getViewIcon(viewType) {
    const icons = {
      'table': 'ph-table',
      'grid': 'ph-table',
      'cards': 'ph-cards',
      'kanban': 'ph-kanban',
      'calendar': 'ph-calendar',
      'timeline': 'ph-chart-line',
      'graph': 'ph-graph'
    };
    return icons[viewType] || 'ph-eye';
  }

  _getOperatorColor(operator) {
    const colors = {
      'SEG': 'purple',
      'CON': 'blue',
      'ALT': 'green',
      'SYN': 'orange',
      'INS': 'gray',
      'GIVEN': 'emerald',
      'DIRECT': 'gray'
    };
    return colors[operator] || 'gray';
  }

  _getEpistemicStatusIcon(status) {
    const icons = {
      'preliminary': '<i class="ph ph-clock"></i>',
      'reviewed': '<i class="ph ph-check-circle"></i>',
      'contested': '<i class="ph ph-warning"></i>',
      'superseded': '<i class="ph ph-arrow-right"></i>'
    };
    return icons[status] || '<i class="ph ph-circle"></i>';
  }

  _getActivityIcon(operator) {
    const icons = {
      'INS': 'ph-plus-circle',
      'DES': 'ph-pencil',
      'NUL': 'ph-trash',
      'SEG': 'ph-funnel',
      'CON': 'ph-link',
      'ALT': 'ph-swap',
      'SYN': 'ph-git-merge',
      'SUP': 'ph-arrow-right',
      'REC': 'ph-arrow-counter-clockwise'
    };
    return icons[operator] || 'ph-circle';
  }

  _getActivityIconClass(operator) {
    const classes = {
      'INS': 'activity-create',
      'DES': 'activity-update',
      'NUL': 'activity-delete',
      'SEG': 'activity-filter',
      'CON': 'activity-link',
      'ALT': 'activity-transform',
      'SYN': 'activity-merge',
      'SUP': 'activity-supersede'
    };
    return classes[operator] || '';
  }

  _formatTimestamp(timestamp) {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;

    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  _formatTimeframe(timeframe) {
    if (!timeframe) return 'Not specified';
    if (typeof timeframe === 'string') return timeframe;
    if (timeframe.observedAt) return new Date(timeframe.observedAt).toLocaleString();
    if (timeframe.start && timeframe.end) {
      return `${new Date(timeframe.start).toLocaleDateString()} - ${new Date(timeframe.end).toLocaleDateString()}`;
    }
    return JSON.stringify(timeframe);
  }
}

// ============================================================================
// LineageGraphModal - Full graph visualization
// ============================================================================

class LineageGraphModal {
  constructor(workbench) {
    this.workbench = workbench;
    this.cy = null;
  }

  /**
   * Show the lineage graph modal
   */
  show(graphData) {
    // Create modal HTML
    const modalHtml = `
      <div class="lineage-graph-modal" id="lineage-graph-modal">
        <div class="lineage-graph-overlay"></div>
        <div class="lineage-graph-content">
          <div class="lineage-graph-header">
            <h3><i class="ph ph-graph"></i> Data Lineage Graph</h3>
            <button class="lineage-graph-close" id="lineage-graph-close">
              <i class="ph ph-x"></i>
            </button>
          </div>
          <div class="lineage-graph-legend">
            <span class="legend-item"><span class="legend-node source"></span> Source (GIVEN)</span>
            <span class="legend-item"><span class="legend-node set"></span> Set (MEANT)</span>
            <span class="legend-item"><span class="legend-node view"></span> View</span>
            <span class="legend-item"><span class="legend-edge direct">───</span> DIRECT</span>
            <span class="legend-item"><span class="legend-edge seg">─│─</span> SEG</span>
            <span class="legend-item"><span class="legend-edge con">─⋈─</span> CON</span>
          </div>
          <div class="lineage-graph-container" id="lineage-graph-container"></div>
          <div class="lineage-graph-controls">
            <button id="lineage-zoom-in" title="Zoom In"><i class="ph ph-magnifying-glass-plus"></i></button>
            <button id="lineage-zoom-out" title="Zoom Out"><i class="ph ph-magnifying-glass-minus"></i></button>
            <button id="lineage-fit" title="Fit to View"><i class="ph ph-arrows-out"></i></button>
            <button id="lineage-export" title="Export as PNG"><i class="ph ph-image"></i></button>
          </div>
        </div>
      </div>
    `;

    // Add modal to document
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Initialize graph
    this._initGraph(graphData);

    // Attach event handlers
    this._attachHandlers();
  }

  /**
   * Initialize Cytoscape graph
   */
  _initGraph(graphData) {
    const container = document.getElementById('lineage-graph-container');
    if (!container) return;

    // Convert graph data to Cytoscape format
    const elements = [];

    // Add nodes
    for (const node of graphData.nodes) {
      elements.push({
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          operator: node.operator
        },
        classes: `lineage-node-${node.type} ${node.id === graphData.focusId ? 'focused' : ''}`
      });
    }

    // Add edges
    for (const edge of graphData.edges) {
      elements.push({
        data: {
          id: `${edge.source}-${edge.target}`,
          source: edge.source,
          target: edge.target,
          operator: edge.operator
        },
        classes: `lineage-edge-${edge.operator?.toLowerCase() || 'default'}`
      });
    }

    // Create Cytoscape instance with custom stylesheet
    this.cy = cytoscape({
      container,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'text-valign': 'bottom',
            'text-margin-y': 8,
            'font-size': 12,
            'width': 40,
            'height': 40,
            'background-color': '#6b7280',
            'color': '#f1f5f9'
          }
        },
        {
          selector: '.lineage-node-source',
          style: {
            'background-color': '#10b981',
            'shape': 'diamond'
          }
        },
        {
          selector: '.lineage-node-set',
          style: {
            'background-color': '#8b5cf6',
            'shape': 'roundrectangle'
          }
        },
        {
          selector: '.lineage-node-view',
          style: {
            'background-color': '#3b82f6',
            'shape': 'ellipse',
            'width': 30,
            'height': 30
          }
        },
        {
          selector: '.focused',
          style: {
            'border-width': 4,
            'border-color': '#f59e0b',
            'width': 50,
            'height': 50
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#6b7280',
            'target-arrow-color': '#6b7280',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier'
          }
        },
        {
          selector: '.lineage-edge-seg',
          style: {
            'line-color': '#8b5cf6',
            'target-arrow-color': '#8b5cf6',
            'line-style': 'dashed'
          }
        },
        {
          selector: '.lineage-edge-con',
          style: {
            'line-color': '#3b82f6',
            'target-arrow-color': '#3b82f6'
          }
        },
        {
          selector: '.lineage-edge-view',
          style: {
            'line-color': '#9ca3af',
            'target-arrow-color': '#9ca3af',
            'line-style': 'dotted'
          }
        }
      ],
      layout: {
        name: 'dagre',
        rankDir: 'TB',
        nodeSep: 60,
        rankSep: 80
      }
    });

    // Fit after layout
    this.cy.on('layoutstop', () => {
      this.cy.fit(undefined, 40);
    });
  }

  /**
   * Attach event handlers
   */
  _attachHandlers() {
    // Close button
    document.getElementById('lineage-graph-close')?.addEventListener('click', () => {
      this.close();
    });

    // Overlay click
    document.querySelector('.lineage-graph-overlay')?.addEventListener('click', () => {
      this.close();
    });

    // Zoom controls
    document.getElementById('lineage-zoom-in')?.addEventListener('click', () => {
      if (this.cy) this.cy.zoom(this.cy.zoom() * 1.2);
    });

    document.getElementById('lineage-zoom-out')?.addEventListener('click', () => {
      if (this.cy) this.cy.zoom(this.cy.zoom() / 1.2);
    });

    document.getElementById('lineage-fit')?.addEventListener('click', () => {
      if (this.cy) this.cy.fit(undefined, 40);
    });

    document.getElementById('lineage-export')?.addEventListener('click', () => {
      this._exportPNG();
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  }

  /**
   * Export graph as PNG
   */
  _exportPNG() {
    if (!this.cy) return;

    const png = this.cy.png({
      output: 'blob',
      bg: '#1e293b',
      scale: 2
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(png);
    link.download = 'lineage-graph.png';
    link.click();
  }

  /**
   * Close the modal
   */
  close() {
    const modal = document.getElementById('lineage-graph-modal');
    if (modal) {
      modal.remove();
    }
    if (this.cy) {
      this.cy.destroy();
      this.cy = null;
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LineageExplorer,
    EntityDetailPanel,
    LineageGraphModal
  };
}

if (typeof window !== 'undefined') {
  window.EOLineage = {
    LineageExplorer,
    EntityDetailPanel,
    LineageGraphModal
  };
}
