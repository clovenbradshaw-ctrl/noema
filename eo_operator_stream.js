/**
 * EO Operator Stream - Operator-Driven Data Streaming
 *
 * Implements the API storage layer where operators serve as data contracts.
 * Every user action is an operator; every operator implies a data requirement.
 *
 * Core insight: The activity stream IS the demand signal.
 *
 * Operators:
 * - NUL (∅): Absence recognition → metadata about missing data
 * - DES (⊡): Designation → schemas, type definitions
 * - INS (△): Instantiation → write path (outbound)
 * - SEG (｜): Segmentation → filtered subsets
 * - CON (⋈): Connection → relationship traversal
 * - ALT (∿): Alternation → definition switching
 * - SYN (∨): Synthesis → server-side aggregation
 * - SUP (⊕): Superposition → multi-source truth
 * - REC (⟳): Recursion → perspective re-centering
 */

// ============================================================================
// OPERATOR TYPES
// ============================================================================

const OperatorType = Object.freeze({
  NUL: 'NUL',  // Absence recognition
  DES: 'DES',  // Designation/definition
  INS: 'INS',  // Instantiation (create)
  SEG: 'SEG',  // Segmentation (filter)
  CON: 'CON',  // Connection (relate)
  ALT: 'ALT',  // Alternation (switch frame)
  SYN: 'SYN',  // Synthesis (merge/aggregate)
  SUP: 'SUP',  // Superposition (multi-truth)
  REC: 'REC'   // Recursion (re-center)
});

const StreamStatus = Object.freeze({
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error'
});

const SubscriptionState = Object.freeze({
  ACTIVE: 'active',
  PAUSED: 'paused',
  CLOSED: 'closed'
});

// ============================================================================
// OPERATOR INTENT - What the client wants
// ============================================================================

class OperatorIntent {
  constructor(operatorType, params, options = {}) {
    this.id = 'intent_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
    this.timestamp = new Date().toISOString();
    this.operator = {
      type: operatorType,
      params: params
    };
    this.hints = {
      localEventCount: options.localEventCount || 0,
      lastSyncClock: options.lastSyncClock || 0,
      prefetchDepth: options.prefetchDepth || 1
    };
    this.priority = options.priority || 'normal'; // 'high', 'normal', 'low'
    this.timeout = options.timeout || 30000;
  }

  toJSON() {
    return {
      id: this.id,
      timestamp: this.timestamp,
      operator: this.operator,
      hints: this.hints,
      priority: this.priority
    };
  }

  static seg(collection, filter, options = {}) {
    return new OperatorIntent(OperatorType.SEG, {
      collection,
      filter: filter || {},
      sort: options.sort,
      limit: options.limit || 50,
      offset: options.offset || 0
    }, options);
  }

  static con(sourceEntity, relationship, options = {}) {
    return new OperatorIntent(OperatorType.CON, {
      sourceEntity,
      relationship,
      traversal: options.traversal || 'outbound',
      includeProperties: options.includeProperties !== false
    }, options);
  }

  static syn(collection, aggregate, options = {}) {
    return new OperatorIntent(OperatorType.SYN, {
      collection,
      groupBy: options.groupBy,
      aggregate,
      filter: options.filter
    }, options);
  }

  static des(entityType, options = {}) {
    return new OperatorIntent(OperatorType.DES, {
      entityType,
      includeSchema: options.includeSchema !== false,
      includeConstraints: options.includeConstraints || false
    }, options);
  }

  static ins(event, options = {}) {
    return new OperatorIntent(OperatorType.INS, {
      event
    }, options);
  }

  static sup(entityId, property, options = {}) {
    return new OperatorIntent(OperatorType.SUP, {
      entityId,
      property,
      includeSources: options.includeSources !== false
    }, options);
  }

  static rec(newCenter, options = {}) {
    return new OperatorIntent(OperatorType.REC, {
      newCenter,
      previousCenter: options.previousCenter,
      depth: options.depth || 2
    }, options);
  }

  static alt(frame, options = {}) {
    return new OperatorIntent(OperatorType.ALT, {
      frame,
      previousFrame: options.previousFrame
    }, options);
  }

  static nul(entityType, expectedProperties, options = {}) {
    return new OperatorIntent(OperatorType.NUL, {
      entityType,
      expectedProperties
    }, options);
  }
}

