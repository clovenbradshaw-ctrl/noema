# Plan: Simplified Activity Storage

## Design Principle

**Store simple. Expand when needed. Reference context only when it exists.**

---

## New Activity Format

### Core Record (what gets stored)

```javascript
{
  id: "act_m5x8a1",
  ts: 1735643460,           // unix timestamp (not ISO string)
  op: "ALT",                // operator
  actor: "user_789",        // who (pulled out of context - it's always needed)
  target: "rec_123",        // entity ID
  field: "name",            // field ID (if applicable, else null)
  delta: ["John", "Jane"],  // [prev, next] for changes, null otherwise
  method: "inline_edit",    // how (optional, common)
  source: null,             // from where (optional, rare)
  seq: null,                // sequence ID (if compound action)
  ctx: null                 // context ref (only if rich context needed)
}
```

**Size: ~150-200 bytes** vs current ~800+ bytes

### When Rich Context is Needed

For legal/compliance scenarios, reference a context record:

```javascript
// Activity with rich context
{
  id: "act_legal_123",
  ts: 1735643460,
  op: "NUL",
  actor: "system",
  target: "rec_789",
  method: "expectation_check",
  ctx: "ctx_metro_rule"  // ← reference
}

// Context record (stored separately)
{
  id: "ctx_metro_rule",
  jurisdiction: "Metro County Court",
  definition: "Per Metro Court Rule 12.4",
  term: "filing_deadline",
  background: "Annual compliance audit"
}
```

---

## Schema

### activities table

| Field | Type | Notes |
|-------|------|-------|
| id | string | Primary key, `act_<ts36>_<rand>` |
| ts | integer | Unix timestamp (seconds or ms) |
| op | string | One of: INS, DES, SEG, CON, SYN, ALT, SUP, REC, NUL |
| actor | string | User/system ID |
| target | string | Entity ID |
| field | string? | Field ID if field-level operation |
| delta | [any, any]? | [previousValue, newValue] for changes |
| method | string? | How the action was performed |
| source | string? | External source reference |
| seq | string? | Sequence ID for compound actions |
| ctx | string? | Reference to contexts table |

### contexts table (sparse, only when needed)

| Field | Type | Notes |
|-------|------|-------|
| id | string | Primary key |
| term | string? | Semantic term |
| definition | string? | What it means |
| jurisdiction | string? | Legal/org scope |
| scale | string? | Operation scale |
| background | string? | Why/reasoning |

### sequences table (for compound actions)

| Field | Type | Notes |
|-------|------|-------|
| id | string | Primary key, `seq_<ts36>_<rand>` |
| ts | integer | When sequence started |
| name | string | Human name ("Join Sources") |
| ops | string[] | ["INS", "CON", "DES"] |
| actor | string | Who initiated |
| ctx | string? | Shared context ref |

---

## Module Changes

### eo_activity.js

**Before:**
```javascript
function createActivityAtom(params, options = {}) {
  const { operator, target, context } = params;
  return {
    id: generateActivityId(),
    type: 'activity_atom',
    operator,
    target: normalizeTarget(target),
    context: normalizeContext(context),  // Always 9-element structure
    timestamp: new Date().toISOString(),
    // ... 10+ more fields
  };
}
```

**After:**
```javascript
function createActivity(op, target, actor, options = {}) {
  return {
    id: genId('act'),
    ts: Date.now(),
    op,
    actor,
    target: typeof target === 'string' ? target : target.id,
    field: target.field || null,
    delta: options.delta || null,
    method: options.method || null,
    source: options.source || null,
    seq: options.seq || null,
    ctx: options.ctx || null
  };
}

// Expansion for consumers that need full structure
function expand(activity) {
  return {
    id: activity.id,
    type: 'activity_atom',
    operator: activity.op,
    target: {
      id: activity.target,
      fieldId: activity.field,
      previousValue: activity.delta?.[0],
      newValue: activity.delta?.[1]
    },
    context: activity.ctx
      ? loadContext(activity.ctx)
      : { epistemic: { agent: activity.actor, method: activity.method, source: activity.source }},
    timestamp: new Date(activity.ts).toISOString()
  };
}
```