// ============================================================================
// DATA SLICE - What the server returns
// ============================================================================

class DataSlice {
  constructor(data) {
    this.requestId = data.requestId;
    this.events = data.events || [];
    this.meta = {
      totalMatching: data.meta?.totalMatching || this.events.length,
      horizon: data.meta?.horizon,
      expiresAt: data.meta?.expiresAt,
      continuationToken: data.meta?.continuationToken,
      computedAt: data.meta?.computedAt
    };
    this.relationships = data.relationships || [];
    this.synthesized = data.synthesized || null;
    this.superposition = data.superposition || null;
    this.schema = data.schema || null;
    this.error = data.error || null;
  }

  get hasMore() {
    return !!this.meta.continuationToken;
  }

  get isEmpty() {
    return this.events.length === 0 && !this.synthesized && !this.schema;
  }

  get byteSize() {
    return JSON.stringify(this).length;
  }
}

// ============================================================================
// DATA BUDGET - Bandwidth constraints
// ============================================================================

class DataBudget {
  constructor(options = {}) {
    this.maxInitialPayload = options.maxInitialPayload || 5 * 1024 * 1024; // 5MB
    this.maxEventRate = options.maxEventRate || 100; // per second
    this.maxCacheSize = options.maxCacheSize || 50 * 1024 * 1024; // 50MB
    this.prefetchDepth = options.prefetchDepth || 2;
    this.aggregatePreference = options.aggregatePreference || 'server'; // 'server' | 'local'

    // Tracking
    this._bytesReceived = 0;
    this._eventsReceived = 0;
    this._windowStart = Date.now();
  }

  track(slice) {
    this._bytesReceived += slice.byteSize;
    this._eventsReceived += slice.events.length;

    // Reset window every second
    const now = Date.now();
    if (now - this._windowStart > 1000) {
      this._windowStart = now;
      this._eventsReceived = slice.events.length;
    }
  }

  isWithinLimits(slice) {
    if (slice.byteSize > this.maxInitialPayload) return false;
    if (this._eventsReceived + slice.events.length > this.maxEventRate) return false;
    return true;
  }

  suggestAdaptation(connectionQuality) {
    const adaptations = [];

    if (connectionQuality === 'slow') {
      adaptations.push({ operator: OperatorType.SEG, adaptation: 'reduce_limit', newLimit: 20 });
      adaptations.push({ operator: OperatorType.SYN, adaptation: 'server_only' });
      adaptations.push({ operator: OperatorType.CON, adaptation: 'counts_only' });
      adaptations.push({ operator: OperatorType.REC, adaptation: 'defer_until_idle' });
    }

    return adaptations;
  }

  getStats() {
    return {
      bytesReceived: this._bytesReceived,
      eventsReceived: this._eventsReceived,
      limits: {
        maxInitialPayload: this.maxInitialPayload,
        maxEventRate: this.maxEventRate,
        maxCacheSize: this.maxCacheSize
      }
    };
  }
}

// ============================================================================
// SUBSCRIPTION - Live updates for operator results
// ============================================================================

class Subscription {
  constructor(id, intent, callback) {
    this.id = id;
    this.intent = intent;
    this.callback = callback;
    this.state = SubscriptionState.ACTIVE;
    this.createdAt = new Date().toISOString();
    this.lastUpdate = null;
    this.eventCount = 0;
  }

  notify(slice) {
    if (this.state !== SubscriptionState.ACTIVE) return;

    this.lastUpdate = new Date().toISOString();
    this.eventCount += slice.events.length;

    try {
      this.callback(slice);
    } catch (err) {
      console.error(`Subscription ${this.id} callback error:`, err);
    }
  }

  pause() {
    this.state = SubscriptionState.PAUSED;
  }

  resume() {
    this.state = SubscriptionState.ACTIVE;
  }

  close() {
    this.state = SubscriptionState.CLOSED;
  }
}

// ============================================================================
// OPERATOR EXECUTOR - Executes operators locally or via stream
// ============================================================================

class OperatorExecutor {
  constructor(eventStore, options = {}) {
    this.eventStore = eventStore;
    this.stateDerivation = options.stateDerivation;
    this.horizonGate = options.horizonGate;
  }

  /**
   * Execute a SEG (segmentation) operator locally
   */
  executeSEG(params, horizon = null) {
    const { collection, filter, sort, limit, offset } = params;

    // Get all events, optionally filtered by horizon
    let events = this.eventStore.getAll();

    // Filter by collection if specified
    if (collection) {
      events = events.filter(e =>
        e.payload?.collection === collection ||
        e.payload?.entityType === collection ||
        e.context?.collection === collection
      );
    }

    // Apply filter conditions
    if (filter && Object.keys(filter).length > 0) {
      events = events.filter(e => this._matchesFilter(e, filter));
    }

    // Apply horizon restrictions if available
    if (this.horizonGate && horizon) {
      events = events.filter(e => this.horizonGate.isVisible(e, horizon));
    }

    // Sort
    if (sort) {
      const { field, order } = sort;
      events.sort((a, b) => {
        const aVal = this._getNestedValue(a, field);
        const bVal = this._getNestedValue(b, field);
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return order === 'desc' ? -cmp : cmp;
      });
    }

    // Paginate
    const total = events.length;
    events = events.slice(offset || 0, (offset || 0) + (limit || 50));

    // Extract relationship counts
    const relationships = events.map(e => ({
      entityId: e.id,
      relationships: this._countRelationships(e)
    }));

    return new DataSlice({
      requestId: 'local',
      events,
      meta: { totalMatching: total },
      relationships
    });
  }