**Convenience wrappers become thin:**
```javascript
const Activity = {
  insert: (target, actor, opts) => createActivity('INS', target, actor, opts),
  update: (target, actor, delta, opts) => createActivity('ALT', target, actor, { delta, ...opts }),
  delete: (target, actor, opts) => createActivity('NUL', target, actor, opts),
  link: (target, actor, opts) => createActivity('CON', target, actor, opts),
  // ... etc
};
```

### eo_nine_operators.js

**Simplify invoke():**

```javascript
// Before: returns complex invocation object
function invoke(operator, target, context = {}) {
  // ... 30 lines building nested structure
}

// After: returns activity-ready object
function invoke(op, target, actor, options = {}) {
  return {
    op,
    target: normalizeTargetId(target),
    field: target.field || null,
    actor,
    delta: options.delta,
    method: options.method,
    source: options.source,
    ctx: options.ctx
  };
}
```

**ActionOperatorMapping simplifies:**

```javascript
// Before
'update_field': {
  operators: ['ALT'],
  encode: (action) => [
    invoke('ALT', {
      type: 'field',
      id: action.recordId,
      field: action.fieldId,
      previousValue: action.oldValue,
      newValue: action.newValue
    }, {
      agent: action.userId,
      method: 'inline_edit'
    })
  ]
}

// After
'update_field': {
  op: 'ALT',
  encode: (a) => ({
    target: a.recordId,
    field: a.fieldId,
    delta: [a.oldValue, a.newValue],
    method: 'inline_edit'
  })
}
```

### eo_compliance.js

**Validation works on expanded form:**

```javascript
// Before: deeply nested access
const agent = activity.context?.epistemic?.agent;
const method = activity.context?.epistemic?.method;

// After: flat access (expand first if needed)
function validate(activity) {
  const a = activity.actor ? activity : expand(activity);
  const agent = a.actor;
  const method = a.method;
  // ...
}
```

### eo_ghost_registry.js

**Ghost operations become simple:**

```javascript
// Before
GhostActivities.ghost(entityId, entityType, actor, reason) {
  return createActivityAtom({
    operator: 'NUL',
    target: { entityId, entityType, positionType: 'entity' },
    context: ContextTemplates.ghostCreation(actor, reason)
  });
}

// After
function ghost(entityId, actor, reason) {
  return createActivity('NUL', entityId, actor, {
    method: 'soft_delete',
    ctx: reason ? createContext({ background: reason }) : null
  });
}
```

### ActivityStore class

**Indexes simplify:**

```javascript
// Before: nested path indexes
actStore.createIndex('agent', 'context.epistemic.agent');

// After: flat field indexes
actStore.createIndex('actor', 'actor');
actStore.createIndex('op', 'op');
actStore.createIndex('target', 'target');
actStore.createIndex('ts', 'ts');
```

**Queries stay the same interface, work with flat fields:**

```javascript
getByOperator(op) {
  return this.query({ op });
}

getByEntity(entityId) {
  return this.query({ target: entityId });
}

getByActor(actor) {
  return this.query({ actor });
}
```

---

## API Examples

### Create Record

**Request:**
```http
POST /api/sets/set_abc/records
{ "values": { "name": "John" } }
```

**Stored:**
```json
{ "id": "act_x7k2", "ts": 1735643460, "op": "INS", "actor": "user_789", "target": "rec_456", "method": "api" }
```

**Response:**
```json
{
  "record": { "id": "rec_456", "values": { "name": "John" } },
  "activity": { "id": "act_x7k2", "op": "INS" }
}
```

### Update Field

**Request:**
```http
PATCH /api/records/rec_123/fields/name
{ "value": "Jane" }
```

**Stored:**
```json
{ "id": "act_x8a1", "ts": 1735643520, "op": "ALT", "actor": "user_789", "target": "rec_123", "field": "name", "delta": ["John", "Jane"], "method": "inline_edit" }
```

### Join Sources (Compound)