  /**
   * Execute a CON (connection) operator locally
   */
  executeCON(params, horizon = null) {
    const { sourceEntity, relationship, traversal, includeProperties } = params;

    const sourceEvent = this.eventStore.get(sourceEntity);
    if (!sourceEvent) {
      return new DataSlice({ requestId: 'local', error: 'Source entity not found' });
    }

    // Find related events
    let relatedEvents = [];
    const allEvents = this.eventStore.getAll();

    // Check for explicit relationships in payload
    if (sourceEvent.payload?.relationships?.[relationship]) {
      const relatedIds = sourceEvent.payload.relationships[relationship];
      relatedEvents = relatedIds
        .map(id => this.eventStore.get(id))
        .filter(e => e != null);
    }

    // Check for relationships via connection events
    for (const e of allEvents) {
      if (e.payload?.action === 'connect' &&
          e.payload?.relationship === relationship) {
        if (traversal === 'outbound' && e.payload?.source === sourceEntity) {
          const target = this.eventStore.get(e.payload.target);
          if (target) relatedEvents.push(target);
        }
        if (traversal === 'inbound' && e.payload?.target === sourceEntity) {
          const source = this.eventStore.get(e.payload.source);
          if (source) relatedEvents.push(source);
        }
      }
    }

    // Deduplicate
    const seen = new Set();
    relatedEvents = relatedEvents.filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });

    return new DataSlice({
      requestId: 'local',
      events: relatedEvents,
      relationships: relatedEvents.map(e => ({
        entityId: e.id,
        relationships: this._countRelationships(e)
      }))
    });
  }

  /**
   * Execute a SYN (synthesis) operator locally
   */
  executeSYN(params, horizon = null) {
    const { collection, groupBy, aggregate, filter } = params;

    // First apply SEG to get the working set
    const segResult = this.executeSEG({
      collection,
      filter,
      limit: 10000 // Higher limit for aggregation
    }, horizon);

    const events = segResult.events;

    if (!aggregate) {
      return new DataSlice({
        requestId: 'local',
        error: 'No aggregate specified'
      });
    }

    const { field, mode } = aggregate;
    let synthesized = {};

    if (groupBy) {
      // Group-based aggregation
      const groups = new Map();

      for (const e of events) {
        const groupKey = this._getNestedValue(e, groupBy) || '__null__';
        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        groups.get(groupKey).push(e);
      }

      for (const [key, groupEvents] of groups) {
        synthesized[key] = this._aggregate(groupEvents, field, mode);
      }
    } else {
      // Single aggregation
      synthesized = { result: this._aggregate(events, field, mode) };
    }

    return new DataSlice({
      requestId: 'local',
      events: [], // No raw events for SYN
      synthesized,
      meta: {
        sourceEventCount: events.length,
        computedAt: new Date().toISOString()
      }
    });
  }

  /**
   * Execute a SUP (superposition) operator locally
   */
  executeSUP(params, horizon = null) {
    const { entityId, property, includeSources } = params;

    // Find all observations for this entity/property
    const observations = this.eventStore.getAll().filter(e =>
      e.payload?.entityId === entityId ||
      e.payload?.targetId === entityId ||
      e.id === entityId
    );

    // Extract values with their contexts
    const values = [];
    for (const e of observations) {
      let value;
      if (property) {
        value = this._getNestedValue(e.payload, property);
      } else {
        value = e.payload;
      }

      if (value !== undefined) {
        values.push({
          value,
          context: {
            source: e.context?.workspace || e.actor,
            method: e.mode || 'declared',
            timestamp: e.timestamp,
            actor: e.actor
          },
          eventId: e.id
        });
      }
    }

    const superposition = {
      entityId,
      property,
      values,
      isSuperposed: values.length > 1,
      resolution: null
    };

    return new DataSlice({
      requestId: 'local',
      events: includeSources ? observations : [],
      superposition
    });
  }

  /**
   * Execute a DES (designation) operator locally
   */
  executeDES(params, horizon = null) {
    const { entityType, includeSchema, includeConstraints } = params;

    // Find schema definition events
    const schemaEvents = this.eventStore.getAll().filter(e =>
      e.payload?.action === 'define_schema' ||
      e.payload?.action === 'define_type' ||
      e.payload?.entityType === entityType
    );

    const schema = {
      entityType,
      fields: [],
      constraints: []
    };

    // Build schema from events
    for (const e of schemaEvents) {
      if (e.payload?.fields) {
        schema.fields.push(...e.payload.fields);
      }
      if (includeConstraints && e.payload?.constraints) {
        schema.constraints.push(...e.payload.constraints);
      }
    }

    return new DataSlice({
      requestId: 'local',
      events: schemaEvents,
      schema
    });
  }

  /**
   * Execute a REC (recursion) operator locally
   */
  executeREC(params, horizon = null) {
    const { newCenter, previousCenter, depth } = params;

    // This is a more complex operation - rebuild the perspective
    // around a new center entity

    const centerEvent = this.eventStore.getAll().find(e =>
      e.payload?.entityType === newCenter ||
      e.payload?.type === newCenter
    );

    if (!centerEvent) {
      return new DataSlice({
        requestId: 'local',
        error: `Center type ${newCenter} not found`
      });
    }

    // Gather all entities of this type
    const entities = this.eventStore.getAll().filter(e =>
      e.payload?.entityType === newCenter ||
      e.payload?.type === newCenter
    );

    // For each entity, gather connected data up to depth
    const relationships = [];
    for (const e of entities) {
      const rels = this._traverseRelationships(e.id, depth);
      relationships.push({
        entityId: e.id,
        connected: rels
      });
    }

    return new DataSlice({
      requestId: 'local',
      events: entities,
      relationships,
      meta: {
        center: newCenter,
        previousCenter,
        depth
      }
    });
  }

  // Helper methods

  _matchesFilter(event, filter) {
    for (const [key, value] of Object.entries(filter)) {
      const eventValue = this._getNestedValue(event, key) ||
                         this._getNestedValue(event.payload, key);

      if (typeof value === 'object' && value !== null) {
        // Range or complex filter
        if (value.gt !== undefined && eventValue <= value.gt) return false;
        if (value.gte !== undefined && eventValue < value.gte) return false;
        if (value.lt !== undefined && eventValue >= value.lt) return false;
        if (value.lte !== undefined && eventValue > value.lte) return false;
        if (value.ne !== undefined && eventValue === value.ne) return false;
        if (value.in !== undefined && !value.in.includes(eventValue)) return false;
      } else if (eventValue !== value) {
        return false;
      }
    }
    return true;
  }

  _getNestedValue(obj, path) {
    if (!obj || !path) return undefined;
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
      if (current === null || current === undefined) return undefined;
      current = current[key];
    }
    return current;
  }

  _countRelationships(event) {
    const counts = {};
    if (event.payload?.relationships) {
      for (const [rel, targets] of Object.entries(event.payload.relationships)) {
        counts[rel] = Array.isArray(targets) ? targets.length : 1;
      }
    }
    return counts;
  }

  _aggregate(events, field, mode) {
    const values = events
      .map(e => this._getNestedValue(e, field) || this._getNestedValue(e.payload, field))
      .filter(v => v !== undefined && v !== null);

    const numericValues = values.filter(v => typeof v === 'number');

    switch (mode) {
      case 'sum':
        return numericValues.reduce((a, b) => a + b, 0);
      case 'avg':
      case 'average':
        return numericValues.length > 0
          ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length
          : 0;
      case 'count':
        return values.length;
      case 'min':
        return numericValues.length > 0 ? Math.min(...numericValues) : null;
      case 'max':
        return numericValues.length > 0 ? Math.max(...numericValues) : null;
      case 'first':
        return values[0];
      case 'last':
        return values[values.length - 1];
      case 'concat':
        return values.join(', ');
      default:
        return { count: values.length, values };
    }
  }

  _traverseRelationships(entityId, maxDepth, visited = new Set(), currentDepth = 0) {
    if (currentDepth >= maxDepth || visited.has(entityId)) {
      return [];
    }
    visited.add(entityId);

    const connections = [];
    const allEvents = this.eventStore.getAll();

    for (const e of allEvents) {
      if (e.payload?.action === 'connect') {
        if (e.payload?.source === entityId) {
          connections.push({
            relationship: e.payload.relationship,
            target: e.payload.target,
            depth: currentDepth + 1
          });
          // Recurse
          connections.push(...this._traverseRelationships(
            e.payload.target,
            maxDepth,
            visited,
            currentDepth + 1
          ));
        }
      }
    }

    return connections;
  }
}

// ============================================================================
// OPERATOR STREAM CLIENT - WebSocket connection to server
// ============================================================================

class OperatorStreamClient {
  constructor(options = {}) {
    this.serverUrl = options.serverUrl || null;
    this.eventStore = options.eventStore;
    this.executor = options.executor || (this.eventStore
      ? new OperatorExecutor(this.eventStore, options)
      : null);

    this.status = StreamStatus.DISCONNECTED;
    this.ws = null;
    this.deviceId = this._getDeviceId();
    this.horizon = options.horizon || null;

    // Request tracking
    this._pendingRequests = new Map();
    this._subscriptions = new Map();

    // Budget
    this.budget = new DataBudget(options.budget);

    // Reconnection
    this.maxRetries = options.maxRetries || 4;
    this.retryDelays = [2000, 4000, 8000, 16000];
    this._retryCount = 0;

    // Callbacks
    this._onStatusChange = options.onStatusChange || (() => {});
    this._onError = options.onError || console.error;

    // Prefetch prediction
    this._navigationHistory = [];
    this._prefetchPatterns = new Map();
  }

  _getDeviceId() {
    if (typeof localStorage !== 'undefined') {
      let id = localStorage.getItem('eo_stream_device_id');
      if (!id) {
        id = 'device_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
        localStorage.setItem('eo_stream_device_id', id);
      }
      return id;
    }
    return 'device_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Connect to the stream server
   */
  async connect(serverUrl = null) {
    if (serverUrl) this.serverUrl = serverUrl;

    if (!this.serverUrl) {
      // Operate in local-only mode
      this.status = StreamStatus.CONNECTED;
      this._onStatusChange(this.status);
      return { success: true, mode: 'local' };
    }

    this.status = StreamStatus.CONNECTING;
    this._onStatusChange(this.status);

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          this.status = StreamStatus.CONNECTED;
          this._retryCount = 0;
          this._onStatusChange(this.status);

          // Send connection handshake
          this._send({
            type: 'connect',
            deviceId: this.deviceId,
            horizon: this.horizon,
            budget: this.budget.getStats().limits
          });

          resolve({ success: true, mode: 'remote' });
        };

        this.ws.onmessage = (event) => {
          this._handleMessage(JSON.parse(event.data));
        };

        this.ws.onerror = (error) => {
          this._onError(error);
          this.status = StreamStatus.ERROR;
          this._onStatusChange(this.status);
        };

        this.ws.onclose = () => {
          this.status = StreamStatus.DISCONNECTED;
          this._onStatusChange(this.status);
          this._attemptReconnect();
        };

      } catch (err) {
        this.status = StreamStatus.ERROR;
        this._onStatusChange(this.status);
        reject(err);
      }
    });
  }

  /**
   * Disconnect from the stream server
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.status = StreamStatus.DISCONNECTED;
    this._onStatusChange(this.status);

    // Reject all pending requests
    for (const [id, { reject }] of this._pendingRequests) {
      reject(new Error('Disconnected'));
    }
    this._pendingRequests.clear();
  }

  /**
   * Send an operator intent and get a data slice
   */
  async request(intent) {
    // Record for prefetch prediction
    this._recordNavigation(intent);

    // If local-only or disconnected, execute locally
    if (!this.ws || this.status !== StreamStatus.CONNECTED) {
      return this._executeLocally(intent);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this._pendingRequests.delete(intent.id);
        // Fall back to local execution
        this._executeLocally(intent).then(resolve).catch(reject);
      }, intent.timeout);

      this._pendingRequests.set(intent.id, { resolve, reject, timeout });
      this._send({
        type: 'operator_intent',
        intent: intent.toJSON()
      });
    });
  }

  /**
   * Subscribe to live updates for an operator result
   */
  subscribe(intent, callback) {
    const subId = 'sub_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
    const subscription = new Subscription(subId, intent, callback);

    this._subscriptions.set(subId, subscription);

    // Notify server if connected
    if (this.ws && this.status === StreamStatus.CONNECTED) {
      this._send({
        type: 'subscribe',
        subscriptionId: subId,
        intent: intent.toJSON()
      });
    }

    // Execute initial query
    this.request(intent).then(slice => {
      subscription.notify(slice);
    });

    return {
      id: subId,
      pause: () => subscription.pause(),
      resume: () => subscription.resume(),
      close: () => {
        subscription.close();
        this._subscriptions.delete(subId);
        if (this.ws && this.status === StreamStatus.CONNECTED) {
          this._send({ type: 'unsubscribe', subscriptionId: subId });
        }
      }
    };
  }

  /**
   * Execute operator locally
   */
  async _executeLocally(intent) {
    if (!this.executor) {
      throw new Error('No local executor available');
    }

    const { type, params } = intent.operator;

    switch (type) {
      case OperatorType.SEG:
        return this.executor.executeSEG(params, this.horizon);
      case OperatorType.CON:
        return this.executor.executeCON(params, this.horizon);
      case OperatorType.SYN:
        return this.executor.executeSYN(params, this.horizon);
      case OperatorType.SUP:
        return this.executor.executeSUP(params, this.horizon);
      case OperatorType.DES:
        return this.executor.executeDES(params, this.horizon);
      case OperatorType.REC:
        return this.executor.executeREC(params, this.horizon);
      case OperatorType.INS:
        // INS is always local-first
        return this._handleInsert(params);
      case OperatorType.ALT:
        // ALT just changes the frame
        this.horizon = { ...this.horizon, frame: params.frame };
        return new DataSlice({ requestId: 'local', meta: { frame: params.frame } });
      case OperatorType.NUL:
        return this._handleNul(params);
      default:
        throw new Error(`Unknown operator type: ${type}`);
    }
  }

  _handleInsert(params) {
    const { event } = params;
    const result = this.eventStore.append(event);

    if (result.success) {
      // Queue for sync
      return new DataSlice({
        requestId: 'local',
        events: [event],
        meta: { pending: true }
      });
    } else {
      return new DataSlice({
        requestId: 'local',
        error: result.errors?.join(', ') || result.error
      });
    }
  }

  _handleNul(params) {
    const { entityType, expectedProperties } = params;

    // Find what's missing
    const existing = this.eventStore.getAll()
      .filter(e => e.payload?.entityType === entityType)
      .map(e => e.payload);

    const missing = [];
    if (expectedProperties) {
      for (const prop of expectedProperties) {
        const hasIt = existing.some(p => p[prop] !== undefined);
        if (!hasIt) missing.push(prop);
      }
    }

    return new DataSlice({
      requestId: 'local',
      meta: {
        entityType,
        existingCount: existing.length,
        missing
      }
    });
  }

  _handleMessage(message) {
    switch (message.type) {
      case 'data_slice':
        this._handleDataSlice(message);
        break;
      case 'subscription_update':
        this._handleSubscriptionUpdate(message);
        break;
      case 'error':
        this._handleError(message);
        break;
      case 'connected':
        console.log('Stream connected:', message);
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  _handleDataSlice(message) {
    const slice = new DataSlice(message.slice);
    this.budget.track(slice);

    const pending = this._pendingRequests.get(message.requestId);
    if (pending) {
      clearTimeout(pending.timeout);
      this._pendingRequests.delete(message.requestId);

      // Merge with local store if we have events
      if (slice.events.length > 0 && this.eventStore) {
        for (const event of slice.events) {
          this.eventStore.append(event);
        }
      }

      pending.resolve(slice);
    }
  }

  _handleSubscriptionUpdate(message) {
    const subscription = this._subscriptions.get(message.subscriptionId);
    if (subscription) {
      const slice = new DataSlice(message.slice);
      this.budget.track(slice);

      // Merge events into local store
      if (slice.events.length > 0 && this.eventStore) {
        for (const event of slice.events) {
          this.eventStore.append(event);
        }
      }

      subscription.notify(slice);
    }
  }

  _handleError(message) {
    const pending = this._pendingRequests.get(message.requestId);
    if (pending) {
      clearTimeout(pending.timeout);
      this._pendingRequests.delete(message.requestId);
      pending.reject(new Error(message.error));
    }
    this._onError(new Error(message.error));
  }

  _send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  _attemptReconnect() {
    if (this._retryCount >= this.maxRetries) {
      console.log('Max retries reached, giving up');
      return;
    }

    const delay = this.retryDelays[this._retryCount];
    this._retryCount++;

    this.status = StreamStatus.RECONNECTING;
    this._onStatusChange(this.status);

    console.log(`Reconnecting in ${delay}ms (attempt ${this._retryCount})`);

    setTimeout(() => {
      this.connect().catch(err => {
        console.error('Reconnection failed:', err);
      });
    }, delay);
  }

  // Navigation prediction for prefetching

  _recordNavigation(intent) {
    const entry = {
      operator: intent.operator.type,
      params: intent.operator.params,
      timestamp: Date.now()
    };

    this._navigationHistory.push(entry);

    // Keep last 100 entries
    if (this._navigationHistory.length > 100) {
      this._navigationHistory.shift();
    }

    // Update patterns
    if (this._navigationHistory.length >= 2) {
      const prev = this._navigationHistory[this._navigationHistory.length - 2];
      const key = `${prev.operator}:${JSON.stringify(prev.params)}`;

      if (!this._prefetchPatterns.has(key)) {
        this._prefetchPatterns.set(key, new Map());
      }

      const targets = this._prefetchPatterns.get(key);
      const targetKey = `${entry.operator}:${JSON.stringify(entry.params)}`;
      targets.set(targetKey, (targets.get(targetKey) || 0) + 1);
    }
  }

  predictNextOperations(intent, limit = 3) {
    const key = `${intent.operator.type}:${JSON.stringify(intent.operator.params)}`;
    const patterns = this._prefetchPatterns.get(key);

    if (!patterns) return [];

    // Sort by frequency
    const sorted = Array.from(patterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([k]) => {
        const [op, paramsStr] = k.split(':');
        return { operator: op, params: JSON.parse(paramsStr) };
      });

    return sorted;
  }

  /**
   * Get stream status
   */
  getStatus() {
    return {
      status: this.status,
      connected: this.status === StreamStatus.CONNECTED,
      deviceId: this.deviceId,
      horizon: this.horizon,
      pendingRequests: this._pendingRequests.size,
      activeSubscriptions: this._subscriptions.size,
      budget: this.budget.getStats()
    };
  }
}

// ============================================================================
// MOCK STREAM SERVER - For local development and testing
// ============================================================================

class MockStreamServer {
  constructor(options = {}) {
    this.eventStore = options.eventStore;
    this.executor = new OperatorExecutor(this.eventStore, options);
    this.connections = new Map();
    this.subscriptions = new Map();
    this.latencyMs = options.latencyMs || 50;
  }

  /**
   * Handle incoming message from client
   */
  async handleMessage(connectionId, message) {
    // Simulate network latency
    await this._delay(this.latencyMs);

    switch (message.type) {
      case 'connect':
        return this._handleConnect(connectionId, message);
      case 'operator_intent':
        return this._handleOperatorIntent(connectionId, message);
      case 'subscribe':
        return this._handleSubscribe(connectionId, message);
      case 'unsubscribe':
        return this._handleUnsubscribe(connectionId, message);
      default:
        return { type: 'error', error: `Unknown message type: ${message.type}` };
    }
  }

  _handleConnect(connectionId, message) {
    this.connections.set(connectionId, {
      deviceId: message.deviceId,
      horizon: message.horizon,
      budget: message.budget,
      connectedAt: new Date().toISOString()
    });

    return {
      type: 'connected',
      connectionId,
      serverTime: new Date().toISOString()
    };
  }

  async _handleOperatorIntent(connectionId, message) {
    const { intent } = message;
    const { type, params } = intent.operator;
    const connection = this.connections.get(connectionId);
    const horizon = connection?.horizon;

    let slice;

    try {
      switch (type) {
        case OperatorType.SEG:
          slice = this.executor.executeSEG(params, horizon);
          break;
        case OperatorType.CON:
          slice = this.executor.executeCON(params, horizon);
          break;
        case OperatorType.SYN:
          slice = this.executor.executeSYN(params, horizon);
          break;
        case OperatorType.SUP:
          slice = this.executor.executeSUP(params, horizon);
          break;
        case OperatorType.DES:
          slice = this.executor.executeDES(params, horizon);
          break;
        case OperatorType.REC:
          slice = this.executor.executeREC(params, horizon);
          break;
        default:
          slice = new DataSlice({ requestId: intent.id, error: `Unsupported operator: ${type}` });
      }
    } catch (err) {
      slice = new DataSlice({ requestId: intent.id, error: err.message });
    }

    return {
      type: 'data_slice',
      requestId: intent.id,
      slice: {
        requestId: intent.id,
        events: slice.events,
        meta: slice.meta,
        relationships: slice.relationships,
        synthesized: slice.synthesized,
        superposition: slice.superposition,
        schema: slice.schema,
        error: slice.error
      }
    };
  }

  _handleSubscribe(connectionId, message) {
    const { subscriptionId, intent } = message;

    this.subscriptions.set(subscriptionId, {
      connectionId,
      intent,
      createdAt: new Date().toISOString()
    });

    // Set up event listener for matching events
    // (In a real implementation, this would be more sophisticated)

    return { type: 'subscribed', subscriptionId };
  }

  _handleUnsubscribe(connectionId, message) {
    this.subscriptions.delete(message.subscriptionId);
    return { type: 'unsubscribed', subscriptionId: message.subscriptionId };
  }

  /**
   * Broadcast to subscriptions when events change
   */
  notifySubscriptions(event) {
    for (const [subId, sub] of this.subscriptions) {
      // Check if event matches subscription filter
      const { intent } = sub;
      if (this._eventMatchesIntent(event, intent)) {
        // Would send via WebSocket in real implementation
        console.log(`Subscription ${subId} notified of event ${event.id}`);
      }
    }
  }

  _eventMatchesIntent(event, intent) {
    const { type, params } = intent.operator;

    if (type === OperatorType.SEG) {
      // Check if event matches collection and filter
      if (params.collection) {
        const eventCollection = event.payload?.collection ||
                               event.payload?.entityType ||
                               event.context?.collection;
        if (eventCollection !== params.collection) return false;
      }

      if (params.filter) {
        for (const [key, value] of Object.entries(params.filter)) {
          const eventValue = event.payload?.[key] || event[key];
          if (eventValue !== value) return false;
        }
      }

      return true;
    }

    return false;
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      connections: this.connections.size,
      subscriptions: this.subscriptions.size
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    OperatorType,
    StreamStatus,
    SubscriptionState,
    OperatorIntent,
    DataSlice,
    DataBudget,
    Subscription,
    OperatorExecutor,
    OperatorStreamClient,
    MockStreamServer
  };
}

if (typeof window !== 'undefined') {
  window.OperatorType = OperatorType;
  window.StreamStatus = StreamStatus;
  window.SubscriptionState = SubscriptionState;
  window.OperatorIntent = OperatorIntent;
  window.DataSlice = DataSlice;
  window.DataBudget = DataBudget;
  window.Subscription = Subscription;
  window.OperatorExecutor = OperatorExecutor;
  window.OperatorStreamClient = OperatorStreamClient;
  window.MockStreamServer = MockStreamServer;
}