**Stored sequence:**
```json
{ "id": "seq_xa12", "ts": 1735643580, "name": "Join Sources", "ops": ["INS", "CON", "DES"], "actor": "user_789" }
```

**Stored activities:**
```json
{ "id": "act_001", "ts": 1735643580, "op": "INS", "actor": "user_789", "target": "set_new", "seq": "seq_xa12" }
{ "id": "act_002", "ts": 1735643580, "op": "CON", "actor": "user_789", "target": "set_new", "seq": "seq_xa12", "method": "left_join" }
{ "id": "act_003", "ts": 1735643580, "op": "DES", "actor": "user_789", "target": "set_new", "delta": [null, "Employee Details"], "seq": "seq_xa12" }
```

### With Rich Context (Legal)

**Stored:**
```json
{ "id": "act_legal", "ts": 1735643640, "op": "NUL", "actor": "system", "target": "filing_123", "method": "expectation_check", "ctx": "ctx_metro" }
```

**Context record:**
```json
{ "id": "ctx_metro", "jurisdiction": "Metro County Court", "definition": "Per Rule 12.4", "term": "filing_deadline" }
```

---

## Migration

### Step 1: Add new functions alongside old

```javascript
// New compact API
export const Activity = { insert, update, delete, link, ... };

// Old API still works (deprecated)
export { createActivityAtom, ActivityPatterns };
```

### Step 2: Migrate storage

```javascript
// On read: detect old format, expand
function load(raw) {
  if (raw.type === 'activity_atom') {
    return migrate(raw);  // Convert old → new
  }
  return raw;
}

// Migration: old verbose → new compact
function migrate(old) {
  return {
    id: old.id,
    ts: new Date(old.timestamp).getTime(),
    op: old.operator,
    actor: old.context?.epistemic?.agent,
    target: old.target?.id || old.target?.entityId,
    field: old.target?.fieldId,
    delta: old.target?.previousValue !== undefined
      ? [old.target.previousValue, old.target.newValue]
      : null,
    method: old.context?.epistemic?.method,
    source: old.context?.epistemic?.source,
    seq: old.sequenceId,
    ctx: null  // Rich context migrated separately if needed
  };
}
```

### Step 3: Update IndexedDB schema

```javascript
// Version 2 schema
request.onupgradeneeded = (event) => {
  const db = event.target.result;

  if (event.oldVersion < 2) {
    // Migrate activities store
    const store = transaction.objectStore('activities');
    store.deleteIndex('agent');
    store.createIndex('actor', 'actor');
    store.createIndex('op', 'op');
    store.createIndex('target', 'target');
  }
};
```

---

## What We Keep

- **9 operators** (INS, DES, SEG, CON, SYN, ALT, SUP, REC, NUL) - these are the vocabulary
- **Sequences** for compound actions
- **Rich context** when needed (via reference)
- **Full expansion** available for compliance/display

## What We Drop

- **Mandatory 9-element context** on every activity
- **Nested object structure** for storage
- **Verbose field names** (operator → op, timestamp → ts)
- **Always-null fields** (definition, jurisdiction, scale on routine ops)

---

## Size Comparison

| Operation | Old Size | New Size | Savings |
|-----------|----------|----------|---------|
| Field update | ~850 bytes | ~180 bytes | 79% |
| Create record | ~750 bytes | ~150 bytes | 80% |
| Delete record | ~700 bytes | ~120 bytes | 83% |
| Join (3 ops) | ~2400 bytes | ~500 bytes | 79% |

---

## Decision: Store Compact, Expand on Demand

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Action    │ ──▶ │   Store     │ ──▶ │   Query     │
│  (simple)   │     │  (compact)  │     │  (expand?)  │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                          ┌───────────────────┴───────────────────┐
                          │                                       │
                    ┌─────▼─────┐                         ┌───────▼───────┐
                    │  Simple   │                         │   Expanded    │
                    │  (API)    │                         │  (Compliance) │
                    └───────────┘                         └───────────────┘
```

Most consumers get compact. Compliance/audit get expanded.
